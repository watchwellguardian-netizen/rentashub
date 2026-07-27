import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ACCEL_P1_008_MANDATORY_TESTS,
  CORE_RENTAL_AUTH_BRIDGE_CONTRACT,
  CORE_RENTAL_DATABASE_ADAPTER_CONTRACT,
  CORE_RENTAL_PAYMENT_SANDBOX_BRIDGE_CONTRACT,
  CORE_RENTAL_RLS_POLICY_MATRIX,
  CORE_RENTAL_STORAGE_BRIDGE_MANIFEST,
  CORE_RENTAL_STAGING_JOURNEY_TEST_PLAN,
  getCoreRentalProductionBridgeReadiness,
  validateCoreRentalProductionBridge,
} from "../../server/src/services/coreRentalProductionBridge.js";

test("ACCEL-P1-008 production-readiness bridge is provider-ready only", () => {
  const readiness = getCoreRentalProductionBridgeReadiness({});
  assert.equal(readiness.status, "PROVIDER_READY_NOT_ACTIVATED");
  assert.equal(readiness.liveActivation, false);
  assert.equal(readiness.databaseAdapter.liveConnection, false);
  assert.equal(readiness.authBridge.liveSupabaseAuth, false);
  assert.equal(readiness.rlsPolicyStatus.enforcementProven, false);
  assert.equal(readiness.storageBridge.status, "MANIFEST_PREPARED_NOT_ACTIVATED");
  assert.equal(readiness.paymentSandboxBridge.liveMoneyMovement, false);
  assert.equal(readiness.stagingJourney.executedInStaging, false);
  assert.ok(readiness.boundaries.some((boundary) => boundary.includes("No Supabase connection")));
});

test("database and auth bridge contracts cover required production-readiness mappings", () => {
  assert.equal(CORE_RENTAL_DATABASE_ADAPTER_CONTRACT.status, "ADAPTER_PREPARED_NOT_CONNECTED");
  for (const entity of ["supplier_profiles", "assets", "bookings", "payment_ledger", "file_metadata", "audit_logs", "core_rental_idempotency_records"]) {
    assert.ok(CORE_RENTAL_DATABASE_ADAPTER_CONTRACT.entities.includes(entity), `${entity} should be mapped`);
  }
  assert.match(CORE_RENTAL_DATABASE_ADAPTER_CONTRACT.transactionBoundary.rollbackRequirement, /roll back together/);
  assert.match(CORE_RENTAL_DATABASE_ADAPTER_CONTRACT.transactionBoundary.overlapPrevention, /must not overlap/);
  assert.equal(CORE_RENTAL_AUTH_BRIDGE_CONTRACT.status, "CONTRACT_PREPARED_LIVE_AUTH_DISABLED");
  assert.equal(CORE_RENTAL_AUTH_BRIDGE_CONTRACT.developmentHeadersAllowed, false);
  assert.ok(CORE_RENTAL_AUTH_BRIDGE_CONTRACT.requiredSessionChecks.includes("session revocation"));
});

test("RLS policy matrix prepares ownership tenant and admin controls without claiming enforcement", () => {
  const tables = new Set(CORE_RENTAL_RLS_POLICY_MATRIX.map((row) => row.table));
  for (const table of ["assets", "bookings", "payment_ledger", "file_metadata", "audit_logs", "notifications"]) {
    assert.ok(tables.has(table), `${table} should be present`);
  }
  assert.ok(CORE_RENTAL_RLS_POLICY_MATRIX.every((row) => row.roles.includes("admin") || row.table === "audit_logs"));
  assert.ok(CORE_RENTAL_RLS_POLICY_MATRIX.some((row) => row.table === "bookings" && row.supplierColumn === "supplier_id"));
});

test("storage bridge manifest covers rental object classes and private access expectations", () => {
  const useCases = new Set(CORE_RENTAL_STORAGE_BRIDGE_MANIFEST.map((item) => item.useCase));
  for (const useCase of ["listing_images", "asset_documents", "contracts", "check_in_evidence", "check_out_evidence", "dispute_evidence"]) {
    assert.ok(useCases.has(useCase), `${useCase} should be present`);
  }
  const privateItems = CORE_RENTAL_STORAGE_BRIDGE_MANIFEST.filter((item) => item.visibility.includes("private"));
  assert.ok(privateItems.every((item) => item.signedDownload === true));
  assert.ok(CORE_RENTAL_STORAGE_BRIDGE_MANIFEST.every((item) => item.malwareScanRequired === true));
});

test("payment sandbox bridge and staging journey cover required scenarios without live money movement", () => {
  assert.equal(CORE_RENTAL_PAYMENT_SANDBOX_BRIDGE_CONTRACT.status, "CONTRACT_PREPARED_PROVIDER_DISABLED");
  assert.equal(CORE_RENTAL_PAYMENT_SANDBOX_BRIDGE_CONTRACT.liveMoneyMovement, false);
  for (const operation of ["payment intent creation", "signed webhook verification", "refund contract", "ledger event contract"]) {
    assert.ok(CORE_RENTAL_PAYMENT_SANDBOX_BRIDGE_CONTRACT.requiredOperations.includes(operation));
  }
  assert.deepEqual(CORE_RENTAL_STAGING_JOURNEY_TEST_PLAN, [
    "supplier authentication",
    "supplier listing creation",
    "customer authentication",
    "booking request",
    "supplier acceptance",
    "sandbox payment",
    "contract generation",
    "check-in",
    "check-out",
    "settlement preparation",
    "review",
    "audit verification",
  ]);
});

test("mandatory ACCEL-P1-008 test coverage list includes requested bridge scenarios", () => {
  for (const required of [
    "database transaction rollback",
    "duplicate idempotency key",
    "overlapping accepted bookings",
    "concurrent supplier acceptance",
    "stale-version update",
    "customer tenant isolation",
    "supplier tenant isolation",
    "admin permission enforcement",
    "unauthorized storage access",
    "signed URL expiry",
    "duplicate payment webhook",
    "failed payment",
    "refund limit",
    "settlement before check-out",
    "payout before reconciliation",
    "feature-flag rollback to provider-independent path",
  ]) {
    assert.ok(ACCEL_P1_008_MANDATORY_TESTS.includes(required), `${required} should be listed`);
  }
  assert.equal(validateCoreRentalProductionBridge().status, "PASS");
});

test("migration 008 is mirrored and prepares SQL policies without production execution claims", () => {
  const serverSql = readFileSync("server/migrations/008_core_rental_production_readiness_bridge.sql", "utf8");
  const supabaseSql = readFileSync("supabase/migrations/008_core_rental_production_readiness_bridge.sql", "utf8");
  assert.equal(serverSql, supabaseSql);
  for (const needle of [
    "core_rental_idempotency_records",
    "core_rental_payment_events",
    "core_rental_storage_requirements",
    "ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id",
    "ENABLE ROW LEVEL SECURITY",
    "CREATE POLICY core_bookings_party_admin_select",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_customer_idempotency",
  ]) {
    assert.match(serverSql, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(serverSql, /Prepared SQL only/);
  assert.doesNotMatch(serverSql, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
});
