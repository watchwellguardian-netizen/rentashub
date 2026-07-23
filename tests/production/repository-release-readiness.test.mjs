import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildArtifactIntegrityReport,
  buildCiGateEvidenceReport,
  buildZipArtifactExpansionReport,
  BRANCH_PROTECTION_REQUIREMENTS,
  CI_GATE_MATRIX,
  PR_APPROVAL_REQUIREMENTS,
  RELEASE_CHECKLIST_ITEMS,
  RELEASE_READINESS_REQUIRED_FILES,
  renderArtifactIntegrityReport,
  renderBranchProtectionEvidenceChecklist,
  renderBuildTestReadinessMatrix,
  renderChangelogGenerator,
  renderCiGateEvidenceReport,
  renderPrApprovalEvidenceChecklist,
  renderRcEvidenceIndexTemplate,
  renderReleaseTagEvidenceGenerator,
  renderReleaseChecklist,
  renderZipArtifactExpansionReport,
  validateRepositoryReleaseReadiness,
} from "../../scripts/repository-release-readiness-tooling.mjs";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assertNoSecretValues(output) {
  for (const pattern of [/SUPABASE_SERVICE_ROLE_KEY\s*=/i, /DATABASE_URL\s*=/i, /postgresql:\/\/postgres:/i, /GITHUB_TOKEN\s*=/i, /sk_live_/i]) {
    assert.doesNotMatch(output, pattern);
  }
}

