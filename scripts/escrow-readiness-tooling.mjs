import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESCROW_DEPOSIT_TYPES, ESCROW_PROVIDERS, ESCROW_STATES, getEscrowReadiness } from "../server/src/escrow/escrowReadiness.js";
import { createEscrowService } from "../server/src/services/escrowService.js";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/, /^simulated$/i, /^none$/i, /^todo$/i, /^tbd$/i];

export const ESCROW_PROVIDER_INTAKE_CHECKLIST = [
  { item: "Provider selected", envKey: "ESCROW_PROVIDER", required: true },
  { item: "Readiness mode confirmed", envKey: "ESCROW_MODE", required: true },
  { item: "Operations owner assigned", envKey: "ESCROW_OPERATIONS_OWNER", required: true },
  { item: "Legal owner assigned", envKey: "ESCROW_LEGAL_OWNER", required: true },
  { item: "Dispute owner assigned", envKey: "ESCROW_DISPUTE_OWNER", required: true },
  { item: "Release policy documented", envKey: "ESCROW_RELEASE_POLICY_URL", required: true },
  { item: "Dispute policy documented", envKey: "ESCROW_DISPUTE_POLICY_URL", required: true },
  { item: "Settlement currency approved", envKey: "ESCROW_SETTLEMENT_CURRENCY", required: true },
  { item: "Provider webhook policy documented", envKey: "ESCROW_WEBHOOK_POLICY_URL", required: false },
  { item: "Reconciliation policy documented", envKey: "ESCROW_RECONCILIATION_POLICY_URL", required: false },
];

export const LEGAL_TRUST_ACCOUNT_READINESS_CHECKLIST = [
  { item: "Escrow legal counsel assigned", envKey: "ESCROW_LEGAL_OWNER" },
  { item: "Trust account bank selected", envKey: "LEGAL_TRUST_ACCOUNT_BANK" },
  { item: "Trust account owner assigned", envKey: "LEGAL_TRUST_ACCOUNT_OWNER" },
  { item: "Trust account policy documented", envKey: "LEGAL_TRUST_ACCOUNT_POLICY_URL" },
  { item: "Release authority documented", envKey: "ESCROW_RELEASE_POLICY_URL" },
  { item: "Dispute authority documented", envKey: "ESCROW_DISPUTE_POLICY_URL" },
  { item: "Reconciliation owner assigned", envKey: "DEPOSIT_RECONCILIATION_OWNER" },
];

export const DEPOSIT_STATE_MACHINE = {
  draft: ["pending", "cancelled"],
  pending: ["held", "refunded", "cancelled", "expired", "disputed"],
  held: ["released", "partially_released", "refunded", "disputed", "expired"],
  partially_released: ["released", "refunded", "disputed"],
  disputed: ["released", "partially_released", "refunded", "cancelled"],
  released: [],
  refunded: [],
  cancelled: [],
  expired: [],
};

