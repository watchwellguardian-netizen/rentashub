import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MOCK_WEBHOOK_PAYLOADS,
  PAYMENT_PROVIDER_CREDENTIAL_KEYS,
  SANDBOX_READINESS_CHECKLISTS,
  TAX_GCT_CONFIGURATION_MATRIX,
  buildPayoutReadinessChecklist,
  buildRevenueLaunchBlockerReport,
  buildRevenueReadinessToolingReport,
  buildSandboxReadinessChecklist,
  buildTaxGctConfigurationMatrix,
  renderChargebackEvidenceChecklist,
  renderPaymentProviderEvidenceIntakeTemplate,
  renderPayoutEvidenceChecklist,
  renderRefundEvidenceChecklist,
  renderRevenueEvidencePackageTemplate,
  renderRevenueLaunchBlockerReport,
  renderSandboxReadinessChecklist,
  renderSettlementEvidenceChecklist,
  renderTaxGctReadinessChecklist,
  renderTaxGctConfigurationMatrix,
  renderWebhookVerificationEvidenceTemplate,
  runWebhookReadinessTests,
  validateMockWebhookPayload,
  validatePaymentProviderCredentials,
  validateRefundChargebackPlaceholderWorkflow,
  validateSimulatedPayoutHarness,
} from "../../scripts/revenue-readiness-tooling.mjs";

const shapedStripeEnv = {
  PAYMENT_PROVIDER: "stripe",
  PAYMENT_MODE: "sandbox",
  PAYMENT_PUBLIC_KEY: "pk_test_readiness",
  PAYMENT_SECRET_KEY: "sk_test_readiness",
  STRIPE_WEBHOOK_SECRET: "whsec_test_readiness",
  PAYMENT_WEBHOOK_URL: "https://api.rentashub.test/api/payments/webhook",
  PAYMENT_SANDBOX_ENABLED: "true",
  MERCHANT_ONBOARDING_MODE: "connect_sandbox",
  PAYMENT_OPERATIONS_OWNER: "payments@rentashub.test",
  PAYMENT_COMPLIANCE_OWNER: "compliance@rentashub.test",
  SETTLEMENT_CURRENCY: "JMD",
  REFUND_MODE: "sandbox_manual_review",
  CHARGEBACK_CONTACT_EMAIL: "chargebacks@rentashub.test",
  PAYOUT_MODE: "sandbox",
  PAYOUT_POLICY_URL: "https://revenue.rentashub.test/payout-policy",
  RECONCILIATION_OWNER: "reconciliation@rentashub.test",
  FINANCIAL_REPORTING_OWNER: "finance@rentashub.test",
  TAX_GCT_POLICY_URL: "https://revenue.rentashub.test/tax-gct",
  REVENUE_OWNER_NAME: "Revenue Owner",
  REVENUE_OWNER_EMAIL: "revenue@rentashub.test",
  MARKETPLACE_FEE_POLICY_URL: "https://revenue.rentashub.test/marketplace-fees",
  COMMISSION_POLICY_URL: "https://revenue.rentashub.test/commission",
  PAYMENT_LIFECYCLE_POLICY_URL: "https://revenue.rentashub.test/payment-lifecycle",
  REFUND_LIFECYCLE_POLICY_URL: "https://revenue.rentashub.test/refund-lifecycle",
  DEPOSIT_LIFECYCLE_POLICY_URL: "https://revenue.rentashub.test/deposit-lifecycle",
  ESCROW_LEDGER_POLICY_URL: "https://revenue.rentashub.test/escrow-ledger",
  ESCROW_STATE_MACHINE_POLICY_URL: "https://revenue.rentashub.test/escrow-state-machine",
  SETTLEMENT_WORKFLOW_POLICY_URL: "https://revenue.rentashub.test/settlement",
  TRANSACTION_AUDIT_POLICY_URL: "https://revenue.rentashub.test/transaction-audit",
};

const shapedWipayEnv = {
  ...shapedStripeEnv,
  PAYMENT_PROVIDER: "wipay",
  WIPAY_WEBHOOK_SECRET: "wipay_webhook_test_readiness",
};
delete shapedWipayEnv.STRIPE_WEBHOOK_SECRET;

function assertCredentialSafe(markdown) {
  assert.doesNotMatch(markdown, /PAYMENT_SECRET_KEY\s*=/i);
  assert.doesNotMatch(markdown, /STRIPE_WEBHOOK_SECRET\s*=/i);
  assert.doesNotMatch(markdown, /WIPAY_WEBHOOK_SECRET\s*=/i);
  assert.doesNotMatch(markdown, /SUPABASE_SERVICE_ROLE_KEY\s*=/i);
  assert.doesNotMatch(markdown, /sk_live_/i);
  assert.doesNotMatch(markdown, /postgresql:\/\//i);
}

test("payment provider credential validator supports Stripe and rejects missing placeholders", () => {
  assert.deepEqual(PAYMENT_PROVIDER_CREDENTIAL_KEYS.stripe.includes("STRIPE_WEBHOOK_SECRET"), true);
  const missing = validatePaymentProviderCredentials({});
  assert.equal(missing.status, "NEEDS_CREDENTIALS");
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /PAYMENT_PROVIDER/.test(blocker)));

  const shaped = validatePaymentProviderCredentials(shapedStripeEnv);
  assert.equal(shaped.status, "CREDENTIAL_READY_FOR_SANDBOX");
  assert.equal(shaped.provider, "stripe");
  assert.equal(shaped.valuePrinted, false);
  assert.equal(shaped.blockers.length, 0);
});

