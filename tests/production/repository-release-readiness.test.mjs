import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  RELEASE_CHECKLIST_ITEMS,
  RELEASE_READINESS_REQUIRED_FILES,
  renderRcEvidenceIndexTemplate,
  renderReleaseChecklist,
  validateRepositoryReleaseReadiness,
} from "../../scripts/repository-release-readiness-tooling.mjs";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
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