export const ESCROW_LEDGER_VALIDATION_SCENARIOS = [
  {
    id: "ledger-security-deposit-held",
    bookingId: "booking-escrow-tooling-001",
    assetId: "asset-escrow-tooling-001",
    customerId: "customer-escrow-tooling",
    supplierId: "supplier-escrow-tooling",
    depositType: "security_deposit",
    amount: 100000,
    currency: "JMD",
    status: "held",
    liveFundsProcessed: false,
    legalEscrowActive: false,
  },
  {
    id: "ledger-damage-deposit-disputed",
    bookingId: "booking-escrow-tooling-002",
    assetId: "asset-escrow-tooling-002",
    customerId: "customer-escrow-tooling",
    supplierId: "supplier-escrow-tooling",
    depositType: "damage_deposit",
    amount: 45000,
    currency: "JMD",
    status: "disputed",
    liveFundsProcessed: false,
    legalEscrowActive: false,
  },
  {
    id: "ledger-property-deposit-refunded",
    bookingId: "booking-escrow-tooling-003",
    assetId: "asset-escrow-tooling-003",
    customerId: "customer-escrow-tooling",
    supplierId: "supplier-escrow-tooling",
    depositType: "property_deposit",
    amount: 150000,
    currency: "JMD",
    status: "refunded",
    liveFundsProcessed: false,
    legalEscrowActive: false,
  },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function checklistRows(checklist, env) {
  return checklist.map((row) => ({
    ...row,
    status: hasRealValue(env[row.envKey]) ? "present" : "missing_or_placeholder",
    valuePrinted: false,
  }));
}

function unique(values) {
  return [...new Set(values)];
}

export function validateEscrowProviderIntake(env = process.env) {
  const readiness = getEscrowReadiness(env);
  const rows = checklistRows(ESCROW_PROVIDER_INTAKE_CHECKLIST, env);
  const blockers = [];
  if (!ESCROW_PROVIDERS.includes(readiness.provider)) blockers.push("ESCROW_PROVIDER must be one of the supported escrow readiness providers.");
  if (readiness.provider === "placeholder") blockers.push("ESCROW_PROVIDER must be selected before provider intake can pass.");
  blockers.push(
    ...rows
      .filter((row) => row.required && row.status !== "present")
      .map((row) => `${row.envKey} is required for escrow provider intake readiness.`),
  );
  blockers.push(...readiness.missing.map((key) => `${key} is missing for selected provider readiness.`));
  if (readiness.placeholderRejected) blockers.push("Placeholder escrow values are rejected for credential readiness.");
  return {
    status: blockers.length ? "NEEDS_PROVIDER_INTAKE" : "PROVIDER_INTAKE_READY_FOR_EVIDENCE",
    provider: readiness.provider,
    rows,
    valuePrinted: false,
    liveEscrowActive: false,
    liveFundsProcessed: false,
    blockers: unique(blockers),
  };
}

export function validateDepositStateMachine() {
  const blockers = [];
  for (const state of ESCROW_STATES) {
    if (!Object.prototype.hasOwnProperty.call(DEPOSIT_STATE_MACHINE, state)) blockers.push(`Missing state-machine definition for ${state}.`);
  }
  for (const [state, transitions] of Object.entries(DEPOSIT_STATE_MACHINE)) {
    if (!ESCROW_STATES.includes(state)) blockers.push(`Unknown state-machine state ${state}.`);
    for (const target of transitions) {
      if (!ESCROW_STATES.includes(target)) blockers.push(`Invalid transition target ${state} -> ${target}.`);
    }
  }
  for (const terminalState of ["released", "refunded", "cancelled", "expired"]) {
    if ((DEPOSIT_STATE_MACHINE[terminalState] || []).length > 0) blockers.push(`${terminalState} must remain terminal in readiness validation.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    stateMachine: DEPOSIT_STATE_MACHINE,
    supportedStates: ESCROW_STATES,
    liveFundsProcessed: false,
    blockers,
  };
}

export function validateEscrowLedger(records = ESCROW_LEDGER_VALIDATION_SCENARIOS) {
  const blockers = [];
  for (const record of records) {
    if (!record.id) blockers.push("Ledger record id is required.");
    if (!record.bookingId) blockers.push(`${record.id || "unknown"} bookingId is required.`);
    if (!record.assetId) blockers.push(`${record.id || "unknown"} assetId is required.`);
    if (!record.customerId || !record.supplierId) blockers.push(`${record.id || "unknown"} customerId and supplierId are required.`);
    if (!ESCROW_DEPOSIT_TYPES.includes(record.depositType)) blockers.push(`${record.id || "unknown"} depositType is unsupported.`);
    if (!ESCROW_STATES.includes(record.status)) blockers.push(`${record.id || "unknown"} status is unsupported.`);
    if (!Number.isFinite(Number(record.amount)) || Number(record.amount) <= 0) blockers.push(`${record.id || "unknown"} amount must be greater than zero.`);
    if (!record.currency) blockers.push(`${record.id || "unknown"} currency is required.`);
    if (record.liveFundsProcessed !== false) blockers.push(`${record.id || "unknown"} must not mark liveFundsProcessed true.`);
    if (record.legalEscrowActive !== false) blockers.push(`${record.id || "unknown"} must not mark legalEscrowActive true.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    recordsChecked: records.length,
    liveFundsProcessed: false,
    legalEscrowActive: false,
    blockers,
  };
}

export function validateReleaseRefundDisputePlaceholders() {
  const store = new Map();
  const service = createEscrowService({ escrowStore: store, env: { ESCROW_PROVIDER: "placeholder", ESCROW_MODE: "readiness_only", ESCROW_SETTLEMENT_CURRENCY: "JMD" } });
  const customerReq = { user: { id: "customer-escrow-tooling", role: "customer" } };
  const supplierReq = { user: { id: "supplier-escrow-tooling", role: "supplier" } };
  const created = service.create({
    bookingId: "booking-escrow-tooling",
    assetId: "asset-escrow-tooling",
    supplierId: "supplier-escrow-tooling",
    depositType: "security_deposit",
    amount: 100000,
    status: "held",
  }, customerReq);
  const release = service.updateStatus(created.id, "release", { amount: 25000, note: "Readiness partial release." }, supplierReq);

  const disputedSource = service.create({
    bookingId: "booking-escrow-dispute-tooling",
    assetId: "asset-escrow-dispute-tooling",
    supplierId: "supplier-escrow-tooling",
    depositType: "damage_deposit",
    amount: 50000,
    status: "held",
  }, customerReq);
  const dispute = service.updateStatus(disputedSource.id, "dispute", { reason: "Readiness dispute evidence." }, customerReq);
  const refund = service.updateStatus(disputedSource.id, "refund", { amount: 50000, note: "Readiness refund placeholder." }, supplierReq);

  const rows = [
    { workflow: "release", expectedStatus: "partially_released", actualStatus: release.status, liveFundsProcessed: release.liveFundsProcessed },
    { workflow: "dispute", expectedStatus: "disputed", actualStatus: dispute.status, liveFundsProcessed: dispute.liveFundsProcessed },
    { workflow: "refund", expectedStatus: "refunded", actualStatus: refund.status, liveFundsProcessed: refund.liveFundsProcessed },
  ];
  const blockers = rows
    .filter((row) => row.actualStatus !== row.expectedStatus || row.liveFundsProcessed !== false)
    .map((row) => `${row.workflow} placeholder expected ${row.expectedStatus} and no live funds.`);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    rows,
    releaseNotice: release.notice,
    liveFundsProcessed: false,
    legalEscrowActive: false,
    blockers,
  };
}

export function buildLegalTrustAccountReadinessChecklist(env = process.env) {
  const rows = checklistRows(LEGAL_TRUST_ACCOUNT_READINESS_CHECKLIST, env);
  const blockers = rows.filter((row) => row.status !== "present").map((row) => `${row.envKey} is required before legal trust account review can pass.`);
  return {
    status: blockers.length ? "NEEDS_LEGAL_TRUST_ACCOUNT_REVIEW" : "READY_FOR_LEGAL_TRUST_ACCOUNT_EVIDENCE",
    rows,
    legalEscrowActive: false,
    liveFundsProcessed: false,
    legalApprovalRequired: true,
    valuePrinted: false,
    blockers,
  };
}

export function renderEscrowEvidenceTemplate() {
  return `# Escrow Evidence Package Template

Do not include escrow API keys, bank credentials, trust account access credentials, service-role keys, access tokens, webhook secrets, or screenshots containing credentials.

## Environment

- Environment: Development / UAT
- Escrow Provider: Stripe Connect / WiPay / Lynk / NCB / Manual Deposit Hold / Legal Trust Account
- Escrow Operations Owner:
- Escrow Legal Owner:
- Escrow Dispute Owner:
- Date:

## Provider Intake Evidence

| Item | Evidence Location | Result |
| --- | --- | --- |
${ESCROW_PROVIDER_INTAKE_CHECKLIST.map((row) => `| ${row.item} |  | Pending |`).join("\n")}

## Deposit State-Machine Evidence

| State | Allowed Next States | Test Result |
| --- | --- | --- |
${Object.entries(DEPOSIT_STATE_MACHINE).map(([state, transitions]) => `| ${state} | ${transitions.join(", ") || "terminal"} | Pending |`).join("\n")}

## Escrow Ledger Evidence

| Scenario | Booking | Deposit Type | Status | No Live Funds |
| --- | --- | --- | --- | --- |
${ESCROW_LEDGER_VALIDATION_SCENARIOS.map((row) => `| ${row.id} | ${row.bookingId} | ${row.depositType} | ${row.status} | Yes |`).join("\n")}

## Release / Refund / Dispute Evidence

- Release placeholder workflow:
- Refund placeholder workflow:
- Dispute placeholder workflow:
- No live funds processed:
- No legal escrow capability claimed:

## Legal Trust Account Evidence

| Item | Evidence Location | Result |
| --- | --- | --- |
${LEGAL_TRUST_ACCOUNT_READINESS_CHECKLIST.map((row) => `| ${row.item} |  | Pending |`).join("\n")}

## Decision

- Result: PASS / FAIL
- Missing evidence:
- Next action:
`;
}

export function renderEscrowProviderIntakeTemplate() {
  return `# Escrow Provider Intake Template

Do not include escrow API keys, webhook secrets, bank credentials, trust account credentials, service-role keys, access tokens, or screenshots containing credentials.

## Provider Intake

- Environment: Development / UAT
- Provider: Stripe Connect / WiPay / Lynk / NCB / Manual Deposit Hold / Legal Trust Account
- Operations owner:
- Legal owner:
- Dispute owner:
- Date:

| Intake Item | Required Env/Policy | Status | Evidence Location |
| --- | --- | --- | --- |
${ESCROW_PROVIDER_INTAKE_CHECKLIST.map((row) => `| ${row.item} | ${row.envKey} | Pending |  |`).join("\n")}

## Decision

- Result: PASS / FAIL
- Missing evidence:
- Next action:
`;
}

export function renderLegalTrustAccountEvidenceChecklist() {
  return `# Legal Trust Account Evidence Checklist

Do not include bank credentials, account numbers, trust account access credentials, API keys, tokens, or screenshots containing credentials.

| Evidence Item | Development | UAT | Production Hold | Notes |
| --- | --- | --- | --- | --- |
${LEGAL_TRUST_ACCOUNT_READINESS_CHECKLIST.map((row) => `| ${row.item} | Pending | Pending | Pending | ${row.envKey} |`).join("\n")}
| Legal counsel approval | Pending | Pending | Pending | Manual signoff required. |
| Trust account operating procedure | Pending | Pending | Pending | Policy reference only. |
| Dual-control release authority | Pending | Pending | Pending | Names/roles only, no credentials. |
| Reconciliation evidence path | Pending | Pending | Pending | Report reference only. |

Live legal escrow remains inactive until legal review, bank/trust setup, compliance approval, and operational controls pass.
`;
}

export function renderDepositHoldReleaseEvidenceChecklist() {
  return [
    "# Deposit Hold/Release Evidence Checklist",
    "",
    "Do not include payment keys, escrow API keys, bank credentials, customer financial data, or screenshots containing credentials.",
    "",
    "| Workflow | Expected State | Evidence Required | Status |",
    "| --- | --- | --- | --- |",
    "| Deposit draft created | draft | Booking, asset, amount, currency, audit event | Pending |",
    "| Deposit hold requested | pending / held | Provider sandbox reference or placeholder evidence | Pending |",
    "| Deposit hold confirmed | held | Ledger record, audit event, no live funds if placeholder | Pending |",
    "| Full release requested | released | Release policy, actor, audit event | Pending |",
    "| Partial release requested | partially_released | Amount split, reason, approval evidence | Pending |",
    "| Terminal release verified | released | No further transitions allowed | Pending |",
    "",
    "## Approved State Machine",
    ...Object.entries(DEPOSIT_STATE_MACHINE).map(([state, transitions]) => `- ${state}: ${transitions.join(", ") || "terminal"}`),
  ].join("\n");
}

export function renderPartialReleaseEvidenceTemplate() {
  return `# Partial Release Evidence Template

Do not include escrow API keys, payment credentials, bank credentials, private financial details, or screenshots containing credentials.

## Partial Release

- Environment: Development / UAT
- Escrow/deposit record ID:
- Booking ID:
- Asset ID:
- Original deposit amount:
- Release amount:
- Remaining amount:
- Currency:
- Requested by:
- Approved by:
- Reason:
- Policy reference:

## Evidence

| Evidence Item | Status | Evidence Location |
| --- | --- | --- |
| Original held ledger entry exists | Pending |  |
| Partial release transition allowed | Pending |  |
| Remaining balance calculated correctly | Pending |  |
| Customer/supplier visibility reviewed | Pending |  |
| Audit event recorded | Pending |  |
| No live funds moved unless provider sandbox evidence is attached | Pending |  |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderRefundEvidenceTemplate() {
  return `# Escrow Refund Evidence Template

Do not include payment credentials, escrow API keys, bank details, customer financial data, or screenshots containing credentials.

## Refund

- Environment: Development / UAT
- Escrow/deposit record ID:
- Booking ID:
- Asset ID:
- Refund amount:
- Currency:
- Refund reason:
- Requested by:
- Approved by:
- Policy reference:

## Evidence

| Evidence Item | Status | Evidence Location |
| --- | --- | --- |
| Held/disputed ledger entry exists | Pending |  |
| Refund transition allowed | Pending |  |
| Refund amount <= available balance | Pending |  |
| Customer notification path reviewed | Pending |  |
| Audit event recorded | Pending |  |
| No live funds moved unless provider sandbox evidence is attached | Pending |  |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderDisputeEvidenceTemplate() {
  return `# Escrow Dispute Evidence Template

Do not include payment credentials, escrow API keys, bank details, legal privileged documents, private evidence files, or screenshots containing credentials.

## Dispute

- Environment: Development / UAT
- Escrow/deposit record ID:
- Booking ID:
- Asset ID:
- Dispute amount:
- Currency:
- Opened by:
- Dispute reason:
- Evidence package reference:
- Dispute owner:
- Policy reference:

## Evidence

| Evidence Item | Status | Evidence Location |
| --- | --- | --- |
| Held/pending ledger entry exists | Pending |  |
| Dispute transition allowed | Pending |  |
| Evidence stored in private bucket/reference | Pending |  |
| Admin/dispute owner review path verified | Pending |  |
| Release/refund/partial release paths remain controlled | Pending |  |
| Audit event recorded | Pending |  |
| No legal escrow decision claimed without approval | Pending |  |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderEscrowLedgerEvidenceChecklist() {
  return [
    "# Escrow Ledger Evidence Checklist",
    "",
    "Do not include escrow API keys, bank credentials, payment secrets, customer financial data, or screenshots containing credentials.",
    "",
    "| Evidence Item | Development | UAT | Notes |",
    "| --- | --- | --- | --- |",
    "| Ledger record has unique ID | Pending | Pending | Internal record ID only. |",
    "| Booking, asset, customer, supplier IDs present | Pending | Pending | IDs only, no private data. |",
    "| Deposit type supported | Pending | Pending | security/damage/property/etc. |",
    "| Amount and currency valid | Pending | Pending | No bank data. |",
    "| State is valid | Pending | Pending | Must match approved state machine. |",
    "| Transition audit event recorded | Pending | Pending | Audit event ID only. |",
    "| Reconciliation reference recorded | Pending | Pending | Report reference only. |",
    "| Live funds flag remains accurate | Pending | Pending | Must not claim live funds when placeholder. |",
    "",
    "## Static Validation Scenarios",
    ...ESCROW_LEDGER_VALIDATION_SCENARIOS.map((row) => `- ${row.id}: ${row.depositType}, ${row.amount} ${row.currency}, ${row.status}, live funds ${row.liveFundsProcessed ? "YES" : "NO"}`),
  ].join("\n");
}

export function buildEscrowLaunchBlockerReport({ env = process.env } = {}) {
  const readiness = buildEscrowReadinessToolingReport({ env });
  const manualEvidence = [
    "Escrow provider selected and legally approved",
    "Legal trust account evidence and operating procedure",
    "Deposit hold sandbox/legal evidence",
    "Release and partial release evidence",
    "Refund evidence",
    "Dispute workflow evidence",
    "Escrow ledger reconciliation evidence",
    "Escrow legal/compliance signoff",
    "No live funds movement certification until provider/legal controls pass",
  ];
  const blockers = [
    ...readiness.blockers,
    ...manualEvidence.map((item) => `Manual evidence required: ${item}`),
  ];
  return {
    status: "BLOCKED",
    generatedAt: new Date().toISOString(),
    liveEscrowActive: false,
    liveFundsProcessed: false,
    legalEscrowClaim: false,
    valuePrinted: false,
    blockers: unique(blockers),
    nextGate: "A4-01 Infrastructure Ownership Confirmation Submitted; Escrow activation remains blocked until A4 and legal/provider evidence pass.",
  };
}

export function renderEscrowLaunchBlockerReport(report = buildEscrowLaunchBlockerReport()) {
  return [
    "# Escrow Launch Blocker Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Escrow Active: ${report.liveEscrowActive ? "YES" : "NO"}`,
    `Live Funds Processed: ${report.liveFundsProcessed ? "YES" : "NO"}`,
    `Legal Escrow Claim: ${report.legalEscrowClaim ? "YES" : "NO"}`,
    "",
    "## Blockers",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
    "## Next Gate",
    report.nextGate,
  ].join("\n");
}

export function buildEscrowReadinessToolingReport({ env = process.env } = {}) {
  const providerIntake = validateEscrowProviderIntake(env);
  const stateMachine = validateDepositStateMachine();
  const ledger = validateEscrowLedger();
  const placeholderWorkflows = validateReleaseRefundDisputePlaceholders();
  const legalTrustAccount = buildLegalTrustAccountReadinessChecklist(env);
  const readiness = getEscrowReadiness(env);
  const blockers = unique([
    ...providerIntake.blockers,
    ...stateMachine.blockers,
    ...ledger.blockers,
    ...placeholderWorkflows.blockers,
    ...legalTrustAccount.blockers,
  ]);
  return {
    status: blockers.length ? "NEEDS_ESCROW_EVIDENCE_OR_LEGAL_REVIEW" : "ESCROW_CREDENTIAL_READY_FOR_REVIEW",
    provider: readiness.provider,
    providerIntake,
    stateMachine,
    ledger,
    placeholderWorkflows,
    legalTrustAccount,
    readinessScore: readiness.score,
    liveEscrowActive: false,
    liveFundsProcessed: false,
    legalEscrowClaim: false,
    valuePrinted: false,
    blockers,
  };
}

function renderReport(report) {
  console.log("# Escrow Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- Escrow provider intake checklist: ${report.providerIntake.status}`);
  console.log(`- Deposit state-machine tests: ${report.stateMachine.status}`);
  console.log(`- Escrow ledger validation: ${report.ledger.status}`);
  console.log(`- Release/refund/dispute placeholder tests: ${report.placeholderWorkflows.status}`);
  console.log(`- Legal trust account readiness checklist: ${report.legalTrustAccount.status}`);
  console.log(`- Live escrow active: ${report.liveEscrowActive}`);
  console.log(`- Live funds processed: ${report.liveFundsProcessed}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildEscrowReadinessToolingReport(), null, 2));
  else if (command === "provider-intake") console.log(JSON.stringify(validateEscrowProviderIntake(), null, 2));
  else if (command === "state-machine") console.log(JSON.stringify(validateDepositStateMachine(), null, 2));
  else if (command === "ledger") console.log(JSON.stringify(validateEscrowLedger(), null, 2));
  else if (command === "placeholder-workflows") console.log(JSON.stringify(validateReleaseRefundDisputePlaceholders(), null, 2));
  else if (command === "legal-trust-checklist") console.log(JSON.stringify(buildLegalTrustAccountReadinessChecklist(), null, 2));
  else if (command === "evidence-template") console.log(renderEscrowEvidenceTemplate());
  else if (command === "provider-intake-template") console.log(renderEscrowProviderIntakeTemplate());
  else if (command === "legal-trust-evidence") console.log(renderLegalTrustAccountEvidenceChecklist());
  else if (command === "deposit-hold-release-checklist") console.log(renderDepositHoldReleaseEvidenceChecklist());
  else if (command === "partial-release-template") console.log(renderPartialReleaseEvidenceTemplate());
  else if (command === "refund-template") console.log(renderRefundEvidenceTemplate());
  else if (command === "dispute-template") console.log(renderDisputeEvidenceTemplate());
  else if (command === "ledger-evidence-checklist") console.log(renderEscrowLedgerEvidenceChecklist());
  else if (command === "launch-blockers") console.log(renderEscrowLaunchBlockerReport());
  else renderReport(buildEscrowReadinessToolingReport());
}
