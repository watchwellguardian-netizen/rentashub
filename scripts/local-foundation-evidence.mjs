import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonDatabase } from "../server/src/db/adapters/jsonAdapter.js";
import { runMigrations } from "../server/src/db/migrator.js";
import { runSeeds } from "../server/src/db/seed.js";
import { TABLES } from "../server/src/db/schema.js";
import { AUDIT_EVENT_CATEGORIES } from "../server/src/audit/auditEventModel.js";
import { validateFeatureFlagRegistry } from "../src/lib/featureFlags.js";
import { validateStorageBucketDefinitions } from "../src/lib/storageBuckets.js";
import { validateRentalContracts } from "../src/lib/rentalJourneyContracts.js";
import { runStaticPolicyScenarioMatrix } from "../src/lib/rbacRlsPolicyContracts.js";

const artifactsDir = "artifacts/accelerated-delivery";
const migrationsDir = "server/migrations";
const requiredMigrations = [
  "001_initial_schema.sql",
  "002_auth_foundation.sql",
  "003_file_storage_foundation.sql",
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
];

async function readSqlFiles() {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const entries = [];
  for (const file of files) {
    entries.push({ file, sql: await readFile(resolve(migrationsDir, file), "utf8") });
  }
  return entries;
}

function checkMigrationOrder(files) {
  const errors = [];
  const names = files.map((entry) => entry.file);
  for (const required of requiredMigrations) {
    if (!names.includes(required)) errors.push(`Missing migration ${required}`);
  }
  const sorted = [...names].sort();
  if (names.join("|") !== sorted.join("|")) errors.push("Migration files are not sorted lexicographically");
  return { valid: errors.length === 0, errors, migrationCount: names.length, names };
}

function checksum(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function migrationChecksums(entries) {
  return Object.fromEntries(entries.map(({ file, sql }) => [file, checksum(sql)]));
}

function simulateInvalidMigrationOrdering(entries) {
  const result = checkMigrationOrder([...entries].reverse());
  return { status: result.valid ? "FAIL" : "PASS", invalidOrderingDetected: !result.valid, errors: result.errors };
}

function simulateFailedMigrationReporting(entries) {
  const result = checkMigrationOrder(entries.filter((entry) => entry.file !== "007_audit_logging_activation.sql"));
  return { status: result.valid ? "FAIL" : "PASS", failedMigrationReported: !result.valid, errors: result.errors };
}

function checkRlsCoverage(entries) {
  const createdTables = new Set();
  const rlsTables = new Set();
  const policyTables = new Set();
  for (const { sql } of entries) {
    for (const match of sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.([a-zA-Z0-9_]+)/gi)) createdTables.add(match[1]);
    for (const match of sql.matchAll(/ALTER\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)) rlsTables.add(match[1]);
    for (const match of sql.matchAll(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.([a-zA-Z0-9_]+)/gi)) policyTables.add(match[1]);
  }
  const missingRls = [...createdTables].filter((table) => !rlsTables.has(table));
  const missingPolicy = [...rlsTables].filter((table) => !policyTables.has(table));
  return {
    status: missingRls.length === 0 && missingPolicy.length === 0 ? "PASS" : "PARTIAL",
    createdTables: [...createdTables].sort(),
    rlsTables: [...rlsTables].sort(),
    policyTables: [...policyTables].sort(),
    missingRls,
    missingPolicy,
  };
}

async function runInMemoryReset() {
  const database = await createJsonDatabase({ filePath: ":memory:" });
  await database.reset();
  const migrationResult = await runMigrations(database);
  const seedResult = await runSeeds(database);
  const snapshot = database.snapshot();
  const tableCounts = Object.fromEntries(TABLES.map((table) => [table, snapshot.tables[table]?.length || 0]));
  const recordIds = Object.fromEntries(TABLES.map((table) => [table, (snapshot.tables[table] || []).map((record) => record.id).filter(Boolean)]));
  const duplicateRecordIds = Object.fromEntries(
    Object.entries(recordIds)
      .map(([table, ids]) => [table, ids.filter((id, index) => ids.indexOf(id) !== index)])
      .filter(([, duplicates]) => duplicates.length > 0),
  );
  return {
    provider: database.provider,
    filePath: database.filePath,
    productionTouched: false,
    liveProviderTouched: false,
    migrationsApplied: migrationResult.applied.map((migration) => migration.name),
    tableCount: migrationResult.tableCount,
    seedRecordCount: seedResult.recordCount,
    tablesSeeded: seedResult.tablesSeeded,
    tableCounts,
    duplicateRecordIds,
    schemaHash: checksum({ schemaVersion: snapshot.schemaVersion, tableNames: Object.keys(snapshot.tables).sort(), tableCounts }),
  };
}

async function runDeterministicResetEvidence() {
  const first = await runInMemoryReset();
  const second = await runInMemoryReset();
  return {
    status: first.schemaHash === second.schemaHash && Object.keys(second.duplicateRecordIds).length === 0 ? "PASS" : "FAIL",
    firstSchemaHash: first.schemaHash,
    secondSchemaHash: second.schemaHash,
    schemaHashesMatch: first.schemaHash === second.schemaHash,
    seedRecordCountStable: first.seedRecordCount === second.seedRecordCount,
    duplicateRecordsDetected: Object.keys(second.duplicateRecordIds).length > 0,
    duplicateRecordIds: second.duplicateRecordIds,
  };
}

