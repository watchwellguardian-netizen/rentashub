import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createLogger } from "../../server/src/monitoring/logger.js";
import {
  buildAlertRules,
  buildDependencyChecks,
  buildHealthEndpoints,
  buildOperationalDashboardConfig,
  buildRunbookIndex,
  classifyOperationalError,
  createObservabilityOperationsEvidence,
  createRequestContext,
  MetricsRegistry,
  tenantSafeLogContext,
} from "../../server/src/monitoring/observabilityOperationsReadiness.js";

test("request context generates trace identifiers and redacts tenant-safe metadata", () => {
  const context = createRequestContext({
    tenantId: "tenant-a",
    userId: "user-a",
    role: "supplier",
    metadata: {
      token: "Bearer should-not-leak",
      safe: "visible",
    },
  });
  assert.match(context.requestId, /^req-/);
  assert.match(context.correlationId, /^corr-/);
  assert.match(context.traceId, /^trace-/);
  assert.equal(context.tenantId, "tenant-a");
  assert.equal(context.metadata.token, "[REDACTED]");
  assert.equal(context.metadata.safe, "visible");

  const safe = tenantSafeLogContext({ metadata: { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_bad", nested: { password: "bad" } } });
  assert.doesNotMatch(JSON.stringify(safe), /sb_secret_bad|password":"bad/);
});

test("structured logger redacts common token and credential patterns", () => {
  const lines = [];
  const logger = createLogger({ sink: { log: (line) => lines.push(line) }, level: "info" });
  logger.write("test.secret-redaction", {
    authorization: "Bearer live-token",
    databaseUrl: "postgresql://user:pass@example.test/db",
    nested: { apiKey: "sk_live_bad" },
  });
  const output = lines.join("\n");
  assert.match(output, /REDACTED/);
  assert.doesNotMatch(output, /live-token|postgresql:\/\/user:pass|sk_live_bad/i);
});

test("dependency checks cover database Redis storage queue and identity without live provider claims", () => {
  const checks = buildDependencyChecks({});
  for (const key of ["postgres", "redis", "storage", "queue", "identity"]) {
    assert.ok(checks[key], `${key} dependency check should exist`);
  }
  assert.equal(checks.postgres.status, "BLOCKED");
  assert.equal(checks.redis.status, "READY");
  assert.equal(checks.storage.status, "READY");
  assert.equal(checks.identity.status, "BLOCKED_LIVE_IDP_PENDING");
  assert.equal(checks.identity.tokenValidationReady, true);
  assert.doesNotMatch(JSON.stringify(checks), /SUPABASE_SERVICE_ROLE_KEY|postgresql:\/\/[^:\s]+:[^@\s]+@/i);
});

test("health readiness and liveness payloads fail closed without runtime evidence", () => {
  const endpoints = buildHealthEndpoints({});
  assert.equal(endpoints.health.ok, true);
  assert.equal(endpoints.liveness.status, "PROCESS_ALIVE");
  assert.equal(endpoints.readiness.ok, false);
  assert.equal(endpoints.readiness.status, "BLOCKED_PENDING_RUNTIME_EVIDENCE");
  assert.equal(endpoints.readiness.dependencies.postgres.runtimeEvidence, "BLOCKED_NO_EXECUTABLE_POSTGRES");
});

test("error taxonomy classifies operational failures", () => {
  assert.equal(classifyOperationalError({ code: "POSTGRES_CONSTRAINT", message: "duplicate key" }).category, "database");
  assert.equal(classifyOperationalError({ code: "REDIS_TIMEOUT" }).category, "redis");
  assert.equal(classifyOperationalError({ code: "OBJECT_ACCESS_DENIED" }).category, "storage");
  assert.equal(classifyOperationalError({ code: "JWT_EXPIRED" }).category, "auth");
  assert.equal(classifyOperationalError({ message: "secret appeared in log" }).category, "security");
  assert.equal(classifyOperationalError({ message: "plain error" }).category, "unknown");
});

test("metrics registry records queue export and auth metrics", () => {
  const metrics = new MetricsRegistry();
  metrics.increment("queue.jobs.enqueued", { queue: "rental-events" }, 2);
  metrics.increment("exports.completed", { format: "csv" });
  metrics.increment("auth.decisions", { outcome: "denied" });
  metrics.gauge("queue.dead_letters", { queue: "rental-events" }, 1);
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.counters.length, 3);
  assert.equal(snapshot.gauges.length, 1);
  assert.equal(snapshot.counters.find((metric) => metric.name === "queue.jobs.enqueued").value, 2);
});

test("S5-S3G evidence includes alert rules dashboard runbooks diagnostics and pending telemetry", () => {
  const evidence = createObservabilityOperationsEvidence({});
  assert.equal(evidence.status, "OBSERVABILITY_ENGINEERING_COMPLETE");
  assert.equal(evidence.operationsStatus, "OPERATIONS_ENGINEERING_COMPLETE");
  assert.equal(evidence.healthStatus, "HEALTH_AND_READINESS_ENGINEERING_COMPLETE");
  assert.equal(evidence.alertingStatus, "ALERTING_CREDENTIAL_READY");
  assert.equal(evidence.telemetryStatus, "LIVE_TELEMETRY_DESTINATION_PENDING");
  assert.equal(evidence.productionTouched, false);
  assert.equal(evidence.liveTelemetryTouched, false);
  assert.ok(buildAlertRules().length >= 5);
  assert.equal(buildOperationalDashboardConfig().liveDestination, "LIVE_TELEMETRY_DESTINATION_PENDING");
  assert.equal(buildRunbookIndex().every((runbook) => runbook.exists), true);
  assert.ok(evidence.maintenanceMode.steps.includes("pause queue workers"));
  assert.ok(evidence.diagnostics.startup.includes("dependency readiness check"));
  assert.ok(evidence.manifest.runtimeEvidenceIndex.includes("postgres"));
});

test("S5-S3G workflow runs focused validation and avoids live telemetry credentials", () => {
  const workflow = readFileSync(".github/workflows/observability-operations-runtime-validation.yml", "utf8");
  for (const required of [
    "node --test tests/production/s5-s3g-observability-operations-readiness.test.mjs",
    "node scripts/s5-s3g-observability-operations-readiness.mjs json",
    "OBSERVABILITY_MODE: local",
    "LIVE_TELEMETRY_DESTINATION_PENDING",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(workflow, /OBSERVABILITY_MODE}" != "local"/);
  assert.doesNotMatch(workflow, /SENTRY_DSN|BETTER_STACK|LOGTAIL|TELEMETRY_TOKEN|SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL/i);
});
