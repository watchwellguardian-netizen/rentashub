import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { runSeeds } from "../src/db/seed.js";
import { createApp } from "../src/main/app.js";

async function createSeededApp() {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  await runSeeds(database);
  return { database, app: createApp({ database }) };
}

async function withServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function requestJson(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json() };
}

const customerHeaders = { "x-user-role": "customer", "x-user-id": "customer-demo" };
const otherCustomerHeaders = { "x-user-role": "customer", "x-user-id": "other-customer" };
const supplierHeaders = { "x-user-role": "supplier", "x-user-id": "supplier-demo" };
const otherSupplierHeaders = { "x-user-role": "supplier", "x-user-id": "other-supplier" };
const adminHeaders = { "x-user-role": "admin", "x-user-id": "admin-demo" };

async function createBooking(baseUrl, start = "2026-08-01T09:00:00.000Z", end = "2026-08-02T09:00:00.000Z", headers = {}) {
  return requestJson(baseUrl, "/api/v1/rentals/bookings", {
    method: "POST",
    headers: { ...customerHeaders, ...headers },
    body: {
      asset_id: "asset-demo-excavator",
      customer_id: "customer-demo",
      supplier_id: "supplier-demo",
      start_at: start,
      end_at: end,
    },
  });
}

async function transition(baseUrl, bookingId, action, headers = supplierHeaders, body = {}) {
  return requestJson(baseUrl, `/api/v1/rentals/bookings/${bookingId}/${action}`, {
    method: "PATCH",
    headers,
    body,
  });
}

test("versioned core rental action matrix covers required lifecycle actions", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/v1/rentals/actions", { headers: adminHeaders });
    assert.equal(result.response.status, 200);
    const keys = result.body.data.map((action) => action.key);
    for (const key of [
      "validateSupplierProfile",
      "createAsset",
      "moderateListing",
      "publishListing",
      "checkAvailability",
      "quotePrice",
      "requestBooking",
      "acceptBooking",
      "rejectBooking",
      "requirePayment",
      "confirmBooking",
      "triggerContract",
      "checkIn",
      "activateRental",
      "requestExtension",
      "approveExtension",
      "rejectExtension",
      "checkOut",
      "calculateFinalCharge",
      "prepareSettlement",
      "markReviewEligible",
      "cancelBooking",
      "openDispute",
    ]) {
      assert.ok(keys.includes(key), `${key} should be present`);
    }
  });
});

test("core rental persistence readiness reports repository contract and local transaction boundary", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/v1/rentals/persistence/readiness", { headers: adminHeaders });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.status, "CONTRACT_READY");
    assert.equal(result.body.data.persistence.transactionalStrategy, "snapshot_rollback");
    assert.equal(result.body.data.persistence.lockStrategy, "in_process_keyed_mutex");
    assert.equal(result.body.data.persistence.productionSuitable, false);
  });
});

test("core rental API blocks unpublished listing booking and allows publish workflow", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const createdAsset = await requestJson(baseUrl, "/api/v1/rentals/assets", {
      method: "POST",
      headers: supplierHeaders,
      body: {
        title: "Compact loader",
        category: "heavy-equipment",
        listing_type: "rent",
        price_rate: 200,
        deposit_amount: 500,
      },
    });
    assert.equal(createdAsset.response.status, 201);

    const blocked = await requestJson(baseUrl, "/api/v1/rentals/bookings", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: createdAsset.body.data.id,
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        start_at: "2026-08-05T09:00:00.000Z",
        end_at: "2026-08-06T09:00:00.000Z",
      },
    });
    assert.equal(blocked.response.status, 409);
    assert.equal(blocked.body.error, "rental_conflict");

    const moderated = await requestJson(baseUrl, `/api/v1/rentals/listings/${createdAsset.body.data.id}/moderate`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: {},
    });
    assert.equal(moderated.response.status, 200);
    const published = await requestJson(baseUrl, `/api/v1/rentals/listings/${createdAsset.body.data.id}/publish`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: {},
    });
    assert.equal(published.response.status, 200);
  });
});