test("Stripe and WiPay sandbox readiness checklists remain evidence pending and provider-safe", () => {
  assert.ok(SANDBOX_READINESS_CHECKLISTS.stripe.some((item) => /Connect/.test(item)));
  assert.ok(SANDBOX_READINESS_CHECKLISTS.wipay.some((item) => /JMD/.test(item)));
  const stripe = buildSandboxReadinessChecklist("stripe", shapedStripeEnv);
  const wipay = buildSandboxReadinessChecklist("wipay", shapedWipayEnv);
  assert.equal(stripe.status, "READY_FOR_SANDBOX_EVIDENCE");
  assert.equal(wipay.status, "READY_FOR_SANDBOX_EVIDENCE");
  assert.equal(stripe.livePaymentsActive, false);
  assert.equal(wipay.livePaymentsActive, false);
  assert.ok(stripe.rows.every((row) => row.status === "pending_evidence"));
});

test("webhook readiness tests validate mock Stripe and WiPay payloads without live signatures", () => {
  assert.equal(MOCK_WEBHOOK_PAYLOADS.length, 4);
  const result = runWebhookReadinessTests();
  assert.equal(result.status, "PASS");
  assert.equal(result.liveWebhookActive, false);
  assert.equal(result.signatureVerificationRequiresProviderSecret, true);
  assert.ok(result.results.some((item) => item.eventType === "charge.dispute.created"));
  const invalid = validateMockWebhookPayload({ id: "evt_missing" }, "stripe");
  assert.equal(invalid.status, "FAIL");
});

test("refund and chargeback placeholder workflow validates no live money movement", () => {
  const result = validateRefundChargebackPlaceholderWorkflow();
  assert.equal(result.status, "PASS");
  assert.equal(result.paymentCreated, true);
  assert.equal(result.refundPlaceholder.liveRefundProcessed, false);
  assert.equal(result.chargebackPlaceholder.liveChargebackProcessed, false);
  assert.equal(result.liveMoneyMovementActive, false);
  assert.equal(result.paymentSummary.platformFee, 5000);
});

test("payout readiness checklist validates policy inputs and simulated payout harness", () => {
  const missing = buildPayoutReadinessChecklist({});
  assert.equal(missing.status, "NEEDS_CREDENTIALS_OR_POLICY");
  assert.ok(missing.blockers.some((blocker) => /PAYOUT_MODE/.test(blocker)));
  assert.equal(missing.livePayoutActive, false);

  const shaped = buildPayoutReadinessChecklist(shapedStripeEnv);
  assert.equal(shaped.status, "READY_FOR_PAYOUT_SANDBOX_REVIEW");
  assert.equal(shaped.simulatedPayoutHarness.status, "PASS");
  assert.equal(shaped.livePayoutActive, false);

  const harness = validateSimulatedPayoutHarness();
  assert.equal(harness.status, "PASS");
  assert.equal(harness.liveBankTransferActive, false);
});

test("Tax/GCT configuration matrix covers platform fees deposits auctions and referrals", () => {
  const names = TAX_GCT_CONFIGURATION_MATRIX.map((row) => row.item);
  for (const item of ["platform_service_fee", "security_deposit", "auction_buyer_fee", "financing_referral_fee"]) {
    assert.ok(names.includes(item));
  }
  const missing = buildTaxGctConfigurationMatrix({});
  assert.equal(missing.status, "NEEDS_TAX_POLICY");
  assert.equal(missing.taxAdvisorApprovalRequired, true);
  assert.equal(missing.liveTaxFilingActive, false);
  const shaped = buildTaxGctConfigurationMatrix(shapedStripeEnv);
  assert.equal(shaped.status, "READY_FOR_TAX_REVIEW");
  const markdown = renderTaxGctConfigurationMatrix();
  assert.match(markdown, /Tax\/GCT Configuration Matrix/);
  assert.match(markdown, /platform_service_fee/);
});

test("revenue evidence package template is credential-safe", () => {
  const template = renderRevenueEvidencePackageTemplate();
  assert.match(template, /Revenue Evidence Package Template/);
  assert.match(template, /Webhook Evidence/);
  assert.match(template, /Refund \/ Chargeback Evidence/);
  assert.match(template, /Tax\/GCT Evidence/);
  for (const label of ["PAYMENT_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "WIPAY_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]) {
    assert.doesNotMatch(template, new RegExp(`${label}\\s*=`, "i"));
  }
});

