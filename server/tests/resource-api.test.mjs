import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { runSeeds } from "../src/db/seed.js";
import { createApp } from "../src/main/app.js";

async function createTestApp({ seeded = false } = {}) {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  if (seeded) await runSeeds(database);
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

const supplierHeaders = { "x-user-role": "supplier", "x-user-id": "supplier-demo" };
const customerHeaders = { "x-user-role": "customer", "x-user-id": "customer-demo" };

test("asset API can list, create, find, update, and soft delete with audit logs", async () => {
  const { app, database } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      headers: supplierHeaders,
      body: {
        owner_id: "supplier-demo",
        title: "Towable air compressor",
        category: "small-tools-machines",
        listing_type: "rental",
        availability_status: "available",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.title, "Towable air compressor");

    const listed = await requestJson(baseUrl, "/api/assets");
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.count, 1);

    const found = await requestJson(baseUrl, `/api/assets/${created.body.data.id}`);
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.category, "small-tools-machines");

    const updated = await requestJson(baseUrl, `/api/assets/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { price_rate: 95 },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.price_rate, 95);

    const deleted = await requestJson(baseUrl, `/api/assets/${created.body.data.id}`, {
      method: "DELETE",
      headers: supplierHeaders,
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.softDeleted, true);

    const missingAfterDelete = await requestJson(baseUrl, `/api/assets/${created.body.data.id}`);
    assert.equal(missingAfterDelete.response.status, 404);
    assert.equal(database.table("audit_logs").length, 3);
  });
});

test("booking API can list, create, find, and update with audit logs", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/bookings", {
      method: "POST",
      headers: customerHeaders,
      body: {
        asset_id: "asset-demo-excavator",
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        status: "pending",
        payment_status: "unpaid",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.status, "pending");

    const listed = await requestJson(baseUrl, "/api/bookings", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.ok(listed.body.count >= 2);

    const found = await requestJson(baseUrl, `/api/bookings/${created.body.data.id}`, { headers: customerHeaders });
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.asset_id, "asset-demo-excavator");

    const updated = await requestJson(baseUrl, `/api/bookings/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { status: "approved" },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.status, "approved");
    assert.ok(database.table("audit_logs").length >= 3);
  });
});

test("inspection API can list, create, find, and update with audit logs", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/inspections", {
      method: "POST",
      headers: customerHeaders,
      body: {
        booking_id: "booking-demo-approved",
        asset_id: "asset-demo-excavator",
        type: "check-in",
        condition_status: "good",
        submitted_by_user_id: "customer-demo",
        submitted_by_role: "customer",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.type, "check-in");

    const listed = await requestJson(baseUrl, "/api/inspections", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.count, 1);

    const found = await requestJson(baseUrl, `/api/inspections/${created.body.data.id}`, { headers: supplierHeaders });
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.asset_id, "asset-demo-excavator");

    const updated = await requestJson(baseUrl, `/api/inspections/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: {
        supplier_review: {
          status: "accepted",
          reviewed_by_user_id: "supplier-demo",
          notes: "Looks acceptable.",
        },
      },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.supplier_review.status, "accepted");
    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("inspections.created"));
    assert.ok(auditActions.includes("inspections.updated"));
  });
});

test("message API can ensure thread, list, detail, send, and mark read with audit logs", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const ensured = await requestJson(baseUrl, "/api/messages", {
      method: "POST",
      headers: customerHeaders,
      body: {
        kind: "thread",
        booking_id: "booking-demo-approved",
        asset_id: "asset-demo-excavator",
        asset_title: "Demo Excavator",
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
      },
    });
    assert.equal(ensured.response.status, 201);
    assert.equal(ensured.body.thread.id, "thread-booking-demo-approved");

    const listed = await requestJson(baseUrl, "/api/messages", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.count, 1);

    const sent = await requestJson(baseUrl, "/api/messages", {
      method: "POST",
      headers: customerHeaders,
      body: {
        thread_id: ensured.body.thread.id,
        sender_id: "customer-demo",
        sender_role: "customer",
        body: "Is pickup still available?",
      },
    });
    assert.equal(sent.response.status, 201);
    assert.equal(sent.body.message.body, "Is pickup still available?");

    const detail = await requestJson(baseUrl, `/api/messages/${ensured.body.thread.id}`, { headers: supplierHeaders });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.messages.some((message) => message.body === "Is pickup still available?"), true);

    const marked = await requestJson(baseUrl, `/api/messages/${ensured.body.thread.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { mark_thread_read: true },
    });
    assert.equal(marked.response.status, 200);
    assert.equal(marked.body.thread.id, ensured.body.thread.id);

    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("message_threads.created"));
    assert.ok(auditActions.includes("messages.created"));
    assert.ok(auditActions.includes("message_threads.updated"));
  });
});

