import { createDatabase } from "./connection.js";
import { getSelectedDatabaseProvider } from "./databaseProvider.js";
import { runMigrations } from "./migrator.js";
import { runSeeds } from "./seed.js";

async function main() {
  const command = process.argv[2];
  const selectedProvider = getSelectedDatabaseProvider();
  if (selectedProvider === "postgres") {
    console.error("[db] provider=postgres target=supabase-postgresql mode=credential-readiness");
  }
  const database = await createDatabase();
  const provider = database.provider || "unknown";

  if (command === "migrate") {
    const result = await runMigrations(database);
    console.log(`[db] provider=${provider} migrated ${result.applied.length} migration(s) across ${result.tableCount} table contract(s).`);
    return;
  }

  if (command === "seed") {
    await runMigrations(database);
    const result = await runSeeds(database);
    console.log(`[db] provider=${provider} seeded ${result.recordCount} record(s).`);
    return;
  }

  if (command === "reset") {
    if (selectedProvider !== "json" && process.env.RENTASHUB_CONFIRM_DB_RESET !== "YES") {
      throw new Error("Refusing to reset a non-JSON database without RENTASHUB_CONFIRM_DB_RESET=YES. Backup and confirm the target database before retrying.");
    }
    if (selectedProvider === "json") {
      console.warn("[db] reset warning: local JSON development data will be deleted and reseeded.");
    }
    await database.reset();
    await runMigrations(database);
    const result = await runSeeds(database);
    console.log(`[db] provider=${provider} reset local development database and seeded ${result.recordCount} record(s).`);
    return;
  }

  throw new Error("Usage: node server/src/db/cli.js migrate|seed|reset");
}

main().catch((error) => {
  console.error(`[db] ${error.message}`);
  process.exit(1);
});
