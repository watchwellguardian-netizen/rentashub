import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildDependencyAuditPlan } from "../../scripts/dependency-audit-wrapper.mjs";
import { scanForSecrets } from "../../scripts/secret-scan.mjs";
import {
  buildSecretSafetyReport,
  detectServiceRoleExposure,
  renderSecretSafetyReport,
  scanDocumentationSecrets,
  scanFrontendBundleSecrets,
  scanLogPatternSecrets,
  scanZipArtifactSecrets,
} from "../../scripts/secret-safety-tooling.mjs";
import { validateReleaseArtifacts } from "../../scripts/validate-release-artifacts.mjs";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("static secret-pattern scanner is available and clean", () => {
  const result = scanForSecrets();
  assert.equal(result.status, "PASS");
  assert.equal(result.findings.length, 0);
  assert.ok(result.scannedFiles > 0);
});

test("dependency audit wrapper reports release audit targets without running network audit", () => {
  const plan = buildDependencyAuditPlan();
  assert.ok(["READY_TO_RUN", "READY_WITH_LOCKFILE_GAPS"].includes(plan.status));
  assert.equal(plan.mode, "plan");
  assert.equal(plan.auditLevel, "high");
  assert.ok(plan.targets.some((target) => target.id === "root"));
  assert.ok(plan.targets.some((target) => target.id === "server"));
  assert.match(JSON.stringify(plan), /npm audit --audit-level=high/);
});

test("CSP policy draft contains strict baseline and staging validation boundary", () => {
  const doc = read("docs/csp-policy-draft.md");
  for (const phrase of [
    "default-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "report-only mode",
    "does not activate CSP enforcement",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("rate-limit configuration matrix covers protected abuse surfaces", () => {
  const doc = read("docs/rate-limit-configuration-matrix.md");
  for (const phrase of [
    "Auth login",
    "Password reset",
    "File upload intent",
    "Payment intent",
    "Admin mutations",
    "distributed rate limiting",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("MFA and session hardening checklists preserve provider-ready boundary", () => {
  const mfa = read("docs/mfa-readiness-checklist.md");
  const session = read("docs/session-hardening-validation-checklist.md");
  assert.match(mfa, /Admin MFA required/);
  assert.match(mfa, /does not activate live MFA/);
  assert.match(session, /Refresh-token rotation/);
  assert.match(session, /Development auth headers disabled in production/);
  assert.match(session, /does not activate live Supabase session handling/);
});

test("security evidence template covers required evidence sections without requesting secrets", () => {
  const doc = read("docs/security-evidence-report-template.md");
  for (const phrase of [
    "Static Secret Scan",
    "Dependency Audit",
    "CSP Validation",
    "Rate Limiting",
    "MFA Readiness",
    "Session Hardening",
    "Do not include secrets",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("security readiness scripts and docs are included in artifact validation", () => {
  const result = validateReleaseArtifacts();
  assert.equal(result.status, "PASS");

  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["security:scan"], "node scripts/secret-scan.mjs");
  assert.equal(pkg.scripts["security:audit"], "node scripts/dependency-audit-wrapper.mjs plan");
  assert.equal(pkg.scripts["security:audit:run"], "node scripts/dependency-audit-wrapper.mjs run");

  const ci = read(".github/workflows/ci.yml");
  const security = read(".github/workflows/security.yml");
  assert.match(ci, /npm run security:audit/);
  assert.match(security, /npm run security:audit:run/);
});

test("frontend bundle secret scanner is available and credential-safe", () => {
  const result = scanFrontendBundleSecrets();
  assert.equal(result.surface, "frontend_bundle");
  assert.equal(result.status, "PASS");
  assert.ok(result.scannedFiles >= 0);
  assert.deepEqual(result.findings, []);
});

test("ZIP artifact secret scanner checks packageable files and artifact validation", () => {
  const result = scanZipArtifactSecrets();
  assert.equal(result.surface, "zip_artifact_packageable_files");
  assert.equal(result.status, "PASS");
  assert.equal(result.artifactValidationStatus, "PASS");
  assert.deepEqual(result.findings, []);
});

test("documentation and log-pattern secret scanners are available", () => {
  const docs = scanDocumentationSecrets();
  const logs = scanLogPatternSecrets();
  assert.equal(docs.surface, "documentation");
  assert.equal(logs.surface, "logs");
  assert.equal(docs.status, "PASS");
  assert.equal(logs.status, "PASS");
  assert.deepEqual(docs.findings, []);
  assert.deepEqual(logs.findings, []);
});

test("service-role-key exposure detector allows labels but blocks values", () => {
  const result = detectServiceRoleExposure();
  assert.equal(result.surface, "service_role_key_exposure");
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.findings, []);
});

test("secret safety report combines bundle zip docs logs and service-role checks", () => {
  const report = buildSecretSafetyReport();
  assert.equal(report.status, "PASS");
  assert.equal(report.checks.length, 5);
  assert.ok(report.checks.some((check) => check.surface === "frontend_bundle"));
  assert.ok(report.checks.some((check) => check.surface === "zip_artifact_packageable_files"));
  assert.ok(report.checks.some((check) => check.surface === "documentation"));
  assert.ok(report.checks.some((check) => check.surface === "logs"));
  assert.ok(report.checks.some((check) => check.surface === "service_role_key_exposure"));
  assert.deepEqual(report.findings, []);
  const rendered = renderSecretSafetyReport(report);
  assert.match(rendered, /Secret Safety Report/);
  assert.doesNotMatch(rendered, /eyJ|postgresql:\/\/|sb_service_[a-z0-9_]+/i);
});
