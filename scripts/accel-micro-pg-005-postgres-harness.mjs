import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = "server/migrations";
const REQUIRED_MIGRATIONS = [
  "001_initial_schema.sql",
  "002_auth_foundation.sql",
  "003_file_storage_foundation.sql",
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
  "008_core_rental_production_readiness_bridge.sql",
  "009_core_rental_postgres_repository_adapter.sql",
];

const BLOCKED = "BLOCKED_NO_EXECUTABLE_POSTGRES";
const FAIL = "FAIL_POSTGRES_EXECUTION";
const PASS = "PASS_POSTGRES_EXECUTION";

const DISALLOWED_HOST_PATTERNS = [/supabase\.co$/i, /supabase\.com$/i];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function redact(value = "") {
  return String(value).replace(/(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@/i, "$1$2:REDACTED@");
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function findExecutable(name) {
  const result = spawnSync("where.exe", [name], { encoding: "utf8" });
  return {
    name,
    available: result.status === 0,
    paths: result.status === 0 ? result.stdout.trim().split(/\r?\n/).filter(Boolean) : [],
  };
}

function versionOf(command, args = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    command: `${command} ${args.join(" ")}`,
    exitCode: result.status ?? 1,
    output: result.status === 0 ? `${result.stdout || ""}${result.stderr || ""}`.trim() : "",
  };
}

export function validatePostgresHarnessUrl(rawUrl = "", env = process.env) {
  const value = String(rawUrl || "").trim();
  if (!value) return { valid: false, code: "missing_database_url", safeForExecution: false, sanitizedUrl: "" };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, code: "invalid_database_url", safeForExecution: false, sanitizedUrl: "[invalid-url]" };
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    return { valid: false, code: "invalid_protocol", safeForExecution: false, sanitizedUrl: redact(value) };
  }
  if (!parsed.hostname || !parsed.username || !parsed.password || !parsed.pathname.replace("/", "")) {
    return { valid: false, code: "incomplete_database_url", safeForExecution: false, sanitizedUrl: redact(value) };
  }
  if (DISALLOWED_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    return { valid: false, code: "remote_supabase_host_blocked", safeForExecution: false, sanitizedUrl: redact(value) };
  }
  const databaseName = parsed.pathname.replace("/", "");
  const localHost = LOCAL_HOSTS.has(parsed.hostname);
  const disposableName = /(?:test|disposable|pg005|rentashub_pg005)/i.test(databaseName);
  const explicitDisposable = env.ACCEL_PG005_CONFIRM_DISPOSABLE === "true";
  const safeForExecution = localHost && (disposableName || explicitDisposable);
  return {
    valid: true,
    code: safeForExecution ? "valid_disposable_local_url" : "not_confirmed_disposable_local_url",
    safeForExecution,
    sanitizedUrl: redact(value),
    host: parsed.hostname,
    databaseName,
  };
}

export function getPostgresHarnessEnvironment(env = process.env) {
  const psql = findExecutable("psql");
  const supabase = findExecutable("supabase");
  const docker = findExecutable("docker");
  const databaseUrl = env.ACCEL_PG005_DATABASE_URL || env.PG_TEST_DATABASE_URL || "";
  const urlValidation = validatePostgresHarnessUrl(databaseUrl, env);
  const executablePostgresAvailable = psql.available && urlValidation.safeForExecution;
  return {
    status: executablePostgresAvailable ? "EXECUTABLE_POSTGRES_AVAILABLE" : BLOCKED,
    psql: { ...psql, version: psql.available ? versionOf("psql") : null },
    supabase: { ...supabase, version: supabase.available ? versionOf("supabase") : null },
    docker: { ...docker, version: docker.available ? versionOf("docker") : null },
    databaseUrl: urlValidation,
    requiredEnv: ["ACCEL_PG005_DATABASE_URL or PG_TEST_DATABASE_URL"],
    productionBlocked: true,
    liveSupabaseBlocked: true,
  };
}

async function readMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  const entries = [];
  for (const file of files) {
    const sql = await readFile(resolve(MIGRATIONS_DIR, file), "utf8");
    entries.push({ file, sql, checksum: checksum(sql) });
  }
  return entries;
}

export async function getMigrationExecutionPlan() {
  const entries = await readMigrations();
  const names = entries.map((entry) => entry.file);
  const missing = REQUIRED_MIGRATIONS.filter((file) => !names.includes(file));
  const selected = REQUIRED_MIGRATIONS.map((file) => entries.find((entry) => entry.file === file)).filter(Boolean);
  return {
    status: missing.length ? "BLOCKED_MISSING_MIGRATIONS" : "READY",
    requiredMigrations: REQUIRED_MIGRATIONS,
    missing,
    orderedFiles: selected.map((entry) => entry.file),
    checksums: Object.fromEntries(selected.map((entry) => [entry.file, entry.checksum])),
    selected,
  };
}

function psqlEnv(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    ...process.env,
    PGPASSWORD: decodeURIComponent(parsed.password),
  };
}

function psqlArgs(databaseUrl, sql) {
  const parsed = new URL(databaseUrl);
  return [
    "--host",
    parsed.hostname,
    "--port",
    parsed.port || "5432",
    "--username",
    decodeURIComponent(parsed.username),
    "--dbname",
    parsed.pathname.replace("/", ""),
    "--set",
    "ON_ERROR_STOP=1",
    "--no-password",
    "--command",
    sql,
  ];
}

