import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBetterStackCredentialReadinessChecklist,
  buildMonitoringLaunchBlockerReport,
  buildMonitoringReadinessReport,
  buildSentryCredentialReadinessChecklist,
  renderAlertRoutingEvidenceTemplate,
  renderBetterStackCredentialReadinessChecklist,
  renderIncidentNotificationTestTemplate,
  renderLogDrainReadinessChecklist,
  renderMonitoringLaunchBlockerReport,
  renderSentryCredentialReadinessChecklist,
  renderUptimeMonitorChecklist,
} from "../../scripts/monitoring-readiness-tooling.mjs";

const shapedEnv = {
  MONITORING_PROVIDER: "sentry_better_stack",
  SENTRY_DSN: "credential-shaped-sentry-dsn-reference",
  SENTRY_ENVIRONMENT: "uat",
  SENTRY_RELEASE: "rc-0.6A",
  BETTER_STACK_API_KEY: "better-stack-shaped-key",
  BETTER_STACK_HEARTBEAT_URL: "https://uptime.betterstack.test/heartbeat/shaped",
  BETTER_STACK_STATUS_PAGE_ID: "status-page-shaped",
  ALERT_EMAIL: "ops@rentashub.test",
  ALERT_SMS: "+15555550100",
  ALERT_ROUTING_POLICY_URL: "https://rentashub.test/alert-policy",
  INCIDENT_OWNER_NAME: "Ops Owner",
  INCIDENT_OWNER_EMAIL: "owner@rentashub.test",
};

test("Sentry credential-readiness checklist reports credentials without live activation", () => {
  const missing = buildSentryCredentialReadinessChecklist({});
  assert.equal(missing.status, "NEEDS_CREDENTIALS");
  assert.equal(missing.liveProviderTouched, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.missing.includes("SENTRY_DSN"));

  const shaped = buildSentryCredentialReadinessChecklist(shapedEnv);
  assert.equal(shaped.status, "CREDENTIAL_SHAPED_MANUAL_EVIDENCE_REQUIRED");
  assert.ok(shaped.checks.some((check) => check.item === "Error capture smoke test" && check.status === "MANUAL_EVIDENCE_REQUIRED"));

  const markdown = renderSentryCredentialReadinessChecklist(shaped);
  assert.match(markdown, /Sentry Credential-Readiness Checklist/);
  assert.doesNotMatch(markdown, /SENTRY_DSN\s*=/);
});

test("Better Stack credential-readiness checklist reports required monitor evidence", () => {
  const missing = buildBetterStackCredentialReadinessChecklist({});
  assert.equal(missing.status, "NEEDS_CREDENTIALS");
  assert.equal(missing.liveProviderTouched, false);
  assert.ok(missing.missing.includes("BETTER_STACK_API_KEY"));
  assert.ok(missing.missing.includes("BETTER_STACK_HEARTBEAT_URL"));

  const shaped = buildBetterStackCredentialReadinessChecklist(shapedEnv);
  assert.equal(shaped.status, "CREDENTIAL_SHAPED_MANUAL_EVIDENCE_REQUIRED");
  assert.ok(shaped.checks.some((check) => check.item === "Log drain test evidence" && check.status === "MANUAL_EVIDENCE_REQUIRED"));

  const markdown = renderBetterStackCredentialReadinessChecklist(shaped);
  assert.match(markdown, /Better Stack Credential-Readiness Checklist/);
  assert.doesNotMatch(markdown, /BETTER_STACK_API_KEY\s*=/);
});

test("alert routing evidence template covers severities and channels without secrets", () => {
  const markdown = renderAlertRoutingEvidenceTemplate();
  assert.match(markdown, /Alert Routing Evidence Template/);
  assert.match(markdown, /sev1/);
  assert.match(markdown, /ALERT_ROUTING_POLICY_URL/);
  assert.match(markdown, /Do not include .*webhook secrets/i);
});

test("uptime monitor checklist covers health targets and performance budgets", () => {
  const markdown = renderUptimeMonitorChecklist();
  assert.match(markdown, /Uptime Monitor Checklist/);
  assert.match(markdown, /\/api\/health\/observability/);
  assert.match(markdown, /API p95 latency target/);
  assert.match(markdown, /99\.5%/);
});

test("log drain readiness checklist is evidence-only and redaction-aware", () => {
  const markdown = renderLogDrainReadinessChecklist();
  assert.match(markdown, /Log Drain Readiness Checklist/);
  assert.match(markdown, /LOG_DRAIN_URL stored in secret manager/);
  assert.match(markdown, /PII\/secret redaction verified/);
  assert.doesNotMatch(markdown, /LOG_DRAIN_URL\s*=/);
});

test("incident notification test template covers synthetic alert scenarios", () => {
  const markdown = renderIncidentNotificationTestTemplate();
  assert.match(markdown, /Incident Notification Test Template/);
  assert.match(markdown, /Synthetic app error/);
  assert.match(markdown, /Synthetic uptime failure/);
  assert.match(markdown, /Missing credential warning/);
});

test("monitoring launch blocker report remains blocked pending real evidence", () => {
  const missing = buildMonitoringLaunchBlockerReport({});
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.liveProviderTouched, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /Manual evidence required: Sentry/.test(blocker)));

  const shaped = buildMonitoringLaunchBlockerReport(shapedEnv);
  assert.equal(shaped.status, "BLOCKED");
  assert.ok(shaped.blockers.some((blocker) => /Manual evidence required: Sentry frontend\/backend/.test(blocker)));
  assert.ok(shaped.blockers.some((blocker) => /Manual evidence required: Better Stack uptime/.test(blocker)));

  const markdown = renderMonitoringLaunchBlockerReport(shaped);
  assert.match(markdown, /Monitoring Launch Blocker Report/);
  assert.match(markdown, /B3 Monitoring Production Activation remains blocked/);
});

test("monitoring readiness report combines provider readiness and blocker status", () => {
  const report = buildMonitoringReadinessReport(shapedEnv);
  assert.equal(report.status, "NEEDS_CREDENTIALS_OR_EVIDENCE");
  assert.equal(report.liveProviderTouched, false);
  assert.equal(report.valuePrinted, false);
  assert.equal(report.readiness.ready, true);
  assert.equal(report.launchBlockers.status, "BLOCKED");
});
