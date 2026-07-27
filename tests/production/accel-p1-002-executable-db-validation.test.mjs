import assert from "node:assert/strict";
import { test } from "node:test";
import { collectAccelP1002ExecutableDbValidation } from "../../scripts/accel-p1-executable-db-validation.mjs";

test("ACCEL-P1-002 validation reports executable environment status without remote provider use", async () => {
  const result = await collectAccelP1002ExecutableDbValidation();
  assert.equal(result.batch, "ACCEL-P1-002");
  assert.equal(result.liveProviderTouched, false);
  assert.equal(result.productionTouched, false);
  assert.equal(result.remoteProjectLinked, false);
  assert.ok(["READY_TO_RUN_LOCAL_EXECUTION", "BLOCKED_NO_EXECUTABLE_POSTGRES"].includes(result.status));
});

test("ACCEL-P1-002 command plan contains only local-safe commands", async () => {
  const result = await collectAccelP1002ExecutableDbValidation();
  assert.equal(result.commandPlan.status, "PASS");
  assert.equal(result.commandPlan.remoteProviderBlocked, true);
  assert.equal(result.commandPlan.productionBlocked, true);
  for (const { command } of result.commandPlan.commands) {
    assert.doesNotMatch(command, /--linked\b|--db-url\b|supabase\s+link\b|supabase\s+db\s+push\b|postgresql:\/\//i);
  }
});

test("ACCEL-P1-002 migration set is ready for a real local engine", async () => {
  const result = await collectAccelP1002ExecutableDbValidation();
  assert.equal(result.migrations.status, "READY_FOR_EXECUTION_ENVIRONMENT");
  assert.equal(result.migrations.missing.length, 0);
  assert.equal(result.migrations.orderValid, true);
  for (const migration of result.migrations.requiredMigrations) {
    assert.ok(result.migrations.checksums[migration], `${migration} checksum should be present`);
  }
});

test("ACCEL-P1-002 remains honest about static RLS versus enforced RLS", async () => {
  const result = await collectAccelP1002ExecutableDbValidation();
  assert.ok(["STATIC_READY", "STATIC_PARTIAL"].includes(result.rls.status));
  assert.equal(result.rls.executed, false);
  assert.equal(result.rls.rlsEnforced, false);
  assert.ok(result.rls.rlsTables.includes("auth_session_events"));
});

test("ACCEL-P1-002 requires manual executable database evidence before PASS", async () => {
  const result = await collectAccelP1002ExecutableDbValidation();
  assert.ok(result.evidence.requiredBeforePass.includes("Migrations 001-008 executed against real PostgreSQL"));
  assert.ok(result.evidence.requiredBeforePass.includes("RLS policy execution proof"));
  if (result.status === "BLOCKED_NO_EXECUTABLE_POSTGRES") {
    assert.match(result.evidence.blockedReason, /No Supabase CLI, Docker, or psql executable/);
  }
});
