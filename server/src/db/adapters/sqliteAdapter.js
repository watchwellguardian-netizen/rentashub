export function isSqliteDriverAvailable() {
  return false;
}

export function getSqliteDriverStatus() {
  return {
    provider: "sqlite",
    available: isSqliteDriverAvailable(),
    productionSuitable: false,
    missing: isSqliteDriverAvailable() ? [] : ["sqlite driver dependency"],
    message: isSqliteDriverAvailable()
      ? "SQLite driver is available for local database activation."
      : "SQLite provider is configured, but no SQLite driver is installed in this environment.",
  };
}

export async function createSqliteDatabase() {
  const error = new Error("SQLite provider is configured, but no SQLite driver is installed in this environment. Use DATABASE_PROVIDER=json or install a reviewed SQLite driver in CI/local development. No silent fallback was used.");
  error.code = "sqlite_provider_unavailable";
  error.statusCode = 501;
  error.details = getSqliteDriverStatus().missing.map((field) => ({ field, message: `${field} is required for SQLite activation.` }));
  throw error;
}
