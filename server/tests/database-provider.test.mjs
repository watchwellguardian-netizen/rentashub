import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { getDatabaseProviderReadiness, getSelectedDatabaseProvider } from "../src/db/databaseProvider.js";
import { runMigrations } from "../src/db/migrator.js";
import { runSeeds } from "../src/db/seed.js";
import { createRepositories } from "../src/repositories/index.js";

function runCli(command, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["server/src/db/cli.js", command], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("database provider defaults to JSON safely", async () => {
  assert.equal(getSelectedDatabaseProvider({}), "json");
  const database = await createDatabase({ filePath: ":memory:" });
  assert.equal(database.provider, "json");
});

test("invalid database provider fails with controlled error", async () => {
  assert.throws(() => getSelectedDatabaseProvider({ provider: "oracle" }), /Unsupported database provider/);
  await assert.rejects(() => createDatabase({ provider: "oracle" }), /Unsupported database provider/);
});

test("PostgreSQL placeholder fails safely if selected without driver/config", async () => {
  await assert.rejects(
    () => createDatabase({ provider: "postgres" }),
    (error) => error.code === "postgres_provider_not_configured" && /No silent fallback/.test(error.message),
  );
});

test("Supabase PostgreSQL placeholder DATABASE_URL fails clearly", async () => {
  const readiness = getDatabaseProviderReadiness({
    provider: "postgres",
    databaseUrl: "postgresql://user:password@host:5432/rentashub",
  });
  assert.equal(readiness.activeProvider, "postgres");
  assert.equal(readiness.activationTarget, "supabase_postgresql");
  assert.equal(readiness.urlValid, false);
  assert.equal(readiness.urlValidationCode, "placeholder_database_url");
  assert.ok(readiness.missing.includes("valid Supabase DATABASE_URL"));
  assert.equal(readiness.jsonFallbackAllowed, false);
});

test("Supabase PostgreSQL URL shape is accepted but remains blocked until driver is installed", () => {
  const readiness = getDatabaseProviderReadiness({
    provider: "postgres",
    databaseUrl: "postgresql://postgres.projectref:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  });
  assert.equal(readiness.urlValid, true);
  assert.equal(readiness.urlValidationCode, "valid_database_url");
  assert.equal(readiness.selectedProvider, "supabase");
  assert.ok(readiness.missing.includes("postgres driver dependency"));
  assert.equal(readiness.available, false);
});

test("SQLite placeholder fails safely when no driver is installed", async () => {
  await assert.rejects(
    () => createDatabase({ provider: "sqlite" }),
    (error) => error.code === "sqlite_provider_unavailable" && /No silent fallback/.test(error.message),
  );
});

test("database readiness reports active provider and migration status", () => {
  const json = getDatabaseProviderReadiness({ provider: "json" });
  assert.equal(json.activeProvider, "json");
  assert.equal(json.available, true);
  assert.equal(json.productionSuitable, false);
  assert.equal(json.migrationStatus, "json_contract_migrations_available");

  const sqlite = getDatabaseProviderReadiness({ provider: "sqlite" });
  assert.equal(sqlite.activeProvider, "sqlite");
  assert.equal(sqlite.available, false);
  assert.equal(sqlite.productionSuitable, false);
  assert.ok(sqlite.missing.includes("sqlite driver dependency"));
  assert.equal(sqlite.migrationStatus, "blocked_missing_driver");

  const postgres = getDatabaseProviderReadiness({ provider: "postgres" });
  assert.equal(postgres.activeProvider, "postgres");
  assert.equal(postgres.available, false);
  assert.equal(postgres.productionSuitable, true);
  assert.ok(postgres.missing.includes("DATABASE_URL"));
  assert.ok(postgres.missing.includes("postgres driver dependency"));
  assert.equal(postgres.migrationStatus, "blocked_missing_config_or_driver");
  assert.equal(postgres.activationTarget, "supabase_postgresql");
});

test("repositories still work through JSON provider", async () => {
  const database = await createDatabase({ provider: "json", filePath: ":memory:" });
  await runMigrations(database);
  await runSeeds(database);
  const repositories = createRepositories(database);
  const created = await repositories.assets.create({
    owner_id: "supplier-demo",
    title: "Provider test loader",
    category: "heavy-equipment",
    listing_type: "rental",
    availability_status: "available",
  });
  assert.equal((await repositories.assets.findById(created.id)).title, "Provider test loader");
});

test("PostgreSQL migration and connection-check commands report Supabase provider before failing", async () => {
  const env = {
    DATABASE_PROVIDER: "postgres",
    DATABASE_POSTGRES_VENDOR: "supabase",
    DATABASE_URL: "postgresql://user:password@host:5432/rentashub",
  };

  const migration = await runCli("migrate", env);
  assert.equal(migration.code, 1);
  assert.match(migration.stderr, /provider=postgres target=supabase-postgresql/);
  assert.match(migration.stderr, /No silent fallback/);

  const check = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["server/src/db/checkConnection.js"], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(check.code, 1);
  assert.match(check.stdout, /provider=postgres/);
  assert.match(check.stdout, /activationTarget=supabase_postgresql/);
  assert.match(check.stdout, /urlValidation=placeholder_database_url/);
  assert.match(check.stderr, /No connection attempt was made and no JSON fallback was used/);
});

test("migration, seed, and reset CLI commands use selected provider", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rentashub-db-provider-"));
  const dbPath = join(dir, "rentashub.json");
  try {
    for (const command of ["migrate", "seed", "reset"]) {
      const result = await runCli(command, { DATABASE_PROVIDER: "json", RENTASHUB_DB_PATH: dbPath });
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /provider=json/);
      if (command === "reset") assert.match(result.stderr, /reset warning/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
