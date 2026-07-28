import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CORE_RENTAL_POSTGRES_TABLE_COLUMNS,
  createCoreRentalPostgresRepositories,
  createCoreRentalPostgresRepositoryAdapter,
  translatePostgresRepositoryError,
} from "../src/repositories/coreRentalPostgresRepositoryAdapter.js";
import { validateCoreRentalRepositoryContract } from "../src/repositories/coreRentalRepositoryContracts.js";

function createFakeClient({ rows = [], rowCount, failOn = [] } = {}) {
  const calls = [];
  const queue = Array.isArray(rows) ? [...rows] : [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [], rowCount: 0 };
      const failure = failOn.find((entry) => sql.includes(entry.includes));
      if (failure) {
        const error = new Error(failure.message || "planned failure");
        error.code = failure.code;
        throw error;
      }
      const next = queue.length ? queue.shift() : [];
      return { rows: Array.isArray(next) ? next : [next], rowCount: rowCount ?? (Array.isArray(next) ? next.length : 1) };
    },
  };
}

function createFakeTransactionClient() {
  const outerCalls = [];
  const txCalls = [];
  const txClient = {
    calls: txCalls,
    async query(sql, params = []) {
      txCalls.push({ sql, params });
      return { rows: [{ id: "tx-row" }], rowCount: 1 };
    },
  };
  return {
    outerCalls,
    txClient,
    async query(sql, params = []) {
      outerCalls.push({ sql, params });
      return { rows: [{ id: "outer-row" }], rowCount: 1 };
    },
    async transaction(callback) {
      return callback(txClient);
    },
  };
}

