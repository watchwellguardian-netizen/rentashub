const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /example/i, /your[-_]?/i, /<[^>]+>/];

function isPlaceholder(value) {
  const raw = String(value || "").trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

export function getBetterStackReadiness(env = process.env) {
  const missing = [];
  if (isPlaceholder(env.BETTER_STACK_API_KEY)) missing.push("BETTER_STACK_API_KEY");
  if (isPlaceholder(env.BETTER_STACK_HEARTBEAT_URL)) missing.push("BETTER_STACK_HEARTBEAT_URL");
  return {
    provider: "better_stack",
    ready: missing.length === 0,
    missing,
    statusPageIdConfigured: !isPlaceholder(env.BETTER_STACK_STATUS_PAGE_ID),
    message: missing.length
      ? "Better Stack requires API key and heartbeat URL before uptime/log alerting can be activated."
      : "Better Stack credentials are shaped; heartbeat/log drains still require live verification.",
  };
}

export function createBetterStackProvider(env = process.env) {
  const readiness = getBetterStackReadiness(env);
  return {
    name: "better_stack",
    readiness,
    captureEvent(event) {
      return {
        sent: false,
        provider: "better_stack",
        reason: readiness.ready ? "provider_client_not_activated" : "missing_credentials",
        event,
      };
    },
  };
}