test("booking request uses deterministic quote, idempotency, and audit events", async () => {
  const { app, database } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const quote = await requestJson(baseUrl, "/api/v1/rentals/quote", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: "asset-demo-excavator",
        start_at: "2026-08-10T09:00:00.000Z",
        end_at: "2026-08-12T09:00:00.000Z",
      },
    });
    assert.equal(quote.response.status, 200);
    assert.equal(quote.body.data.quote.total, 2100);

    const first = await createBooking(baseUrl, "2026-08-10T09:00:00.000Z", "2026-08-12T09:00:00.000Z", { "idempotency-key": "core-rental-p1-004" });
    const second = await createBooking(baseUrl, "2026-08-10T09:00:00.000Z", "2026-08-12T09:00:00.000Z", { "idempotency-key": "core-rental-p1-004" });
    assert.equal(first.response.status, 201);
    assert.equal(second.response.status, 200);
    assert.equal(second.body.data.id, first.body.data.id);
    assert.ok(database.table("audit_logs").some((entry) => entry.action === "bookings.requested"));
    assert.ok(first.body.meta.domain_event.type === "booking.requested");
    assert.equal(first.body.meta.repository_contract, "CONTRACT_READY");
    assert.equal(first.body.meta.persistence.transactionalStrategy, "snapshot_rollback");
    assert.equal(first.body.meta.lock_key, "asset:asset-demo-excavator");
    assert.equal(first.body.meta.repository_invariants, "PASS");
    assert.equal(first.body.data.idempotency_key, "core-rental-p1-004");
    assert.equal(first.body.data.version, 1);
  });
});

test("authorization blocks cross-role and cross-tenant booking mutations", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await createBooking(baseUrl, "2026-08-15T09:00:00.000Z", "2026-08-16T09:00:00.000Z");
    const wrongSupplier = await transition(baseUrl, created.body.data.id, "accept", otherSupplierHeaders);
    assert.equal(wrongSupplier.response.status, 403);
    assert.equal(wrongSupplier.body.error, "forbidden");

    const wrongCustomer = await transition(baseUrl, created.body.data.id, "cancel", otherCustomerHeaders);
    assert.equal(wrongCustomer.response.status, 403);
    assert.equal(wrongCustomer.body.error, "forbidden");
  });
});

