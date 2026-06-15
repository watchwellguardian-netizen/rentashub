import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  SECURITY_HARDENING_PROGRAM_CHECKS,
  getCredentialReadinessSummary,
  getSecurityHardeningProgramReadiness,
} from "../../src/lib/credentialReadiness.js";
import { createAdminSnapshot } from "../../src/lib/adminCenter.js";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function emptyStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("Project C1 documentation exists and includes required hardening sections", () => {
  const files = [
    "docs/project-c-security-hardening-program.md",
    "docs/security-gap-report.md",
    "docs/security-remediation-plan.md",
  ];
  for (const file of files) {
    const contents = read(file);
    assert.match(contents, /Security|security/);
    assert.doesNotMatch(contents, /Production Ready:\s*Yes|production-ready:\s*yes/i);
  }

  const architecture = read("docs/project-c-security-hardening-program.md");
  for (const phrase of [
    "Authentication Security",
    "Application Security",
    "API Security",
    "Dependency Security",
    "Security Monitoring",
    "Security Event Taxonomy",
    "Alert Severity Classes",
    "Live MFA provider",
  ]) {
    assert.match(architecture, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const gaps = read("docs/security-gap-report.md");
  assert.match(gaps, /MFA activation/);
  assert.match(gaps, /Dev-header removal/);
  assert.match(gaps, /Penetration testing/);

  const remediation = read("docs/security-remediation-plan.md");
  assert.match(remediation, /Remediation Sequence/);
  assert.match(remediation, /dependency audit/i);
  assert.match(remediation, /penetration test/i);
});

test("frontend credential readiness exposes Project C1 hardening checks", () => {
  const readiness = getSecurityHardeningProgramReadiness({});
  assert.equal(readiness.status, "security_hardening_inputs_missing");
  assert.equal(readiness.score, 0);
  assert.equal(readiness.liveMfaActive, false);
  assert.equal(readiness.liveWafActive, false);
  assert.equal(readiness.liveSiemActive, false);
  assert.equal(readiness.productionSecurityToolingActive, false);
  assert.ok(readiness.missing.includes("SECURITY_MFA_PROVIDER"));
  assert.ok(SECURITY_HARDENING_PROGRAM_CHECKS.some((item) => item.id === "api_security"));

  const summary = getCredentialReadinessSummary();
  assert.ok(summary.securityHardeningProgramReadiness.some((item) => item.id === "security_monitoring"));
  assert.equal(summary.securityHardening.status, "security_hardening_inputs_missing");
});

test("admin dashboard includes Project C1 security hardening panel", () => {
  const snapshot = createAdminSnapshot(emptyStorage());
  assert.equal(snapshot.overview.securityHardeningScore, 0);
  assert.equal(snapshot.credentialReadiness.securityHardening.missing.includes("SECURITY_MFA_PROVIDER"), true);
  assert.equal(snapshot.settings.securityHardening, "0% security hardening readiness score");

  const page = read("src/pages/AdminCenter.jsx");
  for (const text of [
    "Security hardening program",
    "Authentication security",
    "Application security",
    "API security",
    "Dependency security",
    "Security monitoring",
    "Live tooling",
  ]) {
    assert.match(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("server env template contains Project C1 controls", () => {
  const env = read("server/.env.example");
  for (const key of [
    "SECURITY_MFA_PROVIDER",
    "SECURITY_SESSION_COOKIE_POLICY",
    "SECURITY_REFRESH_TOKEN_ROTATION",
    "SECURITY_SESSION_REVOCATION",
    "SECURITY_CSP_POLICY",
    "SECURITY_CORS_REVIEW_STATUS",
    "SECURITY_CSRF_STRATEGY",
    "SECURITY_RATE_LIMIT_POLICY",
    "SECURITY_ABUSE_PROTECTION_PROVIDER",
    "SECURITY_REQUEST_VALIDATION_STATUS",
    "SECURITY_DEPENDENCY_AUDIT_TOOL",
    "SECURITY_VULNERABILITY_SCAN_PROVIDER",
    "SECURITY_PATCH_SLA_POLICY_URL",
    "SECURITY_EVENT_TAXONOMY_STATUS",
    "SECURITY_ALERT_ROUTING_STATUS",
    "SECURITY_INCIDENT_RUNBOOK_STATUS",
    "SECURITY_REMEDIATION_OWNER",
  ]) {
    assert.match(env, new RegExp(`^${key}=`, "m"));
  }
});

test("backend readiness source references security hardening program", () => {
  const integration = read("server/src/config/integrationReadiness.js");
  const certification = read("server/src/security/securityCertificationReadiness.js");
  assert.match(integration, /getSecurityHardeningProgram/);
  assert.match(integration, /securityHardening/);
  assert.match(certification, /hardeningProgram/);
});

test("Project C1 does not activate live security providers", () => {
  const model = read("server/src/security/securityHardeningProgram.js");
  for (const marker of [
    "mfaLive: false",
    "wafLive: false",
    "socLive: false",
    "siemLive: false",
    "externalPenTestVendorActive: false",
    "productionSecurityToolingActive: false",
  ]) {
    assert.match(model, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(model, /sendAlert\(|createMfaChallenge\(|activateWaf\(/);
});