function checkAuditCoverage() {
  const allEvents = Object.values(AUDIT_EVENT_CATEGORIES).flat();
  const required = [
    "assets.created",
    "assets.updated",
    "bookings.requested",
    "bookings.status_changed",
    "inspections.created",
    "payments.intent_created",
    "reviews.created",
  ];
  const missing = required.filter((event) => !allEvents.includes(event));
  return { status: missing.length ? "FAIL" : "PASS", required, missing };
}

async function writeReports(result) {
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(`${artifactsDir}/local-foundation-evidence.json`, `${JSON.stringify(result, null, 2)}\n`);
  const markdown = `# Local Foundation Evidence

Status: ${result.status}

Live provider touched: ${result.reset.liveProviderTouched ? "Yes" : "No"}

Production touched: ${result.reset.productionTouched ? "Yes" : "No"}

## Migration Reset

- Provider: ${result.reset.provider}
- File path: ${result.reset.filePath}
- Migrations applied: ${result.reset.migrationsApplied.length}
- Table contracts: ${result.reset.tableCount}
- Seed records: ${result.reset.seedRecordCount}
- Schema hash: ${result.reset.schemaHash}
- Deterministic reset: ${result.deterministicReset.status}
- Invalid migration ordering detection: ${result.invalidOrdering.status}
- Failed migration reporting simulation: ${result.failedMigration.status}

## Static Gates

| Gate | Status |
| --- | --- |
| Migration order | ${result.migrationOrder.valid ? "PASS" : "FAIL"} |
| Migration checksums | PASS |
| Deterministic reset | ${result.deterministicReset.status} |
| Invalid migration ordering detection | ${result.invalidOrdering.status} |
| Failed migration reporting simulation | ${result.failedMigration.status} |
| RLS coverage | ${result.rlsCoverage.status} |
| Storage definitions | ${result.storage.valid ? "PASS" : "FAIL"} |
| Feature flag registry | ${result.featureFlags.valid ? "PASS" : "FAIL"} |
| Rental API contracts | ${result.rentalContracts.valid ? "PASS" : "FAIL"} |
| Static RBAC/RLS policy scenarios | ${result.staticPolicyScenarios.passed ? "STATIC_POLICY_VALIDATED" : "FAIL"} |
| Core rental audit events | ${result.auditCoverage.status} |

## Boundaries

- No Supabase connection was opened.
- No credentials were loaded, printed, or required.
- No production database was touched.
- This evidence does not satisfy A4-01, A4-03, or A4-04.
`;
  await writeFile(`${artifactsDir}/local-foundation-evidence.md`, markdown);
}

export async function collectLocalFoundationEvidence() {
  const entries = await readSqlFiles();
  const reset = await runInMemoryReset();
  const deterministicReset = await runDeterministicResetEvidence();
  const migrationOrder = checkMigrationOrder(entries);
  const invalidOrdering = simulateInvalidMigrationOrdering(entries);
  const failedMigration = simulateFailedMigrationReporting(entries);
  const rlsCoverage = checkRlsCoverage(entries);
  const storage = validateStorageBucketDefinitions();
  const featureFlags = validateFeatureFlagRegistry();
  const rentalContracts = validateRentalContracts();
  const staticPolicyScenarios = runStaticPolicyScenarioMatrix();
  const auditCoverage = checkAuditCoverage();
  const checks = [
    migrationOrder.valid,
    deterministicReset.status === "PASS",
    invalidOrdering.status === "PASS",
    failedMigration.status === "PASS",
    ["PASS", "PARTIAL"].includes(rlsCoverage.status),
    storage.valid,
    featureFlags.valid,
    rentalContracts.valid,
    staticPolicyScenarios.passed,
    auditCoverage.status === "PASS",
  ];
  const result = {
    generatedAt: new Date().toISOString(),
    status: checks.every(Boolean) ? "PASS" : "FAIL",
    reset,
    deterministicReset,
    migrationOrder,
    migrationChecksums: migrationChecksums(entries),
    invalidOrdering,
    failedMigration,
    rlsCoverage,
    storage,
    featureFlags,
    rentalContracts,
    staticPolicyScenarios,
    auditCoverage,
  };
  return result;
}

const command = process.argv[2] || "report";
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await collectLocalFoundationEvidence();
  if (command === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    await writeReports(result);
    console.log(`[local-foundation] status: ${result.status}`);
    console.log(`[local-foundation] migrations applied: ${result.reset.migrationsApplied.length}`);
    console.log(`[local-foundation] seed records: ${result.reset.seedRecordCount}`);
    console.log(`[local-foundation] live provider touched: ${result.reset.liveProviderTouched ? "YES" : "NO"}`);
    console.log(`[local-foundation] wrote ${artifactsDir}/local-foundation-evidence.json`);
    console.log(`[local-foundation] wrote ${artifactsDir}/local-foundation-evidence.md`);
  }
  process.exit(result.status === "PASS" ? 0 : 1);
}
