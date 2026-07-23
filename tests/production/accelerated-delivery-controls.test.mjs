import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FEATURE_FLAGS, isFeatureEnabled, validateFeatureFlagRegistry } from "../../src/lib/featureFlags.js";

const read = (path) => readFileSync(path, "utf8");

test("accelerated delivery is authorized without bypassing A4-01 or RC-0.6A", () => {
  const programState = read("docs/program-state.md");
  assert.match(programState, /Accelerated Full-Feature Delivery Programme Phase 0/);
  assert.match(programState, /A4-01 remains mandatory but does not freeze provider-independent implementation work/);
  assert.match(programState, /Does not satisfy A4-01/);
  assert.match(programState, /Does not change RC-0\.6A/);
  assert.match(programState, /Production ready: No/);
});

test("Phase 0 programme controls are present", () => {
  for (const path of [
    "docs/program/ACCELERATED_DELIVERY_CONTROL.md",
    "docs/program/ACTIVE_WORKSTREAM_OWNERSHIP_MATRIX.md",
    "docs/program/FEATURE_FLAG_REGISTRY.md",
    "docs/program/MIGRATION_LEDGER.md",
    "docs/program/SHARED_CONTRACT_REGISTRY.md",
    "docs/program/FEATURE_COMPLETION_LEDGER.md",
    "docs/program/RENTASHUB_ACCELERATED_DELIVERY_DASHBOARD.md",
  ]) {
    assert.ok(read(path).length > 100, `${path} should not be empty`);
  }
});

test("A4-01 evidence captures known owners but remains incomplete without staging and production IDs", () => {
  const evidence = read("docs/program/A4_01_INFRASTRUCTURE_OWNERSHIP_CONFIRMATION.md");
  assert.match(evidence, /Richard Kildare/);
  assert.match(evidence, /hnpoqtxyqexykotackev/);
  assert.match(evidence, /UAT\/Staging Project ID \| UNKNOWN/);
  assert.match(evidence, /Production Project ID \| UNKNOWN/);
  assert.match(evidence, /A4-01 does not pass yet/);
  assert.doesNotMatch(evidence, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
  assert.doesNotMatch(evidence, /postgresql:\/\/postgres:/);
});

test("feature flag registry is valid and production-disabled until certified", () => {
  const result = validateFeatureFlagRegistry();
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.ok(FEATURE_FLAGS.length >= 8);
  for (const flag of FEATURE_FLAGS) {
    assert.equal(flag.environments.production, false, `${flag.key} must remain production disabled`);
  }
  assert.equal(isFeatureEnabled("auction_engine_simulation", "development"), true);
  assert.equal(isFeatureEnabled("auction_engine_simulation", "production"), false);
  assert.equal(isFeatureEnabled("external_ai_gateway", "development"), false);
});

test("dashboard is generated from machine-readable status data", () => {
  const source = JSON.parse(read("docs/program/accelerated-delivery-status.json"));
  const dashboard = read("docs/program/RENTASHUB_ACCELERATED_DELIVERY_DASHBOARD.md");
  assert.equal(source.productionReady, false);
  assert.equal(source.providerActivation, false);
  assert.match(dashboard, /Core platform foundation/);
  assert.match(dashboard, /Provider Activation \| No/);
  assert.match(dashboard, /Production Ready \| No/);
});
