const PLACEHOLDER_VALUES = new Set(["", "placeholder", "none", "todo", "tbd", "changeme", "your-value", "dev", "test"]);

export const COMPLIANCE_REQUIRED_KEYS = [
  "PRIVACY_OWNER_NAME",
  "PRIVACY_OWNER_EMAIL",
  "CONSENT_MANAGEMENT_STRATEGY",
  "DATA_RETENTION_POLICY_URL",
  "DATA_DELETION_POLICY_URL",
  "DATA_EXPORT_POLICY_URL",
  "DSAR_WORKFLOW_OWNER",
  "JAMAICA_DPA_REVIEW_OWNER",
  "GDPR_REVIEW_OWNER",
  "MARKETPLACE_COMPLIANCE_OWNER",
  "LEGAL_DOCUMENT_OWNER",
  "AUDIT_RETENTION_POLICY_URL",
  "KYC_PROVIDER",
  "KYC_POLICY_OWNER",
  "KYC_DATA_SHARING_POLICY_URL",
];

export const COMPLIANCE_DOMAINS = [
  {
    id: "privacy_program",
    label: "Privacy program",
    controls: ["privacy_owner", "consent_management", "data_retention", "data_deletion", "data_export", "dsar_workflow"],
    requiredKeys: ["PRIVACY_OWNER_NAME", "PRIVACY_OWNER_EMAIL", "CONSENT_MANAGEMENT_STRATEGY", "DATA_RETENTION_POLICY_URL", "DATA_DELETION_POLICY_URL", "DATA_EXPORT_POLICY_URL", "DSAR_WORKFLOW_OWNER"],
  },
  {
    id: "compliance_program",
    label: "Compliance program",
    controls: ["jamaica_data_protection_act", "gdpr_framework", "marketplace_compliance", "audit_retention", "legal_documents"],
    requiredKeys: ["JAMAICA_DPA_REVIEW_OWNER", "GDPR_REVIEW_OWNER", "MARKETPLACE_COMPLIANCE_OWNER", "AUDIT_RETENTION_POLICY_URL", "LEGAL_DOCUMENT_OWNER"],
  },
  {
    id: "kyc_readiness",
    label: "KYC readiness",
    controls: ["customer_verification", "supplier_verification", "dealer_verification", "inspector_verification", "transport_provider_verification", "financing_partner_verification"],
    requiredKeys: ["KYC_PROVIDER", "KYC_POLICY_OWNER", "KYC_DATA_SHARING_POLICY_URL"],
  },
];

export const KYC_SUBJECTS = [
  "customer",
  "supplier",
  "dealer",
  "inspector",
  "transport_provider",
  "financing_partner",
];

export const DATA_RIGHTS_WORKFLOWS = [
  "access_request",
  "correction_request",
  "deletion_request",
  "export_request",
  "consent_withdrawal",
  "retention_exception_review",
];

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder") && !normalized.startsWith("<");
}

function domainStatus(domain, env) {
  const missing = domain.requiredKeys.filter((key) => !hasRealValue(env[key]));
  return {
    id: domain.id,
    label: domain.label,
    controls: domain.controls,
    requiredKeys: domain.requiredKeys,
    missing,
    ready: missing.length === 0,
    status: missing.length ? "compliance_inputs_missing" : "ready_for_legal_review",
  };
}

export function calculateComplianceReadinessScore(env = process.env) {
  const missing = COMPLIANCE_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  return Math.round(((COMPLIANCE_REQUIRED_KEYS.length - missing.length) / COMPLIANCE_REQUIRED_KEYS.length) * 100);
}

export function getComplianceReadiness(env = process.env) {
  const missing = COMPLIANCE_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  const domains = COMPLIANCE_DOMAINS.map((domain) => domainStatus(domain, env));
  const score = calculateComplianceReadinessScore(env);
  const ready = missing.length === 0;
  return {
    kind: "privacyCompliance",
    provider: "provider_ready_compliance_controls",
    status: ready ? "ready_for_legal_compliance_review" : "privacy_compliance_inputs_missing",
    ready,
    score,
    missing,
    domains,
    dataRightsWorkflows: DATA_RIGHTS_WORKFLOWS,
    kycSubjects: KYC_SUBJECTS,
    liveKycVendorActive: false,
    realIdentityVerificationActive: false,
    sanctionsScreeningActive: false,
    amlMonitoringActive: false,
    documentVerificationProviderActive: false,
    complianceApproved: false,
    productionSuitable: false,
    message: ready
      ? "Privacy and compliance controls are ready for legal review. Live KYC, identity verification, sanctions screening, AML monitoring, and document-verification providers remain inactive."
      : `Privacy and compliance activation is missing required inputs: ${missing.join(", ")}.`,
  };
}
