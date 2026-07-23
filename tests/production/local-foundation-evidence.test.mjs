import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { collectLocalFoundationEvidence } from "../../scripts/local-foundation-evidence.mjs";
import { AUDIT_EVENT_CATEGORIES } from "../../server/src/audit/auditEventModel.js";
import { validateRentalContracts } from "../../src/lib/rentalJourneyContracts.js";
import { validateStorageBucketDefinitions } from "../../src/lib/storageBuckets.js";
import { runStaticPolicyScenarioMatrix, STATIC_POLICY_VALIDATION_STATUS } from "../../src/lib/rbacRlsPolicyContracts.js";

test("local foundation evidence runs migration reset in memory without provider activation", async () => {
  const result = await collectLocalFoundationEvidence();
  assert.equal(result.status, "PASS");
  assert.equal(result.reset.provider, "json");
  assert.equal(result.reset.filePath, ":memory:");
  assert.equal(result.reset.liveProviderTouched, false);
  assert.equal(result.reset.productionTouched, false);
  assert.equal(result.reset.migrationsApplied.length, 7);
  assert.ok(result.reset.seedRecordCount >= 10);
});

test("migration ledger covers required migrations and keeps production activation out of scope", async () => {
  const result = await collectLocalFoundationEvidence();
  for (const migration of [
    "001_initial_schema.sql",
    "002_auth_foundation.sql",
    "003_file_storage_foundation.sql",
    "004_supabase_activation_architecture.sql",
    "005_supabase_auth_rbac_activation.sql",
    "006_supabase_storage_activation.sql",
    "007_audit_logging_activation.sql",
  ]) {
    assert.ok(result.migrationOrder.names.includes(migration), `${migration} should be present`);
  }
  const ledger = readFileSync("docs/program/MIGRATION_LEDGER.md", "utf8");
  assert.match(ledger, /Do not run Production migrations until UAT signoff/);
});

test("RLS static coverage is present but not treated as live enforcement proof", async () => {
  const result = await collectLocalFoundationEvidence();
  assert.ok(result.rlsCoverage.rlsTables.includes("auth_session_events"));
  assert.ok(result.rlsCoverage.policyTables.includes("auth_session_events"));
  assert.notEqual(result.rlsCoverage.status, "FAIL");
});

test("storage bucket definitions enforce private signed URL requirements", () => {
  const result = validateStorageBucketDefinitions();
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.ok(result.bucketCount >= 8);
});

test("core rental API contracts require permissions and audit events", () => {
  const result = validateRentalContracts();
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.ok(result.contractCount >= 18);
});

test("core rental audit events are registered once for downstream journeys", () => {
  const events = Object.values(AUDIT_EVENT_CATEGORIES).flat();
  for (const event of ["bookings.requested", "bookings.status_changed", "payments.intent_created"]) {
    assert.ok(events.includes(event), `${event} should be registered`);
  }
});

test("RBAC and RLS scenarios are static-policy validated, not labelled enforced", () => {
  const matrix = runStaticPolicyScenarioMatrix();
  assert.equal(matrix.passed, true);
  assert.equal(matrix.validationStatus, STATIC_POLICY_VALIDATION_STATUS);
  assert.equal(matrix.rlsEnforced, false);
  for (const expectedId of [
    "unauthenticated_access_rejection",
    "customer_access_owned_record",
    "customer_denial_other_customer",
    "supplier_access_owned_listing",
    "supplier_denial_other_supplier",
    "organization_isolation",
    "admin_access_by_explicit_permission",
    "role_without_required_permission_denied",
    "inactive_user_denied",
  ]) {
    assert.ok(matrix.results.find((result) => result.id === expectedId && result.passed), `${expectedId} should pass`);
  }
});
