const PLACEHOLDER_PATTERN = /^(|placeholder|change-me|changeme|example|test|dev|none|<.*>)$/i;
const SECRET_VALUE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i,
  /sb_secret_[A-Za-z0-9_-]+/i,
  /service[_-]?role[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{12,}/i,
  /sk_live_[A-Za-z0-9]+/i,
  /whsec_[A-Za-z0-9]+/i,
  /jwt[_-]?secret\s*[:=]\s*[^,\s]+/i,
];

export const SUPABASE_REPLACEMENT_STATUS = {
  READY_LOCAL: "READY_LOCAL",
  CREDENTIAL_READY: "CREDENTIAL_READY",
  BLOCKED_CREDENTIALS: "BLOCKED_CREDENTIALS",
  BLOCKED_RUNTIME: "BLOCKED_RUNTIME",
  BLOCKED_INVALID_MODE: "BLOCKED_INVALID_MODE",
};

export const SUPABASE_REPLACEMENT_COMPONENTS = [
  {
    id: "database",
    replaces: ["Supabase Postgres", "Supabase Data API"],
    selectedBy: "DATABASE_PROVIDER",
    defaultMode: "json",
    productionMode: "postgres",
    allowedModes: ["json", "postgres"],
    requiredTechnologies: ["PostgreSQL 16+", "node-postgres or reviewed PostgreSQL driver", "SQL migrations", "repository contracts"],
    localCapability: "JSON adapter and repository contracts run without credentials.",
    credentialEnvNames: ["DATABASE_PROVIDER", "DATABASE_URL", "DATABASE_SSL_MODE", "MIGRATION_TARGET_ENV"],
    validationCommands: ["npm run database:readiness", "npm run accel:p1:db-validation"],
    failClosedRule: "DATABASE_PROVIDER=postgres must fail when DATABASE_URL or reviewed driver/runtime execution is absent.",
    manualIntervention: "Provide disposable PostgreSQL/UAT database credentials and execute migrations.",
  },
  {
    id: "authorization",
    replaces: ["Supabase RLS", "Supabase PostgREST role grants"],
    selectedBy: "AUTHZ_POLICY_PROVIDER",
    defaultMode: "application_policy",
    productionMode: "postgres_rls_plus_application_policy",
    allowedModes: ["application_policy", "postgres_rls_plus_application_policy"],
    requiredTechnologies: ["PostgreSQL RLS-compatible SQL", "application operation grid", "tenant ownership predicates", "admin exception matrix"],
    localCapability: "Application role/tenant policy enforcement and static RLS SQL checks run without credentials.",
    credentialEnvNames: ["AUTHZ_POLICY_PROVIDER", "RLS_VALIDATION_MODE", "AUTH_TEST_TENANT_IDS"],
    validationCommands: ["npm run a4:governance:rls-rbac", "npm run auth-rbac:api-auth-guard-matrix"],
    failClosedRule: "Production authorization must not rely on role-only checks; tenant and ownership predicates are mandatory.",
    manualIntervention: "Run RLS policies against executable PostgreSQL/Supabase-compatible runtime.",
  },
  {
    id: "authentication",
    replaces: ["Supabase Auth"],
    selectedBy: "AUTH_PROVIDER",
    defaultMode: "local",
    productionMode: "oidc",
    allowedModes: ["local", "oidc"],
    requiredTechnologies: ["OIDC provider", "JWKS verification", "short-lived access tokens", "session revocation store", "MFA provider"],
    localCapability: "Local auth service supports register, login, logout, refresh, password hashing, and role mapping.",
    credentialEnvNames: ["AUTH_PROVIDER", "OIDC_ISSUER_URL", "OIDC_CLIENT_ID", "OIDC_AUDIENCE", "OIDC_JWKS_URL", "OIDC_CLIENT_SECRET"],
    validationCommands: ["npm run auth-rbac:readiness", "npm run auth-rbac:auth-evidence-report"],
    failClosedRule: "AUTH_PROVIDER=oidc must fail when issuer, audience, JWKS URL, or client ID is missing.",
    manualIntervention: "Configure live OIDC/Supabase Auth provider, MFA, email verification, and session lifecycle evidence.",
  },
  {
    id: "object-storage",
    replaces: ["Supabase Storage"],
    selectedBy: "FILE_STORAGE_PROVIDER",
    defaultMode: "local_placeholder",
    productionMode: "s3",
    allowedModes: ["local_placeholder", "s3", "supabase", "cloudinary"],
    requiredTechnologies: ["S3-compatible object storage", "signed URL service", "bucket policy matrix", "file metadata repository", "malware scan hook"],
    localCapability: "Metadata-only upload intent and storage classification checks run without credentials.",
    credentialEnvNames: ["FILE_STORAGE_PROVIDER", "FILE_STORAGE_BUCKET", "FILE_STORAGE_REGION", "FILE_STORAGE_ACCESS_KEY", "FILE_STORAGE_SECRET_KEY"],
    validationCommands: ["npm run storage:readiness", "npm run storage:access-evidence-package"],
    failClosedRule: "Private evidence files must never be routed to public buckets; signed URL TTL must be bounded.",
    manualIntervention: "Provision S3-compatible buckets or Supabase Storage buckets and execute access-denial tests.",
  },
  {
    id: "realtime-events",
    replaces: ["Supabase Realtime"],
    selectedBy: "EVENT_BUS_PROVIDER",
    defaultMode: "local_event_log",
    productionMode: "redis_streams_or_websocket_gateway",
    allowedModes: ["local_event_log", "redis_streams_or_websocket_gateway"],
    requiredTechnologies: ["domain event contracts", "Redis Streams or queue-backed fanout", "WebSocket/SSE gateway", "tenant-scoped channels"],
    localCapability: "Audit/domain event definitions and local notification flows run without credentials.",
    credentialEnvNames: ["EVENT_BUS_PROVIDER", "REDIS_URL", "WEBSOCKET_GATEWAY_URL", "EVENT_CHANNEL_NAMESPACE"],
    validationCommands: ["npm run runtime:evidence", "npm run operations:readiness"],
    failClosedRule: "Tenant event channels must include tenant-scoped names and deny cross-tenant subscriptions.",
    manualIntervention: "Provide Redis/WebSocket runtime and execute cross-tenant subscription tests.",
  },
  {
    id: "edge-functions",
    replaces: ["Supabase Edge Functions"],
    selectedBy: "BACKGROUND_WORKER_PROVIDER",
    defaultMode: "local_worker",
    productionMode: "bullmq",
    allowedModes: ["local_worker", "bullmq"],
    requiredTechnologies: ["Express/API controllers", "BullMQ workers", "Redis", "idempotent job handlers", "dead-letter queue"],
    localCapability: "Local job contracts, queue readiness, and failure-mode tests run without credentials.",
    credentialEnvNames: ["BACKGROUND_WORKER_PROVIDER", "REDIS_URL", "QUEUE_NAMESPACE", "JOB_TIMEOUT_SECONDS"],
    validationCommands: ["npm run runtime:evidence", "npm run operations:s5-s3g"],
    failClosedRule: "Production jobs must be idempotent and tenant-scoped, with retry, timeout, DLQ, and poison-message handling.",
    manualIntervention: "Provide Redis/BullMQ runtime and execute queue processing evidence.",
  },
  {
    id: "observability",
    replaces: ["Supabase Logs", "Supabase dashboard evidence"],
    selectedBy: "MONITORING_PROVIDER",
    defaultMode: "local_logs",
    productionMode: "sentry_better_stack",
    allowedModes: ["local_logs", "sentry", "better_stack", "sentry_better_stack"],
    requiredTechnologies: ["structured logs", "request IDs", "health/readiness/liveness endpoints", "alert routing", "log drain"],
    localCapability: "Structured log redaction and health endpoint readiness run without credentials.",
    credentialEnvNames: ["MONITORING_PROVIDER", "SENTRY_DSN", "BETTER_STACK_SOURCE_TOKEN", "ALERT_WEBHOOK_URL"],
    validationCommands: ["npm run monitoring:readiness", "npm run operations:s5-s3g"],
    failClosedRule: "Production readiness must fail without live alert routing and incident notification evidence.",
    manualIntervention: "Provision telemetry destinations and execute alert notification tests.",
  },
];

