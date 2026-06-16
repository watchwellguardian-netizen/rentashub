import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/, /^none$/i, /^todo$/i, /^tbd$/i];

export const UAT_EXECUTION_CHECKLIST = [
  { area: "access", item: "UAT users created for customer supplier broker inspector transport financing and admin roles", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "marketplace", item: "Search listing detail booking messaging review trust protection and dispute flows executed", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "auctions", item: "Auction browsing bidding simulation compliance document notification and dispute flows executed", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "ecosystem", item: "Inspection transport financing analytics documents notifications and AI readiness flows executed", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "mobile", item: "Desktop tablet and mobile navigation smoke-tested", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "accessibility", item: "Keyboard navigation contrast labels and reduced-motion checks completed", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "security", item: "Protected route refresh direct URL and role-denial tests executed", ownerKey: "SECURITY_REVIEW_OWNER" },
  { area: "evidence", item: "Screenshots notes test run IDs and defects linked to UAT evidence package", ownerKey: "UAT_OWNER_EMAIL" },
  { area: "signoff", item: "UAT go conditional-go or no-go decision recorded", ownerKey: "UAT_SIGNOFF_OWNER" },
];

export const SUPPORT_ESCALATION_MATRIX = [
  { severity: "SEV1", responseTarget: "15 minutes", examples: ["data exposure", "security incident", "payment or escrow live-funds anomaly"], primaryOwnerKey: "INCIDENT_OWNER_EMAIL", escalationOwnerKey: "SECURITY_OWNER_EMAIL" },
  { severity: "SEV2", responseTarget: "1 hour", examples: ["auth outage", "booking outage", "storage outage", "supplier onboarding blocked"], primaryOwnerKey: "PILOT_SUPPORT_EMAIL", escalationOwnerKey: "PILOT_ESCALATION_EMAIL" },
  { severity: "SEV3", responseTarget: "4 business hours", examples: ["workflow bug", "dashboard issue", "controlled placeholder confusion"], primaryOwnerKey: "PILOT_SUPPORT_EMAIL", escalationOwnerKey: "SUPPORT_OWNER_EMAIL" },
  { severity: "SEV4", responseTarget: "2 business days", examples: ["documentation clarification", "training request", "non-blocking UX feedback"], primaryOwnerKey: "PILOT_SUPPORT_EMAIL", escalationOwnerKey: "PILOT_OWNER_EMAIL" },
];

export const SUPPLIER_ONBOARDING_EVIDENCE_TRACKER = [
  { step: "invitation_sent", evidence: ["supplier_contact", "invite_date", "inviter"], requiredForPilot: true },
  { step: "profile_completed", evidence: ["business_name", "parish", "contact_channels", "service_categories"], requiredForPilot: true },
  { step: "verification_submitted", evidence: ["business_registration_placeholder", "authorized_representative_placeholder", "insurance_or_license_placeholder"], requiredForPilot: true },
  { step: "asset_listed", evidence: ["asset_id", "category", "photos_present", "pricing_present"], requiredForPilot: true },
  { step: "listing_reviewed", evidence: ["reviewer", "review_date", "quality_result"], requiredForPilot: true },
  { step: "training_completed", evidence: ["training_date", "booking_response_sla_acknowledged", "support_rules_acknowledged"], requiredForPilot: true },
  { step: "pilot_ready", evidence: ["go_no_go_result", "missing_items", "approver"], requiredForPilot: true },
];

export const MANUAL_OPERATING_PROCEDURE_TEMPLATES = [
  { id: "supplier_onboarding", title: "Supplier Onboarding Manual Procedure", sections: ["intake", "verification", "listing review", "training", "pilot approval"] },
  { id: "customer_support", title: "Customer Support Manual Procedure", sections: ["triage", "identity check", "booking context", "resolution", "follow-up"] },
  { id: "dispute_escalation", title: "Dispute Escalation Manual Procedure", sections: ["claim intake", "evidence collection", "supplier response", "admin review", "resolution note"] },
  { id: "incident_response", title: "Incident Response Manual Procedure", sections: ["severity", "containment", "communications", "recovery", "postmortem"] },
  { id: "closed_beta_go_no_go", title: "Closed Beta Go/No-Go Manual Procedure", sections: ["gate evidence", "open blockers", "owner signoff", "decision", "next review"] },
];

