import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEPOSIT_STATE_MACHINE,
  ESCROW_LEDGER_VALIDATION_SCENARIOS,
  ESCROW_PROVIDER_INTAKE_CHECKLIST,
  LEGAL_TRUST_ACCOUNT_READINESS_CHECKLIST,
  buildEscrowReadinessToolingReport,
  buildEscrowLaunchBlockerReport,
  buildLegalTrustAccountReadinessChecklist,
  renderDepositHoldReleaseEvidenceChecklist,
  renderDisputeEvidenceTemplate,
  renderEscrowEvidenceTemplate,
  renderEscrowLedgerEvidenceChecklist,
  renderEscrowLaunchBlockerReport,
  renderEscrowProviderIntakeTemplate,
  renderLegalTrustAccountEvidenceChecklist,
  renderPartialReleaseEvidenceTemplate,
  renderRefundEvidenceTemplate,
  validateDepositStateMachine,
  validateEscrowLedger,
  validateEscrowProviderIntake,
  validateReleaseRefundDisputePlaceholders,
} from "../../scripts/escrow-readiness-tooling.mjs";

const shapedEscrowEnv = {
  ESCROW_PROVIDER: "legal_trust_account",
  ESCROW_MODE: "readiness_only",
  ESCROW_OPERATIONS_OWNER: "Escrow Operations",
  ESCROW_LEGAL_OWNER: "Escrow Legal",
  ESCROW_DISPUTE_OWNER: "Dispute Operations",
  ESCROW_RELEASE_POLICY_URL: "https://escrow.rentashub.test/release-policy",
  ESCROW_DISPUTE_POLICY_URL: "https://escrow.rentashub.test/dispute-policy",
  ESCROW_SETTLEMENT_CURRENCY: "JMD",
  LEGAL_TRUST_ACCOUNT_BANK: "Readiness Bank",
  LEGAL_TRUST_ACCOUNT_OWNER: "Trust Account Owner",
  LEGAL_TRUST_ACCOUNT_POLICY_URL: "https://escrow.rentashub.test/trust-account-policy",
  DEPOSIT_RECONCILIATION_OWNER: "Reconciliation Owner",
};

function assertCredentialSafe(markdown) {
  assert.doesNotMatch(markdown, /ESCROW_API_KEY\s*=/i);
  assert.doesNotMatch(markdown, /SUPABASE_SERVICE_ROLE_KEY\s*=/i);
  assert.doesNotMatch(markdown, /STRIPE_SECRET_KEY\s*=/i);
  assert.doesNotMatch(markdown, /WIPAY_API_KEY\s*=/i);
  assert.doesNotMatch(markdown, /postgresql:\/\//i);
  assert.doesNotMatch(markdown, /sk_live_/i);
}

test("escrow provider intake checklist rejects missing and placeholder inputs", () => {
  assert.ok(ESCROW_PROVIDER_INTAKE_CHECKLIST.some((row) => row.envKey === "ESCROW_PROVIDER"));
  const missing = validateEscrowProviderIntake({});
  assert.equal(missing.status, "NEEDS_PROVIDER_INTAKE");
  assert.equal(missing.liveEscrowActive, false);
  assert.equal(missing.liveFundsProcessed, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /ESCROW_PROVIDER/.test(blocker)));

  const placeholder = validateEscrowProviderIntake({
    ...shapedEscrowEnv,
    ESCROW_RELEASE_POLICY_URL: "placeholder-release-policy",
  });
  assert.equal(placeholder.status, "NEEDS_PROVIDER_INTAKE");
  assert.ok(placeholder.blockers.some((blocker) => /Placeholder/.test(blocker) || /ESCROW_RELEASE_POLICY_URL/.test(blocker)));

  const shaped = validateEscrowProviderIntake(shapedEscrowEnv);
  assert.equal(shaped.status, "PROVIDER_INTAKE_READY_FOR_EVIDENCE");
  assert.equal(shaped.blockers.length, 0);
});

