import { SOFT_DELETE_TABLES } from "../db/schema.js";

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBaseRepository(database, tableName, { idPrefix = tableName, softDelete = SOFT_DELETE_TABLES.has(tableName) } = {}) {
  function activeRows({ includeDeleted = false } = {}) {
    const rows = database.table(tableName);
    return includeDeleted || !softDelete ? rows : rows.filter((row) => !row.deleted_at);
  }

  return {
    async create(input) {
      const timestamp = now();
      const record = {
        id: input.id || createId(idPrefix),
        ...input,
        created_at: input.created_at || timestamp,
        updated_at: input.updated_at || timestamp,
      };
      database.table(tableName).push(record);
      await database.persist();
      return clone(record);
    },

    async findById(id, options = {}) {
      const record = activeRows(options).find((row) => row.id === id);
      return record ? clone(record) : null;
    },

    async list(filter = {}, options = {}) {
      const rows = activeRows(options).filter((row) =>
        Object.entries(filter).every(([key, value]) => value === undefined || row[key] === value),
      );
      return clone(rows);
    },

    async update(id, changes) {
      const rows = database.table(tableName);
      const index = rows.findIndex((row) => row.id === id && (!softDelete || !row.deleted_at));
      if (index < 0) return null;
      rows[index] = { ...rows[index], ...changes, id, updated_at: changes.updated_at || now() };
      await database.persist();
      return clone(rows[index]);
    },

    async softDelete(id) {
      if (!softDelete) throw new Error(`Soft delete is not enabled for ${tableName}`);
      const rows = database.table(tableName);
      const index = rows.findIndex((row) => row.id === id && !row.deleted_at);
      if (index < 0) return null;
      rows[index] = { ...rows[index], deleted_at: now(), updated_at: now() };
      await database.persist();
      return clone(rows[index]);
    },
  };
}
