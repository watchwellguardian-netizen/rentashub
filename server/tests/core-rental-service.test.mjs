import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { runSeeds } from "../src/db/seed.js";
import { createApp } from "../src/main/app.js";
import { calculateRentalQuote } from "../src/services/coreRentalService.js";

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
const supplierHeaders = { "x-user-role": "supplier", "x-user-id": "supplier-demo" };

test("core rental quote calculation uses asset rental type rate and deposit", () => {
  const quote = calculateRentalQuote(
    { rental_type: "daily", price_rate: 450, deposit_amount: 1200, currency: "JMD" },
    { start_at: "2026-07-10T09:00:00.000Z", end_at: "2026-07-12T09:00:00.000Z" },
  );
  assert.equal(quote.units, 2);
  assert.equal(quote.subtotal, 900);
  assert.equal(quote.deposit, 1200);
  assert.equal(quote.total, 2100);
  assert.equal(quote.currency, "JMD");
});

test("booking API rejects overlapping local availability windows", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const overlap = await requestJson(baseUrl, "/api/bookings", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: "asset-demo-excavator",
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        start_at: "2026-07-02T09:00:00.000Z",
        end_at: "2026-07-04T09:00:00.000Z",
      },
    });
    assert.equal(overlap.response.status, 409);
    assert.equal(overlap.body.error, "rental_conflict");
  });
});

test("booking API creates priced pending booking and records core rental audit event", async () => {
  const { app, database } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/bookings", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: "asset-demo-excavator",
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        start_at: "2026-07-10T09:00:00.000Z",
        end_at: "2026-07-12T09:00:00.000Z",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.status, "pending");
    assert.equal(created.body.data.payment_status, "unpaid");
    assert.equal(created.body.data.total_amount, 900);
    const metadata = JSON.parse(created.body.data.metadata_json);
    assert.equal(metadata.pricing_quote.total, 2100);
    assert.equal(metadata.provider_status, "provider_independent_local");
    assert.ok(database.table("audit_logs").some((entry) => entry.action === "bookings.requested"));
  });
});

test("booking API returns idempotent result for repeated create requests", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const body = {
      asset_id: "asset-demo-excavator",
      customer_id: "customer-demo",
      supplier_id: "supplier-demo",
      start_at: "2026-07-15T09:00:00.000Z",
      end_at: "2026-07-16T09:00:00.000Z",
    };
    const first = await requestJson(baseUrl, "/api/bookings", {
      method: "POST",
      headers: { ...customerHeaders, "idempotency-key": "booking-key-001" },
      body,
    });
    const second = await requestJson(baseUrl, "/api/bookings", {
      method: "POST",
      headers: { ...customerHeaders, "idempotency-key": "booking-key-001" },
      body,
    });
    assert.equal(first.response.status, 201);
    assert.equal(second.response.status, 201);
    assert.equal(second.body.data.id, first.body.data.id);
  });
});

test("booking API blocks invalid state jumps and allows approved active completed path", async () => {
  const { app } = await createSeededApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/bookings", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: "asset-demo-excavator",
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        start_at: "2026-07-20T09:00:00.000Z",
        end_at: "2026-07-21T09:00:00.000Z",
      },
    });
    const invalid = await requestJson(baseUrl, `/api/bookings/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { status: "completed" },
    });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, "validation_error");

    const approved = await requestJson(baseUrl, `/api/bookings/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { status: "approved" },
    });
    assert.equal(approved.response.status, 200);

    const active = await requestJson(baseUrl, `/api/bookings/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { status: "active" },
    });
    assert.equal(active.response.status, 200);

    const completed = await requestJson(baseUrl, `/api/bookings/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { status: "completed" },
    });
    assert.equal(completed.response.status, 200);
    assert.equal(completed.body.data.status, "completed");
  });
});