function runPsql(databaseUrl, sql) {
  const result = spawnSync("psql", psqlArgs(databaseUrl, sql), {
    encoding: "utf8",
    env: psqlEnv(databaseUrl),
    timeout: 30000,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function failureResult(stage, detail, extra = {}) {
  return {
    status: FAIL,
    stage,
    detail,
    ...extra,
  };
}

async function executeHarness(env = process.env) {
  const environment = getPostgresHarnessEnvironment(env);
  const migrations = await getMigrationExecutionPlan();
  if (environment.status !== "EXECUTABLE_POSTGRES_AVAILABLE") {
    return {
      status: BLOCKED,
      environment,
      migrations: { status: migrations.status, missing: migrations.missing, orderedFiles: migrations.orderedFiles },
      message: "No executable disposable PostgreSQL path is available.",
    };
  }
  if (migrations.status !== "READY") return failureResult("migration_plan", "Required migrations are missing.", { environment, migrations });

  const databaseUrl = env.ACCEL_PG005_DATABASE_URL || env.PG_TEST_DATABASE_URL;
  const setup = runPsql(databaseUrl, "CREATE EXTENSION IF NOT EXISTS btree_gist;");
  if (setup.exitCode !== 0) return failureResult("setup", "Failed to prepare required extension.", { environment, stderr: setup.stderr });

  const migrationResults = [];
  for (const migration of migrations.selected) {
    const result = runPsql(databaseUrl, migration.sql);
    migrationResults.push({ file: migration.file, exitCode: result.exitCode, stderr: result.stderr.slice(0, 2000) });
    if (result.exitCode !== 0) {
      return failureResult("migration_execution", `Migration failed: ${migration.file}`, { environment, migrationResults });
    }
  }

  const checks = [
    {
      id: "schema_constraint_introspection",
      sql: "SELECT conname FROM pg_constraint WHERE conname IN ('bookings_no_core_rental_blocking_overlap','bookings_core_rental_status_check','bookings_core_rental_amounts_non_negative','bookings_core_rental_currency_code_check','bookings_core_rental_time_window_check','assets_core_rental_amounts_non_negative') ORDER BY conname;",
    },
    {
      id: "repository_smoke_insert",
      sql: "INSERT INTO public.assets (id, owner_id, title, category, listing_type, availability_status, created_at, updated_at) VALUES ('pg005-asset', 'pg005-supplier', 'PG005 Asset', 'tools', 'rental', 'available', NOW()::text, NOW()::text) ON CONFLICT (id) DO NOTHING;",
    },
    {
      id: "idempotency_uniqueness",
      sql: "INSERT INTO public.core_rental_idempotency_records (actor_id, actor_role, action, resource_type, idempotency_key, request_hash) VALUES ('pg005-actor', 'customer', 'booking.create', 'booking', 'pg005-key', 'hash') ON CONFLICT (actor_id, action, idempotency_key) DO NOTHING;",
    },
    {
      id: "transaction_rollback",
      sql: "BEGIN; INSERT INTO public.assets (id, owner_id, title, category, listing_type, created_at, updated_at) VALUES ('pg005-rollback', 'pg005-supplier', 'Rollback Asset', 'tools', 'rental', NOW()::text, NOW()::text); ROLLBACK;",
    },
    {
      id: "cleanup",
      sql: "DELETE FROM public.core_rental_idempotency_records WHERE actor_id = 'pg005-actor'; DELETE FROM public.assets WHERE id IN ('pg005-asset','pg005-rollback');",
    },
  ];
  const checkResults = [];
  for (const check of checks) {
    const result = runPsql(databaseUrl, check.sql);
    checkResults.push({ id: check.id, exitCode: result.exitCode, stderr: result.stderr.slice(0, 2000) });
    if (result.exitCode !== 0) return failureResult("runtime_check", `Runtime check failed: ${check.id}`, { environment, migrationResults, checkResults });
  }
  return {
    status: PASS,
    environment,
    migrations: { status: migrations.status, orderedFiles: migrations.orderedFiles, checksums: migrations.checksums },
    migrationResults,
    checkResults,
    rlsEnforcementClaimed: false,
    productionTouched: false,
    liveSupabaseTouched: false,
  };
}

export async function collectPg005Harness(command = "detect", env = process.env) {
  if (command === "run") return executeHarness(env);
  const environment = getPostgresHarnessEnvironment(env);
  const migrations = await getMigrationExecutionPlan();
  return {
    status: environment.status === "EXECUTABLE_POSTGRES_AVAILABLE" && migrations.status === "READY" ? "READY_TO_RUN_POSTGRES_EXECUTION" : BLOCKED,
    environment,
    migrations: { status: migrations.status, missing: migrations.missing, orderedFiles: migrations.orderedFiles, checksums: migrations.checksums },
    requiredStatusBehavior: { blocked: BLOCKED, fail: FAIL, pass: PASS },
    productionTouched: false,
    liveSupabaseTouched: false,
  };
}

const command = process.argv[2] || "detect";
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await collectPg005Harness(command);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[accel-micro-pg-005] status: ${result.status}`);
    console.log(`[accel-micro-pg-005] psql: ${result.environment?.psql?.available ? "AVAILABLE" : "UNAVAILABLE"}`);
    console.log(`[accel-micro-pg-005] database url: ${result.environment?.databaseUrl?.code || "unknown"}`);
    console.log(`[accel-micro-pg-005] migrations: ${result.migrations?.status || "unknown"}`);
    console.log(`[accel-micro-pg-005] production touched: NO`);
    console.log(`[accel-micro-pg-005] live Supabase touched: NO`);
  }
  process.exit(result.status === FAIL ? 1 : 0);
}
