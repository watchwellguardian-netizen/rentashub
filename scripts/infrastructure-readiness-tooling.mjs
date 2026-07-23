import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { getInfrastructureReadiness, INFRASTRUCTURE_REQUIRED_KEYS } from "../server/src/infrastructure/infrastructureReadiness.js";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/, /^local$/i, /^none$/i, /^todo$/i, /^tbd$/i];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function renderSafetyNotice() {
  return "Do not include credentials, API tokens, DNS provider secrets, TLS private keys, deployment tokens, database passwords, or screenshots containing credentials.";
}

export function renderDnsEvidenceChecklist() {
  return `# DNS Evidence Checklist

${renderSafetyNotice()}

| Evidence Item | Development | UAT/Staging | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| Domain owner identified | Pending | Pending | Pending | Owner name/role only. |
| Registrar access owner identified | Pending | Pending | Pending | Do not include login details. |
| Staging domain selected | Pending | Pending | Pending | No production traffic. |
| Production domain selected | Pending | Pending | Pending | Do not cut over DNS. |
| DNS provider selected | Pending | Pending | Pending | Provider name only. |
| Required records documented | Pending | Pending | Pending | Record type/name/value redacted where sensitive. |
| TTL and rollback plan documented | Pending | Pending | Pending | Include rollback timing. |
| Production traffic cutover approval | Pending | Pending | Pending | Required before launch only. |

Live DNS configuration remains inactive until infrastructure approval and launch gate signoff.
`;
}

export function renderTlsEvidenceChecklist() {
  return `# TLS Evidence Checklist

${renderSafetyNotice()}

| Evidence Item | Development | UAT/Staging | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| TLS provider selected | Pending | Pending | Pending | Provider name only. |
| Certificate issuance path documented | Pending | Pending | Pending | No private keys. |
| Auto-renewal policy documented | Pending | Pending | Pending | Renewal owner and schedule. |
| HTTPS redirect policy documented | Pending | Pending | Pending | Expected strict HTTPS. |
| HSTS readiness reviewed | Pending | Pending | Pending | Production only after validation. |
| Certificate expiry monitoring defined | Pending | Pending | Pending | Alert route reference only. |
| TLS scan evidence collected | Pending | Pending | Pending | UAT first. |

TLS activation is not performed by this checklist.
`;
}

export function renderHostingEvidenceChecklist() {
  return `# Hosting Evidence Checklist

${renderSafetyNotice()}

| Evidence Item | Development | UAT/Staging | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| Frontend hosting provider selected | Pending | Pending | Pending | Provider name only. |
| Backend hosting provider selected | Pending | Pending | Pending | Provider name only. |
| Environment separation verified | Pending | Pending | Pending | Dev/UAT/Production isolated. |
| Build command configured | Pending | Pending | Pending | Command only, no secrets. |
| Runtime version documented | Pending | Pending | Pending | Node/runtime version. |
| Health check endpoint configured | Pending | Pending | Pending | Route only. |
| Deployment permissions reviewed | Pending | Pending | Pending | Role names only. |
| Production deployment approval | Pending | Pending | Pending | Required before production only. |

No live hosting deployment or production traffic activation is performed by this checklist.
`;
}

export function renderCdnEvidenceChecklist() {
  return `# CDN Evidence Checklist

${renderSafetyNotice()}

| Evidence Item | Development | UAT/Staging | Production Hold | Notes |
| --- | --- | --- | --- | --- |
| CDN provider selected | Pending | Pending | Pending | Provider name only. |
| Cache policy documented | Pending | Pending | Pending | Static assets, API bypass. |
| Cache purge procedure documented | Pending | Pending | Pending | No provider tokens. |
| Origin protection reviewed | Pending | Pending | Pending | Provider/reference only. |
| Security headers passthrough reviewed | Pending | Pending | Pending | CSP/HSTS/CORS compatibility. |
| Asset compression reviewed | Pending | Pending | Pending | Brotli/gzip policy. |
| Rollback route documented | Pending | Pending | Pending | DNS/CDN rollback timing. |

CDN routing is not activated by this checklist.
`;
}

