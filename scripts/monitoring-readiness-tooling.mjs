import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { getBetterStackReadiness } from "../server/src/monitoring/betterStackProvider.js";
import {
  ALERT_ROUTING_CHANNELS,
  HEALTH_CHECK_TARGETS,
  INCIDENT_SEVERITY_MATRIX,
  MONITORING_PROVIDER_MATRIX,
  PERFORMANCE_BUDGETS,
  getMonitoringArchitecturePlan,
} from "../server/src/monitoring/monitoringArchitecture.js";
import { getMonitoringReadiness } from "../server/src/monitoring/monitoringProvider.js";
import { getSentryReadiness } from "../server/src/monitoring/sentryProvider.js";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /example/i, /your[-_]?/i, /<[^>]+>/];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

export function buildSentryCredentialReadinessChecklist(env = process.env) {
  const readiness = getSentryReadiness(env);
  const checks = [
    { item: "SENTRY_DSN", status: hasRealValue(env.SENTRY_DSN) ? "PRESENT" : "MISSING", evidence: "Secret manager reference only; never paste DSN." },
    { item: "SENTRY_ENVIRONMENT", status: hasRealValue(env.SENTRY_ENVIRONMENT) ? "PRESENT" : "MISSING", evidence: "Expected Development/UAT/Production mapping." },
    { item: "SENTRY_RELEASE", status: hasRealValue(env.SENTRY_RELEASE) ? "PRESENT" : "MISSING", evidence: "Release candidate or commit tag reference." },
    { item: "Frontend SDK activation evidence", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "No live SDK capture in readiness tooling." },
    { item: "Backend SDK activation evidence", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "No live SDK capture in readiness tooling." },
    { item: "Error capture smoke test", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "Record event ID only, not payload secrets." },
    { item: "Performance tracing smoke test", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "Record pass/fail and sample rate only." },
  ];
  return {
    provider: "sentry",
    status: readiness.ready ? "CREDENTIAL_SHAPED_MANUAL_EVIDENCE_REQUIRED" : "NEEDS_CREDENTIALS",
    liveProviderTouched: false,
    valuePrinted: false,
    missing: readiness.missing,
    checks,
  };
}

export function renderSentryCredentialReadinessChecklist(report = buildSentryCredentialReadinessChecklist()) {
  return [
    "# Sentry Credential-Readiness Checklist",
    "",
    "Do not include DSN values, auth tokens, source maps upload tokens, event payload secrets, screenshots containing credentials, or stack traces with private user data.",
    "",
    `Status: ${report.status}`,
    `Live Provider Touched: ${report.liveProviderTouched ? "YES" : "NO"}`,
    "",
    "| Item | Status | Evidence Required |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.item} | ${check.status} | ${check.evidence} |`),
    ...(report.missing.length ? ["", "## Missing", ...report.missing.map((item) => `- ${item}`)] : []),
  ].join("\n");
}

export function buildBetterStackCredentialReadinessChecklist(env = process.env) {
  const readiness = getBetterStackReadiness(env);
  const checks = [
    { item: "BETTER_STACK_API_KEY", status: hasRealValue(env.BETTER_STACK_API_KEY) ? "PRESENT" : "MISSING", evidence: "Secret manager reference only; never paste value." },
    { item: "BETTER_STACK_HEARTBEAT_URL", status: hasRealValue(env.BETTER_STACK_HEARTBEAT_URL) ? "PRESENT" : "MISSING", evidence: "Heartbeat configured; do not paste URL with token if sensitive." },
    { item: "BETTER_STACK_STATUS_PAGE_ID", status: hasRealValue(env.BETTER_STACK_STATUS_PAGE_ID) ? "PRESENT" : "MISSING", evidence: "Status page ID/reference." },
    { item: "Uptime monitor evidence", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "Record monitor ID/reference only." },
    { item: "Heartbeat test evidence", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "Record pass/fail and timestamp." },
    { item: "Log drain test evidence", status: "MANUAL_EVIDENCE_REQUIRED", evidence: "Record log source and delivery status only." },
  ];
  return {
    provider: "better_stack",
    status: readiness.ready ? "CREDENTIAL_SHAPED_MANUAL_EVIDENCE_REQUIRED" : "NEEDS_CREDENTIALS",
    liveProviderTouched: false,
    valuePrinted: false,
    missing: readiness.missing,
    checks,
  };
}

