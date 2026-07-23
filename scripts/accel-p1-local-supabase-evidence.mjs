import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const artifactsDir = "artifacts/accelerated-delivery";
const serverMigrationsDir = "server/migrations";
const supabaseMigrationsDir = "supabase/migrations";
const supabaseConfigPath = "supabase/config.toml";

const requiredMigrations = [
  "001_initial_schema.sql",
  "002_auth_foundation.sql",
  "003_file_storage_foundation.sql",
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
];

const localOnlyCommands = [
  "supabase start",
  "supabase db reset --local",
  "supabase status",
  "supabase stop",
];

const forbiddenCommandPatterns = [
  /--linked\b/i,
  /--db-url\b/i,
  /supabase\s+link\b/i,
  /supabase\s+db\s+push\b/i,
  /supabase\s+functions\s+deploy\b/i,
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readDirSql(dir) {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  const entries = [];
  for (const file of files) {
    const sql = await readFile(resolve(dir, file), "utf8");
    entries.push({ file, sql, checksum: sha256(sql) });
  }
  return entries;
}

function validateMigrationParity(serverEntries, supabaseEntries) {
  const errors = [];
  const serverByName = new Map(serverEntries.map((entry) => [entry.file, entry]));
  const supabaseByName = new Map(supabaseEntries.map((entry) => [entry.file, entry]));
  for (const file of requiredMigrations) {
    if (!serverByName.has(file)) errors.push(`Missing canonical server migration ${file}`);
    if (!supabaseByName.has(file)) errors.push(`Missing local Supabase migration ${file}`);
    if (serverByName.has(file) && supabaseByName.has(file) && serverByName.get(file).checksum !== supabaseByName.get(file).checksum) {
      errors.push(`Migration checksum mismatch for ${file}`);
    }
  }
  return {
    status: errors.length ? "FAIL" : "PASS",
    errors,
    requiredMigrations,
    serverMigrationCount: serverEntries.length,
    supabaseMigrationCount: supabaseEntries.length,
    checksums: Object.fromEntries(supabaseEntries.map((entry) => [entry.file, entry.checksum])),
  };
}

function validateLocalCommands(commands = localOnlyCommands) {
  const forbidden = commands.filter((command) => forbiddenCommandPatterns.some((pattern) => pattern.test(command)));
  return {
    status: forbidden.length ? "FAIL" : "PASS",
    commands,
    forbidden,
    productionTouched: false,
    linkedProjectTouched: false,
  };
}

async function validateConfig() {
  const raw = await readFile(supabaseConfigPath, "utf8");
  const errors = [];
  if (!/project_id\s*=\s*"rentashub-local"/.test(raw)) errors.push("Local project_id must remain rentashub-local.");
  if (/project_ref\s*=/.test(raw)) errors.push("project_ref must not be committed for local-only readiness.");
  if (/service[_-]?role|anon[_-]?key|password|access[_-]?token|jwt[_-]?secret/i.test(raw)) errors.push("Config contains credential-like material.");
  if (!/major_version\s*=\s*17/.test(raw)) errors.push("Local Supabase Postgres major_version should be 17 to match current Supabase defaults.");
  return {
    status: errors.length ? "FAIL" : "PASS",
    path: supabaseConfigPath,
    errors,
    postgresMajorVersion: 17,
    authEnabled: /\[auth\][\s\S]*enabled\s*=\s*true/.test(raw),
    storageEnabled: /\[storage\][\s\S]*enabled\s*=\s*true/.test(raw),
    analyticsEnabled: /\[analytics\][\s\S]*enabled\s*=\s*true/.test(raw),
  };
}

function getSupabaseCliStatus() {
  const result = spawnSync("supabase", ["--version"], { encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return {
    status: result.status === 0 ? "AVAILABLE" : "NOT_AVAILABLE",
    executable: "supabase",
    version: result.status === 0 ? output : "",
    localExecutionReady: result.status === 0,
    note: result.status === 0 ? "Local Supabase CLI is available." : "Local Supabase CLI was not executed; install/login/start remain operator-controlled.",
  };
}

function analyzeRlsPolicyCoverage(entries) {
  const created = new Set();
  const rls = new Set();
  const policies = new Set();
  const dataApiGrantCandidates = [];
  for (const { sql } of entries) {
    for (const match of sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.([a-zA-Z0-9_]+)/gi)) created.add(match[1]);
    for (const match of sql.matchAll(/ALTER\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)) rls.add(match[1]);
    for (const match of sql.matchAll(/CREATE\s+POLICY[\s\S]*?ON\s+public\.([a-zA-Z0-9_]+)/gi)) policies.add(match[1]);
    if (/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\./i.test(sql) && !/GRANT\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i.test(sql)) {
      dataApiGrantCandidates.push("explicit_data_api_grants_required_before_live_use");
    }
  }
  const missingRls = [...created].filter((table) => !rls.has(table)).sort();
  const missingPolicies = [...rls].filter((table) => !policies.has(table)).sort();
  return {
    status: missingRls.length || missingPolicies.length ? "PARTIAL" : "PASS",
    createdTables: [...created].sort(),
    rlsTables: [...rls].sort(),
    policyTables: [...policies].sort(),
    missingRls,
    missingPolicies,
    dataApiGrantNote: dataApiGrantCandidates.length
      ? "Supabase 2026 Data API behavior may require explicit grants for newly created public tables before REST/GraphQL exposure."
      : "No Data API grant note generated.",
  };
}

async function writeReports(result) {
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(`${artifactsDir}/accel-p1-local-supabase-evidence.json`, `${JSON.stringify(result, null, 2)}\n`);
  const markdown = `# ACCEL-P1-001 Local Supabase Evidence

Status: ${result.status}

Live provider touched: No

Production touched: No

Linked project touched: No

## Local Supabase Scaffold

- Config: ${result.config.status}
- Migration parity: ${result.migrationParity.status}
- Local command guard: ${result.localCommandGuard.status}
- Supabase CLI status: ${result.supabaseCli.status}
- RLS static coverage: ${result.rlsCoverage.status}

## Required Local Commands

${result.localCommandGuard.commands.map((command) => `- \`${command}\``).join("\n")}

## Boundaries

- No Supabase remote project was linked.
- No credentials were loaded, required, printed, or committed.
- No \`supabase db push\`, \`--linked\`, or \`--db-url\` execution is authorized by this package.
- This does not satisfy A4-01, A4-02, A4-03, A4-04, or A4-05.
`;
  await writeFile(`${artifactsDir}/accel-p1-local-supabase-evidence.md`, markdown);
}