export function renderEnvironmentPromotionEvidenceTemplate() {
  return `# Environment Promotion Evidence Template

${renderSafetyNotice()}

## Promotion Metadata

- Source environment: Development / UAT
- Target environment: UAT / Production
- Release candidate:
- Promotion owner:
- Approval owner:
- Date:

## Evidence

| Evidence Item | Result | Evidence Location | Notes |
| --- | --- | --- | --- |
| Source build passed | Pending |  | Build output reference. |
| Source tests passed | Pending |  | Test output reference. |
| Source readiness passed | Pending |  | Readiness report reference. |
| Secrets mapped by name only | Pending |  | Do not include values. |
| Database migration plan approved | Pending |  | Migration evidence reference. |
| Rollback plan approved | Pending |  | Rollback template reference. |
| Monitoring ready | Pending |  | Monitoring evidence reference. |
| Production hold respected | Pending |  | No traffic cutover without approval. |

## Decision

- Result: PASS / FAIL
- Missing evidence:
- Next action:
`;
}

export function renderRollbackEvidenceTemplate() {
  return `# Rollback Evidence Template

${renderSafetyNotice()}

## Rollback Metadata

- Environment: Development / UAT / Production
- Release candidate:
- Rollback owner:
- Trigger condition:
- Date:

## Evidence

| Evidence Item | Result | Evidence Location | Notes |
| --- | --- | --- | --- |
| Previous artifact identified | Pending |  | Artifact ID only. |
| Previous environment config available | Pending |  | Names only, no values. |
| Database rollback/forward-fix decision recorded | Pending |  | Migration reference. |
| CDN/cache rollback path documented | Pending |  | Provider reference only. |
| DNS rollback TTL reviewed | Pending |  | Timing only. |
| Health checks after rollback defined | Pending |  | Routes only. |
| Communications plan ready | Pending |  | Runbook reference. |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderDisasterRecoveryEvidenceTemplate() {
  return `# Disaster Recovery Evidence Template

${renderSafetyNotice()}

## DR Metadata

- Environment: Development / UAT / Production
- DR region:
- RTO target:
- RPO target:
- DR owner:
- Date:

## Evidence

| Evidence Item | Result | Evidence Location | Notes |
| --- | --- | --- | --- |
| DR region documented | Pending |  | Region only. |
| RTO/RPO approved | Pending |  | Targets only. |
| Database restore path tested | Pending |  | Restore evidence reference. |
| Storage restore path tested | Pending |  | Storage evidence reference. |
| Auth recovery path documented | Pending |  | Provider reference only. |
| DNS failover path documented | Pending |  | No live cutover. |
| Monitoring/alerting during DR defined | Pending |  | Alert evidence reference. |
| Business communication plan linked | Pending |  | BCP reference. |

## Decision

- Result: PASS / FAIL
- Recovery duration observed:
- Data loss observed:
- Next action:
`;
}

export function renderBackupValidationEvidenceTemplate() {
  return `# Backup Validation Evidence Template

${renderSafetyNotice()}

## Backup Metadata

- Environment: Development / UAT
- Backup provider:
- Backup owner:
- Retention policy:
- Date:

## Evidence

| Evidence Item | Result | Evidence Location | Notes |
| --- | --- | --- | --- |
| Database backup created | Pending |  | Backup ID/reference only. |
| Database restore executed | Pending |  | Restore evidence reference. |
| Storage backup path documented | Pending |  | Provider/reference only. |
| Audit log backup path documented | Pending |  | Retention reference. |
| Restore integrity verified | Pending |  | Counts/checksums only. |
| RPO measured | Pending |  | Time only. |
| RTO measured | Pending |  | Time only. |
| Backup access control reviewed | Pending |  | Role names only. |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderProductionLaunchInfrastructureChecklist() {
  return `# Production Launch Infrastructure Checklist

${renderSafetyNotice()}

Status: Launch checklist only. This does not authorize production launch.

| Gate | Required Evidence | Status | Evidence Location |
| --- | --- | --- | --- |
| DNS readiness | Domain owner, records, TTL, rollback | Pending |  |
| TLS readiness | Certificate, renewal, HTTPS, monitoring | Pending |  |
| Hosting readiness | Frontend/backend deploy targets, health checks | Pending |  |
| CDN readiness | Cache policy, purge, origin/security headers | Pending |  |
| Environment promotion | Dev -> UAT -> Production workflow evidence | Pending |  |
| Rollback readiness | Artifact, config, DB, DNS/CDN rollback evidence | Pending |  |
| Backup validation | Backup, restore, integrity, RPO/RTO evidence | Pending |  |
| Disaster recovery | DR region, failover, restore, communications evidence | Pending |  |
| Monitoring readiness | Sentry/Better Stack/alerts/log drains evidence | Pending |  |
| Security readiness | Security evidence package and certification status | Pending |  |
| Compliance readiness | Legal/compliance evidence and approval status | Pending |  |

## Launch Rule

Production launch remains NO-GO until all infrastructure, security, compliance, monitoring, backup, disaster recovery, and revenue gates pass with real operational evidence.
`;
}

export function buildInfrastructureLaunchBlockerReport({ env = process.env } = {}) {
  const readiness = getInfrastructureReadiness(env);
  const manualEvidence = [
    "DNS records and rollback evidence",
    "TLS certificate issuance/renewal evidence",
    "Hosting environment deployment evidence",
    "CDN cache/origin/security evidence",
    "Environment promotion evidence",
    "Rollback evidence",
    "Disaster recovery test evidence",
    "Backup/restore validation evidence",
    "Production launch infrastructure checklist signoff",
  ];
  const blockers = [
    ...readiness.missing.map((key) => `${key} is required for infrastructure readiness.`),
    ...manualEvidence.map((item) => `Manual evidence required: ${item}`),
  ];
  return {
    status: "BLOCKED",
    generatedAt: new Date().toISOString(),
    liveActivation: false,
    productionTrafficActive: false,
    valuePrinted: false,
    readinessStatus: readiness.status,
    readinessScore: readiness.score,
    blockers: [...new Set(blockers)],
    nextGate: "A4-01 Infrastructure Ownership Confirmation Submitted; production infrastructure activation remains blocked until A4 and operational evidence pass.",
  };
}

export function buildInfrastructureReadinessToolingReport({ env = process.env } = {}) {
  const readiness = getInfrastructureReadiness(env);
  const launchBlockers = buildInfrastructureLaunchBlockerReport({ env });
  return {
    status: "CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED",
    generatedAt: new Date().toISOString(),
    liveActivation: false,
    productionTrafficActive: false,
    valuePrinted: false,
    requiredKeys: INFRASTRUCTURE_REQUIRED_KEYS,
    readiness,
    launchBlockerCount: launchBlockers.blockers.length,
  };
}

function renderReport(report = buildInfrastructureReadinessToolingReport()) {
  return [
    "# Deployment / Infrastructure Readiness Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Activation: ${report.liveActivation ? "YES" : "NO"}`,
    `Production Traffic Active: ${report.productionTrafficActive ? "YES" : "NO"}`,
    `Infrastructure Readiness Status: ${report.readiness.status}`,
    `Infrastructure Readiness Score: ${report.readiness.score}`,
    `Launch Blocker Count: ${report.launchBlockerCount}`,
  ].join("\n");
}

export function renderInfrastructureLaunchBlockerReport(report = buildInfrastructureLaunchBlockerReport()) {
  return [
    "# Infrastructure Launch Blocker Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Activation: ${report.liveActivation ? "YES" : "NO"}`,
    `Production Traffic Active: ${report.productionTrafficActive ? "YES" : "NO"}`,
    `Readiness Status: ${report.readinessStatus}`,
    `Readiness Score: ${report.readinessScore}`,
    "",
    "## Blockers",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
    "## Next Gate",
    report.nextGate,
  ].join("\n");
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildInfrastructureReadinessToolingReport(), null, 2));
  else if (command === "dns-checklist") console.log(renderDnsEvidenceChecklist());
  else if (command === "tls-checklist") console.log(renderTlsEvidenceChecklist());
  else if (command === "hosting-checklist") console.log(renderHostingEvidenceChecklist());
  else if (command === "cdn-checklist") console.log(renderCdnEvidenceChecklist());
  else if (command === "environment-promotion-template") console.log(renderEnvironmentPromotionEvidenceTemplate());
  else if (command === "rollback-template") console.log(renderRollbackEvidenceTemplate());
  else if (command === "disaster-recovery-template") console.log(renderDisasterRecoveryEvidenceTemplate());
  else if (command === "backup-validation-template") console.log(renderBackupValidationEvidenceTemplate());
  else if (command === "production-launch-checklist") console.log(renderProductionLaunchInfrastructureChecklist());
  else if (command === "launch-blockers") console.log(renderInfrastructureLaunchBlockerReport());
  else console.log(renderReport());
}