function assertParameterized(call, unexpectedInlineValue) {
  assert.ok(call.sql.includes("$1"), "query should use positional placeholders");
  assert.ok(Array.isArray(call.params), "query params should be an array");
  assert.doesNotMatch(call.sql, new RegExp(unexpectedInlineValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(call.params.includes(unexpectedInlineValue), "caller value should be passed as a parameter");
}

function assertNoInlineValues(calls, values) {
  for (const call of calls) {
    for (const value of values) {
      assert.doesNotMatch(call.sql, new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
}

function combinedCoreRentalSql() {
  return [
    "server/migrations/001_initial_schema.sql",
    "server/migrations/007_audit_logging_activation.sql",
    "server/migrations/008_core_rental_production_readiness_bridge.sql",
    "server/migrations/009_core_rental_postgres_repository_adapter.sql",
  ].map((file) => readFileSync(file, "utf8")).join("\n");
}

function migrationDefinesColumn(sql, tableName, columnName) {
  const createTablePattern = new RegExp(`CREATE TABLE IF NOT EXISTS (?:public\\.)?${tableName}\\s*\\(([\\s\\S]*?)\\n\\);`, "i");
  const createTableMatch = sql.match(createTablePattern);
  const createTableColumns = createTableMatch?.[1] || "";
  const escapedColumn = columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`\\n\\s*${escapedColumn}\\s+`, "i").test(createTableColumns) ||
    new RegExp(`ALTER TABLE public\\.${tableName} ADD COLUMN IF NOT EXISTS ${escapedColumn}\\s+`, "i").test(sql)
  );
}

test("PostgreSQL repositories satisfy the core rental repository contract", () => {
  const repositories = createCoreRentalPostgresRepositories(createFakeClient());
  const validation = validateCoreRentalRepositoryContract(repositories);
  assert.equal(validation.status, "CONTRACT_READY");
  assert.equal(typeof repositories.core_rental_idempotency_records.record, "function");
  assert.equal(typeof repositories.bookings.updateWithVersion, "function");
  assert.equal(typeof repositories.bookings.assertNoOverlap, "function");
});

test("supplier, asset, listing, availability, booking, idempotency, and audit operations use parameterized queries", async () => {
  const client = createFakeClient({
    rows: [
      { id: "supplier-row" },
      [{ id: "asset-row" }],
      [{ id: "listing-row" }],
      [{ id: "customer-booking" }],
      [{ id: "supplier-booking" }],
      { id: "idem-row" },
      { id: "audit-row" },
    ],
  });
  const repositories = createCoreRentalPostgresRepositories(client);
  await repositories.supplier_profiles.create({ id: "supplier-unsafe", business_name: "ACME'; DROP TABLE bookings; --", supplier_id: "supplier-unsafe", supplier_type: "equipment" });
  await repositories.assets.listByOwner("supplier-unsafe");
  await repositories.assets.listAvailable();
  await repositories.bookings.listByCustomer("customer-unsafe");
  await repositories.bookings.listBySupplier("supplier-unsafe");
  await repositories.core_rental_idempotency_records.findByKey({
    actor_id: "actor-unsafe",
    action: "booking.create",
    idempotency_key: "idem-unsafe",
  });
  await repositories.audit_logs.record("booking.created", "booking", { entity_id: "booking-unsafe", actor_id: "actor-unsafe" });

  assertParameterized(client.calls[0], "ACME'; DROP TABLE bookings; --");
  assertParameterized(client.calls[1], "supplier-unsafe");
  assertParameterized(client.calls[3], "customer-unsafe");
  assertParameterized(client.calls[5], "actor-unsafe");
  assertParameterized(client.calls[6], "booking.created");
});

test("all dynamic values remain parameterized and customer-provided values are not interpolated", async () => {
  const dangerousValues = [
    "tenant'; DELETE FROM audit_logs; --",
    "asset'); DROP TABLE assets; --",
    "customer@example.com' OR '1'='1",
    "booking\nUNION SELECT * FROM users",
  ];
  const client = createFakeClient({
    rows: [
      { id: "asset-created" },
      [],
      [{ id: "booking-created" }],
      { id: "idem-created" },
    ],
  });
  const repositories = createCoreRentalPostgresRepositories(client);
  await repositories.assets.create({
    tenant_id: dangerousValues[0],
    owner_id: dangerousValues[2],
    title: dangerousValues[1],
    availability_status: "available",
  });
  await repositories.bookings.createWithAvailabilityCheck({
    asset_id: dangerousValues[1],
    customer_id: dangerousValues[2],
    supplier_id: "supplier-safe",
    start_at: "2026-08-01T10:00:00.000Z",
    end_at: "2026-08-02T10:00:00.000Z",
  });
  await repositories.core_rental_idempotency_records.record({
    actor_id: dangerousValues[2],
    actor_role: "customer",
    action: "booking.create",
    resource_type: "booking",
    idempotency_key: dangerousValues[3],
    request_hash: "hash-safe",
  });

  assertNoInlineValues(client.calls, dangerousValues);
  assert.ok(client.calls.some((call) => call.params.includes(dangerousValues[0])));
  assert.ok(client.calls.some((call) => call.params.includes(dangerousValues[3])));
});

test("transaction callback support commits on success and rolls back on failure", async () => {
  const successClient = createFakeClient({ rows: [{ id: "booking-created" }] });
  const successAdapter = createCoreRentalPostgresRepositoryAdapter(successClient);
  const result = await successAdapter.transaction((repositories) => repositories.bookings.create({ id: "booking-created" }));
  assert.equal(result.id, "booking-created");
  assert.deepEqual(successClient.calls.map((call) => call.sql), [
    "BEGIN",
    successClient.calls[1].sql,
    "COMMIT",
  ]);

  const failingClient = createFakeClient({ failOn: [{ includes: "INSERT INTO public.bookings", code: "23505" }] });
  const failingAdapter = createCoreRentalPostgresRepositoryAdapter(failingClient);
  await assert.rejects(
    () => failingAdapter.transaction((repositories) => repositories.bookings.create({ id: "booking-dupe" })),
    (error) => error.code === "unique_idempotency_conflict",
  );
  assert.equal(failingClient.calls.at(-1).sql, "ROLLBACK");
});

test("original PostgreSQL errors are preserved as causes after translation", async () => {
  const failingClient = createFakeClient({
    failOn: [{ includes: "INSERT INTO public.core_rental_idempotency_records", code: "23505", message: "duplicate key value violates unique constraint" }],
  });
  const repositories = createCoreRentalPostgresRepositories(failingClient);
  await assert.rejects(
    () =>
      repositories.core_rental_idempotency_records.record({
        actor_id: "customer-demo",
        actor_role: "customer",
        action: "booking.create",
        resource_type: "booking",
        idempotency_key: "repeat-key",
        request_hash: "hash",
      }),
    (error) =>
      error.code === "unique_idempotency_conflict" &&
      error.statusCode === 409 &&
      error.cause?.code === "23505" &&
      error.cause?.message === "duplicate key value violates unique constraint",
  );
});

test("optimistic version checks translate stale updates into stable conflicts", async () => {
  const client = createFakeClient({ rows: [[]], rowCount: 0 });
  const repositories = createCoreRentalPostgresRepositories(client);
  await assert.rejects(
    () => repositories.bookings.updateWithVersion("booking-1", { status: "approved" }, 7),
    (error) => error.code === "stale_version_conflict" && error.statusCode === 409,
  );
  const call = client.calls[0];
  assert.match(call.sql, /version = version \+ 1/);
  assert.match(call.sql, /WHERE id = \$3 AND version = \$4/);
  assert.deepEqual(call.params.slice(-2), ["booking-1", 7]);
});

test("overlap conflict handling uses a parameterized range check and stable conflict errors", async () => {
  const client = createFakeClient({ rows: [[{ id: "existing-booking" }]] });
  const repositories = createCoreRentalPostgresRepositories(client);
  await assert.rejects(
    () =>
      repositories.bookings.assertNoOverlap({
        asset_id: "asset-1",
        start_at: "2026-08-01T10:00:00.000Z",
        end_at: "2026-08-02T10:00:00.000Z",
      }),
    (error) => error.code === "booking_overlap_conflict" && error.statusCode === 409,
  );
  const call = client.calls[0];
  assert.match(call.sql, /tstzrange/);
  assert.match(call.sql, /status = ANY\(\$5::text\[\]\)/);
  assert.equal(call.params[0], "asset-1");
  assert.equal(call.params[1], "2026-08-01T10:00:00.000Z");
});

test("PostgreSQL exclusion constraint errors are translated to overlap conflicts", async () => {
  const client = createFakeClient({ failOn: [{ includes: "INSERT INTO public.bookings", code: "23P01", message: "conflicting key value violates exclusion constraint" }] });
  const repositories = createCoreRentalPostgresRepositories(client);
  await assert.rejects(
    () =>
      repositories.bookings.create({
        asset_id: "asset-1",
        customer_id: "customer-1",
        supplier_id: "supplier-1",
        start_at: "2026-08-01T10:00:00.000Z",
        end_at: "2026-08-02T10:00:00.000Z",
      }),
    (error) => error.code === "booking_overlap_conflict" && error.cause?.code === "23P01",
  );
});

test("missing records return null without being promoted to successful data", async () => {
  const client = createFakeClient({ rows: [[]] });
  const repositories = createCoreRentalPostgresRepositories(client);
  const missing = await repositories.assets.findById("missing-asset-id");
  assert.equal(missing, null);
  assertParameterized(client.calls[0], "missing-asset-id");
});

test("transaction clients are used for every repository operation inside a transaction", async () => {
  const client = createFakeTransactionClient();
  const adapter = createCoreRentalPostgresRepositoryAdapter(client);
  await adapter.transaction(async (repositories) => {
    await repositories.assets.create({ id: "asset-tx", title: "Asset in transaction" });
    await repositories.bookings.create({ id: "booking-tx", asset_id: "asset-tx" });
  });
  assert.equal(client.outerCalls.length, 0);
  assert.equal(client.txClient.calls.length, 2);
  assert.ok(client.txClient.calls.every((call) => call.sql.startsWith("INSERT INTO public.")));
});

test("audit-event writes participate in the same transaction client", async () => {
  const client = createFakeTransactionClient();
  const adapter = createCoreRentalPostgresRepositoryAdapter(client);
  await adapter.transaction(async (repositories) => {
    await repositories.bookings.create({ id: "booking-audit-tx", asset_id: "asset-audit" });
    await repositories.audit_logs.record("booking.created", "booking", {
      entity_id: "booking-audit-tx",
      actor_id: "customer-audit",
    });
  });
  assert.equal(client.outerCalls.length, 0);
  assert.equal(client.txClient.calls.length, 2);
  assert.match(client.txClient.calls[1].sql, /INSERT INTO public\.audit_logs/);
  assert.ok(client.txClient.calls[1].params.includes("booking.created"));
});

test("repository methods reject malformed identifiers before query execution", async () => {
  const client = createFakeClient();
  const repositories = createCoreRentalPostgresRepositories(client);
  await assert.rejects(
    () => repositories.assets.create({ title: "Valid title", "title; DROP TABLE bookings; --": "invalid" }),
    (error) => error.code === "unsupported_column" && error.statusCode === 400,
  );
  await assert.rejects(
    () => repositories.bookings.list({ "customer_id OR 1=1": "customer-demo" }),
    (error) => error.code === "unsupported_column",
  );
  assert.equal(client.calls.length, 0);
});

test("PostgreSQL error translation is stable for idempotency and exclusion conflicts", () => {
  assert.equal(translatePostgresRepositoryError({ code: "23505" }).code, "unique_idempotency_conflict");
  assert.equal(translatePostgresRepositoryError({ code: "23P01" }).code, "booking_overlap_conflict");
  assert.equal(translatePostgresRepositoryError({ code: "40P01" }).code, "deadlock_retry_required");
});

test("migration 009 prepares idempotency uniqueness and booking overlap constraints without secrets", () => {
  const serverSql = readFileSync("server/migrations/009_core_rental_postgres_repository_adapter.sql", "utf8");
  const supabaseSql = readFileSync("supabase/migrations/009_core_rental_postgres_repository_adapter.sql", "utf8");
  assert.equal(serverSql, supabaseSql);
  for (const needle of [
    "btree_gist",
    "idx_core_rental_idempotency_actor_action_key",
    "idx_bookings_customer_idempotency_active",
    "bookings_no_core_rental_blocking_overlap",
    "EXCLUDE USING gist",
  ]) {
    assert.match(serverSql, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(serverSql, /SUPABASE_SERVICE_ROLE_KEY|postgresql:\/\/|DATABASE_URL\s*=/);
});

test("migrations 008 and 009 are mirrored between server and Supabase directories", () => {
  for (const name of ["008_core_rental_production_readiness_bridge.sql", "009_core_rental_postgres_repository_adapter.sql"]) {
    assert.equal(
      readFileSync(`server/migrations/${name}`, "utf8"),
      readFileSync(`supabase/migrations/${name}`, "utf8"),
      `${name} should be mirrored exactly`,
    );
  }
});

test("repository table and column contract is covered by prepared migrations", () => {
  const sql = combinedCoreRentalSql();
  for (const [tableName, columns] of Object.entries(CORE_RENTAL_POSTGRES_TABLE_COLUMNS)) {
    assert.match(sql, new RegExp(`(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE) (?:public\\.)?${tableName}\\b`, "i"), `${tableName} should exist`);
    for (const column of columns) {
      assert.ok(migrationDefinesColumn(sql, tableName, column), `${tableName}.${column} should be created or added by migrations`);
    }
  }
});

test("optimistic locking, idempotency, overlap, and audit indexes align with adapter expectations", () => {
  const sql = combinedCoreRentalSql();
  for (const needle of [
    "ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1",
    "ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1",
    "UNIQUE(actor_id, action, idempotency_key)",
    "idx_core_rental_idempotency_actor_action_key",
    "idx_bookings_customer_idempotency_active",
    "idx_bookings_asset_window",
    "bookings_no_core_rental_blocking_overlap",
    "EXCLUDE USING gist",
    "tstzrange(start_at::timestamptz, end_at::timestamptz, '[)') WITH &&",
    "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS previous_hash text",
    "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS immutable_hash text",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id)",
  ]) {
    assert.match(sql, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${needle} should be present`);
  }
});

test("repository queries do not depend on columns absent from prepared migrations", () => {
  const sql = combinedCoreRentalSql();
  const adapterSource = readFileSync("server/src/repositories/coreRentalPostgresRepositoryAdapter.js", "utf8");
  for (const [tableName, columns] of Object.entries(CORE_RENTAL_POSTGRES_TABLE_COLUMNS)) {
    for (const column of columns) {
      assert.ok(migrationDefinesColumn(sql, tableName, column), `${tableName}.${column} should be migrated before adapter query use`);
    }
  }
  for (const retiredColumn of ["company_name", "category_id"]) {
    assert.doesNotMatch(adapterSource, new RegExp(`"${retiredColumn}"`), `${retiredColumn} should not be an adapter dependency`);
  }
});

test("core rental relationship and deletion rules are explicit and non-production bounded", () => {
  const sql = combinedCoreRentalSql();
  assert.match(sql, /WHERE deleted_at IS NULL/i);
  assert.match(sql, /idx_assets_tenant_owner/i);
  assert.match(sql, /idx_bookings_tenant_customer/i);
  assert.match(sql, /idx_bookings_tenant_supplier/i);
  assert.match(sql, /Prepared SQL only/);
  assert.doesNotMatch(sql, /SUPABASE_SERVICE_ROLE_KEY|postgresql:\/\/|DATABASE_URL\s*=/);
});
