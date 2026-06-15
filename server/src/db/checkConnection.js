import { createDatabase } from "./connection.js";
import { getDatabaseProviderReadiness, getSelectedDatabaseProvider } from "./databaseProvider.js";

async function main() {
  const provider = getSelectedDatabaseProvider();
  const readiness = getDatabaseProviderReadiness();
  console.log(`[db:check] provider=${provider}`);
  console.log(`[db:check] activationTarget=${readiness.activationTarget || provider}`);
  console.log(`[db:check] available=${readiness.available}`);
  console.log(`[db:check] productionSuitable=${readiness.productionSuitable}`);
  if (readiness.urlValidationCode) console.log(`[db:check] urlValidation=${readiness.urlValidationCode}`);
  if (readiness.missing?.length) console.log(`[db:check] missing=${readiness.missing.join(", ")}`);

  if (provider === "postgres" && !readiness.available) {
    const error = new Error(`${readiness.message} No connection attempt was made and no JSON fallback was used.`);
    error.code = "postgres_connection_check_blocked";
    throw error;
  }

  const database = await createDatabase();
  console.log(`[db:check] connection=ok provider=${database.provider}`);
}

main().catch((error) => {
  console.error(`[db:check] ${error.message}`);
  process.exit(1);
});