test("deposit state-machine validator covers all supported escrow states", () => {
  assert.deepEqual(DEPOSIT_STATE_MACHINE.released, []);
  assert.ok(DEPOSIT_STATE_MACHINE.held.includes("disputed"));
  assert.ok(DEPOSIT_STATE_MACHINE.disputed.includes("refunded"));
  const result = validateDepositStateMachine();
  assert.equal(result.status, "PASS");
  assert.equal(result.liveFundsProcessed, false);
  for (const state of ["draft", "pending", "held", "released", "partially_released", "refunded", "disputed", "cancelled", "expired"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(result.stateMachine, state));
  }
});

test("escrow ledger validation requires complete readiness-only ledger records", () => {
  assert.equal(ESCROW_LEDGER_VALIDATION_SCENARIOS.length, 3);
  const valid = validateEscrowLedger();
  assert.equal(valid.status, "PASS");
  assert.equal(valid.liveFundsProcessed, false);
  assert.equal(valid.legalEscrowActive, false);

  const invalid = validateEscrowLedger([{ id: "bad-ledger", amount: -1, status: "held", liveFundsProcessed: true, legalEscrowActive: true }]);
  assert.equal(invalid.status, "FAIL");
  assert.ok(invalid.blockers.some((blocker) => /bookingId/.test(blocker)));
  assert.ok(invalid.blockers.some((blocker) => /liveFundsProcessed/.test(blocker)));
});

test("release refund and dispute placeholder workflows do not process live funds", () => {
  const result = validateReleaseRefundDisputePlaceholders();
  assert.equal(result.status, "PASS");
  assert.equal(result.liveFundsProcessed, false);
  assert.equal(result.legalEscrowActive, false);
  assert.match(result.releaseNotice, /No live funds/);
  assert.ok(result.rows.some((row) => row.workflow === "release" && row.actualStatus === "partially_released"));
  assert.ok(result.rows.some((row) => row.workflow === "refund" && row.actualStatus === "refunded"));
  assert.ok(result.rows.some((row) => row.workflow === "dispute" && row.actualStatus === "disputed"));
});

test("legal trust account checklist remains legal-review only", () => {
  assert.ok(LEGAL_TRUST_ACCOUNT_READINESS_CHECKLIST.some((row) => row.envKey === "LEGAL_TRUST_ACCOUNT_BANK"));
  const missing = buildLegalTrustAccountReadinessChecklist({});
  assert.equal(missing.status, "NEEDS_LEGAL_TRUST_ACCOUNT_REVIEW");
  assert.equal(missing.legalEscrowActive, false);
  assert.equal(missing.liveFundsProcessed, false);
  assert.equal(missing.legalApprovalRequired, true);

  const shaped = buildLegalTrustAccountReadinessChecklist(shapedEscrowEnv);
  assert.equal(shaped.status, "READY_FOR_LEGAL_TRUST_ACCOUNT_EVIDENCE");
  assert.equal(shaped.blockers.length, 0);
});

test("escrow evidence template is credential-safe and complete", () => {
  const template = renderEscrowEvidenceTemplate();
  assert.match(template, /Escrow Evidence Package Template/);
  assert.match(template, /Provider Intake Evidence/);
  assert.match(template, /Deposit State-Machine Evidence/);
  assert.match(template, /Escrow Ledger Evidence/);
  assert.match(template, /Release \/ Refund \/ Dispute Evidence/);
  assert.match(template, /Legal Trust Account Evidence/);
  for (const label of ["ESCROW_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "WIPAY_API_KEY"]) {
    assert.doesNotMatch(template, new RegExp(`${label}\\s*=`, "i"));
  }
});

test("escrow readiness tooling report is credential-ready only and blocks manual gaps", () => {
  const missing = buildEscrowReadinessToolingReport({ env: {} });
  assert.equal(missing.status, "NEEDS_ESCROW_EVIDENCE_OR_LEGAL_REVIEW");
  assert.equal(missing.liveEscrowActive, false);
  assert.equal(missing.liveFundsProcessed, false);
  assert.equal(missing.legalEscrowClaim, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /ESCROW_PROVIDER/.test(blocker)));

  const shaped = buildEscrowReadinessToolingReport({ env: shapedEscrowEnv });
  assert.equal(shaped.status, "ESCROW_CREDENTIAL_READY_FOR_REVIEW");
  assert.equal(shaped.provider, "legal_trust_account");
  assert.equal(shaped.liveEscrowActive, false);
  assert.equal(shaped.liveFundsProcessed, false);
  assert.equal(shaped.legalEscrowClaim, false);
});

