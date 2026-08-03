import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseArtifacts } from "./validate-release-artifacts.mjs";
import { validateZipArtifactInclusionExclusion } from "./check-zip-artifact.mjs";
import { buildReleaseCandidateTagPlan } from "./release-candidate-tag-helper.mjs";

const root = process.cwd();

export const RELEASE_READINESS_REQUIRED_FILES = [
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  ".github/ISSUE_TEMPLATE/infrastructure_issue.md",
  ".github/ISSUE_TEMPLATE/security_incident.md",
  "docs/adr/0000-template.md",
  "docs/adr/0001-provider-ready-before-live-activation.md",
  "docs/adr/0002-supabase-selected-for-project-a.md",
  "docs/adr/0003-release-branch-governance.md",
  "docs/adr/0004-no-live-funds-without-revenue-and-escrow-certification.md",
  "docs/changelog-template.md",
  "docs/rc-evidence-index.md",
];

export const RELEASE_CHECKLIST_ITEMS = [
  "Confirm authorized gate or backlog item",
  "Confirm branch is correct for the change",
  "Confirm CODEOWNERS review path",
  "Run frontend/production tests",
  "Run backend tests",
  "Run readiness CLI",
  "Run production build",
  "Run secret scan",
  "Run artifact validation",
  "Run ZIP sanity check",
  "Update changelog when release-impacting",
  "Update RC evidence index when release-impacting",
  "Confirm no live provider claims were introduced",
  "Confirm no secrets or credential values are included",
  "Record rollback plan",
];

