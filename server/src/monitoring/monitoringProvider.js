import { createBetterStackProvider, getBetterStackReadiness } from "./betterStackProvider.js";
import { createSentryProvider, getSentryReadiness } from "./sentryProvider.js";
import { INCIDENT_EVENT_TYPES } from "./incidentEvents.js";
import { getMonitoringArchitecturePlan } from "./monitoringArchitecture.js";

const PROVIDERS = new Set(["none", "sentry", "better_stack", "sentry_better_stack"]);
const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /example/i, /your[-_]?/i, /<[^>]+>/];

function normalize(provider = "none") {
  const value = String(provider || "none").trim().toLowerCase();
  if (!PROVIDERS.has(value)) return "none";
  return value;
}

function isPlaceholder(value) {
  const raw = String(value || "").trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

export function getMonitoringReadiness(env = process.env) {
  const provider = normalize(env.MONITORING_PROVIDER);
  const sentry = getSentryReadiness(env);
  const betterStack = getBetterStackReadiness(env);
  const architecture = getMonitoringArchitecturePlan(env);
  const missing = [];
  if (provider.includes("sentry")) missing.push(...sentry.missing);
  if (provider.includes("better_stack")) missing.push(...betterStack.missing);
  if (provider !== "none" && isPlaceholder(env.ALERT_EMAIL) && isPlaceholder(env.ALERT_SMS)) missing.push("ALERT_EMAIL or ALERT_SMS");
  if (provider !== "none" && isPlaceholder(env.INCIDENT_OWNER_NAME)) missing.push("INCIDENT_OWNER_NAME");
  if (provider !== "none" && isPlaceholder(env.INCIDENT_OWNER_EMAIL)) missing.push("INCIDENT_OWNER_EMAIL");

  return {
    provider,
    selectedProvider: provider,
    productionSuitable: provider !== "none",
    ready: provider !== "none" && missing.length === 0,
    missing: [...new Set(missing)],
    sentry,
    betterStack,
    logLevel: env.LOG_LEVEL || "info",
    logDrainConfigured: !isPlaceholder(env.LOG_DRAIN_URL),
    heartbeatConfigured: provider.includes("better_stack") && betterStack.ready,
    alertEmailConfigured: !isPlaceholder(env.ALERT_EMAIL),
    alertSmsConfigured: !isPlaceholder(env.ALERT_SMS),
    incidentOwnerConfigured: !isPlaceholder(env.INCIDENT_OWNER_NAME) && !isPlaceholder(env.INCIDENT_OWNER_EMAIL),
    incidentEventTypes: INCIDENT_EVENT_TYPES,
    architecture,
    message: provider === "none"
      ? "Monitoring provider is not selected. Sentry and/or Better Stack credentials are required before production monitoring."
      : missing.length
        ? `Monitoring provider ${provider} is missing required credentials or incident routing: ${[...new Set(missing)].join(", ")}.`
        : `Monitoring provider ${provider} is credential-ready; live SDK/log/alert delivery still requires staging verification.`,
  };
}

export function createMonitoringProvider(env = process.env) {
  const readiness = getMonitoringReadiness(env);
  const providers = [];
  if (readiness.provider.includes("sentry")) providers.push(createSentryProvider(env));
  if (readiness.provider.includes("better_stack")) providers.push(createBetterStackProvider(env));
  return {
    readiness,
    captureIncident(event) {
      if (!providers.length || !readiness.ready) {
        return { sent: false, provider: readiness.provider, reason: providers.length ? "missing_credentials" : "provider_not_selected", event };
      }
      return {
        sent: false,
        provider: readiness.provider,
        reason: "live_alert_sending_disabled_until_provider_clients_are_verified",
        results: providers.map((provider) => provider.captureEvent(event)),
        event,
      };
    },
  };
}
