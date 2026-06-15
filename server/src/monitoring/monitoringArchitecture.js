const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /example/i, /your[-_]?/i, /<[^>]+>/];

export const MONITORING_PROVIDER_MATRIX = {
  sentry: {
    purpose: "Frontend/backend error tracking, release health, and performance tracing.",
    requiredEnv: ["SENTRY_DSN", "SENTRY_ENVIRONMENT", "SENTRY_RELEASE"],
    liveStatus: "sdk_not_activated",
  },
  better_stack: {
    purpose: "Uptime checks, heartbeat monitoring, log drain, status page, and alert routing.",
    requiredEnv: ["BETTER_STACK_API_KEY", "BETTER_STACK_HEARTBEAT_URL", "BETTER_STACK_STATUS_PAGE_ID"],
    liveStatus: "provider_client_not_activated",
  },
};

export const HEALTH_CHECK_TARGETS = [
  { id: "frontend", route: "/", expected: "HTTP 200 from deployed frontend" },
  { id: "api_health", route: "/api/health", expected: "HTTP 200 and service status" },
  { id: "api_readiness", route: "/api/health/readiness", expected: "Credential and dependency readiness report" },
  { id: "observability", route: "/api/health/observability", expected: "Monitoring provider and incident readiness report" },
];

export const PERFORMANCE_BUDGETS = {
  p95ApiLatencyMs: 750,
  p99ApiLatencyMs: 1500,
  frontendLargestContentfulPaintMs: 2500,
  frontendInteractionToNextPaintMs: 200,
  apiErrorRatePercent: 1,
  uptimeTargetPercent: 99.5,
};

export const INCIDENT_SEVERITY_MATRIX = [
  {
    severity: "sev1",
    label: "Critical outage or data/security incident",
    examples: ["site unavailable", "auth outage", "payment/security incident", "private file exposure"],
    responseTarget: "15 minutes",
    routing: "sms_email_on_call",
  },
  {
    severity: "sev2",
    label: "Major degraded workflow",
    examples: ["booking failure spike", "upload failures", "provider webhook failures"],
    responseTarget: "1 hour",
    routing: "email_and_team_channel",
  },
  {
    severity: "sev3",
    label: "Limited issue or non-critical regression",
    examples: ["single route errors", "slow endpoint", "admin workflow warning"],
    responseTarget: "1 business day",
    routing: "triage_queue",
  },
  {
    severity: "sev4",
    label: "Informational readiness warning",
    examples: ["missing credentials", "placeholder provider", "non-production smoke warning"],
    responseTarget: "release review",
    routing: "backlog",
  },
];

export const ALERT_ROUTING_CHANNELS = [
  { id: "email", envKey: "ALERT_EMAIL", requiredFor: ["sev1", "sev2"] },
  { id: "sms", envKey: "ALERT_SMS", requiredFor: ["sev1"] },
  { id: "incident_owner", envKey: "INCIDENT_OWNER_EMAIL", requiredFor: ["sev1", "sev2", "sev3"] },
  { id: "status_page", envKey: "BETTER_STACK_STATUS_PAGE_ID", requiredFor: ["public_status_updates"] },
  { id: "policy", envKey: "ALERT_ROUTING_POLICY_URL", requiredFor: ["production_approval"] },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function numberFromEnv(env, key, fallback) {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getMonitoringArchitecturePlan(env = process.env) {
  const selectedProvider = String(env.MONITORING_PROVIDER || "none").toLowerCase();
  const selected = selectedProvider === "sentry_better_stack"
    ? ["sentry", "better_stack"]
    : selectedProvider === "sentry" || selectedProvider === "better_stack"
      ? [selectedProvider]
      : [];
  const missingProviderEnv = selected.flatMap((provider) => MONITORING_PROVIDER_MATRIX[provider].requiredEnv.filter((key) => !hasRealValue(env[key])));
  const missingRouting = ALERT_ROUTING_CHANNELS
    .filter((channel) => channel.requiredFor.includes("production_approval") || channel.requiredFor.includes("sev1"))
    .map((channel) => channel.envKey)
    .filter((key) => !hasRealValue(env[key]));
  return {
    project: "Project B1 Monitoring Architecture",
    selectedProvider,
    selected,
    providerMatrix: MONITORING_PROVIDER_MATRIX,
    healthChecks: HEALTH_CHECK_TARGETS,
    performanceBudgets: {
      ...PERFORMANCE_BUDGETS,
      p95ApiLatencyMs: numberFromEnv(env, "P95_LATENCY_MS_ALERT_THRESHOLD", PERFORMANCE_BUDGETS.p95ApiLatencyMs),
      apiErrorRatePercent: numberFromEnv(env, "ERROR_RATE_ALERT_THRESHOLD_PERCENT", PERFORMANCE_BUDGETS.apiErrorRatePercent),
      uptimeCheckIntervalSeconds: numberFromEnv(env, "UPTIME_CHECK_INTERVAL_SECONDS", 60),
      traceSampleRate: Number.isFinite(Number(env.MONITORING_TRACE_SAMPLE_RATE)) ? Number(env.MONITORING_TRACE_SAMPLE_RATE) : 0,
    },
    severityMatrix: INCIDENT_SEVERITY_MATRIX,
    alertRouting: {
      channels: ALERT_ROUTING_CHANNELS,
      policyUrlConfigured: hasRealValue(env.ALERT_ROUTING_POLICY_URL),
      incidentOwnerConfigured: hasRealValue(env.INCIDENT_OWNER_NAME) && hasRealValue(env.INCIDENT_OWNER_EMAIL),
      missing: [...new Set(missingRouting)],
    },
    missingProviderEnv: [...new Set(missingProviderEnv)],
    readiness: {
      providerSelected: selected.length > 0,
      providerCredentialsPresent: missingProviderEnv.length === 0 && selected.length > 0,
      alertRoutingReady: missingRouting.length === 0,
      productionSuitable: selected.length > 0 && missingProviderEnv.length === 0 && missingRouting.length === 0,
    },
    activationBoundary: "Provider-ready only. No live Sentry SDK capture, Better Stack heartbeat/log drain, status page update, or real alert delivery is active until credentials and staging verification are supplied.",
  };
}
