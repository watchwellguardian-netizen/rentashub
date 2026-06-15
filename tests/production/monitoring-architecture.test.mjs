import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  ALERT_ROUTING_CHANNELS,
  getMonitoringArchitecturePlan,
  HEALTH_CHECK_TARGETS,
  INCIDENT_SEVERITY_MATRIX,
  MONITORING_PROVIDER_MATRIX,
  PERFORMANCE_BUDGETS,
} from "../../server/src/monitoring/monitoringArchitecture.js";

const root = process.cwd();

test("Project B1 monitoring architecture artifacts exist", () => {
  for (const file of [
    "docs/project-b-monitoring-architecture.md",
    "docs/monitoring-observability-readiness.md",
    "server/src/monitoring/monitoringArchitecture.js",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("monitoring architecture doc covers required readiness areas", () => {
  const doc = readFileSync(join(root, "docs/project-b-monitoring-architecture.md"), "utf8");
  for (const text of [
    "Sentry-Ready Error Tracking",
    "Structured Logging",
    "Health Checks",
    "Performance Monitoring",
    "Alert Routing Plan",
    "Incident Severity Matrix",
    "Environment-Aware Monitoring",
    "Provider-ready only",
  ]) {
    assert.match(doc, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.doesNotMatch(doc, /production ready/i);
});

test("provider matrix includes Sentry and Better Stack boundaries", () => {
  assert.equal(MONITORING_PROVIDER_MATRIX.sentry.liveStatus, "sdk_not_activated");
  assert.equal(MONITORING_PROVIDER_MATRIX.better_stack.liveStatus, "provider_client_not_activated");
  assert.ok(MONITORING_PROVIDER_MATRIX.sentry.requiredEnv.includes("SENTRY_DSN"));
  assert.ok(MONITORING_PROVIDER_MATRIX.better_stack.requiredEnv.includes("BETTER_STACK_HEARTBEAT_URL"));
});

test("health checks performance budgets and severity matrix are defined", () => {
  assert.ok(HEALTH_CHECK_TARGETS.some((target) => target.route === "/api/health/observability"));
  assert.equal(PERFORMANCE_BUDGETS.p95ApiLatencyMs, 750);
  assert.equal(PERFORMANCE_BUDGETS.apiErrorRatePercent, 1);
  assert.ok(INCIDENT_SEVERITY_MATRIX.some((item) => item.severity === "sev1" && item.routing === "sms_email_on_call"));
  assert.ok(ALERT_ROUTING_CHANNELS.some((channel) => channel.envKey === "ALERT_ROUTING_POLICY_URL"));
});

test("monitoring architecture plan reports missing credentials without live activation", () => {
  const plan = getMonitoringArchitecturePlan({ MONITORING_PROVIDER: "sentry_better_stack" });
  assert.equal(plan.readiness.providerSelected, true);
  assert.equal(plan.readiness.providerCredentialsPresent, false);
  assert.ok(plan.missingProviderEnv.includes("SENTRY_DSN"));
  assert.ok(plan.missingProviderEnv.includes("BETTER_STACK_API_KEY"));
  assert.equal(plan.readiness.productionSuitable, false);
  assert.match(plan.activationBoundary, /Provider-ready only/i);
});

test("monitoring architecture plan accepts shaped config but remains provider-ready", () => {
  const plan = getMonitoringArchitecturePlan({
    MONITORING_PROVIDER: "sentry_better_stack",
    SENTRY_DSN: "https://abc123@o123.ingest.sentry.io/456",
    SENTRY_ENVIRONMENT: "staging",
    SENTRY_RELEASE: "rc-0.5",
    BETTER_STACK_API_KEY: "better_stack_realistic_key",
    BETTER_STACK_HEARTBEAT_URL: "https://uptime.betterstack.com/api/v1/heartbeat/realistic",
    BETTER_STACK_STATUS_PAGE_ID: "status-page-1",
    ALERT_EMAIL: "ops@rentashub.test",
    ALERT_SMS: "+15555550100",
    ALERT_ROUTING_POLICY_URL: "https://rentashub.test/policy",
    INCIDENT_OWNER_NAME: "Ops Owner",
    INCIDENT_OWNER_EMAIL: "owner@rentashub.test",
    MONITORING_TRACE_SAMPLE_RATE: "0.1",
    ERROR_RATE_ALERT_THRESHOLD_PERCENT: "2",
    P95_LATENCY_MS_ALERT_THRESHOLD: "800",
    UPTIME_CHECK_INTERVAL_SECONDS: "30",
  });
  assert.equal(plan.readiness.providerCredentialsPresent, true);
  assert.equal(plan.readiness.alertRoutingReady, true);
  assert.equal(plan.performanceBudgets.traceSampleRate, 0.1);
  assert.equal(plan.performanceBudgets.apiErrorRatePercent, 2);
  assert.equal(plan.performanceBudgets.p95ApiLatencyMs, 800);
  assert.equal(plan.performanceBudgets.uptimeCheckIntervalSeconds, 30);
  assert.match(plan.activationBoundary, /No live Sentry SDK capture/i);
});
