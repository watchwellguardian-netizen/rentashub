import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const LAUNCH_ENVIRONMENT_DECISIONS = [
  { environment: "Internal Demo", decision: "GO", rationale: "Product foundation, build, package, and smoke evidence can support controlled internal demonstration." },
  { environment: "Investor Demo", decision: "GO", rationale: "Provider-ready workflows may be demonstrated with clear simulation-safe boundaries." },
  { environment: "Internal Testing", decision: "GO", rationale: "Tests and local/provider-ready workflows support internal validation." },
  { environment: "Supplier Demonstrations", decision: "GO", rationale: "Supplier-facing flows can be demonstrated without live payments, escrow, or production data." },
  { environment: "Technical UAT", decision: "GO", rationale: "Technical validation may proceed against non-production environments once available." },
  { environment: "Closed Beta", decision: "CONDITIONAL GO", rationale: "Requires A4 infrastructure certification, live monitoring, support readiness, and security review evidence." },
  { environment: "Paid Pilot", decision: "NO-GO", rationale: "Requires live payments, escrow legal review, revenue operations, compliance, and security certification." },
  { environment: "Public Launch", decision: "NO-GO", rationale: "Requires all activation gates, legal/compliance signoff, production certification, and executive approval." },
];

export const RELEASE_CANDIDATE_EVIDENCE_AREAS = [
  "Program state and authorized gate",
  "A4 infrastructure evidence",
  "Supabase environment evidence",
  "Database migration evidence",
  "Auth/RBAC evidence",
  "Storage evidence",
  "Monitoring evidence",
  "Security evidence",
  "Compliance evidence",
  "Revenue evidence",
  "Escrow evidence",
  "Operational readiness evidence",
  "Build/test/readiness evidence",
  "Artifact and ZIP evidence",
  "Secret-safety evidence",
  "Go/no-go approval evidence",
];

export const LAUNCH_BLOCKERS = [
  { blocker: "A4-01 Infrastructure Ownership Confirmation incomplete", severity: "Critical", blocks: ["Closed Beta", "Paid Pilot", "Public Launch"] },
  { blocker: "A4-02 Environment Provisioning Verification incomplete", severity: "Critical", blocks: ["Closed Beta", "Paid Pilot", "Public Launch"] },
  { blocker: "A4-03 Migration Execution Evidence incomplete", severity: "Critical", blocks: ["Closed Beta", "Paid Pilot", "Public Launch"] },
  { blocker: "A4-04 Infrastructure Certification incomplete", severity: "Critical", blocks: ["Closed Beta", "Paid Pilot", "Public Launch"] },
  { blocker: "A4-05 Execution Verification incomplete", severity: "Critical", blocks: ["Closed Beta", "Paid Pilot", "Public Launch"] },
  { blocker: "Live monitoring and alert routing not operational", severity: "High", blocks: ["Closed Beta", "Paid Pilot", "Public Launch"] },
  { blocker: "Security certification and penetration testing not complete", severity: "Critical", blocks: ["Paid Pilot", "Public Launch"] },
  { blocker: "Compliance legal review and KYC provider activation not complete", severity: "Critical", blocks: ["Paid Pilot", "Public Launch"] },
  { blocker: "Payment sandbox and revenue operations not certified", severity: "Critical", blocks: ["Paid Pilot", "Public Launch"] },
  { blocker: "Escrow legal structure and release/refund workflows not certified", severity: "Critical", blocks: ["Paid Pilot", "Public Launch"] },
  { blocker: "Production launch approval package not complete", severity: "Critical", blocks: ["Public Launch"] },
];

function safetyNotice() {
  return "Do not include credentials, service-role keys, database passwords, JWT secrets, payment keys, escrow secrets, API tokens, or screenshots containing sensitive values.";
}

function table(rows) {
  return rows.join("\n");
}

function pendingRows(items) {
  return items.map((item) => `| ${item} | Pending |  |  |`).join("\n");
}

export function renderClosedBetaEvidencePackage() {
  const items = [
    "A4-01 project names/IDs and owner evidence",
    "A4-02 development and UAT environment evidence",
    "A4-03 migrations 004-007 executed in Development and UAT",
    "A4-04 persistence, Auth/RBAC, Storage, backup/restore evidence",
    "Monitoring alert routing and incident owner evidence",
    "Support escalation and closed beta operations evidence",
    "Secret-safety scan evidence",
    "No paid pilot, public launch, or live money movement confirmation",
  ];
  return `# Closed Beta Evidence Package

${safetyNotice()}

## Decision Boundary

- Recommended decision: CONDITIONAL GO
- Production ready: No
- Paid pilot ready: No
- Public launch ready: No
- Live money movement active: No

## Required Evidence

| Evidence Item | Status | Evidence Location | Notes |
| --- | --- | --- | --- |
${pendingRows(items)}

## Reviewer Signoff

- Release owner:
- Infrastructure owner:
- Security owner:
- Support owner:
- Decision: GO / CONDITIONAL GO / NO-GO
`;
}