test("core rental lifecycle enforces state order, duplicate transitions, extensions, settlement, review, and disputes", async () => {
  const { app, database } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await createBooking(baseUrl, "2026-08-20T09:00:00.000Z", "2026-08-22T09:00:00.000Z");
    const id = created.body.data.id;

    const settlementTooEarly = await transition(baseUrl, id, "prepare-settlement");
    assert.equal(settlementTooEarly.response.status, 400);
    const reviewTooEarly = await transition(baseUrl, id, "mark-review-eligible", customerHeaders);
    assert.equal(reviewTooEarly.response.status, 400);
    const invalidSkip = await transition(baseUrl, id, "check-in");
    assert.equal(invalidSkip.response.status, 400);

    const accepted = await transition(baseUrl, id, "accept");
    assert.equal(accepted.response.status, 200);
    assert.equal(accepted.body.data.version, 2);
    assert.equal(JSON.parse(accepted.body.data.metadata_json).reservation_strategy, "provider_independent_local_lock");
    const duplicateAccept = await transition(baseUrl, id, "accept");
    assert.equal(duplicateAccept.response.status, 409);

    const paymentRequired = await transition(baseUrl, id, "payment-required");
    assert.equal(paymentRequired.response.status, 200);
    assert.equal(paymentRequired.body.data.payment_status, "payment_required");
    const confirmed = await transition(baseUrl, id, "confirm");
    assert.equal(confirmed.response.status, 200);
    const contract = await transition(baseUrl, id, "trigger-contract");
    assert.equal(contract.response.status, 200);
    assert.equal(JSON.parse(contract.body.data.metadata_json).contract_status, "pending_generation");

    const checkedIn = await transition(baseUrl, id, "check-in");
    assert.equal(checkedIn.response.status, 200);
    const duplicateCheckIn = await transition(baseUrl, id, "check-in");
    assert.equal(duplicateCheckIn.response.status, 409);
    const activated = await transition(baseUrl, id, "activate");
    assert.equal(activated.response.status, 200);

    const tooLongExtension = await transition(baseUrl, id, "request-extension", customerHeaders, { requested_end_at: "2026-09-10T09:00:00.000Z" });
    assert.equal(tooLongExtension.response.status, 409);
    const extension = await transition(baseUrl, id, "request-extension", customerHeaders, { requested_end_at: "2026-08-24T09:00:00.000Z" });
    assert.equal(extension.response.status, 200);
    assert.equal(extension.body.data.status, "extension_requested");
    const approvedExtension = await transition(baseUrl, id, "approve-extension");
    assert.equal(approvedExtension.response.status, 200);
    assert.equal(approvedExtension.body.data.end_at, "2026-08-24T09:00:00.000Z");

    const cancelAfterActive = await transition(baseUrl, id, "cancel", customerHeaders);
    assert.equal(cancelAfterActive.response.status, 400);
    const checkedOut = await transition(baseUrl, id, "check-out");
    assert.equal(checkedOut.response.status, 200);
    assert.equal(checkedOut.body.data.status, "completed");
    const duplicateCheckout = await transition(baseUrl, id, "check-out");
    assert.equal(duplicateCheckout.response.status, 409);

    const finalCharge = await transition(baseUrl, id, "calculate-final-charge");
    assert.equal(finalCharge.response.status, 200);
    assert.ok(JSON.parse(finalCharge.body.data.metadata_json).final_charge);
    const settlement = await transition(baseUrl, id, "prepare-settlement");
    assert.equal(settlement.response.status, 200);
    const review = await transition(baseUrl, id, "mark-review-eligible", customerHeaders);
    assert.equal(review.response.status, 200);
    const dispute = await transition(baseUrl, id, "open-dispute", customerHeaders, { reason: "Damage charge disputed" });
    assert.equal(dispute.response.status, 201);
    assert.ok(database.table("audit_logs").some((entry) => entry.action === "disputes.opened"));
  });
});

test("overlapping accepted bookings remain blocked by local availability guard", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const booking = await createBooking(baseUrl, "2026-09-01T09:00:00.000Z", "2026-09-03T09:00:00.000Z");
    const accepted = await transition(baseUrl, booking.body.data.id, "accept");
    assert.equal(accepted.response.status, 200);

    const overlap = await createBooking(baseUrl, "2026-09-02T09:00:00.000Z", "2026-09-04T09:00:00.000Z");
    assert.equal(overlap.response.status, 409);
    assert.equal(overlap.body.error, "rental_conflict");
  });
});

test("parallel booking requests serialize on asset lock and prevent duplicate reservations", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const body = {
      asset_id: "asset-demo-excavator",
      customer_id: "customer-demo",
      supplier_id: "supplier-demo",
      start_at: "2026-09-10T09:00:00.000Z",
      end_at: "2026-09-11T09:00:00.000Z",
    };
    const responses = await Promise.all([
      requestJson(baseUrl, "/api/v1/rentals/bookings", { method: "POST", headers: customerHeaders, body }),
      requestJson(baseUrl, "/api/v1/rentals/bookings", { method: "POST", headers: customerHeaders, body: { ...body, idempotency_key: "parallel-second" } }),
    ]);
    const statuses = responses.map((item) => item.response.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    const successful = responses.find((item) => item.response.status === 201);
    assert.equal(successful.body.meta.lock_key, "asset:asset-demo-excavator");
  });
});

