import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const artifactsDir = "artifacts/accelerated-delivery";
const migrationsDir = "supabase/migrations";

const requiredMigrations = [
  "001_initial_schema.sql",
  "002_auth_foundation.sql",
  "003_file_storage_foundation.sql",
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
];

const executionCommands = [
  { id: "supabase_version", command: "supabase --version", allowed: true },
  { id: "supabase_start", command: "supabase start", allowed: true },
  { id: "supabase_reset", command: "supabase db reset --local", allowed: true },
  { id: "supabase_status", command: "supabase status", allowed: true },
  { id: "docker_version", command: "docker --version", allowed: true },
  { id: "psql_version", command: "psql --version", allowed: true },
];

const forbiddenPatterns = [
  /supabase\s+link\b/i,
  /supabase\s+db\s+push\b/i,
  /supabase\s+db\s+pull\b/i,
  /--linked\b/i,
  /--db-url\b/i,
  /postgresql:\/\/|postgres:\/\//i,
  /service[_-]?role|jwt[_-]?secret|password\s*=/i,
];

function checkExecutable(command) {
  const result = spawnSync("where.exe", [command], { encoding: "utf8" });
  return {
    command,
    available: result.status === 0,
    pathCount: result.status === 0 ? result.stdout.trim().split(/\r?\n/).filter(Boolean).length : 0,
  };
}

function runVersion(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return {
    command: `${command} ${args.join(" ")}`.trim(),
    exitCode: result.status,
    available: result.status === 0,
    output: result.status === 0 ? output : "",
  };
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readMigrations() {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const entries = [];
  for (const file of files) {
    const sql = await readFile(resolve(migrationsDir, file), "utf8");
    entries.push({ file, sql, checksum: checksum(sql) });
  }
  return entries;
}

function analyzeMigrationExecutionReadiness(entries) {
  const names = entries.map((entry) => entry.file);
  const missing = requiredMigrations.filter((file) => !names.includes(file));
  const sorted = [...names].sort();
  const orderValid = names.join("|") === sorted.join("|");
  const destructiveStatements = entries.flatMap(({ file, sql }) => {
    const matches = [...sql.matchAll(/\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+.+\s+DROP\s+COLUMN)\b/gi)];
    return matches.map((match) => ({ file, statement: match[0] }));
  });
  return {
    status: missing.length === 0 && orderValid ? "READY_FOR_EXECUTION_ENVIRONMENT" : "BLOCKED_INVALID_MIGRATION_SET",
    migrationCount: entries.length,
    requiredMigrations,
    missing,
    orderValid,
    destructiveStatements,
    checksums: Object.fromEntries(entries.map((entry) => [entry.file, entry.checksum])),
  };
}

function analyzeRlsStaticCoverage(entries) {
  const tables = new Set();
  const rlsTables = new Set();
  const policyTables = new Set();
  for (const { sql } of entries) {
    for (const match of sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.([a-zA-Z0-9_]+)/gi)) tables.add(match[1]);
    for (const match of sql.matchAll(/ALTER\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)) rlsTables.add(match[1]);
    for (const match of sql.matchAll(/CREATE\s+POLICY[\s\S]*?ON\s+public\.([a-zA-Z0-9_]+)/gi)) policyTables.add(match[1]);
  }
  const missingRls = [...tables].filter((table) => !rlsTables.has(table)).sort();
  const missingPolicy = [...rlsTables].filter((table) => !policyTables.has(table)).sort();
  return {
    status: missingRls.length || missingPolicy.length ? "STATIC_PARTIAL" : "STATIC_READY",
    executed: false,
    rlsEnforced: false,
    tables: [...tables].sort(),
    rlsTables: [...rlsTables].sort(),
    policyTables: [...policyTables].sort(),
    missingRls,
    missingPolicy,
  };
}

function validateCommandPlan() {
  const forbidden = executionCommands.filter(({ command }) => forbiddenPatterns.some((pattern) => pattern.test(command)));
  return {
    status: forbidden.length ? "FAIL" : "PASS",
    commands: executionCommands,
    forbidden,
    remoteProviderBlocked: true,
    productionBlocked: true,
  };
}

function getEnvironmentStatus() {
  const supabase = checkExecutable("supabase");
  const docker = checkExecutable("docker");
  const psql = checkExecutable("psql");
  const versions = {
    supabase: supabase.available ? runVersion("supabase", ["--version"]) : null,
    docker: docker.available ? runVersion("docker", ["--version"]) : null,
    psql: psql.available ? runVersion("psql", ["--version"]) : null,
  };
  const executablePostgresAvailable = supabase.available || (docker.available && psql.available);
  return {
    status: executablePostgresAvailable ? "EXECUTION_ENVIRONMENT_AVAILABLE" : "BLOCKED_NO_EXECUTABLE_POSTGRES",
    supabase,
    docker,
    psql,
    versions,
    executablePostgresAvailable,
  };
}

