import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLOSED_BETA_PACKAGE_SECTIONS,
  MANUAL_OPERATING_PROCEDURE_TEMPLATES,
  SUPPORT_ESCALATION_MATRIX,
  SUPPLIER_ONBOARDING_EVIDENCE_TRACKER,
  UAT_EXECUTION_CHECKLIST,
  buildOperationalReadinessReport,
  buildPilotReadinessScorecard,
  renderClosedBetaReadinessPackage,
  renderManualOperatingProcedureTemplates,
  validateSupplierOnboardingEvidenceTracker,
  validateSupportEscalationMatrix,
  validateUatExecutionChecklist,
} from "../../scripts/operational-readiness-tooling.mjs";

const shapedOperationsEnv = {
  UAT_OWNER_EMAIL: "uat-owner@rentashub.test",
  UAT_SIGNOFF_OWNER: "uat-signoff@rentashub.test",
  SECURITY_REVIEW_OWNER: "security-review@rentashub.test",
  INCIDENT_OWNER_EMAIL: "incident-owner@rentashub.test",
  SECURITY_OWNER_EMAIL: "security-owner@rentashub.test",
  PILOT_SUPPORT_EMAIL: "support@rentashub.test",
  PILOT_ESCALATION_EMAIL: "escalation@rentashub.test",
  SUPPORT_OWNER_EMAIL: "support-owner@rentashub.test",
  PILOT_OWNER_EMAIL: "pilot-owner@rentashub.test",
  PILOT_REGION: "Jamaica UAT",
  PILOT_SUPPLIER_TARGET: "20",
  PILOT_CUSTOMER_TARGET: "100",
  PILOT_OPERATING_HOURS: "Mon-Fri 9:00-17:00 America/Jamaica",
};

const completeSupplierEvidence = SUPPLIER_ONBOARDING_EVIDENCE_TRACKER.map((step) => ({
  step: step.step,
  evidence: Object.fromEntries(step.evidence.map((field, index) => [field, `complete-evidence-${step.step}-${index}`])),
}));

test("UAT execution checklist reports missing owners and remains evidence-only", () => {
  assert.ok(UAT_EXECUTION_CHECKLIST.some((row) => row.area === "marketplace"));
  assert.ok(UAT_EXECUTION_CHECKLIST.some((row) => row.area === "auctions"));
  const missing = validateUatExecutionChecklist({});
  assert.equal(missing.status, "NEEDS_UAT_OWNERS");
  assert.equal(missing.liveUsersActive, false);
  assert.equal(missing.publicLaunchAuthorized, false);
  assert.ok(missing.blockers.some((blocker) => /UAT_OWNER_EMAIL/.test(blocker)));

  const shaped = validateUatExecutionChecklist(shapedOperationsEnv);
  assert.equal(shaped.status, "READY_FOR_UAT_EVIDENCE");
  assert.equal(shaped.blockers.length, 0);
  assert.ok(shaped.rows.every((row) => row.status === "pending_evidence"));
});

test("support escalation matrix covers severity levels and requires owners", () => {
  assert.deepEqual(SUPPORT_ESCALATION_MATRIX.map((row) => row.severity), ["SEV1", "SEV2", "SEV3", "SEV4"]);
  const missing = validateSupportEscalationMatrix({});
  assert.equal(missing.status, "NEEDS_SUPPORT_OWNERS");
  assert.equal(missing.liveOnCallActive, false);
  assert.equal(missing.alertRoutingActive, false);
  assert.ok(missing.blockers.some((blocker) => /INCIDENT_OWNER_EMAIL/.test(blocker)));

  const shaped = validateSupportEscalationMatrix(shapedOperationsEnv);
  assert.equal(shaped.status, "READY_FOR_ESCALATION_EVIDENCE");
  assert.equal(shaped.blockers.length, 0);
});

