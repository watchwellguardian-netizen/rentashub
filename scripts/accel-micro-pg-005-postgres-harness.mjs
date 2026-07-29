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
const REQUIRED_RUNTIME_COLUMNS = {
  assets: ["id", "owner_id", "title", "tenant_id", "version", "currency", "status", "deleted_at"],
  bookings: [
    "id",
    "asset_id",
    "customer_id",
    "supplier_id",
    "tenant_id",
    "version",
    "currency",
    "subtotal",
    "deposit_amount",
    "idempotency_key",
    "status",
    "start_at",
    "end_at",
    "deleted_at",
  ],
  core_rental_idempotency_records: ["actor_id", "action", "idempotency_key", "request_hash", "deleted_at"],
  audit_logs: ["tenant_id", "actor_id"],
};
const REQUIRED_RUNTIME_INDEXES = [
  "idx_assets_tenant_owner",
  "idx_bookings_tenant_customer",
  "idx_bookings_tenant_supplier",
  "idx_bookings_asset_window",
  "idx_bookings_customer_idempotency",
  "idx_core_rental_idempotency_lookup",
  "idx_core_rental_idempotency_actor_action_key",
  "idx_bookings_customer_idempotency_active",
];
const REQUIRED_RUNTIME_CONSTRAINTS = [
  "bookings_no_core_rental_blocking_overlap",
  "bookings_core_rental_status_check",
  "bookings_core_rental_amounts_non_negative",
  "bookings_core_rental_currency_code_check",
  "bookings_core_rental_time_window_check",
  "assets_core_rental_amounts_non_negative",
];
const REQUIRED_RLS_TABLES = [
  "assets",
  "bookings",
  "payment_ledger",
  "file_metadata",
  "audit_logs",
  "notifications",
  "core_rental_idempotency_records",
  "core_rental_payment_events",
  "core_rental_storage_requirements",
];
const REQUIRED_RLS_POLICIES = [
  "core_assets_supplier_admin_select",
  "core_assets_supplier_admin_insert",
  "core_assets_supplier_admin_update",
  "core_bookings_party_admin_select",
  "core_bookings_customer_admin_insert",
  "core_bookings_party_admin_update",
  "core_idempotency_actor_admin_select",
  "core_audit_logs_admin_select",
];

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

function sqlList(values) {
  return values.map((value) => `'${String(value).replaceAll("'", "''")}'`).join(",");
}

function requiredColumnRows() {
  return Object.entries(REQUIRED_RUNTIME_COLUMNS)
    .flatMap(([table, columns]) => columns.map((column) => `('${table}','${column}')`))
    .join(",");
}

function catalogCountCheck(id, sql, expectedCount) {
  return {
    id,
    sql: `WITH actual AS (${sql}) SELECT CASE WHEN COUNT(*) = ${expectedCount} THEN 'PASS:${id}' ELSE 'FAIL:${id}:expected_${expectedCount}:actual_' || COUNT(*) END FROM actual;`,
    expectStdout: `PASS:${id}`,
  };
}

function textPassCheck(id, sql) {
  return { id, sql, expectStdout: `PASS:${id}` };
}

function expectedFailureCheck(id, sql, expectedErrorPattern) {
  return { id, sql, expectFailure: true, expectedErrorPattern };
}

