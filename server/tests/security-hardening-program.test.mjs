import assert from "node:assert/strict";
import { test } from "node:test";
import { getIntegrationReadiness } from "../src/config/integrationReadiness.js";
import {
  SECURITY_ALERT_CLASSIFICATIONS,
  SECURITY_EVENT_TAXONOMY,
  SECURITY_HARDENING_DOMAINS,
  calculateSecurityReadinessScore,
  getSecurityHardeningProgram,
} from "../src/security/securityHardeningProgram.js";

const completeEnv = {
  SECURITY_MFA_PROVIDER: "supabase-mfa",
  SECURITY_SESSION_COOKIE_POLICY: "httpOnly-secure-sameSite-strict",
  SECURITY_REFRESH_TOKEN_ROTATION: "required",
  SECURITY_SESSION_REVOCATION: "required",
  SECURITY_CSP_POLICY: "strict-csp-for-staging",
  SECURITY_CORS_REVIEW_STATUS: "origin-allowlist-reviewed",
  SECURITY_CSRF_STRATEGY: "sameSite-token-reviewed",
  SECURITY_RATE_LIMIT_POLICY: "distributed-provider-required",
  SECURITY_ABUSE_PROTECTION_PROVIDER: "cloudflare",
  SECURITY_REQUEST_VALIDATION_STATUS: "domain-validation-reviewed",
  SECURITY_DEPENDENCY_AUDIT_TOOL: "github-dependabot",
  SECURITY_VULNERABILITY_SCAN_PROVIDER: "github-codeql",
  SECURITY_PATCH_SLA_POLICY_URL: "https://example.test/security/patch-sla",
  SECURITY_EVENT_TAXONOMY_STATUS: "approved",
  SECURITY_ALERT_ROUTING_STATUS: "provider-ready",
  SECURITY_INCIDENT_RUNBOOK_STATUS: "tabletop-required",
  SECURITY_REMEDIATION_OWNER: "security-owner@example.test",
};

test("security hardening program defines required domains, taxonomy, and alert classes", () => {
  const domainIds = SECURITY_HARDENING_DOMAINS.map((domain) => domain.id);
  assert.deepEqual(domainIds, [
    "authentication_security",
    "application_security",
    "api_security",
    "dependency_security",
    "security_monitoring",
  ]);
  assert.ok(SECURITY_EVENT_TAXONOMY.some((event) => event.id === "rbac.permission_denied" && event.severity === "high"));
  assert.ok(SECURITY_EVENT_TAXONOMY.some((event) => event.id === "storage.private_file_access_denied"));
  assert.ok(SECURITY_ALERT_CLASSIFICATIONS.some((item) => item.id === "sev1" && item.responseTarget === "15 minutes"));
});

test("security hardening defaults are provider-ready only and missing live inputs", () => {
  const readiness = getSecurityHardeningProgram({});
  assert.equal(readiness.kind, "securityHardeningProgram");
  assert.equal(readiness.status, "security_hardening_inputs_missing");
  assert.equal(readiness.ready, false);
  assert.equal(readiness.score, 0);
  assert.ok(readiness.missing.includes("SECURITY_MFA_PROVIDER"));
  assert.equal(readiness.mfaLive, false);
  assert.equal(readiness.wafLive, false);
  assert.equal(readiness.siemLive, false);
  assert.equal(readiness.externalPenTestVendorActive, false);
  assert.equal(readiness.productionSecurityToolingActive, false);
  assert.equal(readiness.productionSuitable, false);
});

test("security hardening score rises with complete staging validation inputs", () => {
  const readiness = getSecurityHardeningProgram(completeEnv);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.score, 100);
  assert.equal(calculateSecurityReadinessScore(completeEnv), 100);
  assert.equal(readiness.productionSuitable, false);
  assert.equal(readiness.certified, false);
  assert.equal(readiness.domains.every((domain) => domain.ready), true);
});

test("integration readiness exposes security hardening separately from certification", () => {
  const readiness = getIntegrationReadiness({});
  assert.equal(readiness.checks.securityHardening.kind, "securityHardeningProgram");
  assert.equal(readiness.checks.securityHardening.ready, false);
  assert.ok(readiness.checks.securityCertification.hardeningProgram);
  assert.equal(readiness.checks.securityCertification.hardeningScore, 0);
  assert.match(readiness.workstreams.productionSecurity.note, /Security hardening and certification/);
});

test("placeholder hardening values are rejected", () => {
  const readiness = getSecurityHardeningProgram({
    SECURITY_MFA_PROVIDER: "placeholder",
    SECURITY_SESSION_COOKIE_POLICY: "<required>",
    SECURITY_REFRESH_TOKEN_ROTATION: "todo",
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.includes("SECURITY_MFA_PROVIDER"));
  assert.ok(readiness.missing.includes("SECURITY_SESSION_COOKIE_POLICY"));
  assert.ok(readiness.missing.includes("SECURITY_REFRESH_TOKEN_ROTATION"));
});
