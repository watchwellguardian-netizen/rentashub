import { createJsonDatabase } from "./adapters/jsonAdapter.js";
import { createPostgresDatabase, getPostgresDriverStatus } from "./adapters/postgresAdapter.js";
import { createSqliteDatabase, getSqliteDriverStatus } from "./adapters/sqliteAdapter.js";

export const DATABASE_PROVIDERS = {
  JSON: "json",
  SQLITE: "sqlite",
  POSTGRES: "postgres",
};

const SUPPORTED_PROVIDERS = new Set(Object.values(DATABASE_PROVIDERS));

export class DatabaseProviderError extends Error {
  constructor(message, code = "database_provider_error") {
    super(message);
    this.code = code;
    this.statusCode = 400;
  }
}

export function getSelectedDatabaseProvider(options = {}) {
  const provider = String(options.provider || options.databaseProvider || process.env.DATABASE_PROVIDER || DATABASE_PROVIDERS.JSON).toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new DatabaseProviderError(`Unsupported database provider "${provider}". Use json, sqlite, or postgres.`, "invalid_database_provider");
  }
  return provider;
}

export async function createDatabaseFromProvider(options = {}) {
  const provider = getSelectedDatabaseProvider(options);
  if (provider === DATABASE_PROVIDERS.JSON) return createJsonDatabase(options);
  if (provider === DATABASE_PROVIDERS.SQLITE) return createSqliteDatabase(options);
  if (provider === DATABASE_PROVIDERS.POSTGRES) return createPostgresDatabase(options);
  throw new DatabaseProviderError(`Unsupported database provider "${provider}".`, "invalid_database_provider");
}

export function getDatabaseProviderReadiness(options = {}) {
  const provider = getSelectedDatabaseProvider(options);
  if (provider === DATABASE_PROVIDERS.JSON) {
    return {
      provider,
      activeProvider: provider,
      available: true,
      productionSuitable: false,
      fallback: true,
      missing: [],
      migrationStatus: "json_contract_migrations_available",
      message: "JSON fallback is active for restricted development environments. It is not production-suitable.",
    };
  }
  if (provider === DATABASE_PROVIDERS.SQLITE) {
    const status = getSqliteDriverStatus(options);
    return {
      ...status,
      activeProvider: provider,
      fallback: false,
      migrationStatus: status.available ? "ready_to_run_migrations" : "blocked_missing_driver",
    };
  }
  if (provider === DATABASE_PROVIDERS.POSTGRES) {
    const status = getPostgresDriverStatus(options);
    return {
      ...status,
      activeProvider: provider,
      fallback: false,
      migrationStatus: status.available ? "ready_to_run_migrations" : "blocked_missing_config_or_driver",
      activationTarget: status.selectedProvider === "supabase" ? "supabase_postgresql" : "postgresql",
      jsonFallbackAllowed: false,
    };
  }
  throw new DatabaseProviderError(`Unsupported database provider "${provider}".`, "invalid_database_provider");
}