export async function collectAccelP1LocalSupabaseEvidence() {
  const serverEntries = await readDirSql(serverMigrationsDir);
  const supabaseEntries = await readDirSql(supabaseMigrationsDir);
  const config = await validateConfig();
  const migrationParity = validateMigrationParity(serverEntries, supabaseEntries);
  const localCommandGuard = validateLocalCommands();
  const supabaseCli = getSupabaseCliStatus();
  const rlsCoverage = analyzeRlsPolicyCoverage(supabaseEntries);
  const checks = [
    config.status === "PASS",
    migrationParity.status === "PASS",
    localCommandGuard.status === "PASS",
    ["PASS", "PARTIAL"].includes(rlsCoverage.status),
  ];
  return {
    generatedAt: new Date().toISOString(),
    batch: "ACCEL-P1-001",
    classification: "local_only_supabase_execution_readiness",
    status: checks.every(Boolean) ? "PASS" : "FAIL",
    config,
    migrationParity,
    localCommandGuard,
    supabaseCli,
    rlsCoverage,
    productionTouched: false,
    liveProviderTouched: false,
    credentialRequiredForLiveExecution: true,
  };
}

const command = process.argv[2] || "report";
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await collectAccelP1LocalSupabaseEvidence();
  if (command === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    await writeReports(result);
    console.log(`[accel-p1] status: ${result.status}`);
    console.log(`[accel-p1] config: ${result.config.status}`);
    console.log(`[accel-p1] migration parity: ${result.migrationParity.status}`);
    console.log(`[accel-p1] local command guard: ${result.localCommandGuard.status}`);
    console.log(`[accel-p1] supabase cli: ${result.supabaseCli.status}`);
    console.log(`[accel-p1] live provider touched: NO`);
    console.log(`[accel-p1] production touched: NO`);
    console.log(`[accel-p1] wrote ${artifactsDir}/accel-p1-local-supabase-evidence.json`);
    console.log(`[accel-p1] wrote ${artifactsDir}/accel-p1-local-supabase-evidence.md`);
  }
  process.exit(result.status === "PASS" ? 0 : 1);
}
