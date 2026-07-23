import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CONSENT_WORKFLOW_PLACEHOLDERS,
  DATA_RETENTION_MATRIX,
  KYC_EVIDENCE_INTAKE_PLACEHOLDERS,
  PRIVACY_IMPACT_CHECKLIST,
  buildComplianceConfigChecklist,
  buildComplianceLaunchBlockerReport,
  buildComplianceReadinessToolingReport,
  renderComplianceLaunchBlockerReport,
  renderConsentEvidenceChecklist,
  renderComplianceEvidencePackageTemplate,
  renderDataRetentionMatrix,
  renderDsarRequestTemplate,
  renderGdprReadinessChecklist,
  renderJamaicaDpaReadinessChecklist,
  renderKycVendorReadinessChecklist,
  renderPrivacyPolicyEvidenceChecklist,
  renderRetentionDeletionEvidenceMatrix,
  renderTermsOfUseEvidenceChecklist,
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

function assertCredentialSafe(markdown) {
  assert.doesNotMatch(markdown, /SUPABASE_SERVICE_ROLE_KEY\s*=/i);
  assert.doesNotMatch(markdown, /JWT_SECRET\s*=/i);
  assert.doesNotMatch(markdown, /postgresql:\/\//i);
  assert.doesNotMatch(markdown, /PAYMENT_SECRET_KEY\s*=/i);
}

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

test("privacy policy and terms evidence checklists are generated without credentials", () => {
  const privacy = renderPrivacyPolicyEvidenceChecklist();
  const terms = renderTermsOfUseEvidenceChecklist();
  assert.match(privacy, /Privacy Policy Evidence Checklist/);
  assert.match(privacy, /Lawful basis mapped to workflows/);
  assert.match(privacy, /Legal review complete/);
  assert.match(terms, /Terms of Use Evidence Checklist/);
  assert.match(terms, /Rental\/sale\/trade\/auction boundaries included/);
  assert.match(terms, /Consent capture evidence defined/);
  assertCredentialSafe(privacy);
  assertCredentialSafe(terms);
});

test("Jamaica DPA and GDPR readiness checklists cover legal compliance evidence", () => {
  const jamaica = renderJamaicaDpaReadinessChecklist();
  const gdpr = renderGdprReadinessChecklist();
  assert.match(jamaica, /Jamaica Data Protection Act Readiness Checklist/);
  assert.match(jamaica, /Data subject rights process/);
  assert.match(jamaica, /Cross-border transfer review/);
  assert.match(gdpr, /GDPR Readiness Checklist/);
  assert.match(gdpr, /Lawful basis and purpose limitation/);
  assert.match(gdpr, /Processor\/DPA review/);
  assertCredentialSafe(jamaica);
  assertCredentialSafe(gdpr);
});

test("consent evidence checklist maps configured placeholder workflows", () => {
  const markdown = renderConsentEvidenceChecklist();
  assert.match(markdown, /Consent Evidence Checklist/);
  for (const id of ["marketplace_terms", "privacy_notice", "auction_bidder_terms", "kyc_data_sharing", "marketing_preferences"]) {
    assert.match(markdown, new RegExp(id));
  }
  assert.match(markdown, /Live consent management remains inactive/);
  assertCredentialSafe(markdown);
});

test("retention deletion evidence matrix covers legal holds and deletion status", () => {
  const markdown = renderRetentionDeletionEvidenceMatrix();
  assert.match(markdown, /Retention\/Deletion Evidence Matrix/);
  assert.match(markdown, /account_profile/);
  assert.match(markdown, /kyc_verification_documents/);
  assert.match(markdown, /Deletion automation remains inactive/);
  assertCredentialSafe(markdown);
});

test("KYC vendor readiness checklist keeps provider inactive and private", () => {
  const markdown = renderKycVendorReadinessChecklist();
  assert.match(markdown, /KYC Vendor Readiness Checklist/);
  assert.match(markdown, /customer/);
  assert.match(markdown, /supplier/);
  assert.match(markdown, /private-verification/);
  assert.match(markdown, /Live KYC vendor activation remains inactive/);
  assertCredentialSafe(markdown);
});

test("compliance launch blocker report remains blocked pending legal and provider evidence", () => {
  const missing = buildComplianceLaunchBlockerReport({ env: {} });
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.liveKycVendorActive, false);
  assert.equal(missing.legalApprovalComplete, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /Privacy policy legal approval/.test(blocker)));
  assert.ok(missing.blockers.some((blocker) => /Jamaica DPA legal review/.test(blocker)));

  const shaped = buildComplianceLaunchBlockerReport({ env: shapedEnv });
  assert.equal(shaped.status, "BLOCKED");
  assert.ok(shaped.blockers.some((blocker) => /KYC vendor approval/.test(blocker)));

  const markdown = renderComplianceLaunchBlockerReport(shaped);
  assert.match(markdown, /Compliance Launch Blocker Report/);
  assert.match(markdown, /D2 Compliance Operationalization remains blocked/);
  assertCredentialSafe(markdown);
});