function buildEvidenceRequirements(environmentStatus) {
  const blocked = environmentStatus.status !== "EXECUTION_ENVIRONMENT_AVAILABLE";
  return {
    status: blocked ? "BLOCKED" : "READY_TO_EXECUTE_LOCALLY",
    requiredBeforePass: [
      "Supabase CLI or disposable PostgreSQL engine available",
      "Command and exit-code log for local reset",
      "Migrations 001-007 executed against real PostgreSQL",
      "Seed counts from executable database",
      "Schema checksum before and after deterministic reset",
      "RLS policy execution proof",
      "Cross-user denial tests",
      "Cross-tenant denial tests",
      "Local storage bucket and policy tests",
      "API persistence tests using real local database",
    ],
    blockedReason: blocked ? "No Supabase CLI, Docker, or psql executable is available in this environment." : "",
  };
}

async function writeReports(result) {
  await mkdir(artifactsDir, { recursive: true });
  await writeFile(`${artifactsDir}/accel-p1-002-executable-db-validation.json`, `${JSON.stringify(result, null, 2)}\n`);
  const markdown = `# ACCEL-P1-002 Executable Local Database and RLS Validation

Status: ${result.status}

Classification: ${result.classification}

Live provider touched: No

Production touched: No

## Environment

- Supabase CLI: ${result.environment.supabase.available ? "Available" : "Unavailable"}
- Docker: ${result.environment.docker.available ? "Available" : "Unavailable"}
- psql: ${result.environment.psql.available ? "Available" : "Unavailable"}
- Execution environment: ${result.environment.status}

## Migration Readiness

- Migration set: ${result.migrations.status}
- Migration count: ${result.migrations.migrationCount}
- Required migration missing count: ${result.migrations.missing.length}
- Order valid: ${result.migrations.orderValid ? "Yes" : "No"}

## RLS

- Static RLS coverage: ${result.rls.status}
- RLS executed: No
- RLS enforced: No

## Decision

${result.evidence.blockedReason || "Local execution environment is available; run the operator-controlled local reset workflow next."}

This report does not satisfy A4-01, A4-02, A4-03, A4-04, or A4-05.
`;
  await writeFile(`${artifactsDir}/accel-p1-002-executable-db-validation.md`, markdown);
}

export async function collectAccelP1002ExecutableDbValidation() {
  const entries = await readMigrations();
  const environment = getEnvironmentStatus();
  const commandPlan = validateCommandPlan();
  const migrations = analyzeMigrationExecutionReadiness(entries);
  const rls = analyzeRlsStaticCoverage(entries);
  const evidence = buildEvidenceRequirements(environment);
  const executable = environment.status === "EXECUTION_ENVIRONMENT_AVAILABLE";
  const staticReady = commandPlan.status === "PASS" && migrations.status === "READY_FOR_EXECUTION_ENVIRONMENT" && ["STATIC_READY", "STATIC_PARTIAL"].includes(rls.status);
  return {
    generatedAt: new Date().toISOString(),
    batch: "ACCEL-P1-002",
    classification: executable ? "LOCAL_EXECUTION_ENVIRONMENT_READY" : "EXECUTION_BLOCKED_TOOLING_READY",
    status: executable && staticReady ? "READY_TO_RUN_LOCAL_EXECUTION" : staticReady ? "BLOCKED_NO_EXECUTABLE_POSTGRES" : "FAIL",
    environment,
    commandPlan,
    migrations,
    rls,
    evidence,
    liveProviderTouched: false,
    productionTouched: false,
    remoteProjectLinked: false,
  };
}

const command = process.argv[2] || "report";
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await collectAccelP1002ExecutableDbValidation();
  if (command === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    await writeReports(result);
    console.log(`[accel-p1-002] status: ${result.status}`);
    console.log(`[accel-p1-002] supabase cli: ${result.environment.supabase.available ? "AVAILABLE" : "UNAVAILABLE"}`);
    console.log(`[accel-p1-002] docker: ${result.environment.docker.available ? "AVAILABLE" : "UNAVAILABLE"}`);
    console.log(`[accel-p1-002] psql: ${result.environment.psql.available ? "AVAILABLE" : "UNAVAILABLE"}`);
    console.log(`[accel-p1-002] migration readiness: ${result.migrations.status}`);
    console.log(`[accel-p1-002] rls static coverage: ${result.rls.status}`);
    console.log(`[accel-p1-002] live provider touched: NO`);
    console.log(`[accel-p1-002] production touched: NO`);
    console.log(`[accel-p1-002] wrote ${artifactsDir}/accel-p1-002-executable-db-validation.json`);
    console.log(`[accel-p1-002] wrote ${artifactsDir}/accel-p1-002-executable-db-validation.md`);
  }
  process.exit(result.status === "FAIL" ? 1 : 0);
}