test("CODEOWNERS refinement covers source server scripts docs ADRs and security-sensitive areas", () => {
  const codeowners = read(".github/CODEOWNERS");
  for (const token of ["/src/", "/server/", "/scripts/", "/docs/adr/", "/server/src/escrow/", "/server/src/payments/", "@security-team"]) {
    assert.match(codeowners, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("PR and issue templates include release evidence and secret-safety prompts", () => {
  const pr = read(".github/pull_request_template.md");
  assert.match(pr, /Release Evidence/);
  assert.match(pr, /Authorized gate/);
  assert.match(pr, /No secrets/i);
  assert.match(pr, /CODEOWNERS/);

  const bug = read(".github/ISSUE_TEMPLATE/bug_report.md");
  assert.match(bug, /Release Evidence Required/);
  assert.match(bug, /Security\/data integrity blocker/);

  const feature = read(".github/ISSUE_TEMPLATE/feature_request.md");
  assert.match(feature, /Release Impact/);
  assert.match(feature, /does not require live provider credentials/i);

  const infra = read(".github/ISSUE_TEMPLATE/infrastructure_issue.md");
  assert.match(infra, /Secret Safety/);
  assert.match(infra, /A4-01/);

  const security = read(".github/ISSUE_TEMPLATE/security_incident.md");
  assert.match(security, /Release Control/);
  assert.match(security, /Preserve audit evidence/);
});

test("ADR starter records capture existing architectural decisions", () => {
  const adrFiles = [
    "docs/adr/0001-provider-ready-before-live-activation.md",
    "docs/adr/0002-supabase-selected-for-project-a.md",
    "docs/adr/0003-release-branch-governance.md",
    "docs/adr/0004-no-live-funds-without-revenue-and-escrow-certification.md",
  ];
  for (const path of adrFiles) {
    assert.equal(existsSync(join(root, path)), true);
    const content = read(path);
    assert.match(content, /Status: Accepted/);
    assert.match(content, /## Decision/);
    assert.match(content, /## Validation/);
  }
  assert.match(read(adrFiles[1]), /Supabase/);
  assert.match(read(adrFiles[2]), /future-release-backlog/);
  assert.match(read(adrFiles[3]), /No Live Funds/);
});

test("changelog template and RC evidence index exist and preserve launch boundaries", () => {
  const changelog = read("docs/changelog-template.md");
  assert.match(changelog, /Changelog Template/);
  assert.match(changelog, /Release candidate notes/);
  assert.match(changelog, /Production ready: No/);
  assert.match(changelog, /Live payments\/escrow: No/);

  const index = read("docs/rc-evidence-index.md");
  assert.match(index, /Release Candidate Evidence Index/);
  assert.match(index, /RC-0.6A/);
  assert.match(index, /A4-01/);
  assert.match(index, /Secret Safety Rule/);
});

test("release checklist automation renders required evidence checks", () => {
  assert.ok(RELEASE_CHECKLIST_ITEMS.includes("Run secret scan"));
  assert.ok(RELEASE_CHECKLIST_ITEMS.includes("Run artifact validation"));
  assert.ok(RELEASE_CHECKLIST_ITEMS.includes("Update RC evidence index when release-impacting"));
  const checklist = renderReleaseChecklist();
  assert.match(checklist, /Release Checklist/);
  assert.match(checklist, /Run frontend\/production tests/);
  assert.match(checklist, /Confirm no secrets or credential values are included/);

  const rcIndex = renderRcEvidenceIndexTemplate();
  assert.match(rcIndex, /RC Evidence Index Entry/);
  assert.match(rcIndex, /Authorized Gate/);
  assert.match(rcIndex, /Decision/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "PAYMENT_SECRET_KEY", "ESCROW_API_KEY"]) {
    assert.doesNotMatch(rcIndex, new RegExp(`${label}\\s*=`, "i"));
  }
});

test("repository release readiness validator passes and required files are package artifacts", () => {
  for (const path of RELEASE_READINESS_REQUIRED_FILES) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
  }
  const result = validateRepositoryReleaseReadiness();
  assert.equal(result.status, "PASS");
  assert.equal(result.productionReadyClaimed, false);
  assert.equal(result.liveProviderActivation, false);
  assert.equal(result.blockers.length, 0);
});

test("CI gate evidence reporter covers release gate commands without claiming CI execution", () => {
  assert.ok(CI_GATE_MATRIX.some((row) => row.command === "npm run test"));
  assert.ok(CI_GATE_MATRIX.some((row) => row.command === "npm run zip:check"));
  const report = buildCiGateEvidenceReport();
  assert.equal(report.status, "EVIDENCE_TEMPLATE_READY");
  assert.equal(report.productionReady, false);
  assert.equal(report.liveProviderActivation, false);

  const rendered = renderCiGateEvidenceReport();
  assert.match(rendered, /CI Gate Evidence Report/);
  assert.match(rendered, /Frontend Tests/);
  assert.match(rendered, /CI evidence must be collected from an actual CI run/);
  assertNoSecretValues(rendered);
});

test("branch protection and PR approval evidence checklists cover protected release controls", () => {
  assert.ok(BRANCH_PROTECTION_REQUIREMENTS.some((item) => item.includes("main")));
  assert.ok(BRANCH_PROTECTION_REQUIREMENTS.some((item) => item.includes("release")));
  assert.ok(PR_APPROVAL_REQUIREMENTS.some((item) => item.includes("Authorized gate")));
  assert.ok(PR_APPROVAL_REQUIREMENTS.some((item) => item.includes("No secrets")));

  const branch = renderBranchProtectionEvidenceChecklist();
  assert.match(branch, /Branch Protection Evidence Checklist/);
  assert.match(branch, /No direct pushes/);
  assert.match(branch, /CODEOWNERS review required/);
  assertNoSecretValues(branch);

  const pr = renderPrApprovalEvidenceChecklist();
  assert.match(pr, /Pull Request Approval Evidence Checklist/);
  assert.match(pr, /Security impact reviewed/);
  assert.match(pr, /No live provider activation/);
  assertNoSecretValues(pr);
});

test("artifact integrity and ZIP validator reports reuse package validation rules", () => {
  const artifact = buildArtifactIntegrityReport();
  assert.equal(artifact.status, "PASS");
  assert.equal(artifact.artifactStatus, "PASS");
  assert.equal(artifact.zipStatus, "PASS");
  assert.equal(artifact.productionReady, false);

  const artifactReport = renderArtifactIntegrityReport();
  assert.match(artifactReport, /Artifact Integrity Report/);
  assert.match(artifactReport, /Artifact validation: PASS/);
  assert.match(artifactReport, /ZIP validation: PASS/);
  assertNoSecretValues(artifactReport);

  const zip = buildZipArtifactExpansionReport();
  assert.equal(zip.status, "PASS");
  assert.ok(zip.requiredFilesChecked > 20);
  assert.ok(zip.excludedSegments.includes("node_modules"));

  const zipReport = renderZipArtifactExpansionReport();
  assert.match(zipReport, /ZIP Artifact Inclusion \/ Exclusion Validator Report/);
  assert.match(zipReport, /Forbidden Files/);
  assertNoSecretValues(zipReport);
});

test("changelog release tag and build matrix generators are evidence-only", () => {
  const changelog = renderChangelogGenerator({ version: "RC-0.6A", date: "2026-06-20" });
  assert.match(changelog, /RC-0.6A - 2026-06-20/);
  assert.match(changelog, /Production ready: No/);
  assert.match(changelog, /Live provider activation: No/);
  assertNoSecretValues(changelog);

  const tagEvidence = renderReleaseTagEvidenceGenerator({ tag: "rc-0.6a", title: "RentasHub Marketplace RC-0.6A" });
  assert.match(tagEvidence, /Release Tag Evidence/);
  assert.match(tagEvidence, /Dry run: true/);
  assert.match(tagEvidence, /git tag -a rc-0.6a/);
  assertNoSecretValues(tagEvidence);

  const matrix = renderBuildTestReadinessMatrix();
  assert.match(matrix, /Build \/ Test \/ Readiness Matrix/);
  assert.match(matrix, /npm run test:server/);
  assert.match(matrix, /npm run readiness/);
  assert.match(matrix, /npm run artifact:validate/);
  assertNoSecretValues(matrix);
});

test("repository CI readiness CLI commands render requested artifacts", () => {
  const commands = [
    "ci-gate-report",
    "branch-protection-checklist",
    "pr-approval-checklist",
    "artifact-integrity",
    "zip-validator",
    "changelog",
    "release-tag-evidence",
    "build-test-readiness-matrix",
  ];
  for (const command of commands) {
    const output = execFileSync(process.execPath, ["scripts/repository-release-readiness-tooling.mjs", command], { encoding: "utf8" });
    assert.ok(output.trim().length > 80, `${command} should render useful evidence`);
    assertNoSecretValues(output);
  }
});
