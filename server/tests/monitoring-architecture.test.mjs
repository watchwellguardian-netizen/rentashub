import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createApp } from "../src/main/app.js";
import { getMonitoringArchitecturePlan } from "../src/monitoring/monitoringArchitecture.js";
import { getMonitoringReadiness } from "../src/monitoring/monitoringProvider.js";

async function withServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  return { response, body: await response.json() };
}

test("monitoring architecture plan flags missing provider and alert routing inputs", () => {
  const plan = getMonitoringArchitecturePlan({ MONITORING_PROVIDER: "sentry_better_stack" });
  assert.equal(plan.selectedProvider, "sentry_better_stack");
  assert.deepEqual(plan.selected, ["sentry", "better_stack"]);
  assert.ok(plan.missingProviderEnv.includes("SENTRY_DSN"));
  assert.ok(plan.missingProviderEnv.includes("BETTER_STACK_STATUS_PAGE_ID"));
  assert.ok(plan.alertRouting.missing.includes("ALERT_SMS"));
  assert.ok(plan.alertRouting.missing.includes("ALERT_ROUTING_POLICY_URL"));
  assert.equal(plan.readiness.productionSuitable, false);
});

test("monitoring readiness embeds Project B1 architecture", () => {
  const readiness = getMonitoringReadiness({
    MONITORING_PROVIDER: "none",
    LOG_LEVEL: "silent",
  });
  assert.equal(readiness.architecture.project, "Project B1 Monitoring Architecture");
  assert.ok(readiness.architecture.healthChecks.some((target) => target.route === "/api/health/readiness"));
  assert.equal(readiness.architecture.performanceBudgets.p95ApiLatencyMs, 750);
  assert.ok(readiness.architecture.severityMatrix.some((item) => item.severity === "sev1"));
});

test("observability endpoint returns monitoring architecture fields", async () => {
  const app = createApp({ env: { MONITORING_PROVIDER: "none", LOG_LEVEL: "silent" } });
  await withServer(app.handler, async (baseUrl) => {
    const { response, body } = await json(baseUrl, "/api/health/observability", { headers: { "x-request-id": "b1-obs-1" } });
    assert.equal(response.status, 200);
    assert.equal(body.monitoring.architecture.project, "Project B1 Monitoring Architecture");
    assert.equal(body.monitoring.architecture.selectedProvider, "none");
    assert.equal(body.monitoring.architecture.readiness.providerSelected, false);
    assert.ok(body.monitoring.architecture.healthChecks.some((target) => target.route === "/api/health/observability"));
    assert.equal(body.requestId, "b1-obs-1");
  });
});

test("shaped monitoring config is credential-ready but not live alert delivery", () => {
  const readiness = getMonitoringReadiness({
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
  });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.architecture.readiness.productionSuitable, true);
  assert.match(readiness.architecture.activationBoundary, /No live Sentry SDK capture/i);
});