export const CLOSED_BETA_PACKAGE_SECTIONS = [
  "Executive Summary",
  "Scope and Release Boundary",
  "UAT Execution Evidence",
  "Supplier Onboarding Evidence",
  "Support and Escalation Readiness",
  "Known Defects and Workarounds",
  "Manual Operating Procedures",
  "Pilot Readiness Scorecard",
  "Security Privacy and Compliance Notes",
  "No-Live-Provider Boundary",
  "Go Conditional-Go or No-Go Decision",
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function ownerStatus(env, key) {
  return {
    key,
    status: hasRealValue(env[key]) ? "assigned" : "missing_or_placeholder",
    valuePrinted: false,
  };
}

function unique(values) {
  return [...new Set(values)];
}

export function validateUatExecutionChecklist(env = process.env) {
  const rows = UAT_EXECUTION_CHECKLIST.map((row) => ({
    ...row,
    owner: ownerStatus(env, row.ownerKey),
    status: "pending_evidence",
    evidenceRequired: true,
  }));
  const blockers = unique(rows.filter((row) => row.owner.status !== "assigned").map((row) => `${row.ownerKey} is required for ${row.area} UAT ownership.`));
  return {
    status: blockers.length ? "NEEDS_UAT_OWNERS" : "READY_FOR_UAT_EVIDENCE",
    rows,
    liveUsersActive: false,
    publicLaunchAuthorized: false,
    blockers,
  };
}

export function validateSupportEscalationMatrix(env = process.env) {
  const rows = SUPPORT_ESCALATION_MATRIX.map((row) => ({
    ...row,
    primaryOwner: ownerStatus(env, row.primaryOwnerKey),
    escalationOwner: ownerStatus(env, row.escalationOwnerKey),
    status: "pending_evidence",
  }));
  const blockers = unique(rows.flatMap((row) => [
    row.primaryOwner.status !== "assigned" ? `${row.primaryOwnerKey} is required for ${row.severity} primary support.` : "",
    row.escalationOwner.status !== "assigned" ? `${row.escalationOwnerKey} is required for ${row.severity} escalation.` : "",
  ]).filter(Boolean));
  return {
    status: blockers.length ? "NEEDS_SUPPORT_OWNERS" : "READY_FOR_ESCALATION_EVIDENCE",
    rows,
    liveOnCallActive: false,
    alertRoutingActive: false,
    blockers,
  };
}

export function validateSupplierOnboardingEvidenceTracker(records = []) {
  const blockers = [];
  const submittedSteps = new Set(records.map((record) => record.step));
  for (const step of SUPPLIER_ONBOARDING_EVIDENCE_TRACKER.filter((row) => row.requiredForPilot)) {
    if (!submittedSteps.has(step.step)) blockers.push(`${step.step} evidence is required for supplier pilot readiness.`);
  }
  for (const record of records) {
    const definition = SUPPLIER_ONBOARDING_EVIDENCE_TRACKER.find((row) => row.step === record.step);
    if (!definition) blockers.push(`Unknown supplier onboarding step: ${record.step}`);
    const evidence = record.evidence || {};
    for (const field of definition?.evidence || []) {
      if (!hasRealValue(evidence[field])) blockers.push(`${record.step}.${field} evidence is missing.`);
    }
  }
  return {
    status: blockers.length ? "NEEDS_SUPPLIER_EVIDENCE" : "SUPPLIER_ONBOARDING_EVIDENCE_READY",
    requiredSteps: SUPPLIER_ONBOARDING_EVIDENCE_TRACKER,
    recordsChecked: records.length,
    liveSupplierPilotActive: false,
    blockers,
  };
}

export function buildPilotReadinessScorecard(env = process.env, evidence = {}) {
  const uat = validateUatExecutionChecklist(env);
  const support = validateSupportEscalationMatrix(env);
  const supplierEvidence = validateSupplierOnboardingEvidenceTracker(evidence.supplierOnboarding || []);
  const criteria = [
    { id: "uat", label: "UAT ownership and evidence path", passed: uat.status === "READY_FOR_UAT_EVIDENCE", weight: 20 },
    { id: "support", label: "Support escalation ownership", passed: support.status === "READY_FOR_ESCALATION_EVIDENCE", weight: 20 },
    { id: "supplier_onboarding", label: "Supplier onboarding evidence", passed: supplierEvidence.status === "SUPPLIER_ONBOARDING_EVIDENCE_READY", weight: 20 },
    { id: "pilot_region", label: "Pilot region defined", passed: hasRealValue(env.PILOT_REGION), weight: 10 },
    { id: "pilot_targets", label: "Supplier and customer targets defined", passed: hasRealValue(env.PILOT_SUPPLIER_TARGET) && hasRealValue(env.PILOT_CUSTOMER_TARGET), weight: 10 },
    { id: "operating_hours", label: "Operating hours defined", passed: hasRealValue(env.PILOT_OPERATING_HOURS), weight: 10 },
    { id: "go_no_go", label: "Go/no-go owner assigned", passed: hasRealValue(env.PILOT_OWNER_EMAIL), weight: 10 },
  ];
  const score = criteria.reduce((sum, row) => sum + (row.passed ? row.weight : 0), 0);
  const blockers = [
    ...uat.blockers,
    ...support.blockers,
    ...supplierEvidence.blockers,
    ...criteria.filter((row) => !row.passed).map((row) => `${row.label} is required for closed beta readiness.`),
  ];
  return {
    status: score >= 85 && blockers.length === 0 ? "CLOSED_BETA_OPERATIONALLY_READY_FOR_REVIEW" : "NEEDS_OPERATIONAL_EVIDENCE",
    score,
    criteria,
    uatStatus: uat.status,
    supportStatus: support.status,
    supplierOnboardingStatus: supplierEvidence.status,
    closedBetaActive: false,
    paidPilotActive: false,
    publicLaunchActive: false,
    blockers: unique(blockers),
  };
}

export function renderManualOperatingProcedureTemplates() {
  return [
    "# Manual Operating Procedure Templates",
    "",
    "These templates are operational placeholders. They do not authorize live launch, live provider activation, payments, escrow, KYC, or production traffic.",
    "",
    ...MANUAL_OPERATING_PROCEDURE_TEMPLATES.flatMap((procedure) => [
      `## ${procedure.title}`,
      "",
      `Procedure ID: ${procedure.id}`,
      "",
      "| Section | Owner | Evidence | Result |",
      "| --- | --- | --- | --- |",
      ...procedure.sections.map((section) => `| ${section} |  |  | Pending |`),
      "",
    ]),
  ].join("\n");
}

export function renderClosedBetaReadinessPackage() {
  return `# Closed Beta Readiness Package Template

Do not include secrets, credentials, access tokens, service-role keys, database passwords, payment keys, escrow keys, customer PII, KYC documents, or screenshots containing sensitive data.

${CLOSED_BETA_PACKAGE_SECTIONS.map((section) => `## ${section}\n\n- Evidence:\n- Owner:\n- Result: Pending\n`).join("\n")}
## Decision

- Recommendation: GO / CONDITIONAL GO / NO-GO
- Missing evidence:
- Launch blockers:
- Next gate:
`;
}

export function buildOperationalReadinessReport({ env = process.env, evidence = {} } = {}) {
  const uat = validateUatExecutionChecklist(env);
  const support = validateSupportEscalationMatrix(env);
  const supplierOnboarding = validateSupplierOnboardingEvidenceTracker(evidence.supplierOnboarding || []);
  const scorecard = buildPilotReadinessScorecard(env, evidence);
  const blockers = unique([...uat.blockers, ...support.blockers, ...supplierOnboarding.blockers, ...scorecard.blockers]);
  return {
    status: blockers.length ? "NEEDS_OPERATIONAL_EVIDENCE" : "OPERATIONAL_READINESS_READY_FOR_CLOSED_BETA_REVIEW",
    uat,
    support,
    supplierOnboarding,
    scorecard,
    manualProcedureTemplatesReady: true,
    closedBetaPackageTemplateReady: true,
    closedBetaActive: false,
    paidPilotActive: false,
    publicLaunchActive: false,
    valuePrinted: false,
    blockers,
  };
}

function renderReport(report) {
  console.log("# Operational Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- UAT execution checklist: ${report.uat.status}`);
  console.log(`- Support escalation matrix: ${report.support.status}`);
  console.log(`- Supplier onboarding evidence tracker: ${report.supplierOnboarding.status}`);
  console.log(`- Pilot readiness scorecard: ${report.scorecard.status} (${report.scorecard.score}/100)`);
  console.log(`- Manual operating procedure templates: ${report.manualProcedureTemplatesReady ? "READY" : "MISSING"}`);
  console.log(`- Closed beta readiness package generator: ${report.closedBetaPackageTemplateReady ? "READY" : "MISSING"}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildOperationalReadinessReport(), null, 2));
  else if (command === "uat-checklist") console.log(JSON.stringify(validateUatExecutionChecklist(), null, 2));
  else if (command === "support-matrix") console.log(JSON.stringify(validateSupportEscalationMatrix(), null, 2));
  else if (command === "supplier-tracker") console.log(JSON.stringify(validateSupplierOnboardingEvidenceTracker(), null, 2));
  else if (command === "scorecard") console.log(JSON.stringify(buildPilotReadinessScorecard(), null, 2));
  else if (command === "manual-procedures") console.log(renderManualOperatingProcedureTemplates());
  else if (command === "closed-beta-package") console.log(renderClosedBetaReadinessPackage());
  else renderReport(buildOperationalReadinessReport());
}
