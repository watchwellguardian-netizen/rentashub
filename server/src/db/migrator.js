import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, TABLES } from "./schema.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = resolve(currentDir, "../../migrations");

export async function listMigrationFiles(migrationsDir = defaultMigrationsDir) {
  const files = await readdir(migrationsDir);
  return files.filter((file) => file.endsWith(".sql")).sort();
}

export async function runMigrations(database, { migrationsDir = defaultMigrationsDir } = {}) {
  database.ensureTables();
  const files = await listMigrationFiles(migrationsDir);
  const applied = database.table("schema_migrations");
  const appliedNames = new Set(applied.map((migration) => migration.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const sql = await readFile(resolve(migrationsDir, file), "utf8");
    for (const table of TABLES) database.table(table);
    applied.push({
      id: `migration-${file}`,
      name: file,
      schemaVersion: SCHEMA_VERSION,
      sqlPreview: sql.slice(0, 180),
      appliedAt: new Date().toISOString(),
    });
  }

  database.state.schemaVersion = SCHEMA_VERSION;
  await database.persist();
  return { applied: database.table("schema_migrations"), tableCount: TABLES.length };
}
