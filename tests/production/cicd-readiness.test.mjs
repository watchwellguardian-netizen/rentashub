import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildReleaseCandidateTagPlan } from "../../scripts/release-candidate-tag-helper.mjs";
import { scanForSecrets } from "../../scripts/secret-scan.mjs";
import { validateReleaseArtifacts } from "../../scripts/validate-release-artifacts.mjs";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("CI/CD readiness workflows define build test readiness artifact and secret scan gates", () => {
  const ci = read(".github/workflows/ci.yml");
  const security = read(".github/workflows/security.yml");
  assert.match(ci, /strategy:/);
  assert.match(ci, /frontend-tests/);
  assert.match(ci, /backend-tests/);
  assert.match(ci, /readiness/);
  assert.match(ci, /artifact-validation/);
  assert.match(ci, /a4-supabase-readiness/);
  assert.match(security, /npm run security:scan/);
});

test("branch protection documentation covers protected branches and required checks", () => {
  const doc = read("docs/branch-protection.md");
  assert.match(doc, /main/);
  assert.match(doc, /release/);
  assert.match(doc, /future-release-backlog/);
  assert.match(doc, /Frontend tests/);
  assert.match(doc, /Secret scan/);
  assert.match(doc, /Artifact validation/);
});

test("artifact validation script reports required release assets without requiring build output", () => {
  const result = validateReleaseArtifacts();
  assert.equal(result.status, "PASS");
  assert.equal(result.requiredMissing.length, 0);
  assert.equal(result.forbidden.length, 0);
});

test("secret scan workflow helper does not report committed secrets", () => {
  const result = scanForSecrets();
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.findings, []);
});

test("release candidate tag helper validates RC tag format and stays dry-run only", () => {
  const result = buildReleaseCandidateTagPlan({
    tag: "rc-0.6b",
    title: "RentasHub Marketplace RC-0.6B - Infrastructure Certified",
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.dryRun, true);
  assert.match(result.command, /git tag -a rc-0\.6b/);

  const invalid = buildReleaseCandidateTagPlan({ tag: "production", title: "No" });
  assert.equal(invalid.status, "FAIL");
});

test("CI/CD readiness files are wired into package scripts", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["artifact:validate"], "node scripts/validate-release-artifacts.mjs");
  assert.equal(pkg.scripts["security:scan"], "node scripts/secret-scan.mjs");
  assert.equal(pkg.scripts["rc:tag"], "node scripts/release-candidate-tag-helper.mjs");
  assert.ok(existsSync(join(root, "scripts/validate-release-artifacts.mjs")));
  assert.ok(existsSync(join(root, "scripts/secret-scan.mjs")));
  assert.ok(existsSync(join(root, "scripts/release-candidate-tag-helper.mjs")));
});
