import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  collectPg005Harness,
  getMigrationExecutionPlan,
  getPostgresHarnessEnvironment,
  validatePostgresHarnessUrl,
} from "../../scripts/accel-micro-pg-005-postgres-harness.mjs";

test("PG-005 validates disposable local PostgreSQL URLs without printing secret values", () => {
  const url = "postgresql://postgres:super-secret-password@localhost:5432/rentashub_pg005_test";
  const validation = validatePostgresHarnessUrl(url, {});
  assert.equal(validation.valid, true);
  assert.equal(validation.safeForExecution, true);
  assert.equal(validation.code, "valid_disposable_local_url");
  assert.equal(validation.databaseName, "rentashub_pg005_test");
  assert.doesNotMatch(JSON.stringify(validation), /super-secret-password/);
  assert.match(validation.sanitizedUrl, /REDACTED/);
});

test("PG-005 blocks remote Supabase and unconfirmed non-disposable URLs", () => {
  const remote = validatePostgresHarnessUrl("postgresql://postgres:secret@db.example.supabase.co:5432/postgres", {});
  assert.equal(remote.safeForExecution, false);
  assert.equal(remote.code, "remote_supabase_host_blocked");
  assert.doesNotMatch(JSON.stringify(remote), /secret/);

  const localButNotDisposable = validatePostgresHarnessUrl("postgresql://postgres:secret@localhost:5432/rentashub", {});
  assert.equal(localButNotDisposable.valid, true);
  assert.equal(localButNotDisposable.safeForExecution, false);
  assert.equal(localButNotDisposable.code, "not_confirmed_disposable_local_url");
});

test("PG-005 environment detection returns machine-readable blocked status without executable disposable PostgreSQL", () => {
  const environment = getPostgresHarnessEnvironment({});
  assert.ok(["BLOCKED_NO_EXECUTABLE_POSTGRES", "EXECUTABLE_POSTGRES_AVAILABLE"].includes(environment.status));
  assert.equal(environment.productionBlocked, true);
  assert.equal(environment.liveSupabaseBlocked, true);
  assert.equal(environment.databaseUrl.safeForExecution, false);
  assert.doesNotMatch(JSON.stringify(environment), /SUPABASE_SERVICE_ROLE_KEY|postgresql:\/\/postgres:[^R]/);
});

test("PG-005 migration plan includes ordered migrations 001 through 009", async () => {
  const plan = await getMigrationExecutionPlan();
  assert.equal(plan.status, "READY");
  assert.deepEqual(plan.orderedFiles.slice(0, 9), [
    "001_initial_schema.sql",
    "002_auth_foundation.sql",
    "003_file_storage_foundation.sql",
    "004_supabase_activation_architecture.sql",
    "005_supabase_auth_rbac_activation.sql",
    "006_supabase_storage_activation.sql",
    "007_audit_logging_activation.sql",
    "008_core_rental_production_readiness_bridge.sql",
    "009_core_rental_postgres_repository_adapter.sql",
  ]);
  assert.equal(Object.keys(plan.checksums).length, 9);
});

test("PG-005 detect command reports BLOCKED until disposable PostgreSQL execution is available", async () => {
  const result = await collectPg005Harness("detect", {});
  assert.ok(["BLOCKED_NO_EXECUTABLE_POSTGRES", "READY_TO_RUN_POSTGRES_EXECUTION"].includes(result.status));
  assert.equal(result.productionTouched, false);
  assert.equal(result.liveSupabaseTouched, false);
  assert.deepEqual(result.requiredStatusBehavior, {
    blocked: "BLOCKED_NO_EXECUTABLE_POSTGRES",
    fail: "FAIL_POSTGRES_EXECUTION",
    pass: "PASS_POSTGRES_EXECUTION",
  });
});

test("PG-005 script contains required runtime checks and no production activation commands", () => {
  const source = readFileSync("scripts/accel-micro-pg-005-postgres-harness.mjs", "utf8");
  for (const required of [
    "schema_constraint_introspection",
    "repository_smoke_insert",
    "idempotency_uniqueness",
    "transaction_rollback",
    "cleanup",
    "PASS_POSTGRES_EXECUTION",
    "FAIL_POSTGRES_EXECUTION",
    "BLOCKED_NO_EXECUTABLE_POSTGRES",
  ]) {
    assert.match(source, new RegExp(required));
  }
  assert.doesNotMatch(source, /supabase\s+link|supabase\s+db\s+push|SUPABASE_SERVICE_ROLE_KEY\s*=|DATABASE_URL\s*=/i);
});