export function renderPaidPilotEvidencePackage() {
  const items = [
    "Closed beta certification evidence accepted",
    "Payment provider sandbox credentials stored securely",
    "Webhook verification evidence collected",
    "Refund, chargeback, payout, settlement evidence collected",
    "Escrow legal structure and ledger evidence approved",
    "Security certification and pen-test remediation complete",
    "Compliance legal review, KYC, consent, retention, DSAR evidence complete",
    "Tax/GCT readiness approved",
    "Revenue operations owner signoff complete",
  ];
  return `# Paid Pilot Evidence Package

${safetyNotice()}

## Decision Boundary

- Recommended decision: NO-GO until all revenue, escrow, compliance, and security evidence is accepted.
- Production ready: No
- Public launch ready: No
- Live money movement may only begin after separate revenue and escrow approval.

## Required Evidence

| Evidence Item | Status | Evidence Location | Notes |
| --- | --- | --- | --- |
${pendingRows(items)}

## Reviewer Signoff

- Revenue owner:
- Escrow owner:
- Compliance owner:
- Security owner:
- Executive approver:
- Decision: GO / CONDITIONAL GO / NO-GO
`;
}

export function renderPublicLaunchEvidencePackage() {
  const items = [
    "Infrastructure certification accepted",
    "Monitoring operational and escalation tested",
    "Security certification complete",
    "Compliance legal approval complete",
    "Revenue and escrow operations certified",
    "Production backup/restore and disaster recovery evidence accepted",
    "Production launch infrastructure checklist complete",
    "Final go/no-go report approved",
    "Executive and board/investor readiness summaries approved",
  ];
  return `# Public Launch Evidence Package

${safetyNotice()}

## Decision Boundary

- Recommended decision: NO-GO until all activation, certification, legal, revenue, escrow, and executive approvals are accepted.
- Public launch ready: No
- Production certified: No

## Required Evidence

| Evidence Item | Status | Evidence Location | Notes |
| --- | --- | --- | --- |
${pendingRows(items)}

## Reviewer Signoff

- CEO / Executive sponsor:
- CTO / Technical owner:
- Security owner:
- Compliance owner:
- Revenue owner:
- Operations owner:
- Final decision: PUBLIC LAUNCH GO / PUBLIC LAUNCH CONDITIONAL GO / PUBLIC LAUNCH NO-GO
`;
}

export function buildLaunchBlockerDashboard() {
  return {
    status: "BLOCKED_PENDING_ACTIVATION_EVIDENCE",
    productionReady: false,
    closedBetaDecision: "CONDITIONAL GO AFTER A4 AND MONITORING EVIDENCE",
    paidPilotDecision: "NO-GO",
    publicLaunchDecision: "NO-GO",
    blockers: LAUNCH_BLOCKERS,
  };
}

export function renderLaunchBlockerDashboard() {
  const dashboard = buildLaunchBlockerDashboard();
  return `# Launch Blocker Dashboard

Status: ${dashboard.status}
Production Ready: ${dashboard.productionReady ? "YES" : "NO"}
Closed Beta: ${dashboard.closedBetaDecision}
Paid Pilot: ${dashboard.paidPilotDecision}
Public Launch: ${dashboard.publicLaunchDecision}

| Severity | Blocker | Blocks |
| --- | --- | --- |
${LAUNCH_BLOCKERS.map((row) => `| ${row.severity} | ${row.blocker} | ${row.blocks.join(", ")} |`).join("\n")}
`;
}

export function renderReleaseCandidateEvidenceIndex() {
  return `# Release Candidate Evidence Index

${safetyNotice()}

| Field | Value |
| --- | --- |
| Platform | RentasHub Marketplace |
| Current RC | RC-0.6A |
| Current State | Infrastructure Activation Hold |
| Current Gate | A4-01 Infrastructure Ownership Confirmation |
| Production Ready | No |
| Live Provider Activation | No |

## Evidence Areas

| Evidence Area | Status | Evidence Location | Owner |
| --- | --- | --- | --- |
${RELEASE_CANDIDATE_EVIDENCE_AREAS.map((area) => `| ${area} | Pending / Partial |  |  |`).join("\n")}
`;
}

export function renderFinalGoNoGoReport() {
  return `# Final Go/No-Go Report

${safetyNotice()}

## Current Recommendation

| Environment | Decision | Rationale |
| --- | --- | --- |
${LAUNCH_ENVIRONMENT_DECISIONS.map((row) => `| ${row.environment} | ${row.decision} | ${row.rationale} |`).join("\n")}

## Final Decision

- Internal Demo: GO
- Investor Demo: GO
- Technical UAT: GO
- Closed Beta: CONDITIONAL GO after A4 infrastructure certification and monitoring evidence.
- Paid Pilot: NO-GO.
- Public Launch: NO-GO.

## Required Next Gate

A4-01 Infrastructure Ownership Confirmation Submitted.
`;
}

