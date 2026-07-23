import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPLIANCE_DOMAINS,
  COMPLIANCE_REQUIRED_KEYS,
  DATA_RIGHTS_WORKFLOWS,
  KYC_SUBJECTS,
  getComplianceReadiness,
} from "../server/src/compliance/complianceReadiness.js";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/];

export const CONSENT_WORKFLOW_PLACEHOLDERS = [
  {
    id: "marketplace_terms",
    subject: "all_users",
    trigger: "account_registration",
    consentType: "terms_of_use",
    requiredBefore: "authenticated_marketplace_actions",
    evidenceRequired: ["notice_version", "accepted_at", "actor_id", "ip_user_agent_hash"],
    providerActive: false,
  },
  {
    id: "privacy_notice",
    subject: "all_users",
    trigger: "account_registration",
    consentType: "privacy_notice",
    requiredBefore: "personal_data_processing",
    evidenceRequired: ["notice_version", "accepted_at", "actor_id", "withdrawal_path"],
    providerActive: false,
  },
  {
    id: "auction_bidder_terms",
    subject: "auction_bidders",
    trigger: "first_bid_attempt",
    consentType: "auction_terms",
    requiredBefore: "auction_bid_submission",
    evidenceRequired: ["terms_version", "auction_id", "accepted_at", "bidder_id"],
    providerActive: false,
  },
  {
    id: "kyc_data_sharing",
    subject: "verification_subjects",
    trigger: "verification_submission",
    consentType: "kyc_data_sharing",
    requiredBefore: "identity_or_business_verification",
    evidenceRequired: ["policy_version", "provider_name", "accepted_at", "subject_id"],
    providerActive: false,
  },
  {
    id: "marketing_preferences",
    subject: "all_users",
    trigger: "profile_preferences",
    consentType: "optional_marketing",
    requiredBefore: "promotional_messages",
    evidenceRequired: ["channel", "preference", "updated_at", "actor_id"],
    providerActive: false,
  },
];

export const DATA_RETENTION_MATRIX = [
  { dataClass: "account_profile", defaultRetention: "account_life_plus_2_years", legalHold: true, deletionEligible: true, owner: "privacy_owner" },
  { dataClass: "booking_records", defaultRetention: "7_years", legalHold: true, deletionEligible: false, owner: "marketplace_compliance_owner" },
  { dataClass: "payment_ledger_records", defaultRetention: "7_years_minimum", legalHold: true, deletionEligible: false, owner: "revenue_compliance_owner" },
  { dataClass: "kyc_verification_documents", defaultRetention: "legal_review_required", legalHold: true, deletionEligible: "restricted", owner: "kyc_policy_owner" },
  { dataClass: "claims_dispute_evidence", defaultRetention: "7_years_or_case_close_plus_policy", legalHold: true, deletionEligible: "restricted", owner: "trust_safety_owner" },
  { dataClass: "audit_logs", defaultRetention: "365_to_2555_days_by_category", legalHold: true, deletionEligible: false, owner: "security_compliance_owner" },
  { dataClass: "notification_preferences", defaultRetention: "account_life_plus_1_year", legalHold: false, deletionEligible: true, owner: "privacy_owner" },
];

export const KYC_EVIDENCE_INTAKE_PLACEHOLDERS = KYC_SUBJECTS.map((subject) => ({
  subject,
  requiredEvidence: subject === "customer"
    ? ["government_id_placeholder", "proof_of_address_placeholder", "selfie_liveness_placeholder"]
    : ["business_registration_placeholder", "authorized_representative_id_placeholder", "proof_of_address_placeholder", "insurance_or_license_placeholder"],
  storageClass: "private-verification",
  publicAllowed: false,
  signedAccessRequired: true,
  providerActive: false,
  manualReviewRequired: true,
}));

