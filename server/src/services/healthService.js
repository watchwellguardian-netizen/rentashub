import { config } from "../config/env.js";
import { getIntegrationReadiness } from "../config/integrationReadiness.js";
import { getDatabaseProviderReadiness } from "../db/databaseProvider.js";
import { getMonitoringReadiness } from "../monitoring/monitoringProvider.js";

export function getHealth() {
  return {
    ok: true,
    service: "rentashub-api",
    module: "backend-scaffold",
    environment: config.nodeEnv,
    database: config.databaseUrl ? "configured-placeholder" : "not-configured",
    timestamp: new Date().toISOString(),
  };
}

export function getReadiness() {
  return {
    ok: true,
    service: "rentashub-api",
    module: "credential-readiness",
    environment: config.nodeEnv,
    readiness: getIntegrationReadiness(),
    timestamp: new Date().toISOString(),
  };
}

export function getDatabaseReadiness() {
  const database = getDatabaseProviderReadiness();
  return {
    ok: database.available,
    service: "rentashub-api",
    module: "database-readiness",
    database,
    note: database.available
      ? "Database provider is credential-ready. Provider connectivity still requires running migration and smoke checks."
      : "Database provider is not active. No silent JSON fallback is used when PostgreSQL is explicitly selected.",
    timestamp: new Date().toISOString(),
  };
}

export function getObservabilityReadiness() {
  const monitoring = getMonitoringReadiness();
  return {
    ok: monitoring.ready,
    service: "rentashub-api",
    module: "observability-readiness",
    monitoring,
    note: monitoring.ready
      ? "Monitoring credentials are shaped. Live provider delivery still requires SDK/log drain verification."
      : "Monitoring is not active. Sentry and/or Better Stack credentials and alert routing are required.",
    timestamp: new Date().toISOString(),
  };
}