export const CI_GATE_MATRIX = [
  { gate: "Program State Review", command: "manual review docs/program-state.md", requiredFor: "all changes", status: "EVIDENCE_REQUIRED" },
  { gate: "Frontend Tests", command: "npm run test", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
  { gate: "Backend Tests", command: "npm run test:server", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
  { gate: "Readiness CLI", command: "npm run readiness", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
  { gate: "Secret Scan", command: "npm run security:scan", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
  { gate: "Production Build", command: "npm run build", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
  { gate: "Artifact Validation", command: "npm run artifact:validate", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
  { gate: "ZIP Sanity", command: "npm run zip:check", requiredFor: "release candidate", status: "EVIDENCE_REQUIRED" },
];

export const BRANCH_PROTECTION_REQUIREMENTS = [
  "main requires pull request review before merge",
  "release requires pull request review before merge",
  "future-release-backlog remains non-production backlog only",
  "Required status checks include frontend tests, backend tests, readiness, security scan, build, artifact validation, and ZIP sanity",
  "No direct pushes to protected branches",
  "No force pushes to protected branches",
  "CODEOWNERS review required for sensitive paths",
  "Secrets and production credentials must never be committed",
];

export const PR_APPROVAL_REQUIREMENTS = [
  "Authorized gate or backlog scope identified",
  "Files changed summarized",
  "Testing evidence attached",
  "Security impact reviewed",
  "Database impact reviewed",
  "Rollback plan provided",
  "Screenshots attached when UI changes exist",
  "CODEOWNERS approvals collected",
  "No live provider activation unless explicitly approved",
  "No secrets in branch, PR, logs, screenshots, or artifacts",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fileExists(path) {
  return existsSync(join(root, path));
}

export function validateRepositoryReleaseReadiness() {
  const missing = RELEASE_READINESS_REQUIRED_FILES.filter((path) => !fileExists(path));
  const blockers = [...missing.map((path) => `Missing release readiness file: ${path}`)];
  const checks = [];

  if (!missing.includes(".github/CODEOWNERS")) {
    const codeowners = read(".github/CODEOWNERS");
    for (const token of ["/src/", "/server/", "/scripts/", "/docs/adr/", "@security-team"]) {
      const present = codeowners.includes(token);
      checks.push({ file: ".github/CODEOWNERS", token, present });
      if (!present) blockers.push(`CODEOWNERS must include ${token}.`);
    }
  }

  if (!missing.includes(".github/pull_request_template.md")) {
    const pr = read(".github/pull_request_template.md");
    for (const token of ["Authorized gate", "Release Evidence", "Rollback Plan", "No secrets"]) {
      const present = pr.toLowerCase().includes(token.toLowerCase());
      checks.push({ file: ".github/pull_request_template.md", token, present });
      if (!present) blockers.push(`PR template must include ${token}.`);
    }
  }

  if (!missing.includes("docs/rc-evidence-index.md")) {
    const index = read("docs/rc-evidence-index.md");
    for (const token of ["RC-0.6A", "A4-01", "Secret Safety Rule"]) {
      const present = index.includes(token);
      checks.push({ file: "docs/rc-evidence-index.md", token, present });
      if (!present) blockers.push(`RC evidence index must include ${token}.`);
    }
  }

  return {
    status: blockers.length ? "FAIL" : "PASS",
    filesChecked: RELEASE_READINESS_REQUIRED_FILES.length,
    checks,
    productionReadyClaimed: false,
    liveProviderActivation: false,
    blockers,
  };
}

export function renderReleaseChecklist() {
  return [
    "# Release Checklist",
    "",
    "This checklist supports release review only. It does not authorize production deployment or live provider activation.",
    "",
    ...RELEASE_CHECKLIST_ITEMS.map((item) => `- [ ] ${item}`),
    "",
    "## Evidence",
    "",
    "- Branch:",
    "- Commit:",
    "- RC tag:",
    "- Test results:",
    "- Build result:",
    "- Readiness result:",
    "- Security scan result:",
    "- Artifact/ZIP result:",
    "- Rollback notes:",
  ].join("\n");
}

export function renderRcEvidenceIndexTemplate() {
  return [
    "# RC Evidence Index Entry",
    "",
    "Do not include secrets, credentials, customer private data, KYC documents, or screenshots containing sensitive values.",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Release Candidate |  |",
    "| Branch |  |",
    "| Commit |  |",
    "| Tag |  |",
    "| Authorized Gate |  |",
    "| Tests |  |",
    "| Backend Tests |  |",
    "| Readiness CLI |  |",
    "| Build |  |",
    "| Secret Scan |  |",
    "| Artifact Validation |  |",
    "| ZIP Sanity |  |",
    "| Smoke Tests |  |",
    "| Decision | GO / CONDITIONAL GO / NO-GO / HOLD |",
    "| Manual Evidence Required |  |",
    "| Next Gate |  |",
  ].join("\n");
}

export function buildCiGateEvidenceReport() {
  return {
    status: "EVIDENCE_TEMPLATE_READY",
    productionReady: false,
    liveProviderActivation: false,
    gates: CI_GATE_MATRIX,
    blockers: ["CI evidence must be collected from an actual CI run before release approval."],
  };
}

export function renderCiGateEvidenceReport() {
  const report = buildCiGateEvidenceReport();
  return [
    "# CI Gate Evidence Report",
    "",
    "This report defines CI evidence requirements only. It does not prove that CI has run unless each evidence location is filled from a real run.",
    "",
    `Status: ${report.status}`,
    "Production Ready: No",
    "Live Provider Activation: No",
    "",
    "| Gate | Command / Evidence Source | Required For | Status | Evidence Location |",
    "| --- | --- | --- | --- | --- |",
    ...report.gates.map((row) => `| ${row.gate} | ${row.command} | ${row.requiredFor} | ${row.status} |  |`),
    "",
    "## Blockers",
    "",
    ...report.blockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

export function renderBranchProtectionEvidenceChecklist() {
  return [
    "# Branch Protection Evidence Checklist",
    "",
    "Do not include GitHub tokens, deploy keys, personal access tokens, or screenshots exposing repository secrets.",
    "",
    "| Requirement | main | release | future-release-backlog | Evidence Location |",
    "| --- | --- | --- | --- | --- |",
    ...BRANCH_PROTECTION_REQUIREMENTS.map((item) => `| ${item} | Pending | Pending | Pending / N/A |  |`),
    "",
    "## Decision",
    "",
    "- Result: PASS / FAIL",
    "- Missing controls:",
    "- Next action:",
  ].join("\n");
}

export function renderPrApprovalEvidenceChecklist() {
  return [
    "# Pull Request Approval Evidence Checklist",
    "",
    "Do not include credentials, secret values, private customer data, or screenshots containing sensitive data.",
    "",
    "| Requirement | Status | Evidence Location | Notes |",
    "| --- | --- | --- | --- |",
    ...PR_APPROVAL_REQUIREMENTS.map((item) => `| ${item} | Pending |  |  |`),
    "",
    "## Approval",
    "",
    "- Reviewer:",
    "- CODEOWNERS approvals:",
    "- Security review required: Yes / No",
    "- Database review required: Yes / No",
    "- Decision: Approve / Request changes / Hold",
  ].join("\n");
}

export function buildArtifactIntegrityReport({ requireBuild = false } = {}) {
  const artifact = validateReleaseArtifacts({ requireBuild });
  const zip = validateZipArtifactInclusionExclusion({ requireBuild });
  const blockers = [...artifact.blockers, ...zip.blockers];
  return {
    status: blockers.length ? "FAIL" : "PASS",
    artifactStatus: artifact.status,
    zipStatus: zip.status,
    packageableFiles: artifact.checkedFiles,
    zipPackageableFiles: zip.checkedFiles,
    requiredArtifactMissing: artifact.requiredMissing,
    zipMissing: zip.missing,
    zipForbidden: zip.forbidden,
    productionReady: false,
    liveProviderActivation: false,
    blockers,
  };
}

export function renderArtifactIntegrityReport() {
  const report = buildArtifactIntegrityReport();
  return [
    "# Artifact Integrity Report",
    "",
    "This report verifies local packageability and ZIP inclusion/exclusion rules. It does not deploy or publish artifacts.",
    "",
    `Status: ${report.status}`,
    `Artifact validation: ${report.artifactStatus}`,
    `ZIP validation: ${report.zipStatus}`,
    `Packageable files checked: ${report.packageableFiles}`,
    `ZIP packageable files checked: ${report.zipPackageableFiles}`,
    "Production Ready: No",
    "Live Provider Activation: No",
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- None"]),
  ].join("\n");
}

export function buildZipArtifactExpansionReport({ requireBuild = false } = {}) {
  const zip = validateZipArtifactInclusionExclusion({ requireBuild });
  return {
    status: zip.status,
    requiredFilesChecked: zip.requiredFiles.length,
    checkedFiles: zip.checkedFiles,
    excludedSegments: zip.excludedSegments,
    missing: zip.missing,
    forbidden: zip.forbidden,
    blockers: zip.blockers,
  };
}

export function renderZipArtifactExpansionReport() {
  const report = buildZipArtifactExpansionReport();
  return [
    "# ZIP Artifact Inclusion / Exclusion Validator Report",
    "",
    "This report confirms expected package files and excluded runtime/generated paths. It does not refresh ZIP files.",
    "",
    `Status: ${report.status}`,
    `Required files checked: ${report.requiredFilesChecked}`,
    `Packageable files checked: ${report.checkedFiles}`,
    `Excluded path segments: ${report.excludedSegments.join(", ")}`,
    "",
    "## Missing Required Files",
    "",
    ...(report.missing.length ? report.missing.map((item) => `- ${item}`) : ["- None"]),
    "",
    "## Forbidden Files",
    "",
    ...(report.forbidden.length ? report.forbidden.map((item) => `- ${item}`) : ["- None"]),
  ].join("\n");
}

export function renderChangelogGenerator({ version = "RC-0.6A", date = "YYYY-MM-DD" } = {}) {
  return [
    "# Changelog Entry",
    "",
    `## ${version} - ${date}`,
    "",
    "### Added",
    "",
    "- ",
    "",
    "### Changed",
    "",
    "- ",
    "",
    "### Fixed",
    "",
    "- ",
    "",
    "### Verification",
    "",
    "- Frontend tests:",
    "- Backend tests:",
    "- Readiness CLI:",
    "- Secret scan:",
    "- Build:",
    "- Artifact validation:",
    "- ZIP sanity:",
    "",
    "### Release Boundaries",
    "",
    "- Production ready: No",
    "- Live provider activation: No",
    "- Paid pilot ready: No",
    "- Public launch ready: No",
  ].join("\n");
}

export function renderReleaseTagEvidenceGenerator({ tag = "rc-0.6a", title = "RentasHub Marketplace RC-0.6A" } = {}) {
  const plan = buildReleaseCandidateTagPlan({ tag, title, dryRun: true });
  return [
    "# Release Tag Evidence",
    "",
    "This generator is dry-run only. It does not create or push Git tags.",
    "",
    `Status: ${plan.status}`,
    `Dry run: ${plan.dryRun}`,
    `Tag: ${plan.tag || ""}`,
    `Title: ${plan.title || ""}`,
    "",
    "## Commands To Run After Approval",
    "",
    `- Tag command: ${plan.command || "Blocked"}`,
    `- Push command: ${plan.pushCommand || "Blocked"}`,
    "",
    "## Blockers",
    "",
    ...(plan.blockers.length ? plan.blockers.map((blocker) => `- ${blocker}`) : ["- None"]),
  ].join("\n");
}

export function renderBuildTestReadinessMatrix() {
  return [
    "# Build / Test / Readiness Matrix",
    "",
    "This matrix defines required release evidence. Status must be filled from real command output before release approval.",
    "",
    "| Check | Command | Required Evidence | Status | Evidence Location |",
    "| --- | --- | --- | --- | --- |",
    ...CI_GATE_MATRIX.filter((row) => row.gate !== "Program State Review").map((row) => `| ${row.gate} | ${row.command} | Exit code, summary, and timestamp | Pending |  |`),
    "",
    "## Decision",
    "",
    "- Result: PASS / FAIL",
    "- Missing evidence:",
    "- Next action:",
  ].join("\n");
}

function renderReport(result) {
  console.log("# Repository / Release Readiness Report");
  console.log(`Status: ${result.status}`);
  console.log(`Files checked: ${result.filesChecked}`);
  console.log(`Production ready claimed: ${result.productionReadyClaimed}`);
  console.log(`Live provider activation: ${result.liveProviderActivation}`);
  for (const blocker of result.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(validateRepositoryReleaseReadiness(), null, 2));
  else if (command === "checklist") console.log(renderReleaseChecklist());
  else if (command === "rc-index-template") console.log(renderRcEvidenceIndexTemplate());
  else if (command === "ci-gate-report") console.log(renderCiGateEvidenceReport());
  else if (command === "branch-protection-checklist") console.log(renderBranchProtectionEvidenceChecklist());
  else if (command === "pr-approval-checklist") console.log(renderPrApprovalEvidenceChecklist());
  else if (command === "artifact-integrity") console.log(renderArtifactIntegrityReport());
  else if (command === "zip-validator") console.log(renderZipArtifactExpansionReport());
  else if (command === "changelog") console.log(renderChangelogGenerator());
  else if (command === "release-tag-evidence") console.log(renderReleaseTagEvidenceGenerator());
  else if (command === "build-test-readiness-matrix") console.log(renderBuildTestReadinessMatrix());
  else renderReport(validateRepositoryReleaseReadiness());
}
