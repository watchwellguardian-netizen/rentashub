import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { collectAccelP1LocalSupabaseEvidence } from "../../scripts/accel-p1-local-supabase-evidence.mjs";

const requiredMigrations = [
  "001_initial_schema.sql",
  "002_auth_foundation.sql",
  "003_file_storage_foundation.sql",
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
];

test("ACCEL-P1 local Supabase scaffold exists without remote project linkage", async () => {
  assert.equal(existsSync("supabase/config.toml"), true);
  assert.equal(existsSync("supabase/seed.sql"), true);
  const config = readFileSync("supabase/config.toml", "utf8");
  assert.match(config, /project_id\s*=\s*"rentashub-local"/);
  assert.doesNotMatch(config, /project_ref\s*=/);
  assert.doesNotMatch(config, /service[_-]?role|anon[_-]?key|password|access[_-]?token|jwt[_-]?secret/i);

  const result = await collectAccelP1LocalSupabaseEvidence();
  assert.equal(result.status, "PASS");
  assert.equal(result.config.status, "PASS");
  assert.equal(result.productionTouched, false);
  assert.equal(result.liveProviderTouched, false);
});

test("local Supabase migrations mirror canonical server migrations by checksum", async () => {
  const result = await collectAccelP1LocalSupabaseEvidence();
  assert.equal(result.migrationParity.status, "PASS", result.migrationParity.errors.join("; "));
  for (const migration of requiredMigrations) {
    assert.ok(result.migrationParity.requiredMigrations.includes(migration));
    assert.ok(result.migrationParity.checksums[migration], `${migration} checksum should exist`);
  }
  assert.equal(result.migrationParity.serverMigrationCount, result.migrationParity.supabaseMigrationCount);
});

test("ACCEL-P1 local commands reject linked, db-url, push, and deploy operations", async () => {
  const result = await collectAccelP1LocalSupabaseEvidence();
  assert.equal(result.localCommandGuard.status, "PASS");
  assert.equal(result.localCommandGuard.productionTouched, false);
  assert.equal(result.localCommandGuard.linkedProjectTouched, false);
  for (const command of result.localCommandGuard.commands) {
    assert.doesNotMatch(command, /--linked\b|--db-url\b|supabase\s+link\b|supabase\s+db\s+push\b|supabase\s+functions\s+deploy\b/i);
  }
});

test("ACCEL-P1 reports local execution readiness without claiming A4 completion", async () => {
  const result = await collectAccelP1LocalSupabaseEvidence();
  assert.equal(result.batch, "ACCEL-P1-001");
  assert.equal(result.classification, "local_only_supabase_execution_readiness");
  assert.equal(result.credentialRequiredForLiveExecution, true);
  assert.ok(["AVAILABLE", "NOT_AVAILABLE"].includes(result.supabaseCli.status));
  assert.ok(["PASS", "PARTIAL"].includes(result.rlsCoverage.status));
  assert.match(result.rlsCoverage.dataApiGrantNote, /Data API|No Data API/);
});
