const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /example/i, /your[-_]?/i, /<[^>]+>/];

function isPlaceholder(value) {
  const raw = String(value || "").trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

export function getSentryReadiness(env = process.env) {
  const missing = [];
  if (isPlaceholder(env.SENTRY_DSN)) missing.push("SENTRY_DSN");
  return {
    provider: "sentry",
    ready: missing.length === 0,
    missing,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || "development",
    release: env.SENTRY_RELEASE || "unconfigured",
    message: missing.length
      ? "Sentry requires a valid DSN before error tracking or performance tracing can be activated."
      : "Sentry credentials are shaped; SDK initialization still requires explicit activation and verification.",
  };
}

export function createSentryProvider(env = process.env) {
  const readiness = getSentryReadiness(env);
  return {
    name: "sentry",
    readiness,
    captureEvent(event) {
      return {
        sent: false,
        provider: "sentry",
        reason: readiness.ready ? "sdk_not_activated" : "missing_credentials",
        event,
      };
    },
  };
}