test("supplier onboarding evidence tracker validates all required pilot steps", () => {
  const stepNames = SUPPLIER_ONBOARDING_EVIDENCE_TRACKER.map((row) => row.step);
  for (const step of ["invitation_sent", "profile_completed", "verification_submitted", "asset_listed", "listing_reviewed", "training_completed", "pilot_ready"]) {
    assert.ok(stepNames.includes(step));
  }
  const missing = validateSupplierOnboardingEvidenceTracker([]);
  assert.equal(missing.status, "NEEDS_SUPPLIER_EVIDENCE");
  assert.equal(missing.liveSupplierPilotActive, false);
  assert.ok(missing.blockers.some((blocker) => /invitation_sent/.test(blocker)));

  const complete = validateSupplierOnboardingEvidenceTracker(completeSupplierEvidence);
  assert.equal(complete.status, "SUPPLIER_ONBOARDING_EVIDENCE_READY");
  assert.equal(complete.blockers.length, 0);
});

test("pilot readiness scorecard blocks closed beta until operational evidence is complete", () => {
  const missing = buildPilotReadinessScorecard({}, {});
  assert.equal(missing.status, "NEEDS_OPERATIONAL_EVIDENCE");
  assert.equal(missing.score < 85, true);
  assert.equal(missing.closedBetaActive, false);
  assert.equal(missing.paidPilotActive, false);
  assert.equal(missing.publicLaunchActive, false);

  const shaped = buildPilotReadinessScorecard(shapedOperationsEnv, { supplierOnboarding: completeSupplierEvidence });
  assert.equal(shaped.status, "CLOSED_BETA_OPERATIONALLY_READY_FOR_REVIEW");
  assert.equal(shaped.score, 100);
  assert.equal(shaped.blockers.length, 0);
});

test("manual operating procedure templates cover major operating workflows", () => {
  const ids = MANUAL_OPERATING_PROCEDURE_TEMPLATES.map((row) => row.id);
  for (const id of ["supplier_onboarding", "customer_support", "dispute_escalation", "incident_response", "closed_beta_go_no_go"]) {
    assert.ok(ids.includes(id));
  }
  const rendered = renderManualOperatingProcedureTemplates();
  assert.match(rendered, /Manual Operating Procedure Templates/);
  assert.match(rendered, /Supplier Onboarding Manual Procedure/);
  assert.match(rendered, /Closed Beta Go\/No-Go Manual Procedure/);
  assert.match(rendered, /do not authorize live launch/i);
});

test("closed beta readiness package generator is complete and credential-safe", () => {
  assert.ok(CLOSED_BETA_PACKAGE_SECTIONS.includes("UAT Execution Evidence"));
  assert.ok(CLOSED_BETA_PACKAGE_SECTIONS.includes("No-Live-Provider Boundary"));
  const rendered = renderClosedBetaReadinessPackage();
  assert.match(rendered, /Closed Beta Readiness Package Template/);
  assert.match(rendered, /Supplier Onboarding Evidence/);
  assert.match(rendered, /GO \/ CONDITIONAL GO \/ NO-GO/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "PAYMENT_SECRET_KEY", "ESCROW_API_KEY"]) {
    assert.doesNotMatch(rendered, new RegExp(`${label}\\s*=`, "i"));
  }
});

test("operational readiness report is evidence-only and blocks missing manual owners", () => {
  const missing = buildOperationalReadinessReport({ env: {}, evidence: {} });
  assert.equal(missing.status, "NEEDS_OPERATIONAL_EVIDENCE");
  assert.equal(missing.closedBetaActive, false);
  assert.equal(missing.paidPilotActive, false);
  assert.equal(missing.publicLaunchActive, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /UAT_OWNER_EMAIL/.test(blocker)));

  const shaped = buildOperationalReadinessReport({ env: shapedOperationsEnv, evidence: { supplierOnboarding: completeSupplierEvidence } });
  assert.equal(shaped.status, "OPERATIONAL_READINESS_READY_FOR_CLOSED_BETA_REVIEW");
  assert.equal(shaped.scorecard.score, 100);
  assert.equal(shaped.blockers.length, 0);
});