test("notification API can list, create, find, update, and mark all read", async () => {
  const { app, database } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/notifications", {
      method: "POST",
      headers: customerHeaders,
      body: {
        user_id: "customer-demo",
        type: "booking_approved",
        title: "Booking approved",
        body: "Your booking was approved.",
        related_route: "/bookings",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.title, "Booking approved");

    const listed = await requestJson(baseUrl, "/api/notifications", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.count, 1);

    const found = await requestJson(baseUrl, `/api/notifications/${created.body.data.id}`, { headers: customerHeaders });
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.user_id, "customer-demo");

    const read = await requestJson(baseUrl, `/api/notifications/${created.body.data.id}`, {
      method: "PATCH",
      headers: customerHeaders,
      body: { read: true },
    });
    assert.equal(read.response.status, 200);
    assert.ok(read.body.data.read_at);

    const allRead = await requestJson(baseUrl, "/api/notifications/all", {
      method: "PATCH",
      headers: customerHeaders,
      body: { read_all: true },
    });
    assert.equal(allRead.response.status, 200);
    assert.equal(Array.isArray(allRead.body.data), true);

    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("notifications.created"));
    assert.ok(auditActions.includes("notifications.updated"));
  });
});

test("review API can list published reviews, create review, and accept supplier response", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/reviews", {
      method: "POST",
      headers: customerHeaders,
      body: {
        booking_id: "booking-demo-approved",
        asset_id: "asset-demo-excavator",
        supplier_id: "supplier-demo",
        customer_id: "customer-demo",
        reviewer_id: "customer-demo",
        reviewer_role: "customer",
        rating: 5,
        title: "Excellent rental",
        comment: "Clean asset and smooth handoff.",
        review_type: "asset",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.rating, 5);

    const assetReviews = await requestJson(baseUrl, "/api/reviews?asset_id=asset-demo-excavator");
    assert.equal(assetReviews.response.status, 200);
    assert.equal(assetReviews.body.count, 1);

    const visible = await requestJson(baseUrl, "/api/reviews?visible=me", { headers: customerHeaders });
    assert.equal(visible.response.status, 200);
    assert.equal(visible.body.data.some((review) => review.id === created.body.data.id), true);

    const found = await requestJson(baseUrl, `/api/reviews/${created.body.data.id}`, { headers: customerHeaders });
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.title, "Excellent rental");

    const responded = await requestJson(baseUrl, `/api/reviews/${created.body.data.id}`, {
      method: "PATCH",
      headers: supplierHeaders,
      body: { supplier_response: { body: "Thank you for renting with us." } },
    });
    assert.equal(responded.response.status, 200);
    assert.equal(responded.body.data.supplier_response.body, "Thank you for renting with us.");

    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("reviews.created"));
    assert.ok(auditActions.includes("reviews.responded"));
  });
});

test("trust API can read supplier customer asset risk queue and recalculate with audit logs", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const suppliers = await requestJson(baseUrl, "/api/trust/supplier", { headers: customerHeaders });
    assert.equal(suppliers.response.status, 200);
    assert.ok(suppliers.body.count >= 1);

    const supplier = await requestJson(baseUrl, "/api/trust/supplier/supplier-demo", { headers: customerHeaders });
    assert.equal(supplier.response.status, 200);
    assert.equal(supplier.body.data.entityType, "supplier");

    const customer = await requestJson(baseUrl, "/api/trust/customer/customer-demo", { headers: customerHeaders });
    assert.equal(customer.response.status, 200);
    assert.equal(customer.body.data.entityType, "customer");

    const asset = await requestJson(baseUrl, "/api/trust/asset/asset-demo-excavator", { headers: customerHeaders });
    assert.equal(asset.response.status, 200);
    assert.equal(asset.body.data.entityType, "asset");

    const riskQueue = await requestJson(baseUrl, "/api/trust/risk-queue", { headers: { "x-user-role": "admin", "x-user-id": "admin-demo" } });
    assert.equal(riskQueue.response.status, 200);
    assert.equal(Array.isArray(riskQueue.body.data), true);

    const recalculated = await requestJson(baseUrl, "/api/trust/recalculate/supplier/supplier-demo", {
      method: "PATCH",
      headers: { "x-user-role": "admin", "x-user-id": "admin-demo" },
      body: { entity_type: "supplier", entity_id: "supplier-demo" },
    });
    assert.equal(recalculated.response.status, 200);
    assert.equal(recalculated.body.data.entityId, "supplier-demo");
    assert.ok(database.table("audit_logs").some((entry) => entry.action === "trust.recalculated"));
  });
});

