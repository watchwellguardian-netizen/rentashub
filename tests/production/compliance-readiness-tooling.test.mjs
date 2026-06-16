import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONSENT_WORKFLOW_PLACEHOLDERS,
  DATA_RETENTION_MATRIX,
  KYC_EVIDENCE_INTAKE_PLACEHOLDERS,
  PRIVACY_IMPACT_CHECKLIST,
  buildComplianceConfigChecklist,
  buildComplianceReadinessToolingReport,
  renderComplianceEvidencePackageTemplate,
  renderDataRetentionMatrix,
  renderDsarRequestTemplate,
  validateConsentWorkflowPlaceholders,
  validateDataRetentionMatrix,
  validateDsarRequestTemplate,
  validateKycEvidenceIntakePlaceholders,
  validatePrivacyImpactChecklist,
} from "../../scripts/compliance-readiness-tooling.mjs";

const shapedEnv = {
  PRIVACY_OWNER_NAME: "Privacy Owner",
  PRIVACY_OWNER_EMAIL: "privacy@rentashub.test",
  CONSENT_MANAGEMENT_STRATEGY: "explicit-consent-and-preferences",
  DATA_RETENTION_POLICY_URL: "https://compliance.rentashub.test/retention",
  DATA_DELETION_POLICY_URL: "https://compliance.rentashub.test/deletion",
  DATA_EXPORT_POLICY_URL: "https://compliance.rentashub.test/export",
  DSAR_WORKFLOW_OWNER: "dsar@rentashub.test",
  JAMAICA_DPA_REVIEW_OWNER: "jamaica-dpa@rentashub.test",
  GDPR_REVIEW_OWNER: "gdpr@rentashub.test",
  MARKETPLACE_COMPLIANCE_OWNER: "marketplace-compliance@rentashub.test",
  LEGAL_DOCUMENT_OWNER: "legal@rentashub.test",
  AUDIT_RETENTION_POLICY_URL: "https://compliance.rentashub.test/audit-retention",
  KYC_PROVIDER: "persona",
  KYC_POLICY_OWNER: "kyc@rentashub.test",
  KYC_DATA_SHARING_POLICY_URL: "https://compliance.rentashub.test/kyc-sharing",
};

test("consent workflow placeholders cover marketplace privacy auction KYC and marketing preferences", () => {
  const result = validateConsentWorkflowPlaceholders();
  assert.equal(result.status, "PASS");
  assert.equal(result.providerActive, false);
  const ids = CONSENT_WORKFLOW_PLACEHOLDERS.map((item) => item.id);
  assert.ok(ids.includes("marketplace_terms"));
  assert.ok(ids.includes("privacy_notice"));
  assert.ok(ids.includes("auction_bidder_terms"));
  assert.ok(ids.includes("kyc_data_sharing"));
  assert.ok(ids.includes("marketing_preferences"));
});

test("DSAR request template covers required data-rights workflows without secrets", () => {
  const result = validateDsarRequestTemplate();
  assert.equal(result.status, "PASS");
  assert.equal(result.liveFulfillmentActive, false);
  for (const workflow of ["access_request", "correction_request", "deletion_request", "export_request", "consent_withdrawal"]) {
    assert.ok(result.workflows.includes(workflow));
  }
  const template = renderDsarRequestTemplate();
  assert.match(template, /DSAR Request Evidence Template/);
  assert.match(template, /Legal hold present/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "password="]) {
    assert.doesNotMatch(template, new RegExp(label, "i"));
  }
});

test("data retention matrix covers account booking payment KYC evidence and audit classes", () => {
  const result = validateDataRetentionMatrix();
  assert.equal(result.status, "PASS");
  assert.equal(result.legalApprovalRequired, true);
  const dataClasses = DATA_RETENTION_MATRIX.map((item) => item.dataClass);
  for (const dataClass of ["account_profile", "booking_records", "payment_ledger_records", "kyc_verification_documents", "claims_dispute_evidence", "audit_logs"]) {
    assert.ok(dataClasses.includes(dataClass));
  }
  const markdown = renderDataRetentionMatrix();
  assert.match(markdown, /kyc_verification_documents/);
  assert.match(markdown, /audit_logs/);
});

test("KYC evidence intake placeholders cover all verification subjects and block public access", () => {
  const result = validateKycEvidenceIntakePlaceholders();
  assert.equal(result.status, "PASS");
  assert.equal(result.providerActive, false);
  for (const subject of ["customer", "supplier", "dealer", "inspector", "transport_provider", "financing_partner"]) {
    const row = KYC_EVIDENCE_INTAKE_PLACEHOLDERS.find((item) => item.subject === subject);
    assert.ok(row);
    assert.equal(row.publicAllowed, false);
    assert.equal(row.signedAccessRequired, true);
    assert.equal(row.storageClass, "private-verification");
  }
});

test("privacy impact checklist includes required assessment controls", () => {
  const result = validatePrivacyImpactChecklist();
  assert.equal(result.status, "PASS");
  assert.equal(result.legalReviewRequired, true);
  const ids = PRIVACY_IMPACT_CHECKLIST.map((item) => item.id);
  for (const id of ["lawful_basis", "data_minimization", "access_controls", "storage_security", "dsar_process", "retention_deletion"]) {
    assert.ok(ids.includes(id));
  }
});

test("compliance config checklist reports missing and shaped inputs without printing values", () => {
  const missing = buildComplianceConfigChecklist({});
  assert.equal(missing.status, "NEEDS_CREDENTIALS");
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /PRIVACY_OWNER_NAME/.test(blocker)));

  const shaped = buildComplianceConfigChecklist(shapedEnv);
  assert.equal(shaped.status, "CREDENTIAL_READY_FOR_LEGAL_REVIEW");
  assert.equal(shaped.valuePrinted, false);
  assert.equal(shaped.blockers.length, 0);
});

test("compliance evidence package template requests evidence without credential values", () => {
  const template = renderComplianceEvidencePackageTemplate();
  assert.match(template, /Compliance Evidence Package Template/);
  assert.match(template, /Consent Evidence/);
  assert.match(template, /DSAR Evidence/);
  assert.match(template, /KYC Intake Evidence/);
  assert.match(template, /Privacy Impact Checklist/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "JWT_SECRET", "PAYMENT_SECRET_KEY"]) {
    assert.doesNotMatch(template, new RegExp(`${label}\\s*=`, "i"));
  }
});

test("compliance readiness report remains provider-ready and blocks missing manual inputs", () => {
  const missing = buildComplianceReadinessToolingReport({ env: {} });
  assert.equal(missing.status, "NEEDS_CREDENTIALS_OR_LEGAL_REVIEW");
  assert.equal(missing.liveKycVendorActive, false);
  assert.equal(missing.legalApprovalComplete, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /PRIVACY_OWNER_NAME/.test(blocker)));

  const shaped = buildComplianceReadinessToolingReport({ env: shapedEnv });
  assert.equal(shaped.status, "CREDENTIAL_READY_FOR_LEGAL_REVIEW");
  assert.equal(shaped.liveKycVendorActive, false);
  assert.equal(shaped.legalApprovalComplete, false);
});
