import assert from "node:assert/strict";
import { test } from "node:test";
import { getIntegrationReadiness } from "../src/config/integrationReadiness.js";
import {
  COMPLIANCE_DOMAINS,
  DATA_RIGHTS_WORKFLOWS,
  KYC_SUBJECTS,
  calculateComplianceReadinessScore,
  getComplianceReadiness,
} from "../src/compliance/complianceReadiness.js";

const completeEnv = {
  PRIVACY_OWNER_NAME: "Privacy Owner",
  PRIVACY_OWNER_EMAIL: "privacy@example.test",
  CONSENT_MANAGEMENT_STRATEGY: "explicit-consent-and-preferences",
  DATA_RETENTION_POLICY_URL: "https://example.test/retention",
  DATA_DELETION_POLICY_URL: "https://example.test/deletion",
  DATA_EXPORT_POLICY_URL: "https://example.test/export",
  DSAR_WORKFLOW_OWNER: "dsar@example.test",
  JAMAICA_DPA_REVIEW_OWNER: "dpa@example.test",
  GDPR_REVIEW_OWNER: "gdpr@example.test",
  MARKETPLACE_COMPLIANCE_OWNER: "compliance@example.test",
  LEGAL_DOCUMENT_OWNER: "legal@example.test",
  AUDIT_RETENTION_POLICY_URL: "https://example.test/audit-retention",
  KYC_PROVIDER: "persona",
  KYC_POLICY_OWNER: "kyc@example.test",
  KYC_DATA_SHARING_POLICY_URL: "https://example.test/kyc-sharing",
};

test("compliance readiness defines privacy compliance and KYC domains", () => {
  assert.deepEqual(COMPLIANCE_DOMAINS.map((domain) => domain.id), ["privacy_program", "compliance_program", "kyc_readiness"]);
  assert.ok(DATA_RIGHTS_WORKFLOWS.includes("deletion_request"));
  assert.ok(DATA_RIGHTS_WORKFLOWS.includes("export_request"));
  assert.ok(KYC_SUBJECTS.includes("supplier"));
  assert.ok(KYC_SUBJECTS.includes("financing_partner"));
});

test("compliance readiness defaults to missing inputs and inactive providers", () => {
  const readiness = getComplianceReadiness({});
  assert.equal(readiness.kind, "privacyCompliance");
  assert.equal(readiness.status, "privacy_compliance_inputs_missing");
  assert.equal(readiness.score, 0);
  assert.ok(readiness.missing.includes("JAMAICA_DPA_REVIEW_OWNER"));
  assert.equal(readiness.liveKycVendorActive, false);
  assert.equal(readiness.realIdentityVerificationActive, false);
  assert.equal(readiness.sanctionsScreeningActive, false);
  assert.equal(readiness.amlMonitoringActive, false);
  assert.equal(readiness.documentVerificationProviderActive, false);
  assert.equal(readiness.complianceApproved, false);
  assert.equal(readiness.productionSuitable, false);
});

test("compliance readiness accepts shaped policy inputs without activating live providers", () => {
  const readiness = getComplianceReadiness(completeEnv);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.score, 100);
  assert.equal(calculateComplianceReadinessScore(completeEnv), 100);
  assert.equal(readiness.domains.every((domain) => domain.ready), true);
  assert.equal(readiness.liveKycVendorActive, false);
  assert.equal(readiness.complianceApproved, false);
});

test("integration readiness exposes compliance activation workstream", () => {
  const readiness = getIntegrationReadiness({});
  assert.equal(readiness.checks.compliance.kind, "privacyCompliance");
  assert.equal(readiness.checks.compliance.ready, false);
  assert.equal(readiness.workstreams.complianceActivation.status, "manual_provider_required");
  assert.match(readiness.workstreams.complianceActivation.note, /Jamaica DPA\/GDPR review/);
});
