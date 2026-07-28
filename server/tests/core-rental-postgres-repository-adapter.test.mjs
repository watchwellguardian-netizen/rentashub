import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
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

function assertParameterized(call, unexpectedInlineValue) {
  assert.ok(call.sql.includes("$1"), "query should use positional placeholders");
  assert.ok(Array.isArray(call.params), "query params should be an array");
  assert.doesNotMatch(call.sql, new RegExp(unexpectedInlineValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(call.params.includes(unexpectedInlineValue), "caller value should be passed as a parameter");
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
  await repositories.supplier_profiles.create({ id: "supplier-unsafe", company_name: "ACME'; DROP TABLE bookings; --" });
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