function buildS5S3BRuntimeChecks() {
  return [
    catalogCountCheck(
      "table_catalog",
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${sqlList(Object.keys(REQUIRED_RUNTIME_COLUMNS))})`,
      Object.keys(REQUIRED_RUNTIME_COLUMNS).length,
    ),
    catalogCountCheck(
      "column_catalog",
      `WITH required(table_name,column_name) AS (VALUES ${requiredColumnRows()}) SELECT r.table_name, r.column_name FROM required r JOIN information_schema.columns c ON c.table_schema = 'public' AND c.table_name = r.table_name AND c.column_name = r.column_name`,
      Object.values(REQUIRED_RUNTIME_COLUMNS).flat().length,
    ),
    catalogCountCheck(
      "primary_key_catalog",
      `SELECT tc.table_name FROM information_schema.table_constraints tc WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY' AND tc.table_name IN (${sqlList(["assets", "bookings", "core_rental_idempotency_records"])})`,
      3,
    ),
    catalogCountCheck(
      "index_catalog",
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (${sqlList(REQUIRED_RUNTIME_INDEXES)})`,
      REQUIRED_RUNTIME_INDEXES.length,
    ),
    catalogCountCheck(
      "constraint_catalog",
      `SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname IN (${sqlList(REQUIRED_RUNTIME_CONSTRAINTS)})`,
      REQUIRED_RUNTIME_CONSTRAINTS.length,
    ),
    catalogCountCheck(
      "rls_enabled_catalog",
      `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN (${sqlList(REQUIRED_RLS_TABLES)}) AND c.relrowsecurity = true`,
      REQUIRED_RLS_TABLES.length,
    ),
    catalogCountCheck(
      "rls_policy_catalog",
      `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND policyname IN (${sqlList(REQUIRED_RLS_POLICIES)})`,
      REQUIRED_RLS_POLICIES.length,
    ),
    textPassCheck(
      "fixture_creation",
      `DELETE FROM public.core_rental_idempotency_records WHERE actor_id LIKE 's5-%';
       DELETE FROM public.bookings WHERE id LIKE 's5-%';
       DELETE FROM public.assets WHERE id LIKE 's5-%';
       INSERT INTO public.assets (id, owner_id, title, category, listing_type, availability_status, tenant_id, currency, status, price_rate, deposit_amount, created_at, updated_at)
       VALUES
         ('s5-asset-a', 's5-supplier-a', 'S5 Asset A', 'tools', 'rental', 'available', '11111111-1111-1111-1111-111111111111', 'JMD', 'active', 100, 25, NOW()::text, NOW()::text),
         ('s5-asset-b', 's5-supplier-b', 'S5 Asset B', 'tools', 'rental', 'available', '22222222-2222-2222-2222-222222222222', 'JMD', 'active', 100, 25, NOW()::text, NOW()::text);
       SELECT 'PASS:fixture_creation';`,
    ),
    textPassCheck(
      "same_tenant_owner_access",
      `BEGIN;
       SET LOCAL ROLE authenticated;
       SET LOCAL request.jwt.claim.sub = 's5-supplier-a';
       SET LOCAL request.jwt.claim.role = 'authenticated';
       SELECT CASE WHEN COUNT(*) = 1 THEN 'PASS:same_tenant_owner_access' ELSE 'FAIL:same_tenant_owner_access' END FROM public.assets WHERE id = 's5-asset-a';
       ROLLBACK;`,
    ),
    textPassCheck(
      "cross_tenant_denial",
      `BEGIN;
       SET LOCAL ROLE authenticated;
       SET LOCAL request.jwt.claim.sub = 's5-supplier-a';
       SET LOCAL request.jwt.claim.role = 'authenticated';
       SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS:cross_tenant_denial' ELSE 'FAIL:cross_tenant_denial' END FROM public.assets WHERE id = 's5-asset-b';
       ROLLBACK;`,
    ),
    textPassCheck(
      "anonymous_access_denial",
      `BEGIN;
       SET LOCAL ROLE anon;
       RESET request.jwt.claim.sub;
       RESET request.jwt.claim.role;
       SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS:anonymous_access_denial' ELSE 'FAIL:anonymous_access_denial' END FROM public.assets WHERE id IN ('s5-asset-a','s5-asset-b');
       ROLLBACK;`,
    ),
    textPassCheck(
      "privileged_role_access",
      `BEGIN;
       SET LOCAL ROLE authenticated;
       SET LOCAL request.jwt.claim.sub = 's5-admin';
       SET LOCAL request.jwt.claim.role = 'admin';
       SELECT CASE WHEN COUNT(*) = 2 THEN 'PASS:privileged_role_access' ELSE 'FAIL:privileged_role_access' END FROM public.assets WHERE id IN ('s5-asset-a','s5-asset-b');
       ROLLBACK;`,
    ),
    textPassCheck(
      "transaction_commit",
      `BEGIN;
       INSERT INTO public.assets (id, owner_id, title, category, listing_type, tenant_id, availability_status, currency, status, created_at, updated_at)
       VALUES ('s5-commit', 's5-supplier-a', 'S5 Commit', 'tools', 'rental', '11111111-1111-1111-1111-111111111111', 'available', 'JMD', 'active', NOW()::text, NOW()::text);
       COMMIT;
       SELECT CASE WHEN COUNT(*) = 1 THEN 'PASS:transaction_commit' ELSE 'FAIL:transaction_commit' END FROM public.assets WHERE id = 's5-commit';`,
    ),
    textPassCheck(
      "transaction_rollback",
      `BEGIN;
       INSERT INTO public.assets (id, owner_id, title, category, listing_type, tenant_id, availability_status, currency, status, created_at, updated_at)
       VALUES ('s5-rollback', 's5-supplier-a', 'S5 Rollback', 'tools', 'rental', '11111111-1111-1111-1111-111111111111', 'available', 'JMD', 'active', NOW()::text, NOW()::text);
       ROLLBACK;
       SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS:transaction_rollback' ELSE 'FAIL:transaction_rollback' END FROM public.assets WHERE id = 's5-rollback';`,
    ),
    textPassCheck(
      "idempotency_first_insert",
      `INSERT INTO public.core_rental_idempotency_records (actor_id, actor_role, action, resource_type, idempotency_key, request_hash)
       VALUES ('s5-actor', 'customer', 'booking.create', 'booking', 's5-key', 'hash-one');
       SELECT 'PASS:idempotency_first_insert';`,
    ),
    expectedFailureCheck(
      "duplicate_idempotency_rejection",
      `INSERT INTO public.core_rental_idempotency_records (actor_id, actor_role, action, resource_type, idempotency_key, request_hash)
       VALUES ('s5-actor', 'customer', 'booking.create', 'booking', 's5-key', 'hash-two');`,
      /duplicate key value|unique constraint|idx_core_rental_idempotency_actor_action_key|core_rental_idempotency_records_actor_id_action_idempotency_key_key/i,
    ),
    textPassCheck(
      "booking_seed",
      `INSERT INTO public.bookings (id, asset_id, customer_id, supplier_id, status, payment_status, start_at, end_at, total_amount, tenant_id, currency, subtotal, deposit_amount, idempotency_key, created_at, updated_at)
       VALUES ('s5-booking-a', 's5-asset-a', 's5-customer-a', 's5-supplier-a', 'pending', 'unpaid', '2026-01-01T10:00:00Z', '2026-01-02T10:00:00Z', 125, '11111111-1111-1111-1111-111111111111', 'JMD', 100, 25, 's5-booking-key-a', NOW()::text, NOW()::text);
       SELECT 'PASS:booking_seed';`,
    ),
    expectedFailureCheck(
      "overlapping_booking_rejection",
      `INSERT INTO public.bookings (id, asset_id, customer_id, supplier_id, status, payment_status, start_at, end_at, total_amount, tenant_id, currency, subtotal, deposit_amount, idempotency_key, created_at, updated_at)
       VALUES ('s5-booking-overlap', 's5-asset-a', 's5-customer-b', 's5-supplier-a', 'pending', 'unpaid', '2026-01-01T12:00:00Z', '2026-01-02T12:00:00Z', 125, '11111111-1111-1111-1111-111111111111', 'JMD', 100, 25, 's5-booking-key-b', NOW()::text, NOW()::text);`,
      /conflicting key value|exclusion constraint|bookings_no_core_rental_blocking_overlap/i,
    ),
    textPassCheck(
      "deterministic_cleanup",
      `DELETE FROM public.core_rental_idempotency_records WHERE actor_id LIKE 's5-%';
       DELETE FROM public.bookings WHERE id LIKE 's5-%';
       DELETE FROM public.assets WHERE id LIKE 's5-%';
       SELECT CASE WHEN
         (SELECT COUNT(*) FROM public.assets WHERE id LIKE 's5-%') = 0
         AND (SELECT COUNT(*) FROM public.bookings WHERE id LIKE 's5-%') = 0
         AND (SELECT COUNT(*) FROM public.core_rental_idempotency_records WHERE actor_id LIKE 's5-%') = 0
       THEN 'PASS:deterministic_cleanup' ELSE 'FAIL:deterministic_cleanup' END;`,
    ),
  ];
}

