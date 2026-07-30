import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildSbomFromPackageManifests,
  REQUIRED_EXTERNAL_REVIEWS,
  REQUIRED_PRIVACY_TERMS,
  REQUIRED_SECURITY_DOCS,
  REQUIRED_SECURITY_TERMS,
  REQUIRED_SUPPLY_CHAIN_TERMS,
  validateS5Lrw002,
} from "../../scripts/s5-lrw-002-security-compliance.mjs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("S5-LRW-002 required security and compliance artifacts exist and validate", () => {
  const result = validateS5Lrw002();
  assert.equal(result.status, "INTERNAL_SECURITY_ENGINEERING_COMPLETE");
  assert.equal(result.privacyReadiness, "PRIVACY_READINESS_ENGINEERING_COMPLETE");
  assert.equal(result.sbomStatus, "SBOM_COMPLETE");
  assert.equal(result.licenseStatus, "LICENSE_REGISTER_COMPLETE");
  assert.equal(result.vulnerabilityRegister, "VULNERABILITY_REGISTER_COMPLETE");
  assert.equal(result.externalSecurityAssessment, "EXTERNAL_SECURITY_ASSESSMENT_READY");
  assert.equal(result.externalComplianceAssessment, "EXTERNAL_COMPLIANCE_ASSESSMENT_READY");
  assert.equal(result.liveAndIndependentAssessments, "LIVE_AND_INDEPENDENT_ASSESSMENTS_PENDING");
  assert.equal(result.docsChecked, REQUIRED_SECURITY_DOCS.length);
  assert.equal(result.blockers.length, 0);
});

test("security readiness document covers required security automation controls", () => {
  const doc = read("docs/launch-readiness/security-readiness.md");
  for (const term of REQUIRED_SECURITY_TERMS) assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(doc, /does not certify production security/i);
});

test("privacy readiness document covers data governance and privacy controls", () => {
  const doc = read("docs/launch-readiness/privacy-readiness.md");
  for (const term of REQUIRED_PRIVACY_TERMS) assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(doc, /does not provide legal approval/i);
});

test("SBOM and license register covers supply-chain policy and inventory", () => {
  const doc = read("docs/launch-readiness/sbom-and-license-register.md");
  for (const term of REQUIRED_SUPPLY_CHAIN_TERMS) assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const license of ["AGPL", "GPL", "LGPL", "SSPL", "BUSL"]) assert.match(doc, new RegExp(license));
});

test("external assessment package covers all required independent reviews", () => {
  const doc = read("docs/launch-readiness/external-assessment-readiness.md");
  for (const review of REQUIRED_EXTERNAL_REVIEWS) assert.match(doc, new RegExp(review.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const field of ["Scope", "Prerequisites", "Test accounts", "Owner", "Evidence required", "Acceptance criteria", "Remediation workflow", "Retest procedure"]) {
    assert.match(doc, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("vulnerability remediation register contains severity policy remediation and retest workflow", () => {
  const doc = read("docs/launch-readiness/vulnerability-remediation-register.md");
  for (const term of ["Vulnerability Register", "Remediation Workflow", "Severity Policy", "Retest Procedure", "Critical", "High"]) {
    assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("security certification manifest JSON is valid and preserves pending certification", () => {
  const manifest = JSON.parse(read("docs/launch-readiness/security-certification-manifest.json"));
  assert.equal(manifest.status, "INTERNAL_SECURITY_ENGINEERING_COMPLETE");
  assert.equal(manifest.privacyReadiness, "PRIVACY_READINESS_ENGINEERING_COMPLETE");
  assert.equal(manifest.sbomStatus, "SBOM_COMPLETE");
  assert.equal(manifest.licenseStatus, "LICENSE_REGISTER_COMPLETE");
  assert.equal(manifest.vulnerabilityRegister, "VULNERABILITY_REGISTER_COMPLETE");
  assert.equal(manifest.externalSecurityAssessment, "EXTERNAL_SECURITY_ASSESSMENT_READY");
  assert.equal(manifest.externalComplianceAssessment, "EXTERNAL_COMPLIANCE_ASSESSMENT_READY");
  assert.equal(manifest.liveAndIndependentAssessments, "LIVE_AND_INDEPENDENT_ASSESSMENTS_PENDING");
  assert.equal(manifest.productionCertification, "NOT_CERTIFIED");
  assert.equal(manifest.productionReady, false);
  assert.equal(manifest.paidPilotReady, false);
  assert.equal(manifest.publicLaunchReady, false);
});

test("SBOM generator inventories package dependencies without network access", () => {
  const sbom = buildSbomFromPackageManifests();
  assert.equal(sbom.format, "rentashub-sbom-lite");
  assert.ok(sbom.generatedFrom.includes("package.json"));
  assert.ok(sbom.generatedFrom.includes("server/package.json"));
  assert.ok(sbom.componentCount >= 7);
  assert.ok(sbom.components.some((component) => component.name === "react"));
  assert.equal(sbom.formalLegalReviewPending, true);
});

test("validator records dependency audit and secret scan state without provider activation", () => {
  const result = validateS5Lrw002();
  assert.ok(["READY_TO_RUN", "READY_WITH_LOCKFILE_GAPS"].includes(result.dependencyAuditStatus));
  assert.equal(result.secretScanStatus, "PASS");
  assert.equal(result.productionTouched, false);
  assert.equal(result.liveProvidersTouched, false);
});

test("S5-LRW-002 artifacts do not contain credential assignments or live activation commands", () => {
  const combined = REQUIRED_SECURITY_DOCS.map(read).join("\n") + read("scripts/s5-lrw-002-security-compliance.mjs");
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY\s*=|DATABASE_URL\s*=|SENTRY_DSN\s*=|postgresql:\/\/[^:\s]+:[^@\s]+@|supabase\s+link|supabase\s+db\s+push/i);
});