test("protection and claims API can list plans select booking protection submit claims and update admin claims", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const overview = await requestJson(baseUrl, "/api/protection");
    assert.equal(overview.response.status, 200);
    assert.ok(overview.body.data.plans.length >= 1);

    const plans = await requestJson(baseUrl, "/api/protection/plans");
    assert.equal(plans.response.status, 200);
    assert.equal(plans.body.data[0].id, "protection-demo-damage");

    const plan = await requestJson(baseUrl, "/api/protection/plans/protection-demo-damage");
    assert.equal(plan.response.status, 200);
    assert.equal(plan.body.data.type, "damage_waiver");

    const selected = await requestJson(baseUrl, "/api/protection/booking/booking-demo-approved", {
      method: "PATCH",
      headers: customerHeaders,
      body: { plan_ids: ["protection-demo-damage"] },
    });
    assert.equal(selected.response.status, 200);
    assert.deepEqual(selected.body.data.selectedPlanIds, ["protection-demo-damage"]);

    const bookingProtection = await requestJson(baseUrl, "/api/protection/booking/booking-demo-approved", { headers: customerHeaders });
    assert.equal(bookingProtection.response.status, 200);
    assert.equal(bookingProtection.body.data.selections.length, 1);

    const created = await requestJson(baseUrl, "/api/claims", {
      method: "POST",
      headers: customerHeaders,
      body: {
        booking_id: "booking-demo-approved",
        asset_id: "asset-demo-excavator",
        claim_type: "damage",
        description: "Hydraulic line damage noted after inspection.",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.claimType, "damage");

    const listed = await requestJson(baseUrl, "/api/claims", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.data.some((claim) => claim.id === created.body.data.id), true);

    const found = await requestJson(baseUrl, `/api/claims/${created.body.data.id}`, { headers: supplierHeaders });
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.supplierId, "supplier-demo");

    const adminClaims = await requestJson(baseUrl, "/api/admin/claims", { headers: { "x-user-role": "admin", "x-user-id": "admin-demo" } });
    assert.equal(adminClaims.response.status, 200);
    assert.equal(adminClaims.body.count, 1);

    const updated = await requestJson(baseUrl, `/api/admin/claims/${created.body.data.id}`, {
      method: "PATCH",
      headers: { "x-user-role": "admin", "x-user-id": "admin-demo" },
      body: { status: "under_review", admin_note: "Local simulated review only." },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.status, "under_review");

    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("protection.selection.updated"));
    assert.ok(auditActions.includes("claims.created"));
    assert.ok(auditActions.includes("admin.claims.updated"));
  });
});

test("protection and claims API validation authorization and missing resources are controlled", async () => {
  const { app } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const unauthenticatedSelection = await requestJson(baseUrl, "/api/protection/booking/booking-demo-approved", {
      method: "PATCH",
      body: { plan_ids: ["protection-demo-damage"] },
    });
    assert.equal(unauthenticatedSelection.response.status, 401);

    const forbiddenSelection = await requestJson(baseUrl, "/api/protection/booking/booking-demo-approved", {
      method: "PATCH",
      headers: { "x-user-role": "customer", "x-user-id": "other-customer" },
      body: { plan_ids: ["protection-demo-damage"] },
    });
    assert.equal(forbiddenSelection.response.status, 403);

    const invalidPlan = await requestJson(baseUrl, "/api/protection/booking/booking-demo-approved", {
      method: "PATCH",
      headers: customerHeaders,
      body: { plan_ids: ["not-a-plan"] },
    });
    assert.equal(invalidPlan.response.status, 400);
    assert.equal(invalidPlan.body.error, "validation_error");

    const invalidClaim = await requestJson(baseUrl, "/api/claims", {
      method: "POST",
      headers: customerHeaders,
      body: {
        booking_id: "booking-demo-approved",
        asset_id: "asset-demo-excavator",
        claim_type: "not-real",
        description: "",
      },
    });
    assert.equal(invalidClaim.response.status, 400);
    assert.equal(invalidClaim.body.error, "validation_error");

    const missingPlan = await requestJson(baseUrl, "/api/protection/plans/not-real");
    assert.equal(missingPlan.response.status, 404);
    assert.equal(missingPlan.body.error, "not_found");

    const missingClaim = await requestJson(baseUrl, "/api/claims/not-real", { headers: customerHeaders });
    assert.equal(missingClaim.response.status, 404);
    assert.equal(missingClaim.body.error, "not_found");

    const nonAdmin = await requestJson(baseUrl, "/api/admin/claims", { headers: customerHeaders });
    assert.equal(nonAdmin.response.status, 403);
  });
});

