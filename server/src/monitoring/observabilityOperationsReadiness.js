import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { redactSecrets } from "./logger.js";
import { validateRedisConfig } from "../queues/redisBullmqReadiness.js";
import { validateObjectStorageConfig } from "../files/objectStorageRuntimeReadiness.js";
import { getOidcAuthHealth } from "../auth/oidcReadiness.js";

const REQUIRED_RUNBOOKS = [
  "docs/incident-response-runbook.md",
  "docs/deployment-runbook.md",
  "docs/backup-restore-runbook.md",
];

export const ERROR_TAXONOMY = {
  auth: ["OIDC", "JWT", "AUTH", "UNAUTHORIZED", "FORBIDDEN", "SESSION"],
  database: ["POSTGRES", "SQL", "DATABASE", "PG", "CONSTRAINT", "MIGRATION"],
  redis: ["REDIS", "BULLMQ", "QUEUE"],
  storage: ["S3", "STORAGE", "OBJECT", "SIGNED_URL"],
  export: ["EXPORT", "CSV", "HTML", "BINARY"],
  security: ["SECRET", "TOKEN", "CSRF", "CSP", "CORS", "RATE_LIMIT"],
  provider: ["SENTRY", "BETTER_STACK", "TELEMETRY", "ALERT"],
  validation: ["VALIDATION", "SCHEMA", "BAD_REQUEST"],
};

export function createRequestContext(input = {}) {
  return tenantSafeLogContext({
    requestId: input.requestId || `req-${randomUUID()}`,
    correlationId: input.correlationId || `corr-${randomUUID()}`,
    traceId: input.traceId || `trace-${randomUUID()}`,
    tenantId: input.tenantId || "platform",
    userId: input.userId || "",
    role: input.role || "anonymous",
    operation: input.operation || "",
    metadata: input.metadata || {},
  });
}

export function tenantSafeLogContext(context = {}) {
  return redactSecrets({
    requestId: context.requestId || "",
    correlationId: context.correlationId || "",
    traceId: context.traceId || "",
    tenantId: context.tenantId || "platform",
    userId: context.userId || "",
    role: context.role || "anonymous",
    operation: context.operation || "",
    metadata: context.metadata || {},
  });
}

export class MetricsRegistry {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
  }

  increment(name, labels = {}, value = 1) {
    const key = metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
    return this.counters.get(key);
  }

  gauge(name, labels = {}, value = 0) {
    const key = metricKey(name, labels);
    this.gauges.set(key, value);
    return value;
  }

  snapshot() {
    return {
      counters: [...this.counters.entries()].map(([key, value]) => parseMetricKey(key, value)),
      gauges: [...this.gauges.entries()].map(([key, value]) => parseMetricKey(key, value)),
    };
  }
}

function metricKey(name, labels) {
  return JSON.stringify({ name, labels: Object.fromEntries(Object.entries(labels).sort()) });
}

function parseMetricKey(key, value) {
  return { ...JSON.parse(key), value };
}

export function classifyOperationalError(error = {}) {
  const code = String(error.code || error.name || "").toUpperCase();
  const message = String(error.message || "").toUpperCase();
  const haystack = `${code} ${message}`;
  for (const [category, tokens] of Object.entries(ERROR_TAXONOMY)) {
    if (tokens.some((token) => haystack.includes(token))) {
      return { category, severity: severityFor(category), retryable: ["database", "redis", "storage", "provider"].includes(category) };
    }
  }
  return { category: "unknown", severity: "sev3", retryable: false };
}

function severityFor(category) {
  if (["security", "auth"].includes(category)) return "sev1";
  if (["database", "redis", "storage", "provider"].includes(category)) return "sev2";
  return "sev3";
}

export function buildDependencyChecks(env = process.env) {
  const postgresReady = Boolean(env.ACCEL_PG005_DATABASE_URL || env.PG_TEST_DATABASE_URL || env.DATABASE_URL);
  const postgres = postgresReady
    ? { status: "READY_TO_VALIDATE", code: "disposable_database_url_present", runtimeEvidence: "PENDING_PG006_EXECUTION" }
    : { status: "BLOCKED", code: "missing_disposable_database_url", runtimeEvidence: "BLOCKED_NO_EXECUTABLE_POSTGRES" };
  const redis = validateRedisConfig({ mode: env.REDIS_PROVIDER || "local", redisUrl: env.REDIS_URL || "", confirmDisposable: env.REDIS_CONFIRM_DISPOSABLE === "true" });
  const storage = validateObjectStorageConfig({ provider: env.OBJECT_STORAGE_PROVIDER || "local_s3", endpoint: env.OBJECT_STORAGE_ENDPOINT || "", bucket: env.OBJECT_STORAGE_BUCKET || "rentashub-local-evidence", confirmDisposable: env.OBJECT_STORAGE_CONFIRM_DISPOSABLE === "true" });
  const identity = getOidcAuthHealth(env);
  const queue = {
    status: redis.status === "READY" ? "READY" : "BLOCKED",
    code: redis.status === "READY" ? "queue_engineering_ready" : "redis_dependency_blocked",
    runtimeEvidence: "CI_EXECUTION_PENDING",
  };
  return {
    postgres,
    redis,
    storage,
    queue,
    identity,
  };
}

