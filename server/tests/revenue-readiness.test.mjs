import assert from "node:assert/strict";
import { test } from "node:test";
import { getIntegrationReadiness } from "../src/config/integrationReadiness.js";
import { DEPOSIT_LIFECYCLE_STATES, ESCROW_LEDGER_STATES, PAYMENT_LIFECYCLE_STATES, REVENUE_REQUIRED_KEYS, SETTLEMENT_WORKFLOW_STEPS, getRevenueReadiness } from "../src/revenue/revenueReadiness.js";

const completeEnv = Object.fromEntries(REVENUE_REQUIRED_KEYS.map((key) => [key, `${key.toLowerCase()}-configured`]));

test("revenue readiness reports missing activation inputs by default", () => {
  const readiness = getRevenueReadiness({});
  assert.equal(readiness.ready, false);
  assert.equal(readiness.status, "revenue_activation_inputs_missing");
  assert.equal(readiness.score, 0);
  assert.equal(readiness.missing.includes("REVENUE_OWNER_NAME"), true);
  assert.equal(readiness.realMoneyMovementActive, false);
  assert.equal(readiness.realSettlementActive, false);
  assert.equal(readiness.realEscrowAccountActive, false);
  assert.equal(readiness.productionSuitable, false);
});

test("revenue readiness defines lifecycle, escrow, settlement, and domain architecture", () => {
  const readiness = getRevenueReadiness(completeEnv);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.status, "ready_for_sandbox_revenue_review");
  assert.equal(readiness.score, 100);
  assert.deepEqual(readiness.paymentLifecycleStates, PAYMENT_LIFECYCLE_STATES);
  assert.deepEqual(readiness.depositLifecycleStates, DEPOSIT_LIFECYCLE_STATES);
  assert.deepEqual(readiness.escrowLedgerStates, ESCROW_LEDGER_STATES);
  assert.deepEqual(readiness.settlementWorkflowSteps, SETTLEMENT_WORKFLOW_STEPS);
  assert.equal(readiness.domains.every((domain) => domain.ready), true);
  assert.equal(readiness.stripeActive, false);
  assert.equal(readiness.paypalActive, false);
  assert.equal(readiness.wipayActive, false);
  assert.equal(readiness.fygaroActive, false);
  assert.equal(readiness.ncbGatewayActive, false);
});

test("revenue readiness rejects placeholder values", () => {
  const readiness = getRevenueReadiness({
    ...completeEnv,
    REVENUE_OWNER_NAME: "placeholder",
    TAX_GCT_POLICY_URL: "todo",
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.missing.includes("REVENUE_OWNER_NAME"), true);
  assert.equal(readiness.missing.includes("TAX_GCT_POLICY_URL"), true);
});

test("integration readiness exposes revenue activation workstream", () => {
  const readiness = getIntegrationReadiness({});
  assert.equal(readiness.checks.revenue.kind, "revenueActivation");
  assert.equal(readiness.checks.revenue.ready, false);
  assert.equal(readiness.workstreams.revenueActivation.status, "manual_provider_required");
  assert.match(readiness.workstreams.revenueActivation.note, /Marketplace fees|Tax\/GCT|payout/);
});