test("dispute API can create list find and admin update with audit logs", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/disputes", {
      method: "POST",
      headers: customerHeaders,
      body: {
        booking_id: "booking-demo-approved",
        asset_id: "asset-demo-excavator",
        reason: "damage",
        summary: "Damage condition needs review.",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.data.reason, "damage");
    assert.equal(created.body.data.customerId, "customer-demo");

    const listed = await requestJson(baseUrl, "/api/disputes", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.data.some((dispute) => dispute.id === created.body.data.id), true);

    const found = await requestJson(baseUrl, `/api/disputes/${created.body.data.id}`, { headers: supplierHeaders });
    assert.equal(found.response.status, 200);
    assert.equal(found.body.data.supplierId, "supplier-demo");

    const adminList = await requestJson(baseUrl, "/api/admin/disputes", { headers: { "x-user-role": "admin", "x-user-id": "admin-demo" } });
    assert.equal(adminList.response.status, 200);
    assert.equal(adminList.body.count, 1);

    const updated = await requestJson(baseUrl, `/api/admin/disputes/${created.body.data.id}`, {
      method: "PATCH",
      headers: { "x-user-role": "admin", "x-user-id": "admin-demo" },
      body: { status: "under_review", admin_notes: "Reviewing local evidence metadata." },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.status, "under_review");
    assert.equal(updated.body.data.adminNotes, "Reviewing local evidence metadata.");

    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("disputes.created"));
    assert.ok(auditActions.includes("admin.disputes.updated"));
  });
});

test("dispute API validation authorization and missing resources are controlled", async () => {
  const { app } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const unauthenticated = await requestJson(baseUrl, "/api/disputes", {
      method: "POST",
      body: { booking_id: "booking-demo-approved", asset_id: "asset-demo-excavator", reason: "damage", summary: "No auth." },
    });
    assert.equal(unauthenticated.response.status, 401);

    const forbidden = await requestJson(baseUrl, "/api/disputes", {
      method: "POST",
      headers: { "x-user-role": "customer", "x-user-id": "other-customer" },
      body: { booking_id: "booking-demo-approved", asset_id: "asset-demo-excavator", reason: "damage", summary: "Wrong customer." },
    });
    assert.equal(forbidden.response.status, 403);

    const invalid = await requestJson(baseUrl, "/api/disputes", {
      method: "POST",
      headers: customerHeaders,
      body: { booking_id: "booking-demo-approved", asset_id: "asset-demo-excavator", reason: "not-real", summary: "" },
    });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, "validation_error");

    const missing = await requestJson(baseUrl, "/api/disputes/not-real", { headers: customerHeaders });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error, "not_found");

    const nonAdmin = await requestJson(baseUrl, "/api/admin/disputes", { headers: customerHeaders });
    assert.equal(nonAdmin.response.status, 403);
  });
});

