import { createDatabase } from "../db/connection.js";
import { runMigrations } from "../db/migrator.js";
import { createRepositories } from "../repositories/index.js";

let defaultPromise;

export async function createPersistenceContext({ database } = {}) {
  const activeDatabase = database || (await createDatabase());
  await runMigrations(activeDatabase);
  return {
    database: activeDatabase,
    repositories: createRepositories(activeDatabase),
  };
}

export async function getDefaultPersistenceContext() {
  if (!defaultPromise) defaultPromise = createPersistenceContext();
  return defaultPromise;
}

export async function getRepositories(context = {}) {
  if (context.repositories) return context.repositories;
  if (context.database) return createRepositories(context.database);
  return (await getDefaultPersistenceContext()).repositories;
}