test("revenue readiness report is provider-ready and blocks missing manual inputs", () => {
  const missing = buildRevenueReadinessToolingReport({ env: {} });
  assert.equal(missing.status, "NEEDS_CREDENTIALS_OR_POLICY");
  assert.equal(missing.realMoneyMovementActive, false);
  assert.equal(missing.livePaymentsActive, false);
  assert.equal(missing.liveEscrowActive, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /PAYMENT_PROVIDER/.test(blocker)));

  const shaped = buildRevenueReadinessToolingReport({ env: shapedStripeEnv });
  assert.equal(shaped.status, "CREDENTIAL_READY_FOR_SANDBOX_REVIEW");
  assert.equal(shaped.provider, "stripe");
  assert.equal(shaped.realMoneyMovementActive, false);
  assert.equal(shaped.livePaymentsActive, false);
  assert.equal(shaped.liveEscrowActive, false);
});

test("payment provider evidence intake template is credential-safe", () => {
  const markdown = renderPaymentProviderEvidenceIntakeTemplate();
  assert.match(markdown, /Payment Provider Evidence Intake Template/);
  assert.match(markdown, /Secret key stored in backend-only secret manager/);
  assert.match(markdown, /Sandbox mode confirmed/);
  assertCredentialSafe(markdown);
});

test("Stripe and WiPay sandbox checklist renderers preserve no-live-payment boundary", () => {
  const stripe = renderSandboxReadinessChecklist("stripe", shapedStripeEnv);
  const wipay = renderSandboxReadinessChecklist("wipay", shapedWipayEnv);
  assert.match(stripe, /Stripe Sandbox Readiness Checklist/);
  assert.match(stripe, /Live Payments Active: NO/);
  assert.match(stripe, /Webhook endpoint registered/);
  assert.match(wipay, /WiPay Sandbox Readiness Checklist/);
  assert.match(wipay, /JMD settlement flow reviewed/);
  assertCredentialSafe(stripe);
  assertCredentialSafe(wipay);
});

test("webhook verification evidence template covers provider events without secrets", () => {
  const markdown = renderWebhookVerificationEvidenceTemplate();
  assert.match(markdown, /Webhook Verification Evidence Template/);
  assert.match(markdown, /payment_intent\.succeeded/);
  assert.match(markdown, /transaction\.approved/);
  assert.match(markdown, /Invalid signature rejected/);
  assertCredentialSafe(markdown);
});

test("refund and chargeback evidence checklists cover required review paths", () => {
  const refund = renderRefundEvidenceChecklist();
  const chargeback = renderChargebackEvidenceChecklist();
  assert.match(refund, /Refund Evidence Checklist/);
  assert.match(refund, /Sandbox refund request created/);
  assert.match(refund, /No live money movement/);
  assert.match(chargeback, /Chargeback Evidence Checklist/);
  assert.match(chargeback, /Provider dispute event received/);
  assert.match(chargeback, /Response deadline captured/);
  assertCredentialSafe(refund);
  assertCredentialSafe(chargeback);
});

test("payout settlement and tax checklists render without activating money movement", () => {
  const payout = renderPayoutEvidenceChecklist();
  const settlement = renderSettlementEvidenceChecklist();
  const tax = renderTaxGctReadinessChecklist();
  assert.match(payout, /Payout Evidence Checklist/);
  assert.match(payout, /Live Payout Active: NO/);
  assert.match(settlement, /Settlement Evidence Checklist/);
  assert.match(settlement, /No live settlement performed/);
  assert.match(tax, /Tax\/GCT Readiness Checklist/);
  assert.match(tax, /Live Tax Filing Active: NO/);
  assertCredentialSafe(payout);
  assertCredentialSafe(settlement);
  assertCredentialSafe(tax);
});

test("revenue launch blocker report blocks real money movement pending manual evidence", () => {
  const missing = buildRevenueLaunchBlockerReport({ env: {} });
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.realMoneyMovementActive, false);
  assert.equal(missing.livePaymentsActive, false);
  assert.equal(missing.livePayoutsActive, false);
  assert.equal(missing.liveSettlementActive, false);
  assert.ok(missing.blockers.some((blocker) => /Payment provider sandbox account/.test(blocker)));

  const shaped = buildRevenueLaunchBlockerReport({ env: shapedStripeEnv });
  assert.equal(shaped.status, "BLOCKED");
  assert.ok(shaped.blockers.some((blocker) => /Revenue operations signoff/.test(blocker)));

  const markdown = renderRevenueLaunchBlockerReport(shaped);
  assert.match(markdown, /Revenue Launch Blocker Report/);
  assert.match(markdown, /E2 Revenue Sandbox Activation remains blocked/);
  assertCredentialSafe(markdown);
});