test("payment API can preview simulate list wallet earnings payout and refund placeholder", async () => {
  const { app, database } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const intent = await requestJson(baseUrl, "/api/payments/intent", {
      method: "POST",
      headers: customerHeaders,
      body: { booking_id: "booking-demo-approved" },
    });
    assert.equal(intent.response.status, 200);
    assert.equal(intent.body.data.status, "preview_only");
    assert.match(intent.body.data.notice, /No real card processing/);

    const simulated = await requestJson(baseUrl, "/api/payments/simulate", {
      method: "POST",
      headers: customerHeaders,
      body: { booking_id: "booking-demo-approved" },
    });
    assert.equal(simulated.response.status, 201);
    assert.equal(simulated.body.data.transaction.status, "simulated_paid");
    assert.equal(simulated.body.data.booking.payment_status, "paid");

    const listed = await requestJson(baseUrl, "/api/payments", { headers: customerHeaders });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.count, 1);

    const transactionId = simulated.body.data.transaction.id;
    const transaction = await requestJson(baseUrl, `/api/transactions/${transactionId}`, { headers: supplierHeaders });
    assert.equal(transaction.response.status, 200);
    assert.equal(transaction.body.data.supplierId, "supplier-demo");

    const wallet = await requestJson(baseUrl, "/api/wallet", { headers: customerHeaders });
    assert.equal(wallet.response.status, 200);
    assert.equal(wallet.body.data.transactionCount, 1);

    const earnings = await requestJson(baseUrl, "/api/earnings", { headers: supplierHeaders });
    assert.equal(earnings.response.status, 200);
    assert.equal(earnings.body.data.availableEarnings > 0, true);

    const payout = await requestJson(baseUrl, "/api/payouts/request", {
      method: "POST",
      headers: supplierHeaders,
      body: {},
    });
    assert.equal(payout.response.status, 201);
    assert.equal(payout.body.data.transaction.type, "payout");
    assert.match(payout.body.data.notice, /No bank transfer/);

    const payouts = await requestJson(baseUrl, "/api/payouts", { headers: supplierHeaders });
    assert.equal(payouts.response.status, 200);
    assert.equal(payouts.body.count, 1);

    const refund = await requestJson(baseUrl, "/api/payments/refund-placeholder", {
      method: "POST",
      headers: customerHeaders,
      body: { transaction_id: transactionId },
    });
    assert.equal(refund.response.status, 202);
    assert.match(refund.body.data.notice, /No refund/);

    const auditActions = database.table("audit_logs").map((entry) => entry.action);
    assert.ok(auditActions.includes("payments.simulated"));
    assert.ok(auditActions.includes("payouts.simulated_requested"));
    assert.ok(auditActions.includes("payments.refund_placeholder_requested"));
  });
});

test("payment API blocks unauthorized actions, missing resources, and uncredentialed providers", async () => {
  const { app } = await createTestApp({ seeded: true });
  await withServer(app.handler, async (baseUrl) => {
    const unauthenticated = await requestJson(baseUrl, "/api/payments/simulate", {
      method: "POST",
      body: { booking_id: "booking-demo-approved" },
    });
    assert.equal(unauthenticated.response.status, 401);

    const wrongCustomer = await requestJson(baseUrl, "/api/payments/simulate", {
      method: "POST",
      headers: { "x-user-role": "customer", "x-user-id": "other-customer" },
      body: { booking_id: "booking-demo-approved" },
    });
    assert.equal(wrongCustomer.response.status, 403);

    const missingTransaction = await requestJson(baseUrl, "/api/transactions/not-real", { headers: customerHeaders });
    assert.equal(missingTransaction.response.status, 404);

    const invalidRefund = await requestJson(baseUrl, "/api/payments/refund-placeholder", {
      method: "POST",
      headers: customerHeaders,
      body: {},
    });
    assert.equal(invalidRefund.response.status, 400);
  });

  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  await runSeeds(database);
  const providerApp = createApp({
    database,
    env: {
      PAYMENT_PROVIDER: "stripe",
      PAYMENT_MODE: "provider",
      PAYMENT_PUBLIC_KEY: "",
      PAYMENT_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
    },
  });
  await withServer(providerApp.handler, async (baseUrl) => {
    const blocked = await requestJson(baseUrl, "/api/payments/intent", {
      method: "POST",
      headers: customerHeaders,
      body: { booking_id: "booking-demo-approved" },
    });
    assert.equal(blocked.response.status, 400);
    assert.equal(blocked.body.error, "payment_provider_not_ready");
  });
});

