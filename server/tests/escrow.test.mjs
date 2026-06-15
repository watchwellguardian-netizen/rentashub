import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { getEscrowReadiness } from "../src/escrow/escrowReadiness.js";
import { createApp } from "../src/main/app.js";

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

test("escrow readiness fails clearly for missing and placeholder provider credentials", () => {
  const missing = getEscrowReadiness({ ESCROW_PROVIDER: "stripe_connect", ESCROW_MODE: "readiness_only" });
  assert.equal(missing.ready, false);
  assert.equal(missing.liveActivation, false);
  assert.equal(missing.liveFundsProcessing, false);
  assert.ok(missing.missing.includes("STRIPE_SECRET_KEY"));
  assert.ok(missing.missing.includes("ESCROW_LEGAL_OWNER"));

  const placeholder = getEscrowReadiness({
    ESCROW_PROVIDER: "stripe_connect",
    ESCROW_MODE: "readiness_only",
    STRIPE_SECRET_KEY: "placeholder-secret",
    STRIPE_CONNECT_CLIENT_ID: "ca_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
    ESCROW_OPERATIONS_OWNER: "Ops",
    ESCROW_LEGAL_OWNER: "Legal",
    ESCROW_DISPUTE_OWNER: "Disputes",
    ESCROW_RELEASE_POLICY_URL: "https://example.com/release",
    ESCROW_DISPUTE_POLICY_URL: "https://example.com/disputes",
    ESCROW_SETTLEMENT_CURRENCY: "JMD",
  });
  assert.equal(placeholder.ready, false);
  assert.equal(placeholder.placeholderRejected, true);
});

test("escrow API creates readiness-only records and validates status transitions", async () => {
  const escrowStore = new Map();
  const app = createApp({ escrowStore, env: { ESCROW_PROVIDER: "placeholder", ESCROW_MODE: "readiness_only" } });
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/escrow/create", {
      method: "POST",
      headers: customerHeaders,
      body: {
        bookingId: "booking-demo",
        assetId: "asset-demo",
        supplierId: "supplier-demo",
        depositType: "security_deposit",
        amount: 5000,
        status: "held",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.status, "held");
    assert.equal(created.body.data.liveFundsProcessed, false);
    assert.match(created.body.data.notice, /No live funds/);

    const listed = await requestJson(baseUrl, "/api/escrow", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.count, 1);

    const released = await requestJson(baseUrl, "/api/escrow/release", {
      method: "POST",
      headers: supplierHeaders,
      body: { escrowId: created.body.data.id, amount: 2500 },
    });
    assert.equal(released.response.status, 202);
    assert.equal(released.body.data.status, "partially_released");
    assert.equal(released.body.data.liveFundsProcessed, false);

    const invalid = await requestJson(baseUrl, "/api/escrow/refund", {
      method: "POST",
      headers: supplierHeaders,
      body: { escrowId: created.body.data.id },
    });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, "validation_error");
  });
});

test("escrow API supports dispute/refund readiness states and blocks unauthenticated access", async () => {
  const escrowStore = new Map();
  const app = createApp({ escrowStore });
  await withServer(app.handler, async (baseUrl) => {
    const unauthenticated = await requestJson(baseUrl, "/api/escrow/create", {
      method: "POST",
      body: { bookingId: "booking-demo", assetId: "asset-demo", depositType: "damage_deposit", amount: 500 },
    });
    assert.equal(unauthenticated.response.status, 401);

    const created = await requestJson(baseUrl, "/api/escrow/create", {
      method: "POST",
      headers: customerHeaders,
      body: {
        bookingId: "booking-demo-2",
        assetId: "asset-demo-2",
        supplierId: "supplier-demo",
        depositType: "damage_deposit",
        amount: 7500,
        status: "held",
      },
    });
    const disputed = await requestJson(baseUrl, "/api/escrow/dispute", {
      method: "POST",
      headers: customerHeaders,
      body: { escrowId: created.body.data.id, reason: "Checkout evidence mismatch." },
    });
    assert.equal(disputed.response.status, 202);
    assert.equal(disputed.body.data.status, "disputed");

    const refunded = await requestJson(baseUrl, "/api/escrow/refund", {
      method: "POST",
      headers: supplierHeaders,
      body: { escrowId: created.body.data.id },
    });
    assert.equal(refunded.response.status, 202);
    assert.equal(refunded.body.data.status, "refunded");
    assert.equal(refunded.body.data.liveFundsProcessed, false);
  });
});
