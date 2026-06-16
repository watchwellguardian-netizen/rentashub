import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEPOSIT_LIFECYCLE_STATES,
  ESCROW_LEDGER_STATES,
  PAYMENT_LIFECYCLE_STATES,
  REVENUE_REQUIRED_KEYS,
  SETTLEMENT_WORKFLOW_STEPS,
  getRevenueReadiness,
} from "../server/src/revenue/revenueReadiness.js";
import { getPaymentActivationReadiness } from "../server/src/payments/providerReadiness.js";
import {
  calculatePaymentSummary,
  createSimulatedPayment,
  requestSimulatedPayout,
} from "../src/lib/paymentLedger.js";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/, /^simulated$/i, /^none$/i];

export const PAYMENT_PROVIDER_CREDENTIAL_KEYS = {
  stripe: ["PAYMENT_PROVIDER", "PAYMENT_MODE", "PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_URL"],
  wipay: ["PAYMENT_PROVIDER", "PAYMENT_MODE", "PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY", "WIPAY_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_URL"],
  lynk: ["PAYMENT_PROVIDER", "PAYMENT_MODE", "PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY", "LYNK_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_URL"],
  ncb: ["PAYMENT_PROVIDER", "PAYMENT_MODE", "PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY", "NCB_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_URL"],
};

export const SANDBOX_READINESS_CHECKLISTS = {
  stripe: [
    "Stripe account created",
    "Stripe Connect platform configured",
    "Sandbox public key stored in secret manager",
    "Sandbox secret key stored in backend-only secret manager",
    "Webhook endpoint registered",
    "Webhook signing secret stored",
    "Test payment intent created",
    "Test refund created",
    "Test payout flow reviewed",
    "No live mode keys used",
  ],
  wipay: [
    "WiPay merchant sandbox requested",
    "Sandbox credentials stored in backend-only secret manager",
    "Webhook/callback URL registered",
    "Webhook secret or verification method documented",
    "JMD settlement flow reviewed",
    "Refund process documented",
    "Chargeback/support contact assigned",
    "No live customer transaction processed",
  ],
};

export const MOCK_WEBHOOK_PAYLOADS = [
  {
    provider: "stripe",
    eventType: "payment_intent.succeeded",
    payload: { id: "evt_mock_stripe_paid", type: "payment_intent.succeeded", data: { object: { id: "pi_mock_001", amount: 500000, currency: "jmd" } } },
    expectedAction: "record_payment_success_placeholder",
  },
  {
    provider: "stripe",
    eventType: "charge.dispute.created",
    payload: { id: "evt_mock_stripe_dispute", type: "charge.dispute.created", data: { object: { id: "dp_mock_001", amount: 120000, currency: "jmd" } } },
    expectedAction: "record_chargeback_placeholder",
  },
  {
    provider: "wipay",
    eventType: "transaction.approved",
    payload: { transaction_id: "wipay_mock_001", status: "approved", total: 5000, currency: "JMD" },
    expectedAction: "record_payment_success_placeholder",
  },
  {
    provider: "wipay",
    eventType: "transaction.refunded",
    payload: { transaction_id: "wipay_mock_refund_001", status: "refunded", total: 5000, currency: "JMD" },
    expectedAction: "record_refund_placeholder",
  },
];

