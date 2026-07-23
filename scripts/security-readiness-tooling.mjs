import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDependencyAuditPlan } from "./dependency-audit-wrapper.mjs";
import { buildSecretSafetyReport } from "./secret-safety-tooling.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const SECURITY_SURFACES = [
  "Authentication",
  "Session lifecycle",
  "RBAC and route guards",
  "API request validation",
  "File upload/storage access",
  "Payments and escrow placeholders",
  "Admin actions",
  "Audit logging",
  "Monitoring and alerting",
];

const OWASP_AREAS = [
  "A01 Broken Access Control",
  "A02 Cryptographic Failures",
  "A03 Injection",
  "A04 Insecure Design",
  "A05 Security Misconfiguration",
  "A06 Vulnerable and Outdated Components",
  "A07 Identification and Authentication Failures",
  "A08 Software and Data Integrity Failures",
  "A09 Security Logging and Monitoring Failures",
  "A10 Server-Side Request Forgery",
];

const RATE_LIMIT_SURFACES = [
  "Auth login",
  "Auth register",
  "Password reset",
  "File upload intent",
  "Payment intent",
  "Auction bid simulation",
  "Admin mutations",
  "Search",
  "Messaging",
];

function readDoc(relativePath) {
  const fullPath = join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function docStatus(relativePath, requiredPhrases = []) {
  const content = readDoc(relativePath);
  const missing = requiredPhrases.filter((phrase) => !content.toLowerCase().includes(phrase.toLowerCase()));
  return {
    path: relativePath,
    exists: Boolean(content),
    status: content && missing.length === 0 ? "PASS" : "REVIEW_REQUIRED",
    missing,
  };
}

export function buildSecurityEvidencePackage() {
  const dependencyAudit = buildDependencyAuditPlan();
  const secretSafety = buildSecretSafetyReport();
  const docs = [
    docStatus("docs/csp-policy-draft.md", ["default-src 'self'", "report-only mode", "does not activate CSP enforcement"]),
    docStatus("docs/rate-limit-configuration-matrix.md", ["Auth login", "Password reset", "distributed rate limiting"]),
    docStatus("docs/mfa-readiness-checklist.md", ["Admin MFA required", "does not activate live MFA"]),
    docStatus("docs/session-hardening-validation-checklist.md", ["Refresh-token rotation", "Development auth headers disabled in production"]),
    docStatus("docs/security-evidence-report-template.md", ["Static Secret Scan", "Dependency Audit", "Do not include secrets"]),
  ];
  const blockers = [
    ...docs.filter((doc) => doc.status !== "PASS").map((doc) => `${doc.path}: missing ${doc.missing.join(", ")}`),
    ...(secretSafety.status === "PASS" ? [] : ["Secret safety scan must pass before security evidence package can be accepted."]),
    ...(dependencyAudit.status === "READY_TO_RUN" || dependencyAudit.status === "READY_WITH_LOCKFILE_GAPS" ? [] : ["Dependency audit plan is not ready."]),
    "Manual evidence required: live security review, dependency audit execution, vulnerability scan, OWASP review, and penetration-test intake are not complete.",
  ];
  return {
    status: blockers.length === 1 ? "CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED" : "REVIEW_REQUIRED",
    generatedAt: new Date().toISOString(),
    liveSecurityToolingActivated: false,
    valuePrinted: false,
    docs,
    dependencyAuditStatus: dependencyAudit.status,
    secretSafetyStatus: secretSafety.status,
    blockers,
  };
}

export function renderSecurityEvidencePackage(report = buildSecurityEvidencePackage()) {
  return [
    "# Security Evidence Package",
    "",
    "Do not include secrets, keys, passwords, JWTs, provider tokens, private logs, raw vulnerability payloads, or screenshots containing credentials.",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Security Tooling Activated: ${report.liveSecurityToolingActivated ? "YES" : "NO"}`,
    "",
    "## Evidence Sections",
    "- Static secret scan evidence",
    "- Dependency audit evidence",
    "- CSP validation evidence",
    "- CORS lockdown evidence",
    "- CSRF review evidence",
    "- Rate-limit readiness evidence",
    "- Vulnerability scan evidence",
    "- Secrets exposure certification",
    "- OWASP review evidence",
    "- Pen-test readiness intake",
    "",
    "## Document Checks",
    ...report.docs.map((doc) => `- ${doc.path}: ${doc.status}`),
    "",
    "## Blockers",
    ...report.blockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

export function renderCspReadinessMatrix() {
  const doc = docStatus("docs/csp-policy-draft.md", ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]);
  return [
    "# CSP Readiness Matrix",
    "",
    "Status: Draft / report-only readiness only. This does not enforce CSP.",
    "",
    "| Directive | Required Policy | Evidence Status | Notes |",
    "| --- | --- | --- | --- |",
    "| default-src | 'self' | Pending | Confirm no broad default source. |",
    "| object-src | 'none' | Pending | Blocks plugins/legacy embeds. |",
    "| frame-ancestors | 'none' | Pending | Clickjacking defense. |",
    "| script-src | 'self' | Pending | No wildcard scripts without approval. |",
    "| style-src | 'self' plus approved fonts | Pending | Review inline style requirement. |",
    "| connect-src | approved API/Supabase/monitoring domains | Pending | Validate real provider domains before enforcement. |",
    "| report-uri/report-to | monitoring endpoint | Pending | Required before enforcement. |",
    "",
    "## Existing Draft Check",
    `- docs/csp-policy-draft.md: ${doc.status}`,
  ].join("\n");
}

export function renderCorsLockdownChecklist() {
  return `# CORS Lockdown Checklist

Do not include API keys, bearer tokens, cookies, JWTs, or screenshots containing credentials.

| Evidence Item | Development | UAT | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| Allowed origins inventory approved | Pending | Pending | Pending | Include app, admin, and API domains only. |
| Wildcard origins disabled | Pending | Pending | Pending | No \`*\` for credentialed requests. |
| Credentials policy reviewed | Pending | Pending | Pending | Cookies/auth headers require explicit origin. |
| Preflight methods restricted | Pending | Pending | Pending | Allow only required HTTP methods. |
| Preflight headers restricted | Pending | Pending | Pending | No broad custom header exposure. |
| Error responses do not leak origin policy internals | Pending | Pending | Pending | Friendly generic errors. |
| Direct URL protected-route test completed | Pending | Pending | Pending | Verify CORS does not bypass auth. |
`;
}

export function renderCsrfReviewChecklist() {
  return `# CSRF Review Checklist

Do not include cookies, CSRF tokens, session tokens, JWTs, or screenshots containing credentials.

| Surface | Expected Control | Evidence Status | Notes |
| --- | --- | --- | --- |
| Auth mutations | SameSite cookie or bearer-token strategy reviewed | Pending | Confirm Supabase Auth mode before live activation. |
| Admin mutations | Auth guard plus origin/referer review | Pending | Admin-only route evidence required. |
| Payment/refund placeholders | Idempotency and auth guard review | Pending | No live money movement. |
| Escrow placeholders | Auth guard and role enforcement review | Pending | No live escrow movement. |
| File upload intent | Auth guard and request validation review | Pending | No direct anonymous private upload. |
| State-changing APIs | Non-GET methods only | Pending | Confirm no mutation through GET. |
| Direct form submissions | CSRF posture documented | Pending | Depends on cookie/session model. |
`;
}

export function renderRateLimitReadinessChecklist() {
  return [
    "# Rate-Limit Readiness Checklist",
    "",
    "Status: Provider-ready only. This does not activate WAF, CDN rate limiting, Redis, or external abuse-protection providers.",
    "",
    "| Surface | Evidence Required | Status | Notes |",
    "| --- | --- | --- | --- |",
    ...RATE_LIMIT_SURFACES.map((surface) => `| ${surface} | Config, threshold, audit event, friendly error | Pending | Validate in UAT before launch. |`),
    "",
    "## Required Evidence",
    "- Distributed limiter selected before production.",
    "- Abuse events recorded in audit logs.",
    "- Repeated block events trigger monitoring alerts.",
    "- Auth and reset responses do not disclose account existence.",
  ].join("\n");
}

export function renderDependencyAuditEvidenceTemplate() {
  const plan = buildDependencyAuditPlan();
  return [
    "# Dependency Audit Evidence Template",
    "",
    "Do not include private registry tokens, npm auth tokens, CI secrets, or screenshots containing credentials.",
    "",
    `Plan Status: ${plan.status}`,
    `Audit Level: ${plan.auditLevel}`,
    "",
    "| Target | Command | Result | Critical | High | Remediation Ticket |",
    "| --- | --- | --- | --- | --- | --- |",
    ...plan.targets.map((target) => `| ${target.id} | ${target.command} | Pending | Pending | Pending |  |`),
    "",
    "## Decision",
    "- Result: PASS / FAIL",
    "- Accepted risks:",
    "- Required remediation:",
  ].join("\n");
}

export function renderVulnerabilityScanEvidenceTemplate() {
  return `# Vulnerability Scan Evidence Template

Do not include scanner API keys, exploit payloads, private endpoint credentials, session cookies, JWTs, or screenshots containing credentials.

| Scan Type | Tool | Environment | Result | Critical | High | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- |
| Static application security test | Pending | Development/UAT | Pending | Pending | Pending |  |
| Dependency vulnerability scan | npm audit / approved scanner | Development/UAT | Pending | Pending | Pending |  |
| Secret exposure scan | RentasHub scanner | Source/build/ZIP/docs/logs | Pending | Pending | Pending |  |
| Container/host scan | Pending provider | UAT | Pending | Pending | Pending |  |
| Web app dynamic scan | Pending provider | UAT | Pending | Pending | Pending |  |

## Decision

- Result: PASS / FAIL
- Critical findings remediated:
- High findings remediated or accepted:
- Next action:
`;
}

export function renderSecretsExposureCertificationTemplate() {
  return `# Secrets Exposure Certification Template

Do not include secret values, tokens, keys, database passwords, JWTs, raw DSNs, webhook secrets, or screenshots containing credentials.

| Surface | Required Check | Result | Evidence Location |
| --- | --- | --- | --- |
| Source control | No secrets committed | Pending |  |
| Frontend bundle | No service role key, DB URL, private tokens | Pending |  |
| ZIP artifacts | No .env files, runtime DB, credentials | Pending |  |
| Documentation | No pasted credentials | Pending |  |
| Logs | No credentials or tokens | Pending |  |
| CI/CD | Secrets masked and access-controlled | Pending |  |
| Hosting provider | Secrets stored only as encrypted env vars | Pending |  |

## Required Statement

SUPABASE_SERVICE_ROLE_KEY and other privileged secrets exist only in approved backend/server secret storage. No secret values are included in this evidence package.
`;
}

export function renderOwaspReviewEvidenceChecklist() {
  return [
    "# OWASP Review Evidence Checklist",
    "",
    "Do not include exploit payloads, credentials, session tokens, private user data, or screenshots containing secrets.",
    "",
    "| OWASP Area | Evidence Required | Status | Findings |",
    "| --- | --- | --- | --- |",
    ...OWASP_AREAS.map((area) => `| ${area} | Review notes, tests, remediation decisions | Pending |  |`),
    "",
    "## Required Review Inputs",
    ...SECURITY_SURFACES.map((surface) => `- ${surface}`),
  ].join("\n");
}

export function renderPenTestReadinessIntakeTemplate() {
  return `# Pen-Test Readiness Intake Template

Do not include live credentials, service role keys, database passwords, payment keys, private customer data, or screenshots containing secrets.

## Scope

- Environment: UAT / Staging only
- Production testing authorized: No
- Test window:
- Test owner:
- Emergency contact:

## Assets In Scope

- Frontend URL:
- API base URL:
- Admin routes:
- Supplier/customer workflows:
- Auth/RBAC flows:
- File upload/storage flows:
- Payment/escrow placeholders:

## Accounts

Use test accounts only. Do not submit real user credentials in this document.

| Role | Test Account Provisioned | MFA Required | Notes |
| --- | --- | --- | --- |
| Customer | Pending | Pending |  |
| Supplier | Pending | Pending |  |
| Dealer/Broker | Pending | Pending |  |
| Admin | Pending | Pending |  |

## Rules of Engagement

- No production testing.
- No destructive data deletion except approved test data.
- No social engineering.
- No denial-of-service testing without explicit approval.
- Report critical findings immediately.

## Exit Criteria

- Critical findings remediated.
- High findings remediated or formally accepted.
- Retest evidence submitted.
- Final report redacted and stored securely.
`;
}

export function buildSecurityLaunchBlockerReport() {
  const evidence = buildSecurityEvidencePackage();
  const blockers = [
    ...evidence.blockers,
    "Manual evidence required: CSP report-only validation in UAT.",
    "Manual evidence required: CORS/CSRF review after real auth/session model is active.",
    "Manual evidence required: dependency audit execution in CI.",
    "Manual evidence required: vulnerability scan and OWASP review.",
    "Manual evidence required: penetration-test intake and execution before production certification.",
  ];
  return {
    status: "BLOCKED",
    generatedAt: new Date().toISOString(),
    liveSecurityToolingActivated: false,
    valuePrinted: false,
    blockers: [...new Set(blockers)],
    nextGate: "A4-01 Infrastructure Ownership Confirmation Submitted; C2 Security Operationalization remains blocked until A4 passes.",
  };
}

export function renderSecurityLaunchBlockerReport(report = buildSecurityLaunchBlockerReport()) {
  return [
    "# Security Launch Blocker Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Security Tooling Activated: ${report.liveSecurityToolingActivated ? "YES" : "NO"}`,
    "",
    "## Blockers",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
    "## Next Gate",
    report.nextGate,
  ].join("\n");
}

export function buildSecurityReadinessReport() {
  const evidence = buildSecurityEvidencePackage();
  const blockerReport = buildSecurityLaunchBlockerReport();
  return {
    status: "CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED",
    generatedAt: new Date().toISOString(),
    liveSecurityToolingActivated: false,
    valuePrinted: false,
    evidenceStatus: evidence.status,
    blockerCount: blockerReport.blockers.length,
  };
}

function renderReport(report = buildSecurityReadinessReport()) {
  return [
    "# Security Readiness Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Security Tooling Activated: ${report.liveSecurityToolingActivated ? "YES" : "NO"}`,
    `Evidence Package Status: ${report.evidenceStatus}`,
    `Launch Blocker Count: ${report.blockerCount}`,
  ].join("\n");
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildSecurityReadinessReport(), null, 2));
  else if (command === "evidence-package") console.log(renderSecurityEvidencePackage());
  else if (command === "csp-matrix") console.log(renderCspReadinessMatrix());
  else if (command === "cors-checklist") console.log(renderCorsLockdownChecklist());
  else if (command === "csrf-checklist") console.log(renderCsrfReviewChecklist());
  else if (command === "rate-limit-checklist") console.log(renderRateLimitReadinessChecklist());
  else if (command === "dependency-audit-template") console.log(renderDependencyAuditEvidenceTemplate());
  else if (command === "vulnerability-scan-template") console.log(renderVulnerabilityScanEvidenceTemplate());
  else if (command === "secrets-exposure-template") console.log(renderSecretsExposureCertificationTemplate());
  else if (command === "owasp-checklist") console.log(renderOwaspReviewEvidenceChecklist());
  else if (command === "pentest-intake") console.log(renderPenTestReadinessIntakeTemplate());
  else if (command === "launch-blockers") console.log(renderSecurityLaunchBlockerReport());
  else console.log(renderReport());
}