export function renderBetterStackCredentialReadinessChecklist(report = buildBetterStackCredentialReadinessChecklist()) {
  return [
    "# Better Stack Credential-Readiness Checklist",
    "",
    "Do not include API keys, heartbeat tokens, log drain tokens, screenshots containing credentials, or private log payloads.",
    "",
    `Status: ${report.status}`,
    `Live Provider Touched: ${report.liveProviderTouched ? "YES" : "NO"}`,
    "",
    "| Item | Status | Evidence Required |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.item} | ${check.status} | ${check.evidence} |`),
    ...(report.missing.length ? ["", "## Missing", ...report.missing.map((item) => `- ${item}`)] : []),
  ].join("\n");
}

export function renderAlertRoutingEvidenceTemplate() {
  return [
    "# Alert Routing Evidence Template",
    "",
    "Do not include phone verification codes, email tokens, provider API keys, webhook secrets, or screenshots containing credentials.",
    "",
    "## Environment",
    "",
    "- Environment: Development / UAT",
    "- Monitoring Provider:",
    "- Incident Owner:",
    "- Date:",
    "",
    "| Severity | Required Route | Expected Response Target | Evidence Status | Evidence Location |",
    "| --- | --- | --- | --- | --- |",
    ...INCIDENT_SEVERITY_MATRIX.map((item) => `| ${item.severity} | ${item.routing} | ${item.responseTarget} | Pending |  |`),
    "",
    "## Channel Evidence",
    "",
    "| Channel | Env Key | Required For | Configured | Test Result | Evidence Location |",
    "| --- | --- | --- | --- | --- | --- |",
    ...ALERT_ROUTING_CHANNELS.map((channel) => `| ${channel.id} | ${channel.envKey} | ${channel.requiredFor.join(", ")} | Pending | Pending |  |`),
  ].join("\n");
}

export function renderUptimeMonitorChecklist() {
  return [
    "# Uptime Monitor Checklist",
    "",
    "Do not include monitor API keys, heartbeat secrets, or screenshots containing credentials.",
    "",
    "| Target | Route | Expected Result | Monitor Configured | Evidence Location |",
    "| --- | --- | --- | --- | --- |",
    ...HEALTH_CHECK_TARGETS.map((target) => `| ${target.id} | ${target.route} | ${target.expected} | Pending |  |`),
    "",
    "## Performance Budget Evidence",
    "",
    `- Uptime target: ${PERFORMANCE_BUDGETS.uptimeTargetPercent}%`,
    `- API p95 latency target: ${PERFORMANCE_BUDGETS.p95ApiLatencyMs}ms`,
    `- API p99 latency target: ${PERFORMANCE_BUDGETS.p99ApiLatencyMs}ms`,
    `- API error rate target: ${PERFORMANCE_BUDGETS.apiErrorRatePercent}%`,
  ].join("\n");
}

export function renderLogDrainReadinessChecklist() {
  return `# Log Drain Readiness Checklist

Do not include log drain tokens, provider API keys, private user data, raw authorization headers, JWTs, cookies, or payment/escrow secrets.

| Evidence Item | Development | UAT | Notes |
| --- | --- | --- | --- |
| LOG_LEVEL configured | Pending | Pending | Expected info/warn/error policy. |
| LOG_DRAIN_URL stored in secret manager | Pending | Pending | Do not paste URL value. |
| Application logs reach provider | Pending | Pending | Record delivery status only. |
| Error logs include request ID | Pending | Pending | No private payloads. |
| Audit logs remain separate from app logs | Pending | Pending | Reference audit log evidence. |
| PII/secret redaction verified | Pending | Pending | Reference secret scan. |
| Retention policy documented | Pending | Pending | Reference policy URL/document. |
`;
}

export function renderIncidentNotificationTestTemplate() {
  return [
    "# Incident Notification Test Template",
    "",
    "Do not include provider tokens, verification codes, private phone numbers, private emails, webhook secrets, or screenshots containing credentials.",
    "",
    "## Test Metadata",
    "",
    "- Environment: Development / UAT",
    "- Provider: Sentry / Better Stack / Both",
    "- Test Owner:",
    "- Date:",
    "",
    "| Scenario | Severity | Expected Notification | Actual Result | Evidence Location |",
    "| --- | --- | --- | --- | --- |",
    "| Synthetic app error | sev2 | Email/team channel | Pending |  |",
    "| Synthetic uptime failure | sev1 | SMS/email/on-call | Pending |  |",
    "| Synthetic degraded API latency | sev3 | Triage queue | Pending |  |",
    "| Missing credential warning | sev4 | Backlog/release review | Pending |  |",
    "",
    "## Decision",
    "",
    "- Result: PASS / FAIL",
    "- Blockers:",
    "- Next action:",
  ].join("\n");
}