export const TAX_GCT_CONFIGURATION_MATRIX = [
  { item: "platform_service_fee", taxable: true, tax: "GCT", policyRequired: "TAX_GCT_POLICY_URL", notes: "Confirm current Jamaica GCT treatment with tax advisor." },
  { item: "supplier_rental_income", taxable: "supplier_responsibility_review", tax: "GCT_or_income_tax_review", policyRequired: "SUPPLIER_TAX_DISCLOSURE_POLICY_URL", notes: "Supplier tax obligations require legal/tax disclosure." },
  { item: "auction_buyer_fee", taxable: true, tax: "GCT", policyRequired: "AUCTION_FEE_TAX_POLICY_URL", notes: "Auction buyer premium tax treatment must be approved before live auctions." },
  { item: "security_deposit", taxable: false, tax: "not_revenue_until_forfeited", policyRequired: "DEPOSIT_LIFECYCLE_POLICY_URL", notes: "Deposit treatment changes if forfeited or applied to damage." },
  { item: "inspection_marketplace_fee", taxable: true, tax: "GCT", policyRequired: "INSPECTION_FEE_TAX_POLICY_URL", notes: "Inspector payout and platform fee treatment require review." },
  { item: "transport_referral_fee", taxable: true, tax: "GCT", policyRequired: "TRANSPORT_FEE_TAX_POLICY_URL", notes: "Carrier/vendor tax responsibility must be disclosed." },
  { item: "financing_referral_fee", taxable: "regulated_activity_review", tax: "GCT_or_exemption_review", policyRequired: "FINANCING_REFERRAL_TAX_POLICY_URL", notes: "Referral compliance and tax treatment require legal review." },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function normalizeProvider(provider = "") {
  const value = String(provider || "").trim().toLowerCase();
  if (value === "stripe_connect") return "stripe";
  return value;
}

function validateUrlLike(value) {
  return /^https:\/\/[^\s]+\.[^\s]+/.test(String(value || "").trim());
}

export function validatePaymentProviderCredentials(env = process.env) {
  const provider = normalizeProvider(env.PAYMENT_PROVIDER || "");
  const keys = PAYMENT_PROVIDER_CREDENTIAL_KEYS[provider] || ["PAYMENT_PROVIDER"];
  const providerSupported = Boolean(PAYMENT_PROVIDER_CREDENTIAL_KEYS[provider]);
  const checks = keys.map((key) => ({
    key,
    status: hasRealValue(env[key]) ? "present" : "missing_or_placeholder",
    valuePrinted: false,
  }));
  const blockers = [];
  if (!providerSupported) blockers.push("PAYMENT_PROVIDER must be one of stripe, wipay, lynk, or ncb for credential-readiness validation.");
  blockers.push(...checks.filter((check) => check.status !== "present").map((check) => `${check.key} is required for ${provider || "payment"} sandbox readiness.`));
  if (hasRealValue(env.PAYMENT_MODE) && String(env.PAYMENT_MODE).toLowerCase() !== "sandbox") blockers.push("PAYMENT_MODE must remain sandbox for readiness validation.");
  if (hasRealValue(env.PAYMENT_WEBHOOK_URL) && !validateUrlLike(env.PAYMENT_WEBHOOK_URL)) blockers.push("PAYMENT_WEBHOOK_URL must be an HTTPS URL for sandbox validation.");
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS" : "CREDENTIAL_READY_FOR_SANDBOX",
    provider: provider || "not_selected",
    providerSupported,
    checks,
    valuePrinted: false,
    blockers,
  };
}

export function buildSandboxReadinessChecklist(provider = "stripe", env = process.env) {
  const normalized = normalizeProvider(provider);
  const checklist = SANDBOX_READINESS_CHECKLISTS[normalized] || [];
  const credentialValidation = validatePaymentProviderCredentials({ ...env, PAYMENT_PROVIDER: env.PAYMENT_PROVIDER || normalized });
  const rows = checklist.map((item) => ({
    item,
    status: "pending_evidence",
    evidenceRequired: true,
    liveActivation: false,
  }));
  return {
    status: credentialValidation.status === "CREDENTIAL_READY_FOR_SANDBOX" ? "READY_FOR_SANDBOX_EVIDENCE" : "NEEDS_CREDENTIALS",
    provider: normalized,
    rows,
    credentialValidation,
    livePaymentsActive: false,
    blockers: credentialValidation.blockers,
  };
}