test("bounded core rental frontend vertical-slice API path persists and reads updated booking state", async () => {
  const { app, database } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const asset = await requestJson(baseUrl, "/api/v1/rentals/assets", {
      method: "POST",
      headers: supplierHeaders,
      body: {
        title: "Vertical slice generator",
        category: "small-tools-machines",
        listing_type: "rental",
        rental_type: "daily",
        price_rate: 150,
        deposit_amount: 300,
      },
    });
    assert.equal(asset.response.status, 201);

    const moderated = await requestJson(baseUrl, `/api/v1/rentals/listings/${asset.body.data.id}/moderate`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: {},
    });
    assert.equal(moderated.response.status, 200);
    const published = await requestJson(baseUrl, `/api/v1/rentals/listings/${asset.body.data.id}/publish`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: {},
    });
    assert.equal(published.response.status, 200);

    const availability = await requestJson(baseUrl, "/api/v1/rentals/availability", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: asset.body.data.id,
        start_at: "2026-10-01T09:00:00.000Z",
        end_at: "2026-10-02T09:00:00.000Z",
      },
    });
    assert.equal(availability.response.status, 200);
    assert.equal(availability.body.data.available, true);

    const booking = await requestJson(baseUrl, "/api/v1/rentals/bookings", {
      method: "POST",
      headers: { ...customerHeaders, "idempotency-key": "vertical-slice-001" },
      body: {
        asset_id: asset.body.data.id,
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        start_at: "2026-10-01T09:00:00.000Z",
        end_at: "2026-10-02T09:00:00.000Z",
      },
    });
    assert.equal(booking.response.status, 201);

    const accepted = await transition(baseUrl, booking.body.data.id, "accept", supplierHeaders, {
      expected_version: booking.body.data.version,
    });
    assert.equal(accepted.response.status, 200);
    assert.equal(accepted.body.data.status, "approved");
    assert.equal(accepted.body.data.version, 2);

    const customerRead = await requestJson(baseUrl, `/api/v1/rentals/bookings/${booking.body.data.id}`, {
      headers: customerHeaders,
    });
    assert.equal(customerRead.response.status, 200);
    assert.equal(customerRead.body.data.status, "approved");
    assert.equal(customerRead.body.data.version, 2);
    assert.equal(customerRead.body.meta.repository_invariants, "READ_ONLY");

    assert.ok(database.table("audit_logs").some((entry) => entry.action === "bookings.requested"));
    assert.ok(database.table("audit_logs").some((entry) => entry.action === "bookings.accepted"));
  });
});

test("stale booking version updates are rejected before mutation", async () => {
  const { app, database } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await createBooking(baseUrl, "2026-10-05T09:00:00.000Z", "2026-10-06T09:00:00.000Z");
    const stale = await transition(baseUrl, created.body.data.id, "accept", supplierHeaders, { expected_version: 0 });
    assert.equal(stale.response.status, 409);
    assert.equal(stale.body.error, "rental_conflict");
    assert.equal(database.table("bookings").find((booking) => booking.id === created.body.data.id).status, "pending");
  });
});

test("local snapshot rollback restores booking after partial persistence failure", async () => {
  const { app, database } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await createBooking(baseUrl, "2026-10-07T09:00:00.000Z", "2026-10-08T09:00:00.000Z");
    const originalPersist = database.persist.bind(database);
    let failed = false;
    database.persist = async () => {
      if (!failed) {
        failed = true;
        throw new Error("Injected local persistence failure");
      }
      return originalPersist();
    };

    const failedAccept = await transition(baseUrl, created.body.data.id, "accept");
    assert.equal(failedAccept.response.status, 500);
    const stored = database.table("bookings").find((booking) => booking.id === created.body.data.id);
    assert.equal(stored.status, "pending");
    assert.equal(stored.version, 1);
    database.persist = originalPersist;
  });
});

test("provider-independent JSON persistence survives restart and recovery", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "rentashub-core-rental-"));
  const filePath = join(tempDir, "restart-db.json");
  const database = await createDatabase({ filePath });
  await runMigrations(database);
  await runSeeds(database);
  const app = createApp({ database });

  await withServer(app.handler, async (baseUrl) => {
    const created = await createBooking(baseUrl, "2026-10-09T09:00:00.000Z", "2026-10-10T09:00:00.000Z", {
      "idempotency-key": "restart-recovery",
    });
    assert.equal(created.response.status, 201);
  });

  const recovered = await createDatabase({ filePath });
  await runMigrations(recovered);
  const persisted = recovered.table("bookings").find((booking) => booking.idempotency_key === "restart-recovery");
  assert.equal(persisted.status, "pending");
  assert.equal(persisted.version, 1);
});