export function buildMonitoringLaunchBlockerReport(env = process.env) {
  const readiness = getMonitoringReadiness(env);
  const architecture = getMonitoringArchitecturePlan(env);
  const sentry = buildSentryCredentialReadinessChecklist(env);
  const betterStack = buildBetterStackCredentialReadinessChecklist(env);
  const manualEvidence = [
    "Sentry project/environment/release configured in secret storage",
    "Sentry frontend/backend SDK smoke event evidence",
    "Better Stack uptime monitor configured",
    "Better Stack heartbeat test evidence",
    "Log drain delivery evidence",
    "Alert routing test evidence for sev1/sev2",
    "Incident notification test evidence",
    "Monitoring secret scan evidence",
  ];
  const blockers = [
    ...readiness.missing.map((item) => `Missing monitoring input: ${item}`),
    ...architecture.missingProviderEnv.map((item) => `Missing provider env: ${item}`),
    ...architecture.alertRouting.missing.map((item) => `Missing alert routing env: ${item}`),
    ...manualEvidence.map((item) => `Manual evidence required: ${item}`),
  ];
  return {
    status: blockers.length ? "BLOCKED" : "PASS",
    generatedAt: new Date().toISOString(),
    liveProviderTouched: false,
    valuePrinted: false,
    monitoringReady: readiness.ready,
    selectedProvider: readiness.selectedProvider,
    sentryStatus: sentry.status,
    betterStackStatus: betterStack.status,
    blockers: [...new Set(blockers)],
    nextGate: "A4-01 Infrastructure Ownership Confirmation Submitted; B3 Monitoring Production Activation remains blocked until A4 passes.",
  };
}

export function renderMonitoringLaunchBlockerReport(report = buildMonitoringLaunchBlockerReport()) {
  return [
    "# Monitoring Launch Blocker Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Provider Touched: ${report.liveProviderTouched ? "YES" : "NO"}`,
    `Selected Provider: ${report.selectedProvider}`,
    `Monitoring Ready: ${report.monitoringReady ? "YES" : "NO"}`,
    "",
    "## Provider Checklist Status",
    "",
    `- Sentry: ${report.sentryStatus}`,
    `- Better Stack: ${report.betterStackStatus}`,
    "",
    "## Blockers",
    ...report.blockers.map((blocker) => `- ${blocker}`),
    "",
    "## Next Gate",
    report.nextGate,
  ].join("\n");
}

export function buildMonitoringReadinessReport(env = process.env) {
  const readiness = getMonitoringReadiness(env);
  const launchBlockers = buildMonitoringLaunchBlockerReport(env);
  return {
    status: launchBlockers.status === "PASS" ? "CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED" : "NEEDS_CREDENTIALS_OR_EVIDENCE",
    generatedAt: new Date().toISOString(),
    liveProviderTouched: false,
    valuePrinted: false,
    readiness,
    launchBlockers: {
      status: launchBlockers.status,
      blockerCount: launchBlockers.blockers.length,
    },
  };
}

function renderReport(report = buildMonitoringReadinessReport()) {
  return [
    "# Monitoring Readiness Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Provider Touched: ${report.liveProviderTouched ? "YES" : "NO"}`,
    `Selected Provider: ${report.readiness.selectedProvider}`,
    `Ready: ${report.readiness.ready ? "YES" : "NO"}`,
    `Launch Blockers: ${report.launchBlockers.blockerCount}`,
    "",
    report.readiness.message,
  ].join("\n");
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildMonitoringReadinessReport(), null, 2));
  else if (command === "sentry-checklist") console.log(renderSentryCredentialReadinessChecklist());
  else if (command === "better-stack-checklist") console.log(renderBetterStackCredentialReadinessChecklist());
  else if (command === "alert-routing-template") console.log(renderAlertRoutingEvidenceTemplate());
  else if (command === "uptime-monitor-checklist") console.log(renderUptimeMonitorChecklist());
  else if (command === "log-drain-checklist") console.log(renderLogDrainReadinessChecklist());
  else if (command === "incident-notification-template") console.log(renderIncidentNotificationTestTemplate());
  else if (command === "launch-blockers") console.log(renderMonitoringLaunchBlockerReport());
  else console.log(renderReport());
}