export const PRIVACY_IMPACT_CHECKLIST = [
  { id: "lawful_basis", label: "Lawful basis documented", requiredEvidence: "Privacy/legal owner confirms basis for each personal-data workflow." },
  { id: "data_minimization", label: "Data minimization reviewed", requiredEvidence: "Only required fields are collected for marketplace, auction, KYC, and support workflows." },
  { id: "purpose_limitation", label: "Purpose limitation documented", requiredEvidence: "Processing purposes are mapped to notices and consent workflows." },
  { id: "access_controls", label: "Access controls reviewed", requiredEvidence: "RBAC/RLS and admin access evidence are attached." },
  { id: "storage_security", label: "Storage security reviewed", requiredEvidence: "Private buckets, signed URL rules, and retention rules are verified." },
  { id: "third_party_processors", label: "Processor inventory reviewed", requiredEvidence: "Supabase, monitoring, payment, KYC, email/SMS, and support processors are listed when active." },
  { id: "cross_border_transfer", label: "Cross-border transfer assessed", requiredEvidence: "Hosting/provider regions and transfer safeguards are documented." },
  { id: "dsar_process", label: "DSAR process tested", requiredEvidence: "Access, export, correction, deletion, and consent withdrawal evidence is attached." },
  { id: "retention_deletion", label: "Retention and deletion controls reviewed", requiredEvidence: "Retention matrix is approved and deletion exceptions are documented." },
  { id: "incident_response", label: "Privacy incident response linked", requiredEvidence: "Incident response and breach notification procedures are referenced." },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function validateUrlLike(value) {
  const raw = String(value || "").trim();
  return /^https:\/\/[^\s]+\.[^\s]+/.test(raw);
}

export function validateConsentWorkflowPlaceholders() {
  const blockers = [];
  for (const workflow of CONSENT_WORKFLOW_PLACEHOLDERS) {
    if (!workflow.id || !workflow.subject || !workflow.trigger || !workflow.consentType) blockers.push(`Consent workflow ${workflow.id || "unknown"} is incomplete.`);
    if (workflow.providerActive) blockers.push(`${workflow.id} must remain provider-inactive at credential-readiness stage.`);
    if (!workflow.evidenceRequired?.length) blockers.push(`${workflow.id} must list evidence requirements.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    workflows: CONSENT_WORKFLOW_PLACEHOLDERS,
    providerActive: false,
    blockers,
  };
}

export function validateDsarRequestTemplate() {
  const requiredWorkflows = ["access_request", "correction_request", "deletion_request", "export_request", "consent_withdrawal"];
  const blockers = requiredWorkflows.filter((workflow) => !DATA_RIGHTS_WORKFLOWS.includes(workflow)).map((workflow) => `Missing DSAR workflow: ${workflow}`);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    workflows: DATA_RIGHTS_WORKFLOWS,
    templateReady: true,
    liveFulfillmentActive: false,
    blockers,
  };
}

export function validateDataRetentionMatrix() {
  const blockers = [];
  for (const row of DATA_RETENTION_MATRIX) {
    if (!row.dataClass || !row.defaultRetention || !row.owner) blockers.push(`Retention row ${row.dataClass || "unknown"} is incomplete.`);
    if (/kyc|evidence|audit|payment/.test(row.dataClass) && !row.legalHold) blockers.push(`${row.dataClass} must support legal hold.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    rows: DATA_RETENTION_MATRIX,
    legalApprovalRequired: true,
    blockers,
  };
}

export function validateKycEvidenceIntakePlaceholders() {
  const blockers = [];
  const subjects = new Set(KYC_EVIDENCE_INTAKE_PLACEHOLDERS.map((item) => item.subject));
  for (const subject of KYC_SUBJECTS) {
    if (!subjects.has(subject)) blockers.push(`Missing KYC intake placeholder for ${subject}.`);
  }
  for (const row of KYC_EVIDENCE_INTAKE_PLACEHOLDERS) {
    if (row.publicAllowed) blockers.push(`${row.subject} KYC evidence must not be public.`);
    if (!row.signedAccessRequired) blockers.push(`${row.subject} KYC evidence must require signed/private access.`);
    if (row.providerActive) blockers.push(`${row.subject} KYC provider must remain inactive at readiness stage.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    placeholders: KYC_EVIDENCE_INTAKE_PLACEHOLDERS,
    providerActive: false,
    blockers,
  };
}

export function validatePrivacyImpactChecklist() {
  const required = ["lawful_basis", "data_minimization", "access_controls", "storage_security", "dsar_process", "retention_deletion"];
  const ids = new Set(PRIVACY_IMPACT_CHECKLIST.map((item) => item.id));
  const blockers = required.filter((id) => !ids.has(id)).map((id) => `Missing privacy impact checklist item: ${id}`);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    checklist: PRIVACY_IMPACT_CHECKLIST,
    legalReviewRequired: true,
    blockers,
  };
}

export function buildComplianceConfigChecklist(env = process.env) {
  const readiness = getComplianceReadiness(env);
  const checks = COMPLIANCE_REQUIRED_KEYS.map((key) => ({
    key,
    status: hasRealValue(env[key]) ? "present" : "missing_or_placeholder",
    valuePrinted: false,
    policyUrlLooksValid: key.endsWith("_URL") ? validateUrlLike(env[key]) : undefined,
  }));
  const blockers = checks
    .filter((check) => check.status !== "present" || check.policyUrlLooksValid === false)
    .map((check) => `${check.key} is required for compliance credential-readiness.`);
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS" : "CREDENTIAL_READY_FOR_LEGAL_REVIEW",
    provider: "provider_ready_compliance_controls",
    score: readiness.score,
    domains: COMPLIANCE_DOMAINS,
    checks,
    valuePrinted: false,
    blockers,
  };
}

export function renderDsarRequestTemplate() {
  return `# DSAR Request Evidence Template

Do not include passwords, raw identity documents, service-role keys, access tokens, refresh tokens, or screenshots containing secrets.

## Request Intake

- Environment: Development / UAT / Production
- Request ID:
- Request type: Access / Correction / Deletion / Export / Consent Withdrawal / Retention Exception
- Requester role: Customer / Supplier / Dealer / Inspector / Transport Provider / Financing Partner / Admin
- Requester identifier:
- Verification method:
- Date received:
- Due date:
- Assigned privacy owner:

## Scope

- Data categories requested:
- Systems checked:
- Legal hold present: Yes / No
- Retention exception present: Yes / No
- Third-party processor involvement: Yes / No

## Fulfillment Evidence

- Identity verification completed:
- Data export generated:
- Correction/deletion action completed:
- Consent preference updated:
- Audit event recorded:
- Response delivered:

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderComplianceEvidencePackageTemplate() {
  return `# Compliance Evidence Package Template

Do not include live KYC documents, Supabase service-role keys, payment secrets, JWT secrets, passwords, or screenshots containing credentials.

## Environment

- Environment: Development / UAT
- Compliance Owner:
- Privacy Owner:
- KYC Policy Owner:
- Date:

## Consent Evidence

| Workflow | Status | Evidence Location | Notes |
| --- | --- | --- | --- |
${CONSENT_WORKFLOW_PLACEHOLDERS.map((workflow) => `| ${workflow.id} | Pending |  | ${workflow.consentType} |`).join("\n")}

## DSAR Evidence

| Workflow | Status | Evidence Location | Notes |
| --- | --- | --- | --- |
${DATA_RIGHTS_WORKFLOWS.map((workflow) => `| ${workflow} | Pending |  |  |`).join("\n")}

## Retention Evidence

| Data Class | Retention | Legal Hold | Evidence Location |
| --- | --- | --- | --- |
${DATA_RETENTION_MATRIX.map((row) => `| ${row.dataClass} | ${row.defaultRetention} | ${row.legalHold ? "Yes" : "No"} |  |`).join("\n")}

## KYC Intake Evidence

| Subject | Storage Class | Public Allowed | Signed Access Required | Evidence Location |
| --- | --- | --- | --- | --- |
${KYC_EVIDENCE_INTAKE_PLACEHOLDERS.map((row) => `| ${row.subject} | ${row.storageClass} | ${row.publicAllowed ? "Yes" : "No"} | ${row.signedAccessRequired ? "Yes" : "No"} |  |`).join("\n")}

## Privacy Impact Checklist

| Item | Status | Evidence Location |
| --- | --- | --- |
${PRIVACY_IMPACT_CHECKLIST.map((item) => `| ${item.label} | Pending |  |`).join("\n")}

## Decision

- Result: PASS / FAIL
- Missing evidence:
- Legal approval status:
- Next action:
`;
}

export function renderPrivacyPolicyEvidenceChecklist() {
  return `# Privacy Policy Evidence Checklist

Do not include private user data, KYC documents, credentials, secrets, tokens, or screenshots containing sensitive information.

| Evidence Item | Development | UAT | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| Privacy policy owner assigned | Pending | Pending | Pending | Reference owner only. |
| Policy version recorded | Pending | Pending | Pending | Version/date, not draft secrets. |
| Lawful basis mapped to workflows | Pending | Pending | Pending | Marketplace, auctions, payments, support, KYC. |
| Data categories disclosed | Pending | Pending | Pending | Include uploads, messages, audit logs, payment placeholders. |
| Processor inventory included | Pending | Pending | Pending | Supabase/hosting/monitoring/payment/KYC only when active. |
| Data rights instructions included | Pending | Pending | Pending | Access, correction, deletion, export, withdrawal. |
| Retention/deletion summary included | Pending | Pending | Pending | Reference approved retention matrix. |
| Legal review complete | Pending | Pending | Pending | Manual legal signoff required. |
`;
}

export function renderTermsOfUseEvidenceChecklist() {
  return `# Terms of Use Evidence Checklist

Do not include credentials, secrets, private user data, or screenshots containing sensitive information.

| Evidence Item | Development | UAT | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| Terms owner assigned | Pending | Pending | Pending | Legal/document owner. |
| Marketplace terms version recorded | Pending | Pending | Pending | Required before account actions. |
| Rental/sale/trade/auction boundaries included | Pending | Pending | Pending | Must not claim live escrow/payment where inactive. |
| Supplier obligations included | Pending | Pending | Pending | Listing accuracy, inspection, disputes. |
| Customer obligations included | Pending | Pending | Pending | Booking, damage, payments, conduct. |
| Dispute/claims terms included | Pending | Pending | Pending | Simulation-safe until legal approval. |
| Consent capture evidence defined | Pending | Pending | Pending | Version, timestamp, actor, audit record. |
| Legal review complete | Pending | Pending | Pending | Manual legal signoff required. |
`;
}

export function renderJamaicaDpaReadinessChecklist() {
  return `# Jamaica Data Protection Act Readiness Checklist

Do not include personal data, KYC files, credentials, tokens, or screenshots containing sensitive information.

| Readiness Area | Evidence Required | Status | Evidence Location |
| --- | --- | --- | --- |
| Data controller/processor roles | Legal mapping and owner approval | Pending |  |
| Lawful basis for processing | Workflow-to-purpose mapping | Pending |  |
| Data subject rights process | DSAR intake, verification, fulfillment evidence | Pending |  |
| Consent management | Consent capture and withdrawal evidence | Pending |  |
| Data security controls | RBAC, storage, audit, secret-safety evidence | Pending |  |
| Breach/incident notification | Incident response and notification procedure | Pending |  |
| Cross-border transfer review | Provider region and safeguard evidence | Pending |  |
| Retention/deletion controls | Approved retention matrix and deletion exceptions | Pending |  |
| Legal review signoff | Jamaica DPA review owner approval | Pending |  |
`;
}

export function renderGdprReadinessChecklist() {
  return `# GDPR Readiness Checklist

Do not include personal data, KYC files, credentials, tokens, or screenshots containing sensitive information.

| Readiness Area | Evidence Required | Status | Evidence Location |
| --- | --- | --- | --- |
| Lawful basis and purpose limitation | Processing activity evidence | Pending |  |
| Transparency/privacy notice | Published notice and version evidence | Pending |  |
| Data minimization | Field inventory and justification | Pending |  |
| DSAR process | Access/export/correction/deletion workflow evidence | Pending |  |
| Consent withdrawal | Preference and withdrawal evidence | Pending |  |
| Processor/DPA review | Provider inventory and DPA status | Pending |  |
| Cross-border transfer safeguards | Hosting/provider region review | Pending |  |
| Security controls | RBAC, encryption, logging, secret-safety evidence | Pending |  |
| Breach response | Incident response and notification timing evidence | Pending |  |
| Legal review signoff | GDPR review owner approval | Pending |  |
`;
}

export function renderConsentEvidenceChecklist() {
  return [
    "# Consent Evidence Checklist",
    "",
    "Do not include passwords, tokens, cookies, raw IP addresses, private user data, or screenshots containing sensitive information.",
    "",
    "| Workflow | Trigger | Consent Type | Required Before | Evidence Required | Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...CONSENT_WORKFLOW_PLACEHOLDERS.map((workflow) => `| ${workflow.id} | ${workflow.trigger} | ${workflow.consentType} | ${workflow.requiredBefore} | ${workflow.evidenceRequired.join(", ")} | Pending |`),
    "",
    "Live consent management remains inactive until legal review, storage, audit, and environment evidence are complete.",
  ].join("\n");
}

export function renderRetentionDeletionEvidenceMatrix() {
  return [
    "# Retention/Deletion Evidence Matrix",
    "",
    "Do not include private user records, KYC documents, credentials, tokens, or screenshots containing sensitive information.",
    "",
    "| Data Class | Default Retention | Deletion Eligible | Legal Hold | Evidence Required | Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...DATA_RETENTION_MATRIX.map((row) => `| ${row.dataClass} | ${row.defaultRetention} | ${row.deletionEligible} | ${row.legalHold ? "Yes" : "No"} | Policy approval, audit event, exception review where needed | Pending |`),
    "",
    "Deletion automation remains inactive until legal approval, storage/provider activation, and audit evidence are complete.",
  ].join("\n");
}

export function renderKycVendorReadinessChecklist() {
  return [
    "# KYC Vendor Readiness Checklist",
    "",
    "Do not include live identity documents, vendor API keys, webhook secrets, KYC decision payloads, or screenshots containing sensitive information.",
    "",
    "| Subject | Evidence Type | Storage Class | Public Allowed | Signed Access Required | Vendor Evidence Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...KYC_EVIDENCE_INTAKE_PLACEHOLDERS.map((row) => `| ${row.subject} | ${row.requiredEvidence.join(", ")} | ${row.storageClass} | ${row.publicAllowed ? "Yes" : "No"} | ${row.signedAccessRequired ? "Yes" : "No"} | Pending |`),
    "",
    "## Vendor Activation Evidence Required",
    "- Vendor selected and legal/compliance approved.",
    "- DPA/processor terms reviewed.",
    "- Data sharing policy approved.",
    "- Webhook/security review complete.",
    "- Private storage and signed access verified.",
    "- Manual review process documented.",
    "",
    "Live KYC vendor activation remains inactive.",
  ].join("\n");
}

export function buildComplianceLaunchBlockerReport({ env = process.env } = {}) {
  const readiness = buildComplianceReadinessToolingReport({ env });
  const manualEvidence = [
    "Privacy policy legal approval",
    "Terms of use legal approval",
    "Jamaica DPA legal review",
    "GDPR legal review",
    "Consent capture and withdrawal evidence",
    "DSAR execution evidence",
    "Retention/deletion legal approval and audit evidence",
    "KYC vendor approval and processor review",
    "Compliance evidence package signoff",
  ];
  const blockers = [
    ...readiness.blockers,
    ...manualEvidence.map((item) => `Manual evidence required: ${item}`),
  ];
  return {
    status: "BLOCKED",
    generatedAt: new Date().toISOString(),
    liveKycVendorActive: false,
    legalApprovalComplete: false,
    valuePrinted: false,
    blockers: [...new Set(blockers)],
    nextGate: "A4-01 Infrastructure Ownership Confirmation Submitted; D2 Compliance Operationalization remains blocked until A4 passes.",
  };
}

export function renderComplianceLaunchBlockerReport(report = buildComplianceLaunchBlockerReport()) {
  return [
    "# Compliance Launch Blocker Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live KYC Vendor Active: ${report.liveKycVendorActive ? "YES" : "NO"}`,
    `Legal Approval Complete: ${report.legalApprovalComplete ? "YES" : "NO"}`,
    "",
    "## Blockers",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
    "## Next Gate",
    report.nextGate,
  ].join("\n");
}

export function renderDataRetentionMatrix() {
  return [
    "# Data Retention Matrix",
    "",
    "| Data Class | Default Retention | Legal Hold | Deletion Eligible | Owner |",
    "| --- | --- | --- | --- | --- |",
    ...DATA_RETENTION_MATRIX.map((row) => `| ${row.dataClass} | ${row.defaultRetention} | ${row.legalHold ? "Yes" : "No"} | ${row.deletionEligible} | ${row.owner} |`),
  ].join("\n");
}

export function buildComplianceReadinessToolingReport({ env = process.env } = {}) {
  const consent = validateConsentWorkflowPlaceholders();
  const dsar = validateDsarRequestTemplate();
  const retention = validateDataRetentionMatrix();
  const kyc = validateKycEvidenceIntakePlaceholders();
  const privacyImpact = validatePrivacyImpactChecklist();
  const config = buildComplianceConfigChecklist(env);
  const blockers = [...new Set([
    ...consent.blockers,
    ...dsar.blockers,
    ...retention.blockers,
    ...kyc.blockers,
    ...privacyImpact.blockers,
    ...config.blockers,
  ])];
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_LEGAL_REVIEW" : "CREDENTIAL_READY_FOR_LEGAL_REVIEW",
    provider: "provider_ready_compliance_controls",
    consent,
    dsar,
    retention,
    kyc,
    privacyImpact,
    config,
    liveKycVendorActive: false,
    legalApprovalComplete: false,
    valuePrinted: false,
    blockers,
  };
}

function renderReport(report) {
  console.log("# Compliance Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- Consent workflow placeholders: ${report.consent.status}`);
  console.log(`- DSAR request template: ${report.dsar.status}`);
  console.log(`- Data retention matrix: ${report.retention.status}`);
  console.log(`- KYC evidence intake placeholders: ${report.kyc.status}`);
  console.log(`- Privacy impact checklist: ${report.privacyImpact.status}`);
  console.log(`- Compliance config checklist: ${report.config.status}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildComplianceReadinessToolingReport(), null, 2));
  else if (command === "dsar-template") console.log(renderDsarRequestTemplate());
  else if (command === "retention-matrix") console.log(renderDataRetentionMatrix());
  else if (command === "evidence-template") console.log(renderComplianceEvidencePackageTemplate());
  else if (command === "privacy-policy-checklist") console.log(renderPrivacyPolicyEvidenceChecklist());
  else if (command === "terms-checklist") console.log(renderTermsOfUseEvidenceChecklist());
  else if (command === "jamaica-dpa-checklist") console.log(renderJamaicaDpaReadinessChecklist());
  else if (command === "gdpr-checklist") console.log(renderGdprReadinessChecklist());
  else if (command === "consent-checklist") console.log(renderConsentEvidenceChecklist());
  else if (command === "retention-deletion-matrix") console.log(renderRetentionDeletionEvidenceMatrix());
  else if (command === "kyc-vendor-checklist") console.log(renderKycVendorReadinessChecklist());
  else if (command === "launch-blockers") console.log(renderComplianceLaunchBlockerReport());
  else renderReport(buildComplianceReadinessToolingReport());
}