function evaluateRuntimeCheck(check, result) {
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (check.expectFailure) {
    const matched = result.exitCode !== 0 && check.expectedErrorPattern.test(output);
    return {
      id: check.id,
      exitCode: result.exitCode,
      passed: matched,
      expectedFailure: true,
      stderr: result.stderr.slice(0, 2000),
    };
  }
  const matched = result.exitCode === 0 && (!check.expectStdout || result.stdout.includes(check.expectStdout));
  return {
    id: check.id,
    exitCode: result.exitCode,
    passed: matched,
    expectedStdout: check.expectStdout,
    stdout: result.stdout.slice(0, 2000),
    stderr: result.stderr.slice(0, 2000),
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
  const setup = runPsql(
    databaseUrl,
    `CREATE EXTENSION IF NOT EXISTS pgcrypto;
     CREATE EXTENSION IF NOT EXISTS btree_gist;
     DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
     END $$;`,
  );
  if (setup.exitCode !== 0) return failureResult("setup", "Failed to prepare required extension.", { environment, stderr: setup.stderr });

  const migrationResults = [];
  for (const migration of migrations.selected) {
    const result = runPsql(databaseUrl, migration.sql);
    migrationResults.push({ file: migration.file, exitCode: result.exitCode, stderr: result.stderr.slice(0, 2000) });
    if (result.exitCode !== 0) {
      return failureResult("migration_execution", `Migration failed: ${migration.file}`, { environment, migrationResults });
    }
  }

  const grants = runPsql(
    databaseUrl,
    `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
     GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
     GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;`,
  );
  if (grants.exitCode !== 0) return failureResult("role_grants", "Failed to prepare disposable role grants.", { environment, stderr: grants.stderr });

  const checks = buildS5S3BRuntimeChecks();
  const checkResults = [];
  for (const check of checks) {
    const result = runPsql(databaseUrl, check.sql);
    const evaluated = evaluateRuntimeCheck(check, result);
    checkResults.push(evaluated);
    if (!evaluated.passed) return failureResult("runtime_check", `Runtime check failed: ${check.id}`, { environment, migrationResults, checkResults });
  }
  return {
    status: PASS,
    environment,
    migrations: { status: migrations.status, orderedFiles: migrations.orderedFiles, checksums: migrations.checksums },
    migrationResults,
    checkResults,
    runtimeSuite: {
      sprint: "S5-S3B",
      status: "POSTGRES_RUNTIME_SUITE_100_PERCENT_IMPLEMENTED",
      rlsStatus: "RLS_RUNTIME_SUITE_100_PERCENT_IMPLEMENTED",
      checksPlanned: checks.length,
      checksPassed: checkResults.filter((check) => check.passed).length,
    },
    rlsEnforcementClaimed: true,
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
