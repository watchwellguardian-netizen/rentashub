import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getCredentialReadinessSummary, getRevenueActivationReadiness } from "../../src/lib/credentialReadiness.js";

const root = process.cwd();

const docs = [
  "docs/project-e-revenue-activation-architecture.md",
  "docs/payment-architecture-readiness.md",
  "docs/escrow-architecture-readiness.md",
  "docs/revenue-gap-report.md",
  "docs/revenue-remediation-roadmap.md",
];

test("Project E1 revenue activation docs exist and preserve provider-ready boundary", () => {
  for (const doc of docs) {
    assert.equal(existsSync(join(root, doc)), true, `${doc} should exist`);
    const content = readFileSync(join(root, doc), "utf8");
    assert.match(content, /provider-ready|Provider-ready|readiness/i);
    assert.doesNotMatch(content, /production ready|live payments are active|real escrow is active/i);
  }
  const overview = readFileSync(join(root, "docs/project-e-revenue-activation-architecture.md"), "utf8");
  assert.match(overview, /Marketplace fee/i);
  assert.match(overview, /Commission/i);
  assert.match(overview, /Tax\/GCT/i);
  assert.match(overview, /No live/i);
});

test("frontend revenue readiness defaults to no live money movement", () => {
  const readiness = getRevenueActivationReadiness({});
  assert.equal(readiness.status, "revenue_activation_inputs_missing");
  assert.equal(readiness.score, 0);
  assert.equal(readiness.liveMoneyMovementActive, false);
  assert.equal(readiness.realSettlementActive, false);
  assert.equal(readiness.realEscrowAccountActive, false);
  assert.equal(readiness.missing.includes("MARKETPLACE_FEE_POLICY_URL"), true);
  assert.equal(readiness.paymentLifecycleStates.includes("intent_created"), true);
  assert.equal(readiness.escrowLedgerStates.includes("partially_released"), true);
});

test("credential summary includes revenue activation readiness", () => {
  const summary = getCredentialReadinessSummary();
  assert.equal(Array.isArray(summary.revenueActivationReadiness), true);
  assert.equal(summary.revenueActivationReadiness.some((item) => item.id === "tax_gct"), true);
  assert.equal(summary.revenueActivationReadiness.some((item) => item.id === "no_live_money" && item.status === "enforced"), true);
  assert.equal(summary.revenueActivation.liveMoneyMovementActive, false);
  assert.equal(summary.workstreams.some((item) => item.id === "revenue_activation"), true);
});

test("admin revenue route and panel are wired", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const adminCenter = readFileSync(join(root, "src/pages/AdminCenter.jsx"), "utf8");
  const adminLib = readFileSync(join(root, "src/lib/adminCenter.js"), "utf8");
  assert.match(app, /path="\/admin\/revenue"/);
  assert.match(app, /<AdminRevenue \/>/);
  assert.match(adminLib, /\/admin\/revenue/);
  for (const text of [
    "Revenue activation readiness",
    "Payment architecture",
    "Escrow architecture",
    "Financial controls",
    "Tax/GCT readiness",
    "Payout readiness",
    "Real money movement",
    "Real settlements",
  ]) {
    assert.match(adminCenter, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("server env template includes Project E1 revenue gates", () => {
  const envExample = readFileSync(join(root, "server/.env.example"), "utf8");
  for (const key of [
    "REVENUE_ACTIVATION_MODE=readiness_only",
    "REVENUE_OWNER_NAME=",
    "MARKETPLACE_FEE_POLICY_URL=",
    "COMMISSION_POLICY_URL=",
    "PAYMENT_LIFECYCLE_POLICY_URL=",
    "REFUND_LIFECYCLE_POLICY_URL=",
    "DEPOSIT_LIFECYCLE_POLICY_URL=",
    "ESCROW_LEDGER_POLICY_URL=",
    "SETTLEMENT_WORKFLOW_POLICY_URL=",
    "RECONCILIATION_OWNER=",
    "FINANCIAL_REPORTING_OWNER=",
    "TAX_GCT_POLICY_URL=",
    "PAYOUT_POLICY_URL=",
    "TRANSACTION_AUDIT_POLICY_URL=",
  ]) {
    assert.match(envExample, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