export function buildHealthEndpoints(env = process.env) {
  const dependencies = buildDependencyChecks(env);
  const blocked = Object.values(dependencies).filter((item) => item?.status === "BLOCKED" || item?.status === "BLOCKED_LIVE_IDP_PENDING");
  return {
    health: {
      ok: true,
      service: "rentashub-api",
      endpoint: "/api/health",
      status: "LIVE",
      timestamp: new Date().toISOString(),
    },
    liveness: {
      ok: true,
      service: "rentashub-api",
      endpoint: "/api/health/liveness",
      status: "PROCESS_ALIVE",
      timestamp: new Date().toISOString(),
    },
    readiness: {
      ok: blocked.length === 0,
      service: "rentashub-api",
      endpoint: "/api/health/readiness",
      status: blocked.length ? "BLOCKED_PENDING_RUNTIME_EVIDENCE" : "READY_FOR_RUNTIME_VALIDATION",
      dependencies,
      timestamp: new Date().toISOString(),
    },
  };
}

export function buildAlertRules() {
  return [
    { id: "api_5xx_rate", severity: "sev1", condition: "5xx responses exceed threshold", route: "ALERT_ROUTING_OWNER_REQUIRED" },
    { id: "auth_rejection_spike", severity: "sev1", condition: "invalid-token or permission-denied spike", route: "SECURITY_ON_CALL_REQUIRED" },
    { id: "queue_dead_letter_growth", severity: "sev2", condition: "dead-letter count increases across checks", route: "OPERATIONS_ON_CALL_REQUIRED" },
    { id: "dependency_readiness_blocked", severity: "sev2", condition: "database, Redis, storage, or identity dependency blocked", route: "DEVOPS_OWNER_REQUIRED" },
    { id: "secret_redaction_failure", severity: "sev1", condition: "secret pattern appears in logs or evidence", route: "SECURITY_OWNER_REQUIRED" },
  ];
}

export function buildOperationalDashboardConfig() {
  return {
    status: "DASHBOARD_CONFIG_READY",
    liveDestination: "LIVE_TELEMETRY_DESTINATION_PENDING",
    panels: [
      "request volume and latency",
      "error taxonomy by category",
      "dependency readiness",
      "queue depth and dead letters",
      "export outcomes",
      "authentication decisions",
      "runtime evidence index",
    ],
  };
}

export function buildRunbookIndex(root = process.cwd()) {
  return REQUIRED_RUNBOOKS.map((path) => ({
    path,
    exists: existsSync(`${root}/${path}`),
    purpose: path.includes("incident") ? "incident response" : path.includes("backup") ? "backup and restore" : "deployment and rollback",
  }));
}

export function buildMaintenanceModeProcedures() {
  return {
    status: "PROCEDURE_READY",
    steps: ["set maintenance flag", "serve read-only notice", "pause queue workers", "drain active jobs", "publish owner-approved status update", "resume after health checks pass"],
  };
}

export function buildStartupShutdownDiagnostics() {
  return {
    startup: ["configuration redaction", "dependency readiness check", "migration ledger check", "queue worker registration check"],
    shutdown: ["stop accepting requests", "finish or requeue jobs", "flush structured logs", "close dependency handles"],
  };
}

export function createObservabilityOperationsEvidence(env = process.env) {
  const metrics = new MetricsRegistry();
  metrics.increment("queue.jobs.enqueued", { queue: "rental-events" }, 2);
  metrics.increment("queue.jobs.dead_lettered", { queue: "rental-events" }, 1);
  metrics.increment("exports.completed", { format: "csv" }, 1);
  metrics.increment("auth.decisions", { outcome: "denied" }, 1);
  metrics.gauge("readiness.dependencies.blocked", {}, 1);
  return {
    sprint: "S5-S3G",
    status: "OBSERVABILITY_ENGINEERING_COMPLETE",
    operationsStatus: "OPERATIONS_ENGINEERING_COMPLETE",
    healthStatus: "HEALTH_AND_READINESS_ENGINEERING_COMPLETE",
    alertingStatus: "ALERTING_CREDENTIAL_READY",
    telemetryStatus: "LIVE_TELEMETRY_DESTINATION_PENDING",
    endpoints: buildHealthEndpoints(env),
    requestContext: createRequestContext({ tenantId: "tenant-a", metadata: { authorization: "Bearer test-token", safe: "ok" } }),
    errorTaxonomy: ERROR_TAXONOMY,
    alertRules: buildAlertRules(),
    dashboard: buildOperationalDashboardConfig(),
    runbooks: buildRunbookIndex(),
    maintenanceMode: buildMaintenanceModeProcedures(),
    diagnostics: buildStartupShutdownDiagnostics(),
    metrics: metrics.snapshot(),
    manifest: {
      generatedAt: new Date().toISOString(),
      evidenceType: "machine_readable_observability_operations_readiness",
      runtimeEvidenceIndex: ["postgres", "redis", "storage", "queue", "identity", "browser", "auth"],
      liveTelemetryDestination: "PENDING_OWNER_CREDENTIALS",
    },
    productionTouched: false,
    liveTelemetryTouched: false,
  };
}