test("escrow provider intake and legal trust evidence templates are credential-safe", () => {
  const provider = renderEscrowProviderIntakeTemplate();
  const legal = renderLegalTrustAccountEvidenceChecklist();
  assert.match(provider, /Escrow Provider Intake Template/);
  assert.match(provider, /Provider: Stripe Connect \/ WiPay \/ Lynk/);
  assert.match(provider, /ESCROW_PROVIDER/);
  assert.match(legal, /Legal Trust Account Evidence Checklist/);
  assert.match(legal, /Dual-control release authority/);
  assert.match(legal, /Live legal escrow remains inactive/);
  assertCredentialSafe(provider);
  assertCredentialSafe(legal);
});

test("deposit hold release partial refund and dispute templates cover controlled workflows", () => {
  const holdRelease = renderDepositHoldReleaseEvidenceChecklist();
  const partial = renderPartialReleaseEvidenceTemplate();
  const refund = renderRefundEvidenceTemplate();
  const dispute = renderDisputeEvidenceTemplate();
  assert.match(holdRelease, /Deposit Hold\/Release Evidence Checklist/);
  assert.match(holdRelease, /Deposit hold confirmed/);
  assert.match(holdRelease, /Full release requested/);
  assert.match(partial, /Partial Release Evidence Template/);
  assert.match(partial, /Remaining balance calculated correctly/);
  assert.match(refund, /Escrow Refund Evidence Template/);
  assert.match(refund, /Refund amount <= available balance/);
  assert.match(dispute, /Escrow Dispute Evidence Template/);
  assert.match(dispute, /No legal escrow decision claimed without approval/);
  for (const output of [holdRelease, partial, refund, dispute]) assertCredentialSafe(output);
});

test("escrow ledger evidence checklist includes static scenarios and no live-funds claim", () => {
  const markdown = renderEscrowLedgerEvidenceChecklist();
  assert.match(markdown, /Escrow Ledger Evidence Checklist/);
  assert.match(markdown, /Ledger record has unique ID/);
  assert.match(markdown, /ledger-security-deposit-held/);
  assert.match(markdown, /live funds NO/i);
  assertCredentialSafe(markdown);
});

test("escrow launch blocker report remains blocked pending legal and provider evidence", () => {
  const missing = buildEscrowLaunchBlockerReport({ env: {} });
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.liveEscrowActive, false);
  assert.equal(missing.liveFundsProcessed, false);
  assert.equal(missing.legalEscrowClaim, false);
  assert.ok(missing.blockers.some((blocker) => /Escrow provider selected/.test(blocker)));

  const shaped = buildEscrowLaunchBlockerReport({ env: shapedEscrowEnv });
  assert.equal(shaped.status, "BLOCKED");
  assert.ok(shaped.blockers.some((blocker) => /Escrow legal\/compliance signoff/.test(blocker)));

  const markdown = renderEscrowLaunchBlockerReport(shaped);
  assert.match(markdown, /Escrow Launch Blocker Report/);
  assert.match(markdown, /Escrow activation remains blocked/);
  assertCredentialSafe(markdown);
});