test("validation failures return controlled 400 responses", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      headers: supplierHeaders,
      body: { title: "Missing category and owner" },
    });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error, "validation_error");
    assert.ok(result.body.details.some((detail) => detail.field === "owner_id"));

    const inspectionResult = await requestJson(baseUrl, "/api/inspections", {
      method: "POST",
      headers: customerHeaders,
      body: { booking_id: "booking-demo-approved", type: "check-in" },
    });
    assert.equal(inspectionResult.response.status, 400);
    assert.equal(inspectionResult.body.error, "validation_error");
    assert.ok(inspectionResult.body.details.some((detail) => detail.field === "asset_id"));

    const messageResult = await requestJson(baseUrl, "/api/messages", {
      method: "POST",
      headers: customerHeaders,
      body: { thread_id: "thread-missing-body", sender_id: "customer-demo" },
    });
    assert.equal(messageResult.response.status, 400);
    assert.equal(messageResult.body.error, "validation_error");

    const notificationResult = await requestJson(baseUrl, "/api/notifications", {
      method: "POST",
      headers: customerHeaders,
      body: { user_id: "customer-demo", type: "general" },
    });
    assert.equal(notificationResult.response.status, 400);
    assert.equal(notificationResult.body.error, "validation_error");

    const reviewResult = await requestJson(baseUrl, "/api/reviews", {
      method: "POST",
      headers: customerHeaders,
      body: { booking_id: "booking-demo-approved", rating: 6, title: "", comment: "" },
    });
    assert.equal(reviewResult.response.status, 400);
    assert.equal(reviewResult.body.error, "validation_error");

    const trustResult = await requestJson(baseUrl, "/api/trust/unknown", { headers: customerHeaders });
    assert.equal(trustResult.response.status, 400);
    assert.equal(trustResult.body.error, "validation_error");
  });
});

test("protected write operations require simulated authenticated user context", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const unauthenticated = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      body: { owner_id: "supplier-demo", title: "Asset", category: "cars", listing_type: "rental" },
    });
    assert.equal(unauthenticated.response.status, 401);

    const forbidden = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      headers: customerHeaders,
      body: { owner_id: "supplier-demo", title: "Asset", category: "cars", listing_type: "rental" },
    });
    assert.equal(forbidden.response.status, 403);

    const inspectionUnauthenticated = await requestJson(baseUrl, "/api/inspections", {
      method: "POST",
      body: { booking_id: "booking-demo-approved", asset_id: "asset-demo-excavator", type: "check-in", condition_status: "good" },
    });
    assert.equal(inspectionUnauthenticated.response.status, 401);

    const messageUnauthenticated = await requestJson(baseUrl, "/api/messages", {
      method: "POST",
      body: { thread_id: "thread-one", sender_id: "customer-demo", body: "Hello" },
    });
    assert.equal(messageUnauthenticated.response.status, 401);

    const notificationUnauthenticated = await requestJson(baseUrl, "/api/notifications", {
      method: "POST",
      body: { user_id: "customer-demo", type: "general", title: "Hello" },
    });
    assert.equal(notificationUnauthenticated.response.status, 401);

    const reviewUnauthenticated = await requestJson(baseUrl, "/api/reviews", {
      method: "POST",
      body: { booking_id: "booking-demo-approved", asset_id: "asset-demo-excavator", supplier_id: "supplier-demo", customer_id: "customer-demo", reviewer_id: "customer-demo", rating: 5, title: "Title", comment: "Comment" },
    });
    assert.equal(reviewUnauthenticated.response.status, 401);

    const trustUnauthenticated = await requestJson(baseUrl, "/api/trust/recalculate/supplier/supplier-demo", {
      method: "PATCH",
      body: { entity_type: "supplier", entity_id: "supplier-demo" },
    });
    assert.equal(trustUnauthenticated.response.status, 401);

    const trustForbidden = await requestJson(baseUrl, "/api/trust/recalculate/supplier/supplier-demo", {
      method: "PATCH",
      headers: customerHeaders,
      body: { entity_type: "supplier", entity_id: "supplier-demo" },
    });
    assert.equal(trustForbidden.response.status, 403);
  });
});

test("missing resources return controlled 404 responses", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/assets/not-real");
    assert.equal(result.response.status, 404);
    assert.equal(result.body.error, "not_found");

    const inspection = await requestJson(baseUrl, "/api/inspections/not-real", { headers: customerHeaders });
    assert.equal(inspection.response.status, 404);
    assert.equal(inspection.body.error, "not_found");

    const message = await requestJson(baseUrl, "/api/messages/not-real", { headers: customerHeaders });
    assert.equal(message.response.status, 404);
    assert.equal(message.body.error, "not_found");

    const notification = await requestJson(baseUrl, "/api/notifications/not-real", { headers: customerHeaders });
    assert.equal(notification.response.status, 404);
    assert.equal(notification.body.error, "not_found");

    const review = await requestJson(baseUrl, "/api/reviews/not-real", { headers: customerHeaders });
    assert.equal(review.response.status, 404);
    assert.equal(review.body.error, "not_found");

    const trust = await requestJson(baseUrl, "/api/trust/asset/not-real", { headers: customerHeaders });
    assert.equal(trust.response.status, 404);
    assert.equal(trust.body.error, "not_found");
  });
});
