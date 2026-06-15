import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createApp } from "../src/main/app.js";
import { getMonitoringReadiness } from "../src/monitoring/monitoringProvider.js";
import { createLogger } from "../src/monitoring/logger.js";

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
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  return { response, body: await response.json() };
}

test("monitoring readiness reports missing provider credentials", () => {
  const readiness = getMonitoringReadiness({ MONITORING_PROVIDER: "sentry_better_stack", LOG_LEVEL: "info" });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.provider, "sentry_better_stack");
  assert.ok(readiness.missing.includes("SENTRY_DSN"));
  assert.ok(readiness.missing.includes("BETTER_STACK_API_KEY"));
  assert.ok(readiness.missing.includes("BETTER_STACK_HEARTBEAT_URL"));
  assert.ok(readiness.missing.includes("ALERT_EMAIL or ALERT_SMS"));
  assert.ok(readiness.missing.includes("INCIDENT_OWNER_NAME"));
  assert.ok(readiness.missing.includes("INCIDENT_OWNER_EMAIL"));
});

test("placeholder Sentry and Better Stack credentials are rejected", () => {
  const readiness = getMonitoringReadiness({
    MONITORING_PROVIDER: "sentry_better_stack",
    SENTRY_DSN: "https://example.invalid/your-dsn",
    BETTER_STACK_API_KEY: "placeholder",
    BETTER_STACK_HEARTBEAT_URL: "https://uptime.betterstack.com/api/v1/heartbeat/your-heartbeat",
    ALERT_EMAIL: "ops@example.com",
    INCIDENT_OWNER_NAME: "Ops Owner",
    INCIDENT_OWNER_EMAIL: "owner@example.com",
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.includes("SENTRY_DSN"));
  assert.ok(readiness.missing.includes("BETTER_STACK_API_KEY"));
  assert.ok(readiness.missing.includes("BETTER_STACK_HEARTBEAT_URL"));
});

test("observability endpoint returns monitoring status with request id", async () => {
  const app = createApp({ env: { MONITORING_PROVIDER: "none", LOG_LEVEL: "silent" } });
  await withServer(app.handler, async (baseUrl) => {
    const { response, body } = await json(baseUrl, "/api/health/observability", { headers: { "x-request-id": "obs-test-1" } });
    assert.equal(response.status, 200);
    assert.equal(body.module, "observability-readiness");
    assert.equal(body.monitoring.provider, "none");
    assert.equal(body.requestId, "obs-test-1");
    assert.equal(response.headers.get("x-request-id"), "obs-test-1");
  });
});

test("monitoring test event endpoint is admin protected and dev-safe", async () => {
  const logs = [];
  const app = createApp({
    env: { MONITORING_PROVIDER: "none", LOG_LEVEL: "info" },
    logSink: { log: (line) => logs.push(line) },
  });
  await withServer(app.handler, async (baseUrl) => {
    const unauthorized = await json(baseUrl, "/api/monitoring/test-event", {
      method: "POST",
      body: JSON.stringify({ type: "api_5xx_spike" }),
    });
    assert.equal(unauthorized.response.status, 401);

    const allowed = await json(baseUrl, "/api/monitoring/test-event", {
      method: "POST",
      headers: { "x-user-role": "admin", "x-user-id": "monitoring-admin", "x-request-id": "obs-event-1" },
      body: JSON.stringify({
        type: "payment_failure_spike",
        severity: "test",
        metadata: { PAYMENT_SECRET_KEY: "sk_live_should_not_log", bearer: "Bearer should-not-log" },
      }),
    });
    assert.equal(allowed.response.status, 202);
    assert.equal(allowed.body.event.type, "payment_failure_spike");
    assert.equal(allowed.body.event.requestId, "obs-event-1");
    assert.equal(allowed.body.delivery.sent, false);
    assert.match(allowed.body.notice, /dev-safe/i);
  });
  assert.ok(logs.some((line) => line.includes("incident.event")));
  assert.equal(logs.some((line) => line.includes("sk_live_should_not_log")), false);
  assert.equal(logs.some((line) => line.includes("should-not-log")), false);
});

test("structured logger redacts secret-shaped payloads", () => {
  const logs = [];
  const logger = createLogger({ sink: { log: (line) => logs.push(line) }, level: "info" });
  logger.write("security.test", {
    authorization: "Bearer abc123",
    nested: { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_value", DATABASE_URL: "postgresql://user:pass@example/db" },
    safeValue: "visible",
  });
  const line = logs.join("\n");
  assert.match(line, /\[REDACTED\]/);
  assert.match(line, /visible/);
  assert.doesNotMatch(line, /abc123|sb_secret_value|postgresql:\/\/user:pass/);
});
