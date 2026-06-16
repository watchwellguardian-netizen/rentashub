import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  else renderReport(validateRepositoryReleaseReadiness());
}
