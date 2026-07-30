import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRuntimeEvidenceOrchestrationReport } from "./s5-s3h-runtime-evidence-orchestrator.mjs";

export const REQUIRED_DOCS = [
  "docs/launch-readiness/release-governance.md",
  "docs/launch-readiness/deployment-readiness.md",
  "docs/launch-readiness/recovery-readiness.md",
  "docs/launch-readiness/operational-readiness.md",
  "docs/launch-readiness/certification-evidence-manifest.md",
  "docs/launch-readiness/owner-action-register.md",
  "docs/launch-readiness/launch-dashboard.json",
];

export const REQUIRED_RELEASE_GOVERNANCE_TERMS = [
  "Production Go/No-Go Checklist",
  "Stage 6 Promotion Checklist",
  "Release Approval Workflow",
  "Rollback Authorization Matrix",
  "Emergency Release Procedure",
  "CAB Approval Template",
  "Change Request Template",
  "Production Sign-Off Workflow",
];

export const REQUIRED_DEPLOYMENT_TERMS = [
  "Deployment Manifest Validation",
  "Environment Inventory",
  "Secret Inventory Without Values",
  "Configuration Validation",
  "Version Manifest",
  "Build Manifest",
  "SBOM Generation",
  "Artifact Manifest",
  "Release Package Manifest",
];

export const REQUIRED_RECOVERY_TERMS = [
  "Backup Validation Procedures",
  "Restore Procedures",
  "Disaster Recovery Checklist",
  "RTO Verification Procedure",
  "RPO Verification Procedure",
  "Rollback Playbook",
  "Data Recovery Playbook",
];

export const REQUIRED_OPERATIONAL_TERMS = [
  "Operator Handbook",
  "Incident Response Runbook",
  "Escalation Matrix",
  "Maintenance Procedures",
  "Scheduled Maintenance Workflow",
  "Health Verification Checklist",
  "Operational Acceptance Checklist",
];

export const REQUIRED_CERTIFICATION_INDEXES = [
  "Runtime Evidence Index",
  "Security Evidence Index",
  "Accessibility Evidence Index",
  "PostgreSQL Evidence Index",
  "Redis Evidence Index",
  "Browser Evidence Index",
  "Storage Evidence Index",
  "Authentication Evidence Index",
  "Operations Evidence Index",
  "Certification Evidence Manifest",
];

export const REQUIRED_OWNER_ACTIONS = [
  "GitHub",
  "OIDC",
  "PostgreSQL",
  "Redis",
  "Storage",
  "Telemetry",
  "DNS",
  "TLS",
  "Domains",
  "Hosting",
  "Production Secrets",
];

function read(path) {
  return readFileSync(path, "utf8");
}

function checkTerms(path, terms) {
  const source = read(path);
  return terms.map((term) => ({ term, present: source.includes(term) }));
}

export function validateS5Lrw001(root = process.cwd()) {
  const missingDocs = REQUIRED_DOCS.filter((path) => !existsSync(`${root}/${path}`));
  const checks = {
    releaseGovernance: checkTerms(`${root}/docs/launch-readiness/release-governance.md`, REQUIRED_RELEASE_GOVERNANCE_TERMS),
    deploymentReadiness: checkTerms(`${root}/docs/launch-readiness/deployment-readiness.md`, REQUIRED_DEPLOYMENT_TERMS),
    recoveryReadiness: checkTerms(`${root}/docs/launch-readiness/recovery-readiness.md`, REQUIRED_RECOVERY_TERMS),
    operationalReadiness: checkTerms(`${root}/docs/launch-readiness/operational-readiness.md`, REQUIRED_OPERATIONAL_TERMS),
    certificationManifest: checkTerms(`${root}/docs/launch-readiness/certification-evidence-manifest.md`, REQUIRED_CERTIFICATION_INDEXES),
    ownerActions: checkTerms(`${root}/docs/launch-readiness/owner-action-register.md`, REQUIRED_OWNER_ACTIONS),
  };
  const dashboard = JSON.parse(read(`${root}/docs/launch-readiness/launch-dashboard.json`));
  const runtime = createRuntimeEvidenceOrchestrationReport(root);
  const missingTerms = Object.entries(checks)
    .flatMap(([area, rows]) => rows.filter((row) => !row.present).map((row) => `${area}: ${row.term}`));
  const blockers = [
    ...missingDocs.map((path) => `Missing document: ${path}`),
    ...missingTerms.map((term) => `Missing required term: ${term}`),
  ];
  if (dashboard.status !== "ENGINEERING_COMPLETE") blockers.push("Launch dashboard must remain engineering complete.");
  if (dashboard.runtimeEvidence !== "RUNTIME_EVIDENCE_PENDING") blockers.push("Launch dashboard must keep runtime evidence pending.");
  if (dashboard.productionReady !== false) blockers.push("Launch dashboard must not claim production readiness.");
  if (runtime.status !== "CI_RUNTIME_EXECUTION_FRAMEWORK_COMPLETE") blockers.push("Runtime evidence orchestration must be complete.");
  return {
    sprint: "S5-LRW-001",
    status: blockers.length ? "FAIL" : "ENGINEERING_COMPLETE",
    releaseGovernance: "RELEASE_GOVERNANCE_COMPLETE",
    deploymentReadiness: "DEPLOYMENT_READINESS_COMPLETE",
    certificationPackage: "CERTIFICATION_PACKAGE_COMPLETE",
    ownerActionRegister: "OWNER_ACTION_REGISTER_COMPLETE",
    launchDashboard: "LAUNCH_DASHBOARD_COMPLETE",
    runtimeEvidence: "RUNTIME_EVIDENCE_PENDING",
    docsChecked: REQUIRED_DOCS.length,
    ownerActions: REQUIRED_OWNER_ACTIONS,
    workflowCount: runtime.workflowCount,
    readyWorkflowCount: runtime.readyWorkflowCount,
    dashboard,
    blockers,
    productionTouched: false,
    liveProvidersTouched: false,
  };
}

function printReport(result) {
  console.log(`[s5-lrw-001] status: ${result.status}`);
  console.log(`[s5-lrw-001] release governance: ${result.releaseGovernance}`);
  console.log(`[s5-lrw-001] deployment readiness: ${result.deploymentReadiness}`);
  console.log(`[s5-lrw-001] certification package: ${result.certificationPackage}`);
  console.log(`[s5-lrw-001] owner action register: ${result.ownerActionRegister}`);
  console.log(`[s5-lrw-001] launch dashboard: ${result.launchDashboard}`);
  console.log(`[s5-lrw-001] runtime evidence: ${result.runtimeEvidence}`);
  console.log(`[s5-lrw-001] blockers: ${result.blockers.length}`);
  console.log("[s5-lrw-001] production touched: NO");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const command = process.argv[2] || "report";
  const result = validateS5Lrw001();
  if (command === "json" || process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else printReport(result);
  process.exit(result.status === "FAIL" ? 1 : 0);
}
