import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSecurityEvidencePackage,
  buildSecurityLaunchBlockerReport,
  buildSecurityReadinessReport,
  renderCorsLockdownChecklist,
  renderCsrfReviewChecklist,
  renderCspReadinessMatrix,
  renderDependencyAuditEvidenceTemplate,
  renderOwaspReviewEvidenceChecklist,
  renderPenTestReadinessIntakeTemplate,
  renderRateLimitReadinessChecklist,
  renderSecretsExposureCertificationTemplate,
  renderSecurityEvidencePackage,
  renderSecurityLaunchBlockerReport,
  renderVulnerabilityScanEvidenceTemplate,
} from "../../scripts/security-readiness-tooling.mjs";

function assertCredentialSafe(markdown) {
  assert.doesNotMatch(markdown, /postgresql:\/\//i);
  assert.doesNotMatch(markdown, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
  assert.doesNotMatch(markdown, /JWT_SECRET\s*=/);
  assert.doesNotMatch(markdown, /STRIPE_SECRET_KEY\s*=/);
  assert.doesNotMatch(markdown, /eyJ[a-zA-Z0-9_-]{20,}\./);
}

test("security evidence package generator combines readiness sections without live activation", () => {
  const report = buildSecurityEvidencePackage();
  assert.equal(report.liveSecurityToolingActivated, false);
  assert.equal(report.valuePrinted, false);
  assert.ok(["CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED", "REVIEW_REQUIRED"].includes(report.status));
  assert.ok(report.docs.some((doc) => doc.path === "docs/csp-policy-draft.md"));
  assert.ok(report.blockers.some((blocker) => /Manual evidence required/.test(blocker)));

  const markdown = renderSecurityEvidencePackage(report);
  assert.match(markdown, /Security Evidence Package/);
  assert.match(markdown, /Static secret scan evidence/);
  assert.match(markdown, /Pen-test readiness intake/);
  assertCredentialSafe(markdown);
});

test("CSP readiness matrix covers key directives and remains report-only", () => {
  const markdown = renderCspReadinessMatrix();
  assert.match(markdown, /CSP Readiness Matrix/);
  assert.match(markdown, /default-src/);
  assert.match(markdown, /frame-ancestors/);
  assert.match(markdown, /This does not enforce CSP/);
  assertCredentialSafe(markdown);
});

test("CORS lockdown checklist covers origin credentials and methods", () => {
  const markdown = renderCorsLockdownChecklist();
  assert.match(markdown, /CORS Lockdown Checklist/);
  assert.match(markdown, /Wildcard origins disabled/);
  assert.match(markdown, /Credentials policy reviewed/);
  assert.match(markdown, /Preflight methods restricted/);
  assertCredentialSafe(markdown);
});

test("CSRF review checklist covers state-changing surfaces", () => {
  const markdown = renderCsrfReviewChecklist();
  assert.match(markdown, /CSRF Review Checklist/);
  assert.match(markdown, /Admin mutations/);
  assert.match(markdown, /Payment\/refund placeholders/);
  assert.match(markdown, /State-changing APIs/);
  assertCredentialSafe(markdown);
});

test("rate-limit readiness checklist covers protected abuse surfaces", () => {
  const markdown = renderRateLimitReadinessChecklist();
  for (const phrase of ["Auth login", "Password reset", "File upload intent", "Admin mutations", "Messaging"]) {
    assert.match(markdown, new RegExp(phrase));
  }
  assert.match(markdown, /Provider-ready only/);
  assertCredentialSafe(markdown);
});

test("dependency audit and vulnerability scan templates are evidence-only", () => {
  const dependency = renderDependencyAuditEvidenceTemplate();
  const vulnerability = renderVulnerabilityScanEvidenceTemplate();
  assert.match(dependency, /Dependency Audit Evidence Template/);
  assert.match(dependency, /Audit Level/);
  assert.match(vulnerability, /Vulnerability Scan Evidence Template/);
  assert.match(vulnerability, /Static application security test/);
  assertCredentialSafe(dependency);
  assertCredentialSafe(vulnerability);
});

test("secrets exposure certification template covers source bundle ZIP docs logs and CI", () => {
  const markdown = renderSecretsExposureCertificationTemplate();
  for (const phrase of ["Source control", "Frontend bundle", "ZIP artifacts", "Documentation", "Logs", "CI/CD"]) {
    assert.match(markdown, new RegExp(phrase));
  }
  assert.match(markdown, /No secret values are included/);
  assertCredentialSafe(markdown);
});

test("OWASP review evidence checklist covers the current top ten categories", () => {
  const markdown = renderOwaspReviewEvidenceChecklist();
  assert.match(markdown, /OWASP Review Evidence Checklist/);
  assert.match(markdown, /A01 Broken Access Control/);
  assert.match(markdown, /A10 Server-Side Request Forgery/);
  assert.match(markdown, /Security Logging and Monitoring/);
  assertCredentialSafe(markdown);
});

test("pen-test readiness intake template keeps production and credentials out of scope", () => {
  const markdown = renderPenTestReadinessIntakeTemplate();
  assert.match(markdown, /Pen-Test Readiness Intake Template/);
  assert.match(markdown, /Production testing authorized: No/);
  assert.match(markdown, /No production testing/);
  assert.match(markdown, /Use test accounts only/);
  assertCredentialSafe(markdown);
});

test("security launch blocker report remains blocked until manual security evidence exists", () => {
  const report = buildSecurityLaunchBlockerReport();
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.liveSecurityToolingActivated, false);
  assert.equal(report.valuePrinted, false);
  assert.ok(report.blockers.some((blocker) => /OWASP review/.test(blocker)));
  assert.ok(report.blockers.some((blocker) => /penetration-test/.test(blocker)));

  const markdown = renderSecurityLaunchBlockerReport(report);
  assert.match(markdown, /Security Launch Blocker Report/);
  assert.match(markdown, /C2 Security Operationalization remains blocked/);
  assertCredentialSafe(markdown);
});

test("security readiness report stays credential-ready and does not claim certification", () => {
  const report = buildSecurityReadinessReport();
  assert.equal(report.status, "CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED");
  assert.equal(report.liveSecurityToolingActivated, false);
  assert.equal(report.valuePrinted, false);
  assert.ok(report.blockerCount > 0);
});