export function validateMockWebhookPayload(payload = {}, provider = "stripe") {
  const normalized = normalizeProvider(provider);
  const blockers = [];
  let eventType = "";
  if (normalized === "stripe") {
    eventType = payload.type || "";
    if (!payload.id || !payload.type || !payload.data?.object?.id) blockers.push("Stripe webhook mock must include id, type, and data.object.id.");
  } else if (normalized === "wipay") {
    eventType = payload.status ? `transaction.${payload.status}` : "";
    if (!payload.transaction_id || !payload.status || !payload.currency) blockers.push("WiPay webhook mock must include transaction_id, status, and currency.");
  } else {
    blockers.push(`Mock webhook validator does not support provider ${normalized}.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    provider: normalized,
    eventType,
    signatureVerified: false,
    mockOnly: true,
    valuePrinted: false,
    blockers,
  };
}

export function runWebhookReadinessTests() {
  const results = MOCK_WEBHOOK_PAYLOADS.map((scenario) => {
    const validation = validateMockWebhookPayload(scenario.payload, scenario.provider);
    return {
      provider: scenario.provider,
      eventType: scenario.eventType,
      expectedAction: scenario.expectedAction,
      status: validation.status,
      signatureVerified: false,
      mockOnly: true,
      blockers: validation.blockers,
    };
  });
  const blockers = results.filter((result) => result.status !== "PASS").flatMap((result) => result.blockers.map((blocker) => `${result.provider} ${result.eventType}: ${blocker}`));
  return {
    status: blockers.length ? "FAIL" : "PASS",
    results,
    liveWebhookActive: false,
    signatureVerificationRequiresProviderSecret: true,
    blockers,
  };
}

function memoryStorage({ bookings, listings, ledger = [] }) {
  const store = new Map([
    ["rentashub_bookings", JSON.stringify(bookings)],
    ["rentashub_asset_listings", JSON.stringify(listings)],
    ["rentashub_payment_ledger", JSON.stringify(ledger)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

export function validateRefundChargebackPlaceholderWorkflow() {
  const listing = {
    id: "asset-revenue-tooling",
    title: "Revenue readiness asset",
    ownerSupplierId: "supplier-revenue",
    supplierName: "Revenue Supplier",
    depositRequirement: "JMD 10000 refundable deposit",
  };
  const booking = {
    id: "booking-revenue-tooling",
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: "customer-revenue",
    customerName: "Revenue Customer",
    supplierId: "supplier-revenue",
    supplierName: "Revenue Supplier",
    estimatedCost: 50000,
    depositRequirement: listing.depositRequirement,
    status: "approved",
    paymentStatus: "not_active",
  };
  const storage = memoryStorage({ bookings: [booking], listings: [listing] });
  const payment = createSimulatedPayment(storage, { user: { id: "customer-revenue", role: "customer" }, booking, listing });
  const paymentSummary = calculatePaymentSummary(booking, listing);
  const refundPlaceholder = {
    status: payment.valid ? "PASS" : "FAIL",
    workflow: "refund_placeholder",
    liveRefundProcessed: false,
    allowedStates: ["refunded_placeholder", "disputed"],
    note: "Refund workflow is evidence-only. No provider refund or money movement occurs.",
  };
  const chargebackPlaceholder = {
    status: "PASS",
    workflow: "chargeback_placeholder",
    liveChargebackProcessed: false,
    requiredEvidence: ["provider_event_id", "transaction_id", "amount", "reason", "response_owner", "deadline"],
    note: "Chargeback workflow is placeholder-only until provider dispute APIs and operating procedures are active.",
  };
  return {
    status: payment.valid && refundPlaceholder.status === "PASS" ? "PASS" : "FAIL",
    paymentCreated: payment.valid,
    paymentStatus: payment.transaction?.status || "not_created",
    paymentSummary,
    refundPlaceholder,
    chargebackPlaceholder,
    liveMoneyMovementActive: false,
    blockers: payment.valid ? [] : [payment.error || "Simulated payment could not be created."],
  };
}

export function buildPayoutReadinessChecklist(env = process.env) {
  const required = ["PAYOUT_MODE", "PAYOUT_POLICY_URL", "RECONCILIATION_OWNER", "FINANCIAL_REPORTING_OWNER", "SETTLEMENT_CURRENCY"];
  const checks = required.map((key) => ({
    key,
    status: hasRealValue(env[key]) ? "present" : "missing_or_placeholder",
    valuePrinted: false,
  }));
  const blockers = checks.filter((check) => check.status !== "present").map((check) => `${check.key} is required for payout sandbox readiness.`);
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_POLICY" : "READY_FOR_PAYOUT_SANDBOX_REVIEW",
    checks,
    simulatedPayoutHarness: validateSimulatedPayoutHarness(),
    livePayoutActive: false,
    blockers,
  };
}

export function validateSimulatedPayoutHarness() {
  const listing = { id: "asset-payout-tooling", title: "Payout readiness asset", ownerSupplierId: "supplier-payout", supplierName: "Payout Supplier" };
  const booking = { id: "booking-payout-tooling", assetId: listing.id, assetTitle: listing.title, customerId: "customer-payout", customerName: "Payout Customer", supplierId: "supplier-payout", supplierName: "Payout Supplier", estimatedCost: 30000, depositRequirement: "JMD 0", status: "approved", paymentStatus: "not_active" };
  const storage = memoryStorage({ bookings: [booking], listings: [listing] });
  const payment = createSimulatedPayment(storage, { user: { id: "customer-payout", role: "customer" }, booking, listing });
  const payout = requestSimulatedPayout(storage, "supplier-payout");
  return {
    status: payment.valid && payout.valid && payout.transaction.type === "payout" ? "PASS" : "FAIL",
    simulatedPaymentCreated: payment.valid,
    simulatedPayoutCreated: payout.valid,
    liveBankTransferActive: false,
    blockers: payout.valid ? [] : [payout.error || "Simulated payout could not be created."],
  };
}

export function buildTaxGctConfigurationMatrix(env = process.env) {
  const rows = TAX_GCT_CONFIGURATION_MATRIX.map((row) => ({
    ...row,
    policyConfigured: hasRealValue(env[row.policyRequired]),
    valuePrinted: false,
  }));
  const blockers = rows
    .filter((row) => row.policyRequired === "TAX_GCT_POLICY_URL" && !row.policyConfigured)
    .map((row) => `${row.policyRequired} is required before Tax/GCT sandbox revenue review.`);
  return {
    status: blockers.length ? "NEEDS_TAX_POLICY" : "READY_FOR_TAX_REVIEW",
    rows,
    taxAdvisorApprovalRequired: true,
    liveTaxFilingActive: false,
    blockers,
  };
}

export function renderTaxGctConfigurationMatrix() {
  return [
    "# Tax/GCT Configuration Matrix",
    "",
    "| Item | Taxable | Tax | Policy Required | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...TAX_GCT_CONFIGURATION_MATRIX.map((row) => `| ${row.item} | ${row.taxable} | ${row.tax} | ${row.policyRequired} | ${row.notes} |`),
  ].join("\n");
}

export function renderRevenueEvidencePackageTemplate() {
  return `# Revenue Evidence Package Template

Do not include payment secret keys, webhook secrets, bank credentials, service-role keys, access tokens, card data, or screenshots containing credentials.

## Environment

- Environment: Development / UAT
- Payment Provider: Stripe / WiPay / Other
- Revenue Owner:
- Payment Operations Owner:
- Payment Compliance Owner:
- Date:

## Provider Credential Evidence

| Provider | Sandbox Credentials Stored | Webhook Registered | Secret Values Excluded | Evidence Location |
| --- | --- | --- | --- | --- |
| Stripe | Pending | Pending | Yes |  |
| WiPay | Pending | Pending | Yes |  |

## Webhook Evidence

| Provider | Event | Mock Test | Signature Test | Evidence Location |
| --- | --- | --- | --- | --- |
${MOCK_WEBHOOK_PAYLOADS.map((row) => `| ${row.provider} | ${row.eventType} | Pending | Pending provider secret |  |`).join("\n")}

## Refund / Chargeback Evidence

- Refund placeholder workflow:
- Chargeback placeholder workflow:
- Provider sandbox refund:
- Provider sandbox dispute/chargeback:
- No live money movement confirmed:

## Payout Evidence

- Payout policy approved:
- Reconciliation owner assigned:
- Settlement currency approved:
- Simulated payout harness:
- Provider sandbox payout:
- No bank transfer confirmed:

## Tax/GCT Evidence

| Item | Tax/GCT Policy | Evidence Location |
| --- | --- | --- |
${TAX_GCT_CONFIGURATION_MATRIX.map((row) => `| ${row.item} | ${row.policyRequired} |  |`).join("\n")}

## Decision

- Result: PASS / FAIL
- Missing evidence:
- Next action:
`;
}

export function buildRevenueReadinessToolingReport({ env = process.env } = {}) {
  const providerCredentials = validatePaymentProviderCredentials(env);
  const stripeSandbox = buildSandboxReadinessChecklist("stripe", env);
  const wipaySandbox = buildSandboxReadinessChecklist("wipay", env);
  const webhookTests = runWebhookReadinessTests();
  const refundChargeback = validateRefundChargebackPlaceholderWorkflow();
  const payout = buildPayoutReadinessChecklist(env);
  const taxGct = buildTaxGctConfigurationMatrix(env);
  const revenue = getRevenueReadiness(env);
  const paymentActivation = getPaymentActivationReadiness(env);
  const blockers = [...new Set([
    ...providerCredentials.blockers,
    ...webhookTests.blockers,
    ...refundChargeback.blockers,
    ...payout.blockers,
    ...taxGct.blockers,
    ...revenue.missing.map((key) => `${key} is required for revenue activation architecture readiness.`),
    ...paymentActivation.missing.map((key) => `${key} is required for payment provider activation readiness.`),
  ])];
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_POLICY" : "CREDENTIAL_READY_FOR_SANDBOX_REVIEW",
    provider: providerCredentials.provider,
    providerCredentials,
    stripeSandbox,
    wipaySandbox,
    webhookTests,
    refundChargeback,
    payout,
    taxGct,
    revenueScore: revenue.score,
    paymentActivationScore: paymentActivation.score,
    realMoneyMovementActive: false,
    livePaymentsActive: false,
    liveEscrowActive: false,
    valuePrinted: false,
    blockers,
  };
}

function renderReport(report) {
  console.log("# Revenue Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- Payment provider credential validator: ${report.providerCredentials.status}`);
  console.log(`- Stripe sandbox readiness checklist: ${report.stripeSandbox.status}`);
  console.log(`- WiPay sandbox readiness checklist: ${report.wipaySandbox.status}`);
  console.log(`- Webhook readiness mock tests: ${report.webhookTests.status}`);
  console.log(`- Refund/chargeback placeholder validation: ${report.refundChargeback.status}`);
  console.log(`- Payout readiness checklist: ${report.payout.status}`);
  console.log(`- Tax/GCT configuration matrix: ${report.taxGct.status}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildRevenueReadinessToolingReport(), null, 2));
  else if (command === "tax-gct-matrix") console.log(renderTaxGctConfigurationMatrix());
  else if (command === "evidence-template") console.log(renderRevenueEvidencePackageTemplate());
  else if (command === "webhook-tests") console.log(JSON.stringify(runWebhookReadinessTests(), null, 2));
  else renderReport(buildRevenueReadinessToolingReport());
}
