import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createEmptyDatabase, TABLES } from "../schema.js";

const DEFAULT_DB_PATH = "server/.data/rentashub-dev-db.json";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class JsonDatabaseAdapter {
  constructor({ filePath = process.env.RENTASHUB_DB_PATH || DEFAULT_DB_PATH } = {}) {
    this.provider = "json";
    this.filePath = filePath === ":memory:" ? ":memory:" : resolve(filePath);
    this.state = createEmptyDatabase();
  }

  async initialize() {
    if (this.filePath === ":memory:") {
      this.state = createEmptyDatabase();
      return this;
    }
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.state = JSON.parse(raw);
      this.ensureTables();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      this.state = createEmptyDatabase();
      await this.persist();
    }
    return this;
  }

  ensureTables() {
    if (!this.state.tables) this.state.tables = {};
    for (const table of TABLES) {
      if (!Array.isArray(this.state.tables[table])) this.state.tables[table] = [];
    }
  }

  async persist() {
    this.ensureTables();
    if (this.filePath === ":memory:") return;
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
  }

  async reset() {
    this.state = createEmptyDatabase();
    await this.persist();
  }

  table(tableName) {
    this.ensureTables();
    if (!this.state.tables[tableName]) throw new Error(`Unknown table: ${tableName}`);
    return this.state.tables[tableName];
  }

  snapshot() {
    this.ensureTables();
    return clone(this.state);
  }
}

export async function createJsonDatabase(options = {}) {
  const database = new JsonDatabaseAdapter(options);
  await database.initialize();
  return database;
}