function hasValue(env, name) {
  const raw = String(env[name] || "").trim();
  return Boolean(raw) && !PLACEHOLDER_PATTERN.test(raw);
}

function selectedMode(env, component) {
  return String(env[component.selectedBy] || component.defaultMode).trim().toLowerCase();
}

function modeIsAllowed(mode, component) {
  return component.allowedModes.includes(mode);
}

function missingCredentials(env, component) {
  const mode = selectedMode(env, component);
  if (mode === component.defaultMode || mode === "local" || mode === "json" || mode === "local_placeholder") return [];
  return component.credentialEnvNames.filter((name) => !hasValue(env, name));
}

function hasSecretLeak(value) {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

export function buildSupabaseReplacementReadiness(env = process.env) {
  const components = SUPABASE_REPLACEMENT_COMPONENTS.map((component) => {
    const mode = selectedMode(env, component);
    const invalidMode = !modeIsAllowed(mode, component);
    const missing = missingCredentials(env, component);
    const localMode = mode === component.defaultMode || ["local", "json", "local_placeholder", "local_event_log", "local_worker", "application_policy", "local_logs"].includes(mode);
    const status = invalidMode
      ? SUPABASE_REPLACEMENT_STATUS.BLOCKED_INVALID_MODE
      : localMode
      ? SUPABASE_REPLACEMENT_STATUS.READY_LOCAL
      : missing.length
        ? SUPABASE_REPLACEMENT_STATUS.BLOCKED_CREDENTIALS
        : SUPABASE_REPLACEMENT_STATUS.CREDENTIAL_READY;
    return {
      id: component.id,
      replaces: component.replaces,
      selectedBy: component.selectedBy,
      selectedMode: mode,
      defaultMode: component.defaultMode,
      productionMode: component.productionMode,
      status,
      invalidMode,
      allowedModes: component.allowedModes,
      localMode,
      productionReady: false,
      liveProviderActive: false,
      requiredTechnologies: component.requiredTechnologies,
      credentialEnvNames: component.credentialEnvNames,
      missingCredentials: missing,
      validationCommands: component.validationCommands,
      failClosedRule: component.failClosedRule,
      manualIntervention: component.manualIntervention,
      localCapability: component.localCapability,
    };
  });
  const credentialReady = components.filter((component) => component.status === SUPABASE_REPLACEMENT_STATUS.CREDENTIAL_READY).length;
  const localReady = components.filter((component) => component.status === SUPABASE_REPLACEMENT_STATUS.READY_LOCAL).length;
  const blockedCredentials = components.filter((component) => component.status === SUPABASE_REPLACEMENT_STATUS.BLOCKED_CREDENTIALS).length;
  const invalidModeCount = components.filter((component) => component.status === SUPABASE_REPLACEMENT_STATUS.BLOCKED_INVALID_MODE).length;
  const report = {
    platform: "RentasHub",
    sprint: "S5-ABW-004",
    status: "SUPABASE_REPLACEMENT_FOUNDATION_READY",
    objective: "Replace Supabase dependency with provider-neutral PostgreSQL, OIDC, S3-compatible storage, queue, event, and observability contracts.",
    productionReady: false,
    liveSupabaseRequired: false,
    liveProviderActivation: false,
    componentsTotal: components.length,
    localReady,
    credentialReady,
    blockedCredentials,
    invalidModeCount,
    components,
    architectureDecision: "RentasHub should depend on open standards and replaceable providers, while retaining Supabase compatibility as one possible PostgreSQL/Auth/Storage implementation.",
    manualInterventionStillRequired: [
      "Executable PostgreSQL runtime for migration/RLS evidence.",
      "OIDC/Auth provider credentials for live authentication evidence.",
      "S3-compatible or Supabase Storage credentials for object access evidence.",
      "Redis/BullMQ runtime for realtime/events/background execution evidence.",
      "Telemetry destination credentials for alerting evidence.",
      "Legal/security/operations approval before production launch.",
    ],
  };
  const serialized = JSON.stringify(report);
  if (hasSecretLeak(serialized)) {
    throw new Error("Supabase replacement readiness report contains a secret-like value.");
  }
  return report;
}

export function assertProviderModeReady(componentId, env = process.env) {
  const report = buildSupabaseReplacementReadiness(env);
  const component = report.components.find((item) => item.id === componentId);
  if (!component) {
    const error = new Error(`Unknown provider replacement component "${componentId}".`);
    error.code = "unknown_provider_component";
    throw error;
  }
  if (component.status === SUPABASE_REPLACEMENT_STATUS.BLOCKED_INVALID_MODE) {
    const error = new Error(`${component.id} selected unsupported mode "${component.selectedMode}". Allowed modes: ${component.allowedModes.join(", ")}`);
    error.code = "provider_component_invalid_mode";
    error.details = component.allowedModes.map((mode) => ({ mode, message: `${mode} is an allowed mode for ${component.id}.` }));
    throw error;
  }
  if (component.status === SUPABASE_REPLACEMENT_STATUS.BLOCKED_CREDENTIALS) {
    const error = new Error(`${component.id} is not credential-ready. Missing: ${component.missingCredentials.join(", ")}`);
    error.code = "provider_component_credentials_missing";
    error.details = component.missingCredentials.map((field) => ({ field, message: `${field} is required for ${component.id}.` }));
    throw error;
  }
  return component;
}