export function renderLaunchApprovalChecklist() {
  const items = [
    "Current program-state.md reviewed",
    "Authorized gate confirmed",
    "A4 evidence package accepted",
    "Monitoring evidence accepted",
    "Security evidence accepted",
    "Compliance evidence accepted",
    "Revenue evidence accepted",
    "Escrow evidence accepted",
    "Operational readiness evidence accepted",
    "Build/test/readiness/ZIP evidence accepted",
    "Secret exposure certification accepted",
    "Rollback and DR evidence accepted",
    "Executive approval recorded",
    "No false production-ready claims introduced",
  ];
  return `# Launch Approval Checklist

${safetyNotice()}

${items.map((item) => `- [ ] ${item}`).join("\n")}

## Approval

- Decision: GO / CONDITIONAL GO / NO-GO
- Approver:
- Date:
- Conditions:
`;
}

export function renderExecutiveLaunchReadinessSummary() {
  return `# Executive Launch Readiness Summary

## Current Classification

RentasHub Marketplace RC-0.6A - Infrastructure Activation Hold.

## Executive Position

- Product foundations: Complete.
- Activation architecture: Complete.
- Credential-readiness tooling: Complete / expanding.
- Live infrastructure: Not certified.
- Production certification: Not complete.
- Paid pilot: NO-GO.
- Public launch: NO-GO.

## Decision Summary

Closed beta may only move from conditional to approved after A4 infrastructure evidence and monitoring evidence are accepted. Paid pilot and public launch remain blocked by security, compliance, revenue, escrow, infrastructure, and legal approvals.
`;
}

export function renderBoardInvestorReadinessEvidenceSummary() {
  return `# Board / Investor Readiness Evidence Summary

${safetyNotice()}

## Summary

RentasHub has a mature provider-ready marketplace foundation, but remains pre-activation. Evidence should be presented as foundation readiness, not production launch readiness.

## Evidence Categories

| Category | Current Evidence Position | Remaining Proof Required |
| --- | --- | --- |
| Product | Foundation complete and demo-ready | Live user validation |
| Infrastructure | Architecture and tooling complete | A4 execution evidence |
| Security | Readiness tooling and policies complete | Live controls, pen-test, remediation |
| Compliance | Framework complete | Legal review, KYC/consent/DSAR activation |
| Revenue | Architecture complete | Sandbox validation, escrow/legal, tax approval |
| Operations | Runbooks and evidence tooling complete | Live team execution and incident tests |
| Launch | Packaging and smoke evidence available | Production certification and executive signoff |

## Investor-Safe Claim

RentasHub is provider-ready and activation-ready, not production certified.
`;
}

export function buildLaunchReadinessReport() {
  return {
    status: "CREDENTIAL_READY_TOOLING_COMPLETE",
    productionReady: false,
    liveProviderActivation: false,
    decisions: LAUNCH_ENVIRONMENT_DECISIONS,
    blockers: LAUNCH_BLOCKERS,
    artifacts: [
      "Closed beta evidence package generator",
      "Paid pilot evidence package generator",
      "Public launch evidence package generator",
      "Launch blocker dashboard/report",
      "Release candidate evidence index",
      "Final go/no-go report generator",
      "Launch approval checklist",
      "Executive launch readiness summary",
      "Board/investor readiness evidence summary",
    ],
  };
}

function renderReport(report) {
  console.log("# Release / Launch Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log(`Production Ready: ${report.productionReady ? "YES" : "NO"}`);
  console.log(`Live Provider Activation: ${report.liveProviderActivation ? "YES" : "NO"}`);
  console.log("");
  for (const decision of report.decisions) {
    console.log(`- ${decision.environment}: ${decision.decision}`);
  }
  for (const blocker of report.blockers) {
    console.log(`- Blocker: ${blocker.blocker}`);
  }
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildLaunchReadinessReport(), null, 2));
  else if (command === "closed-beta-package") console.log(renderClosedBetaEvidencePackage());
  else if (command === "paid-pilot-package") console.log(renderPaidPilotEvidencePackage());
  else if (command === "public-launch-package") console.log(renderPublicLaunchEvidencePackage());
  else if (command === "blockers") console.log(renderLaunchBlockerDashboard());
  else if (command === "rc-evidence-index") console.log(renderReleaseCandidateEvidenceIndex());
  else if (command === "go-no-go") console.log(renderFinalGoNoGoReport());
  else if (command === "approval-checklist") console.log(renderLaunchApprovalChecklist());
  else if (command === "executive-summary") console.log(renderExecutiveLaunchReadinessSummary());
  else if (command === "board-investor-summary") console.log(renderBoardInvestorReadinessEvidenceSummary());
  else renderReport(buildLaunchReadinessReport());
}
