const SOFT_DELETE_TABLES = new Set(["assets", "bookings", "supplier_profiles"]);

export const CORE_RENTAL_POSTGRES_TABLE_COLUMNS = {
  supplier_profiles: [
    "id",
    "tenant_id",
    "supplier_id",
    "business_name",
    "supplier_type",
    "service_areas_json",
    "profile_json",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  assets: [
    "id",
    "tenant_id",
    "owner_id",
    "category",
    "subcategory",
    "title",
    "description",
    "location",
    "rental_type",
    "price_rate",
    "deposit_amount",
    "currency",
    "availability_status",
    "verification_status",
    "listing_type",
    "sale_price",
    "trade_value",
    "status",
    "version",
    "published_at",
    "metadata_json",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  bookings: [
    "id",
    "tenant_id",
    "asset_id",
    "customer_id",
    "supplier_id",
    "start_at",
    "end_at",
    "status",
    "currency",
    "subtotal",
    "deposit_amount",
    "total_amount",
    "idempotency_key",
    "payment_status",
    "payment_intent_id",
    "contract_status",
    "settlement_status",
    "checkin_at",
    "checkout_at",
    "version",
    "metadata_json",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  core_rental_idempotency_records: [
    "id",
    "tenant_id",
    "actor_id",
    "actor_role",
    "action",
    "resource_type",
    "resource_id",
    "idempotency_key",
    "request_hash",
    "response_hash",
    "status",
    "created_at",
    "expires_at",
    "deleted_at",
  ],
  audit_logs: [
    "id",
    "tenant_id",
    "actor_id",
    "action",
    "entity_type",
    "entity_id",
    "metadata_json",
    "previous_hash",
    "immutable_hash",
    "created_at",
  ],
};

const ERROR_CODES = {
  "23503": { code: "foreign_key_violation", statusCode: 409, message: "A related record required by this operation does not exist." },
  "23505": { code: "unique_idempotency_conflict", statusCode: 409, message: "This idempotent operation has already been recorded." },
  "23P01": { code: "booking_overlap_conflict", statusCode: 409, message: "The requested booking window overlaps an existing blocking booking." },
  "40001": { code: "serialization_retry_required", statusCode: 409, message: "The transaction could not be serialized and should be retried." },
  "40P01": { code: "deadlock_retry_required", statusCode: 409, message: "The transaction deadlocked and should be retried." },
};

const BLOCKING_BOOKING_STATES = ["pending", "approved", "confirmed", "checked_in", "active", "extension_requested"];

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function repositoryError({ code, statusCode = 500, message, cause, details = [] }) {
  const error = new Error(message);
  error.name = "CoreRentalPostgresRepositoryError";
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  if (cause) error.cause = cause;
  return error;
}

export function translatePostgresRepositoryError(error) {
  if (error?.name === "CoreRentalPostgresRepositoryError") return error;
  const mapped = ERROR_CODES[error?.code];
  if (mapped) return repositoryError({ ...mapped, cause: error });
  return repositoryError({
    code: "postgres_repository_error",
    statusCode: 500,
    message: "The PostgreSQL repository operation failed.",
    cause: error,
  });
}

function assertQueryClient(client) {
  if (!client || typeof client.query !== "function") {
    throw repositoryError({
      code: "postgres_query_client_required",
      statusCode: 500,
      message: "A PostgreSQL-compatible query client with query(sql, params) is required.",
    });
  }
}

function assertTable(tableName) {
  if (!CORE_RENTAL_POSTGRES_TABLE_COLUMNS[tableName]) {
    throw repositoryError({ code: "unsupported_table", statusCode: 500, message: `${tableName} is not supported by the core rental Postgres adapter.` });
  }
}

function allowedColumns(tableName, input = {}) {
  assertTable(tableName);
  const allowed = new Set(CORE_RENTAL_POSTGRES_TABLE_COLUMNS[tableName]);
  const keys = Object.keys(input);
  const invalid = keys.filter((key) => !allowed.has(key));
  if (invalid.length) {
    throw repositoryError({
      code: "unsupported_column",
      statusCode: 400,
      message: `Unsupported column for ${tableName}: ${invalid.join(", ")}.`,
      details: invalid.map((field) => ({ field, message: "Column is not part of the approved repository contract." })),
    });
  }
  return keys;
}

function tableHasColumn(tableName, columnName) {
  assertTable(tableName);
  return CORE_RENTAL_POSTGRES_TABLE_COLUMNS[tableName].includes(columnName);
}

function orderByCreatedAtDesc() {
  return "created_at DESC, id ASC";
}

async function runQuery(client, sql, params = []) {
  try {
    return await client.query(sql, params);
  } catch (error) {
    throw translatePostgresRepositoryError(error);
  }
}

function rowsOf(result) {
  return clone(result?.rows || []);
}

function firstRow(result) {
  return clone(result?.rows?.[0] || null);
}

function buildWhere(filter = {}, params = [], { includeDeleted = false, softDelete = false, tableName } = {}) {
  const clauses = [];
  const columns = allowedColumns(tableName, filter);
  for (const column of columns) {
    const value = filter[column];
    if (value === undefined) continue;
    params.push(value);
    clauses.push(`${column} = $${params.length}`);
  }
  if (softDelete && !includeDeleted) clauses.push("deleted_at IS NULL");
  return clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
}

function createBasePostgresRepository(client, tableName, { idPrefix = tableName, softDelete = SOFT_DELETE_TABLES.has(tableName) } = {}) {
  assertQueryClient(client);
  assertTable(tableName);

  return {
    async create(input = {}) {
      const timestamp = now();
      const record = {
        id: input.id || createId(idPrefix),
        ...input,
        created_at: input.created_at || timestamp,
      };
      if (tableHasColumn(tableName, "updated_at")) record.updated_at = input.updated_at || timestamp;
      const columns = allowedColumns(tableName, record).filter((column) => record[column] !== undefined);
      const values = columns.map((column) => record[column]);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      const sql = `INSERT INTO public.${tableName} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`;
      return firstRow(await runQuery(client, sql, values));
    },

    async findById(id, options = {}) {
      const params = [id];
      const deletedClause = softDelete && !options.includeDeleted ? " AND deleted_at IS NULL" : "";
      const sql = `SELECT * FROM public.${tableName} WHERE id = $1${deletedClause} LIMIT 1`;
      return firstRow(await runQuery(client, sql, params));
    },

    async list(filter = {}, options = {}) {
      const params = [];
      const where = buildWhere(filter, params, { tableName, softDelete, includeDeleted: options.includeDeleted });
      const sql = `SELECT * FROM public.${tableName}${where} ORDER BY ${orderByCreatedAtDesc()}`;
      return rowsOf(await runQuery(client, sql, params));
    },

    async update(id, changes = {}) {
      const timestamp = now();
      const patch = { ...changes };
      if (tableHasColumn(tableName, "updated_at")) patch.updated_at = changes.updated_at || timestamp;
      const columns = allowedColumns(tableName, patch).filter((column) => column !== "id" && patch[column] !== undefined);
      if (!columns.length) return this.findById(id);
      const params = columns.map((column) => patch[column]);
      params.push(id);
      const deletedClause = softDelete ? " AND deleted_at IS NULL" : "";
      const setClause = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
      const sql = `UPDATE public.${tableName} SET ${setClause} WHERE id = $${params.length}${deletedClause} RETURNING *`;
      return firstRow(await runQuery(client, sql, params));
    },

    async softDelete(id) {
      if (!softDelete) {
        throw repositoryError({ code: "soft_delete_not_supported", statusCode: 400, message: `Soft delete is not enabled for ${tableName}.` });
      }
      const timestamp = now();
      const setClause = tableHasColumn(tableName, "updated_at") ? "deleted_at = $1, updated_at = $1" : "deleted_at = $1";
      const sql = `UPDATE public.${tableName} SET ${setClause} WHERE id = $2 AND deleted_at IS NULL RETURNING *`;
      return firstRow(await runQuery(client, sql, [timestamp, id]));
    },
  };
}

function createAssetPostgresRepository(client) {
  const base = createBasePostgresRepository(client, "assets", { idPrefix: "asset" });
  return {
    ...base,
    async listByOwner(ownerId) {
      return base.list({ owner_id: ownerId });
    },
    async listAvailable() {
      return base.list({ availability_status: "available" });
    },
  };
}

function createBookingPostgresRepository(client) {
  const base = createBasePostgresRepository(client, "bookings", { idPrefix: "booking" });
  return {
    ...base,
    async listByCustomer(customerId) {
      return base.list({ customer_id: customerId });
    },
    async listBySupplier(supplierId) {
      return base.list({ supplier_id: supplierId });
    },
    async assertNoOverlap({ asset_id, start_at, end_at, exclude_booking_id } = {}) {
      const params = [asset_id, start_at, end_at, exclude_booking_id || "", BLOCKING_BOOKING_STATES];
      const sql = `
        SELECT id FROM public.bookings
        WHERE asset_id = $1
          AND id <> $4
          AND status = ANY($5::text[])
          AND deleted_at IS NULL
          AND tstzrange(start_at::timestamptz, end_at::timestamptz, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
        LIMIT 1
      `;
      const result = await runQuery(client, sql, params);
      if (result?.rows?.length) {
        throw repositoryError({
          code: "booking_overlap_conflict",
          statusCode: 409,
          message: "The requested booking window overlaps an existing blocking booking.",
          details: [{ field: "asset_id", message: asset_id }],
        });
      }
      return { status: "available" };
    },
    async createWithAvailabilityCheck(input = {}) {
      await this.assertNoOverlap(input);
      return base.create(input);
    },
    async updateWithVersion(id, changes = {}, expectedVersion) {
      if (!Number.isInteger(expectedVersion)) {
        throw repositoryError({ code: "expected_version_required", statusCode: 400, message: "expectedVersion must be an integer." });
      }
      const timestamp = now();
      const patch = { ...changes, updated_at: changes.updated_at || timestamp };
      const columns = allowedColumns("bookings", patch).filter((column) => !["id", "version"].includes(column) && patch[column] !== undefined);
      const params = columns.map((column) => patch[column]);
      params.push(id, expectedVersion);
      const setClause = [...columns.map((column, index) => `${column} = $${index + 1}`), "version = version + 1"].join(", ");
      const sql = `UPDATE public.bookings SET ${setClause} WHERE id = $${params.length - 1} AND version = $${params.length} AND deleted_at IS NULL RETURNING *`;
      const result = await runQuery(client, sql, params);
      if (!result?.rowCount) {
        throw repositoryError({
          code: "stale_version_conflict",
          statusCode: 409,
          message: "The booking was changed by another operation. Reload and retry with the current version.",
          details: [{ field: "version", message: String(expectedVersion) }],
        });
      }
      return firstRow(result);
    },
  };
}

function createIdempotencyPostgresRepository(client) {
  const base = createBasePostgresRepository(client, "core_rental_idempotency_records", { idPrefix: "idem", softDelete: true });
  return {
    ...base,
    async findByKey({ actor_id, action, idempotency_key } = {}) {
      return firstRow(
        await runQuery(
          client,
          "SELECT * FROM public.core_rental_idempotency_records WHERE actor_id = $1 AND action = $2 AND idempotency_key = $3 AND deleted_at IS NULL LIMIT 1",
          [actor_id, action, idempotency_key],
        ),
      );
    },
    async record(input = {}) {
      return base.create(input);
    },
  };
}

function createAuditPostgresRepository(client) {
  const base = createBasePostgresRepository(client, "audit_logs", { idPrefix: "audit", softDelete: false });
  return {
    ...base,
    async record(action, entityType, metadata = {}) {
      return base.create({
        action,
        entity_type: entityType,
        entity_id: metadata.entity_id,
        actor_id: metadata.actor_id,
        tenant_id: metadata.tenant_id,
        metadata_json: JSON.stringify(metadata),
      });
    },
    async search(filters = {}) {
      return base.list(filters, { includeDeleted: true });
    },
    async export(filters = {}, options = {}) {
      const records = await this.search(filters);
      return {
        format: options.format || "json",
        count: records.length,
        records,
      };
    },
  };
}

export function createCoreRentalPostgresRepositories(client) {
  assertQueryClient(client);
  const supplierProfiles = createBasePostgresRepository(client, "supplier_profiles", { idPrefix: "supplier" });
  const assets = createAssetPostgresRepository(client);
  const bookings = createBookingPostgresRepository(client);
  const auditLogs = createAuditPostgresRepository(client);
  const idempotencyRecords = createIdempotencyPostgresRepository(client);
  return {
    supplier_profiles: supplierProfiles,
    assets,
    bookings,
    audit_logs: auditLogs,
    core_rental_idempotency_records: idempotencyRecords,
  };
}

export function createCoreRentalPostgresRepositoryAdapter(client) {
  assertQueryClient(client);
  const createRepositories = (queryClient) => createCoreRentalPostgresRepositories(queryClient);
  return {
    provider: "postgres",
    liveConnection: false,
    rlsEnforcementClaimed: false,
    createRepositories: () => createRepositories(client),
    async transaction(callback) {
      if (typeof client.transaction === "function") {
        return client.transaction((transactionClient) => callback(createRepositories(transactionClient)));
      }
      await runQuery(client, "BEGIN");
      try {
        const result = await callback(createRepositories(client));
        await runQuery(client, "COMMIT");
        return result;
      } catch (error) {
        await runQuery(client, "ROLLBACK");
        throw translatePostgresRepositoryError(error);
      }
    },
  };
}
