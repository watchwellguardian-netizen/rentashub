import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MOCK_WEBHOOK_PAYLOADS,
  PAYMENT_PROVIDER_CREDENTIAL_KEYS,
  SANDBOX_READINESS_CHECKLISTS,
  TAX_GCT_CONFIGURATION_MATRIX,
  buildPayoutReadinessChecklist,
  buildRevenueReadinessToolingReport,
  buildSandboxReadinessChecklist,
  buildTaxGctConfigurationMatrix,
  renderRevenueEvidencePackageTemplate,
  renderTaxGctConfigurationMatrix,
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
