import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  API_MODE_NOT_IMPLEMENTED_MESSAGE,
  DATA_MODES,
  ASSET_API_PILOT_NOTICE,
  AssetApiError,
  BOOKING_API_PILOT_NOTICE,
  BookingApiError,
  INSPECTION_API_PILOT_NOTICE,
  InspectionApiError,
  MESSAGE_API_PILOT_NOTICE,
  MessageApiError,
  NOTIFICATION_API_PILOT_NOTICE,
  NotificationApiError,
  REVIEW_API_PILOT_NOTICE,
  ReviewApiError,
  TRUST_API_PILOT_NOTICE,
  TrustApiError,
  PROTECTION_API_PILOT_NOTICE,
  ProtectionApiError,
  DISPUTE_API_PILOT_NOTICE,
  DisputeApiError,
  PAYMENT_API_PILOT_NOTICE,
  PaymentApiError,
  BEARER_AUTH_MIGRATION_NOTICE,
  apiPilotAuthHeaders,
  assetAdapter,
  bookingAdapter,
  frontendAdapters,
  inspectionAdapter,
  marketplaceAdapter,
  messageAdapter,
  notificationAdapter,
  normalizeDataMode,
  paymentAdapter,
  protectionAdapter,
  reviewAdapter,
  supplierAdapter,
  trustAdapter,
  disputeAdapter,
} from "../../src/lib/adapters/index.js";
import { API_CONFIG } from "../../src/lib/apiClient.js";
import { SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { SEED_BOOKINGS } from "../../src/lib/bookingService.js";
import { writeApiTokenPlaceholder } from "../../src/lib/authSession.js";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

test("frontend adapter files and data mode configuration exist", () => {
  for (const file of [
    "src/lib/adapters/assetAdapter.js",
    "src/lib/adapters/bookingAdapter.js",
    "src/lib/adapters/inspectionAdapter.js",
    "src/lib/adapters/reviewAdapter.js",
    "src/lib/adapters/paymentAdapter.js",
    "src/lib/adapters/messageAdapter.js",
    "src/lib/adapters/notificationAdapter.js",
    "src/lib/adapters/supplierAdapter.js",
    "src/lib/adapters/marketplaceAdapter.js",
    "src/lib/adapters/trustAdapter.js",
    "src/lib/adapters/protectionAdapter.js",
    "src/lib/adapters/disputeAdapter.js",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
  assert.match(read(".env.example"), /VITE_DATA_MODE=local/);
  assert.equal(normalizeDataMode("api"), DATA_MODES.API);
  assert.equal(normalizeDataMode("unexpected"), DATA_MODES.LOCAL);
});

test("adapter registry exposes required domain adapters", () => {
  assert.equal(frontendAdapters.assets, assetAdapter);
  assert.equal(frontendAdapters.bookings, bookingAdapter);
  assert.equal(frontendAdapters.inspections, inspectionAdapter);
  assert.equal(frontendAdapters.messages, messageAdapter);
  assert.equal(frontendAdapters.notifications, notificationAdapter);
  assert.equal(frontendAdapters.reviews, reviewAdapter);
  assert.equal(frontendAdapters.payments, paymentAdapter);
  assert.equal(frontendAdapters.suppliers, supplierAdapter);
  assert.equal(frontendAdapters.marketplace, marketplaceAdapter);
  assert.equal(frontendAdapters.trust, trustAdapter);
  assert.equal(frontendAdapters.protection, protectionAdapter);
  assert.equal(frontendAdapters.disputes, disputeAdapter);
});

test("API pilot auth headers prefer bearer token and fall back to development role headers", () => {
  const storage = createMemoryStorage();
  writeApiTokenPlaceholder(storage, "adapter-bearer-token");

  assert.deepEqual(apiPilotAuthHeaders({ id: "customer-demo", role: "customer" }, { storage }), {
    authorization: "Bearer adapter-bearer-token",
  });
  assert.deepEqual(apiPilotAuthHeaders({ id: "customer-demo", role: "customer" }, { storage, bearerAuth: false }), {
    "x-user-role": "customer",
    "x-user-id": "customer-demo",
  });
  assert.deepEqual(apiPilotAuthHeaders({ id: "customer-demo", role: "customer" }, { devAuth: false }), {});
  assert.match(BEARER_AUTH_MIGRATION_NOTICE, /prefer backend bearer auth/);
});

test("local mode adapters use existing localStorage repository services", () => {
  const storage = createMemoryStorage();
  const asset = {
    id: "adapter-asset-1",
    ownerSupplierId: "supplier-demo",
    title: "Adapter test trailer",
    category: "trailers",
    listingType: "rental",
  };
  const booking = {
    id: "adapter-booking-1",
    assetId: asset.id,
    customerId: "customer-demo",
    supplierId: "supplier-demo",
    status: "approved",
  };

  assetAdapter.forMode("local").saveAll(storage, [asset]);
  bookingAdapter.forMode("local").saveAll(storage, [booking]);

  assert.equal(assetAdapter.forMode("local").getById(storage, asset.id).title, "Adapter test trailer");
  assert.equal(assetAdapter.list(storage).length, 1);
  assert.equal(bookingAdapter.forMode("local").getById(storage, booking.id).status, "approved");
  assert.equal(bookingAdapter.list(storage).length, 1);
});

test("local mode inspection adapter supports list, detail, create, and review", () => {
  const storage = createMemoryStorage();
  const booking = {
    ...SEED_BOOKINGS[0],
    id: "adapter-inspection-booking",
    assetId: SEED_LISTINGS[0].id,
    assetTitle: SEED_LISTINGS[0].title,
    customerId: "review-customer",
    supplierId: SEED_LISTINGS[0].ownerSupplierId,
    status: "approved",
    paymentStatus: "paid",
  };
  assetAdapter.forMode("local").saveAll(storage, [SEED_LISTINGS[0]]);
  bookingAdapter.forMode("local").saveAll(storage, [booking]);

  const created = inspectionAdapter.forMode("local").submit(storage, {
    type: "check-in",
    user: { id: "review-customer", role: "customer" },
    booking,
    listing: SEED_LISTINGS[0],
    input: {
      conditionStatus: "good",
      checklist: { "Exterior condition checked": true },
      photos: [],
      fuelBatteryLevel: "80%",
      odometer: "12000",
      engineHours: "",
      accessoriesIncluded: "Keys and charger",
      missingAccessories: "",
      customerNotes: "Looks good.",
      damageNotes: "",
      locationLabel: "Supplier yard",
    },
  });

  assert.equal(created.valid, true);
  assert.equal(inspectionAdapter.forMode("local").getById(storage, created.inspection.id).bookingId, booking.id);
  assert.equal(inspectionAdapter.forMode("local").listByBooking(storage, booking.id).length, 1);
  const reviewed = inspectionAdapter.forMode("local").review(storage, created.inspection.id, "accepted", { id: SEED_LISTINGS[0].ownerSupplierId, role: "supplier" }, "Accepted.");
  assert.equal(reviewed.valid, true);
  assert.equal(reviewed.inspection.supplierReview.status, "accepted");
});

test("local mode message and notification adapters keep existing workflows", () => {
  const storage = createMemoryStorage();
  const booking = {
    ...SEED_BOOKINGS[0],
    id: "adapter-message-booking",
    assetId: SEED_LISTINGS[0].id,
    assetTitle: SEED_LISTINGS[0].title,
    customerId: "review-customer",
    customerName: "Review Customer",
    supplierId: SEED_LISTINGS[0].ownerSupplierId,
    supplierName: "Review Supplier",
  };
  const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
  assetAdapter.forMode("local").saveAll(storage, [SEED_LISTINGS[0]]);
  bookingAdapter.forMode("local").saveAll(storage, [booking]);

  const thread = messageAdapter.forMode("local").ensureBookingThread(storage, booking, SEED_LISTINGS[0]);
  const sent = messageAdapter.forMode("local").send(storage, { threadId: thread.id, user: customer, body: "Adapter message" });
  const notification = notificationAdapter.forMode("local").create(storage, {
    recipientId: customer.id,
    type: "general",
    title: "Adapter notification",
    body: "Hello",
    relatedRoute: "/messages",
  });

  assert.equal(sent.valid, true);
  assert.equal(messageAdapter.forMode("local").listVisibleThreads(storage, customer).length, 1);
  assert.equal(messageAdapter.forMode("local").listThreadMessages(storage, thread.id).some((message) => message.body === "Adapter message"), true);
  assert.equal(notificationAdapter.forMode("local").listByUser(storage, customer.id).length, 1);
  assert.equal(notificationAdapter.forMode("local").markRead(storage, notification.id, customer.id), true);
  assert.equal(notificationAdapter.forMode("local").markAllRead(storage, customer.id).every((item) => item.read), true);
});

test("local mode review adapter keeps review submission, summaries, and supplier response", () => {
  const storage = createMemoryStorage();
  const booking = {
    ...SEED_BOOKINGS[0],
    id: "adapter-review-booking",
    assetId: SEED_LISTINGS[0].id,
    supplierId: SEED_LISTINGS[0].ownerSupplierId,
    customerId: "review-customer",
    customerName: "Review Customer",
    status: "completed",
  };
  const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
  const supplier = { id: SEED_LISTINGS[0].ownerSupplierId, role: "supplier" };
  assetAdapter.forMode("local").saveAll(storage, [SEED_LISTINGS[0]]);
  bookingAdapter.forMode("local").saveAll(storage, [booking]);

  const result = reviewAdapter.forMode("local").submit(storage, {
    user: customer,
    booking,
    input: { rating: 5, title: "Great", comment: "Smooth rental.", reviewType: "asset" },
  });
  assert.equal(result.valid, true);
  assert.equal(reviewAdapter.forMode("local").listPublishedForAsset(storage, SEED_LISTINGS[0].id).length, 1);
  assert.equal(reviewAdapter.forMode("local").getAssetRatingSummary(storage, SEED_LISTINGS[0].id).average, 5);
  const responded = reviewAdapter.forMode("local").respond(storage, result.review.id, supplier, "Thank you.");
  assert.equal(responded.valid, true);
  assert.equal(responded.review.supplierResponse.body, "Thank you.");
});

test("local mode trust adapter keeps scores, risk queue, summaries, and ranking", () => {
  const storage = createMemoryStorage();
  const listing = { ...SEED_LISTINGS[0], id: "trust-local-asset", ownerSupplierId: SEED_LISTINGS[0].ownerSupplierId, verificationStatus: "verified" };
  assetAdapter.forMode("local").saveAll(storage, [listing]);
  bookingAdapter.forMode("local").saveAll(storage, [{
    ...SEED_BOOKINGS[0],
    id: "trust-local-booking",
    assetId: listing.id,
    supplierId: listing.ownerSupplierId,
    customerId: "customer-demo",
    status: "completed",
  }]);

  const supplier = trustAdapter.forMode("local").supplierScore(storage, listing.ownerSupplierId);
  const customer = trustAdapter.forMode("local").customerScore(storage, "customer-demo");
  const asset = trustAdapter.forMode("local").assetScore(storage, listing.id);
  const summary = trustAdapter.forMode("local").summaryForListing(storage, listing);
  const ranked = trustAdapter.forMode("local").rankListings(storage, [listing]);

  assert.equal(supplier.entityType, "supplier");
  assert.equal(customer.entityType, "customer");
  assert.equal(asset.entityType, "asset");
  assert.equal(summary.asset.entityId, listing.id);
  assert.equal(ranked[0].id, listing.id);
  assert.equal(Array.isArray(trustAdapter.forMode("local").riskQueue(storage)), true);
});

test("local mode protection adapter keeps plans, booking selection, and claims", () => {
  const storage = createMemoryStorage();
  const listing = { ...SEED_LISTINGS[0], ownerSupplierId: "supplier-demo" };
  const booking = {
    ...SEED_BOOKINGS[0],
    id: "adapter-protection-booking",
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: "customer-demo",
    supplierId: "supplier-demo",
    status: "approved",
    paymentStatus: "not_active",
    estimatedCost: 10000,
    estimatedDuration: 1,
  };
  assetAdapter.forMode("local").saveAll(storage, [listing]);
  bookingAdapter.forMode("local").saveAll(storage, [booking]);

  const plans = protectionAdapter.forMode("local").listPlans();
  const selected = protectionAdapter.forMode("local").selectBookingProtection(storage, {
    user: { id: "customer-demo", role: "customer" },
    bookingId: booking.id,
    planIds: [plans[0].id],
  });
  const claim = protectionAdapter.forMode("local").submitClaim(storage, {
    user: { id: "customer-demo", role: "customer" },
    bookingId: booking.id,
    input: { claimType: "damage", description: "Adapter claim test." },
  });

  assert.equal(plans.length > 0, true);
  assert.equal(selected.valid, true);
  assert.equal(claim.valid, true);
  assert.equal(protectionAdapter.forMode("local").getClaimById(storage, claim.claim.id).id, claim.claim.id);
});

test("local mode dispute adapter keeps open list detail and admin status update", () => {
  const storage = createMemoryStorage();
  const listing = { ...SEED_LISTINGS[0], ownerSupplierId: "supplier-demo" };
  const booking = {
    ...SEED_BOOKINGS[0],
    id: "adapter-dispute-booking",
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: "customer-demo",
    supplierId: "supplier-demo",
    status: "completed",
  };
  assetAdapter.forMode("local").saveAll(storage, [listing]);
  bookingAdapter.forMode("local").saveAll(storage, [booking]);

  const opened = disputeAdapter.forMode("local").open(storage, {
    user: { id: "customer-demo", role: "customer" },
    bookingId: booking.id,
    input: { reason: "damage", summary: "Damage found during return." },
  });
  assert.equal(opened.valid, true);
  assert.equal(disputeAdapter.forMode("local").listVisible(storage, { id: "customer-demo", role: "customer" }).length, 1);
  assert.equal(disputeAdapter.forMode("local").getById(storage, opened.dispute.id).summary, "Damage found during return.");

  const updated = disputeAdapter.forMode("local").adminUpdateStatus(storage, opened.dispute.id, "under_review", { id: "admin-demo", role: "admin" }, "Reviewing evidence.");
  assert.equal(updated.valid, true);
  assert.equal(updated.dispute.status, "under_review");
});

test("local mode asset adapter supports list, detail, create, and edit", () => {
  const storage = createMemoryStorage();
  const seed = { ...SEED_LISTINGS[0], id: "adapter-created-asset", title: "Adapter created skid steer" };
  const created = assetAdapter.forMode("local").upsert(storage, seed);
  assert.equal(created.valid, true);
  assert.equal(assetAdapter.forMode("local").getById(storage, "adapter-created-asset").title, "Adapter created skid steer");

  const edited = assetAdapter.forMode("local").upsert(storage, { ...created.listing, title: "Adapter edited skid steer" });
  assert.equal(edited.valid, true);
  assert.equal(assetAdapter.forMode("local").getById(storage, "adapter-created-asset").title, "Adapter edited skid steer");
  assert.equal(assetAdapter.forMode("local").listBySupplier(storage, created.listing.ownerSupplierId).some((listing) => listing.id === created.listing.id), true);
});

test("local mode booking adapter supports list, detail, create, and update", () => {
  const storage = createMemoryStorage();
  assetAdapter.forMode("local").saveAll(storage, [SEED_LISTINGS[0]]);
  const result = bookingAdapter.forMode("local").createRequest(storage, {
    user: { id: "review-customer", full_name: "Review Customer", role: "customer" },
    listing: SEED_LISTINGS[0],
    input: {
      startDateTime: "2026-06-14T09:00",
      endDateTime: "2026-06-15T09:00",
      pickupDeliveryMethod: "pickup",
      notes: "Adapter booking test",
    },
  });

  assert.equal(result.valid, true);
  assert.equal(bookingAdapter.forMode("local").getById(storage, result.booking.id).assetId, SEED_LISTINGS[0].id);
  assert.equal(bookingAdapter.forMode("local").listByCustomer(storage, "review-customer").some((booking) => booking.id === result.booking.id), true);
  const approved = bookingAdapter.forMode("local").updateStatus(storage, result.booking.id, "approved", { id: "review-supplier", role: "supplier" });
  assert.equal(approved.valid, true);
  assert.equal(bookingAdapter.forMode("local").getById(storage, result.booking.id).status, "approved");
});

test("api mode asset list and detail use backend asset endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const data = url.endsWith("/api/assets/asset-api-1")
      ? { id: "asset-api-1", owner_id: "supplier-demo", title: "API detail asset", category: "cars", listing_type: "rental" }
      : [{ id: "asset-api-1", owner_id: "supplier-demo", title: "API list asset", category: "cars", listing_type: "rental" }];
    return {
      ok: true,
      status: 200,
      async json() {
        return Array.isArray(data) ? { data, count: data.length } : { data };
      },
    };
  };

  try {
    const listings = await assetAdapter.forMode("api").list();
    const detail = await assetAdapter.forMode("api").getById(null, "asset-api-1");

    assert.equal(listings[0].title, "API list asset");
    assert.equal(listings[0].ownerSupplierId, "supplier-demo");
    assert.equal(detail.title, "API detail asset");
    assert.equal(calls[0].url, "http://api.test/api/assets");
    assert.equal(calls[1].url, "http://api.test/api/assets/asset-api-1");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode asset create update and delete send dev-authenticated backend requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    const idFromUrl = String(url).split("/").pop();
    return {
      ok: true,
      status: options.method === "POST" ? 201 : 200,
      async json() {
        return { data: { ...body, id: body.id || (options.method === "DELETE" ? idFromUrl : "asset-api-created") } };
      },
    };
  };

  try {
    const created = await assetAdapter.forMode("api").upsert(null, { ...SEED_LISTINGS[0], id: "" });
    const updated = await assetAdapter.forMode("api").upsert(null, { ...SEED_LISTINGS[0], id: "asset-api-created", title: "Updated API asset" });
    const deleted = await assetAdapter.forMode("api").softDelete(null, "asset-api-created", { user: { id: SEED_LISTINGS[0].ownerSupplierId, role: "supplier" } });

    assert.equal(created.valid, true);
    assert.equal(updated.valid, true);
    assert.equal(deleted.id, "asset-api-created");
    assert.equal(calls[0].url, "http://api.test/api/assets");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers["x-user-role"], "supplier");
    assert.equal(calls[0].options.headers["x-user-id"], SEED_LISTINGS[0].ownerSupplierId);
    assert.equal(calls[1].url, "http://api.test/api/assets/asset-api-created");
    assert.equal(calls[1].options.method, "PATCH");
    assert.equal(calls[2].url, "http://api.test/api/assets/asset-api-created");
    assert.equal(calls[2].options.method, "DELETE");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode asset protected write prefers stored bearer auth over development headers", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const storage = createMemoryStorage();
  const calls = [];
  writeApiTokenPlaceholder(storage, "asset-bearer-token");
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      status: 201,
      async json() {
        return { data: { ...body, id: "asset-api-bearer" } };
      },
    };
  };

  try {
    const created = await assetAdapter.forMode("api").upsert(storage, { ...SEED_LISTINGS[0], id: "" }, { storage });
    assert.equal(created.valid, true);
    assert.equal(calls[0].options.headers.authorization, "Bearer asset-bearer-token");
    assert.equal(Object.hasOwn(calls[0].options.headers, "x-user-role"), false);
    assert.equal(Object.hasOwn(calls[0].options.headers, "x-user-id"), false);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});


test("api mode asset unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => assetAdapter.forMode("api").upsert(null, SEED_LISTINGS[0], { devAuth: false }),
    (err) => err instanceof AssetApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => assetAdapter.forMode("api").list(),
    (err) => err instanceof AssetApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => assetAdapter.forMode("api").list(),
    (err) => err instanceof AssetApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode booking list and detail use backend booking endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const data = url.endsWith("/api/bookings/booking-api-1")
      ? { id: "booking-api-1", asset_id: "asset-api-1", customer_id: "customer-demo", supplier_id: "supplier-demo", status: "approved" }
      : [{ id: "booking-api-1", asset_id: "asset-api-1", customer_id: "customer-demo", supplier_id: "supplier-demo", status: "pending_supplier_approval" }];
    return {
      ok: true,
      status: 200,
      async json() {
        return Array.isArray(data) ? { data, count: data.length } : { data };
      },
    };
  };

  try {
    const bookings = await bookingAdapter.forMode("api").list(null, { user: { id: "customer-demo", role: "customer" } });
    const detail = await bookingAdapter.forMode("api").getById(null, "booking-api-1", { user: { id: "customer-demo", role: "customer" } });

    assert.equal(bookings[0].assetId, "asset-api-1");
    assert.equal(detail.status, "approved");
    assert.equal(calls[0].url, "http://api.test/api/bookings");
    assert.equal(calls[0].options.headers["x-user-role"], "customer");
    assert.equal(calls[1].url, "http://api.test/api/bookings/booking-api-1");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode booking create and update send dev-authenticated backend requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      status: options.method === "POST" ? 201 : 200,
      async json() {
        return { data: { ...body, id: body.id || "booking-api-created" } };
      },
    };
  };

  try {
    const user = { id: "review-customer", full_name: "Review Customer", role: "customer" };
    const created = await bookingAdapter.forMode("api").createRequest(null, {
      user,
      listing: SEED_LISTINGS[0],
      input: {
        startDateTime: "2026-06-16T09:00",
        endDateTime: "2026-06-17T09:00",
        pickupDeliveryMethod: "pickup",
      },
    });
    const updated = await bookingAdapter.forMode("api").updateStatus(null, "booking-api-created", "approved", { id: "review-supplier", role: "supplier" });

    assert.equal(created.valid, true);
    assert.equal(updated.valid, true);
    assert.equal(calls[0].url, "http://api.test/api/bookings");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers["x-user-role"], "customer");
    assert.equal(calls[0].options.headers["x-user-id"], "review-customer");
    assert.equal(calls[1].url, "http://api.test/api/bookings/booking-api-created");
    assert.equal(calls[1].options.method, "PATCH");
    assert.equal(calls[1].options.headers["x-user-role"], "supplier");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode booking can opt into core rental v1 journey behind feature flag", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      status: options.method === "POST" ? 201 : 200,
      async json() {
        return {
          data: {
            id: body.id || "booking-core-v1-created",
            asset_id: body.asset_id || "asset-api-1",
            customer_id: body.customer_id || "review-customer",
            supplier_id: body.supplier_id || "review-supplier",
            start_at: body.start_at || "2026-06-16T09:00",
            end_at: body.end_at || "2026-06-17T09:00",
            status: url.endsWith("/accept") ? "approved" : "pending",
            payment_status: "unpaid",
            metadata_json: JSON.stringify({ provider_status: "provider_independent_local", pricing_quote: { units: 1, subtotal: 18000 } }),
          },
        };
      },
    };
  };

  try {
    const user = { id: "review-customer", full_name: "Review Customer", role: "customer" };
    const featureOverrides = { rental_core_backend_path: true };
    const created = await bookingAdapter.forMode("api").createRequest(null, {
      user,
      listing: SEED_LISTINGS[0],
      input: {
        id: "booking-core-v1-created",
        startDateTime: "2026-06-16T09:00",
        endDateTime: "2026-06-17T09:00",
        pickupDeliveryMethod: "pickup",
      },
    }, { user, featureOverrides });
    const updated = await bookingAdapter.forMode("api").updateStatus(null, "booking-core-v1-created", "approved", { id: "review-supplier", role: "supplier" }, { featureOverrides });

    assert.equal(created.valid, true);
    assert.equal(created.coreRentalV1, true);
    assert.equal(created.booking.assetId, SEED_LISTINGS[0].id);
    assert.equal(updated.valid, true);
    assert.equal(updated.coreRentalV1, true);
    assert.equal(calls[0].url, "http://api.test/api/v1/rentals/bookings");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[1].url, "http://api.test/api/v1/rentals/bookings/booking-core-v1-created/accept");
    assert.equal(calls[1].options.method, "PATCH");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode booking unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => bookingAdapter.forMode("api").createRequest(null, {
      user: { id: "review-customer", role: "customer" },
      listing: SEED_LISTINGS[0],
      input: { startDateTime: "2026-06-16T09:00", endDateTime: "2026-06-17T09:00", pickupDeliveryMethod: "pickup" },
    }, { devAuth: false }),
    (err) => err instanceof BookingApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => bookingAdapter.forMode("api").list(null, { user: { id: "customer-demo", role: "customer" } }),
    (err) => err instanceof BookingApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => bookingAdapter.forMode("api").getById(null, "booking-api-1"),
    (err) => err instanceof BookingApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode inspection list and detail use backend inspection endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const data = url.endsWith("/api/inspections/inspection-api-1")
      ? { id: "inspection-api-1", booking_id: "booking-api-1", asset_id: "asset-api-1", type: "check-in", condition_status: "good" }
      : [{ id: "inspection-api-1", booking_id: "booking-api-1", asset_id: "asset-api-1", type: "check-in", condition_status: "good" }];
    return {
      ok: true,
      status: 200,
      async json() {
        return Array.isArray(data) ? { data, count: data.length } : { data };
      },
    };
  };

  try {
    const inspections = await inspectionAdapter.forMode("api").list(null, { user: { id: "customer-demo", role: "customer" } });
    const detail = await inspectionAdapter.forMode("api").getById(null, "inspection-api-1", { user: { id: "supplier-demo", role: "supplier" } });

    assert.equal(inspections[0].bookingId, "booking-api-1");
    assert.equal(detail.conditionStatus, "good");
    assert.equal(calls[0].url, "http://api.test/api/inspections");
    assert.equal(calls[0].options.headers["x-user-role"], "customer");
    assert.equal(calls[1].url, "http://api.test/api/inspections/inspection-api-1");
    assert.equal(calls[1].options.headers["x-user-role"], "supplier");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode inspection create and update send dev-authenticated backend requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    return {
      ok: true,
      status: options.method === "POST" ? 201 : 200,
      async json() {
        return { data: { ...body, id: body.id || (url.includes("/api/bookings/") ? "booking-api-1" : "inspection-api-created") } };
      },
    };
  };

  try {
    const user = { id: "review-customer", full_name: "Review Customer", role: "customer" };
    const booking = { ...SEED_BOOKINGS[0], id: "booking-api-1", assetId: SEED_LISTINGS[0].id, status: "approved", paymentStatus: "paid" };
    const created = await inspectionAdapter.forMode("api").submit(null, {
      type: "check-in",
      user,
      booking,
      listing: SEED_LISTINGS[0],
      input: {
        conditionStatus: "good",
        checklist: { "Exterior condition checked": true },
        photos: [],
        fuelBatteryLevel: "80%",
        odometer: "12000",
        engineHours: "",
        accessoriesIncluded: "Keys",
        missingAccessories: "",
        customerNotes: "Looks good.",
        damageNotes: "",
        locationLabel: "Supplier yard",
      },
    });
    const reviewed = await inspectionAdapter.forMode("api").review(null, "inspection-api-created", "accepted", { id: "review-supplier", role: "supplier" }, "Accepted.");

    assert.equal(created.valid, true);
    assert.equal(reviewed.valid, true);
    assert.equal(calls[0].url, "http://api.test/api/inspections");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers["x-user-role"], "customer");
    assert.equal(calls[0].options.headers["x-user-id"], "review-customer");
    assert.equal(calls[1].url, "http://api.test/api/bookings/booking-api-1");
    assert.equal(calls[1].options.method, "PATCH");
    assert.equal(calls[2].url, "http://api.test/api/inspections/inspection-api-created");
    assert.equal(calls[2].options.method, "PATCH");
    assert.equal(calls[2].options.headers["x-user-role"], "supplier");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode inspection unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => inspectionAdapter.forMode("api").review(null, "inspection-api-1", "accepted", { id: "review-supplier", role: "supplier" }, "Accepted.", { devAuth: false }),
    (err) => err instanceof InspectionApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => inspectionAdapter.forMode("api").list(null, { user: { id: "customer-demo", role: "customer" } }),
    (err) => err instanceof InspectionApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => inspectionAdapter.forMode("api").getById(null, "inspection-api-1"),
    (err) => err instanceof InspectionApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode messages list detail create and update use backend endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (options.method === "POST" && body.kind === "thread") {
      return { ok: true, status: 201, async json() { return { thread: { id: "thread-api-1", booking_id: body.booking_id, asset_id: body.asset_id, customer_id: body.customer_id, supplier_id: body.supplier_id, participant_ids_json: JSON.stringify(body.participants || []), unread_by_json: "{}" } }; } };
    }
    if (options.method === "POST") {
      return { ok: true, status: 201, async json() { return { message: { id: "message-api-1", thread_id: body.thread_id, sender_id: body.sender_id, sender_role: body.sender_role, body: body.body }, thread: { id: body.thread_id, participant_ids_json: "[]", unread_by_json: "{}" } }; } };
    }
    if (options.method === "PATCH") {
      return { ok: true, status: 200, async json() { return { thread: { id: "thread-api-1", participant_ids_json: "[]", unread_by_json: "{}" } }; } };
    }
    if (url.endsWith("/api/messages/thread-api-1")) {
      return { ok: true, status: 200, async json() { return { thread: { id: "thread-api-1", participant_ids_json: "[]", unread_by_json: "{}" }, messages: [{ id: "message-api-1", thread_id: "thread-api-1", sender_id: "customer-demo", body: "Hello" }] }; } };
    }
    return { ok: true, status: 200, async json() { return { data: [{ id: "thread-api-1", participant_ids_json: "[]", unread_by_json: "{}" }], count: 1 }; } };
  };

  try {
    const user = { id: "customer-demo", role: "customer" };
    const threads = await messageAdapter.forMode("api").listVisibleThreads(null, user, { user });
    const detail = await messageAdapter.forMode("api").getThread(null, "thread-api-1", { user });
    const messages = await messageAdapter.forMode("api").listThreadMessages(null, "thread-api-1", { user });
    const ensured = await messageAdapter.forMode("api").ensureBookingThread(null, { ...SEED_BOOKINGS[0], id: "booking-api-1" }, SEED_LISTINGS[0], { user });
    const sent = await messageAdapter.forMode("api").send(null, { threadId: "thread-api-1", user, body: "Hello" }, { user });
    await messageAdapter.forMode("api").markRead(null, "thread-api-1", user, { user });

    assert.equal(threads[0].id, "thread-api-1");
    assert.equal(detail.id, "thread-api-1");
    assert.equal(messages[0].body, "Hello");
    assert.equal(ensured.id, "thread-api-1");
    assert.equal(sent.valid, true);
    assert.equal(calls[0].url, "http://api.test/api/messages");
    assert.equal(calls[0].options.headers["x-user-role"], "customer");
    assert.equal(calls.some((call) => call.url === "http://api.test/api/messages/thread-api-1" && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode notifications list detail create and update use backend endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (options.method === "POST") {
      return { ok: true, status: 201, async json() { return { data: { id: "note-api-1", ...body } }; } };
    }
    if (options.method === "PATCH" && url.endsWith("/api/notifications/all")) {
      return { ok: true, status: 200, async json() { return { data: [{ id: "note-api-1", user_id: "customer-demo", title: "Read", read_at: "now" }] }; } };
    }
    if (options.method === "PATCH") {
      return { ok: true, status: 200, async json() { return { data: { id: "note-api-1", user_id: "customer-demo", title: "Read", read_at: "now" } }; } };
    }
    if (url.endsWith("/api/notifications/note-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "note-api-1", user_id: "customer-demo", title: "Detail" } }; } };
    }
    return { ok: true, status: 200, async json() { return { data: [{ id: "note-api-1", user_id: "customer-demo", title: "List" }], count: 1 }; } };
  };

  try {
    const user = { id: "customer-demo", role: "customer" };
    const notifications = await notificationAdapter.forMode("api").listByUser(null, user.id, { user });
    const detail = await notificationAdapter.forMode("api").getById(null, "note-api-1", { user });
    const created = await notificationAdapter.forMode("api").create(null, { recipientId: user.id, type: "general", title: "Created", body: "Hello" }, { user });
    const marked = await notificationAdapter.forMode("api").markRead(null, "note-api-1", user.id, { user });
    const allRead = await notificationAdapter.forMode("api").markAllRead(null, user.id, { user });

    assert.equal(notifications[0].id, "note-api-1");
    assert.equal(detail.title, "Detail");
    assert.equal(created.title, "Created");
    assert.equal(marked, true);
    assert.equal(allRead[0].read, true);
    assert.equal(calls[0].url, "http://api.test/api/notifications");
    assert.equal(calls[0].options.headers["x-user-role"], "customer");
    assert.equal(calls.some((call) => call.url === "http://api.test/api/notifications/all" && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode communication unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => messageAdapter.forMode("api").send(null, { threadId: "thread-api-1", user: { id: "customer-demo", role: "customer" }, body: "Hello" }, { devAuth: false }),
    (err) => err instanceof MessageApiError && err.code === "unauthorized",
  );
  await assert.rejects(
    () => notificationAdapter.forMode("api").create(null, { recipientId: "customer-demo", type: "general", title: "Hello" }, { devAuth: false }),
    (err) => err instanceof NotificationApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => messageAdapter.forMode("api").listVisibleThreads(null, { id: "customer-demo", role: "customer" }),
    (err) => err instanceof MessageApiError && err.code === "backend_unavailable",
  );
  await assert.rejects(
    () => notificationAdapter.forMode("api").listByUser(null, "customer-demo", { user: { id: "customer-demo", role: "customer" } }),
    (err) => err instanceof NotificationApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => messageAdapter.forMode("api").getThread(null, "thread-api-1"),
    (err) => err instanceof MessageApiError && err.code === "backend_unavailable",
  );
  await assert.rejects(
    () => notificationAdapter.forMode("api").getById(null, "note-api-1"),
    (err) => err instanceof NotificationApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode reviews list detail create response and summaries use backend endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (options.method === "POST") {
      return { ok: true, status: 201, async json() { return { data: { id: "review-api-1", ...body, status: "published" } }; } };
    }
    if (options.method === "PATCH") {
      return { ok: true, status: 200, async json() { return { data: { id: "review-api-1", booking_id: "booking-api-1", asset_id: "asset-api-1", supplier_id: "supplier-demo", customer_id: "customer-demo", reviewer_id: "customer-demo", rating: 5, title: "Great", comment: "Smooth", review_type: "asset", status: "published", supplier_response: body.supplier_response } }; } };
    }
    if (url.endsWith("/api/reviews/review-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "review-api-1", asset_id: "asset-api-1", supplier_id: "supplier-demo", customer_id: "customer-demo", reviewer_id: "customer-demo", rating: 5, title: "Detail", comment: "Smooth", review_type: "asset", status: "published" } }; } };
    }
    return { ok: true, status: 200, async json() { return { data: [{ id: "review-api-1", asset_id: "asset-api-1", supplier_id: "supplier-demo", customer_id: "customer-demo", reviewer_id: "customer-demo", rating: 5, title: "List", comment: "Smooth", review_type: "asset", status: "published" }], count: 1 }; } };
  };

  try {
    const customer = { id: "customer-demo", role: "customer" };
    const supplier = { id: "supplier-demo", role: "supplier" };
    const booking = { ...SEED_BOOKINGS[0], id: "booking-api-1", assetId: "asset-api-1", supplierId: "supplier-demo", customerId: "customer-demo", status: "completed" };
    const visible = await reviewAdapter.forMode("api").listVisible(null, customer, { user: customer });
    const assetReviews = await reviewAdapter.forMode("api").listPublishedForAsset(null, "asset-api-1", { user: customer });
    const summary = await reviewAdapter.forMode("api").getAssetRatingSummary(null, "asset-api-1", { user: customer });
    const detail = await reviewAdapter.forMode("api").getById(null, "review-api-1", { user: customer });
    const created = await reviewAdapter.forMode("api").submit(null, { user: customer, booking, input: { rating: 5, title: "Great", comment: "Smooth", reviewType: "asset" } }, { user: customer });
    const responded = await reviewAdapter.forMode("api").respond(null, "review-api-1", supplier, "Thank you.", { user: supplier });

    assert.equal(visible[0].id, "review-api-1");
    assert.equal(assetReviews[0].assetId, "asset-api-1");
    assert.equal(summary.average, 5);
    assert.equal(detail.title, "Detail");
    assert.equal(created.valid, true);
    assert.equal(responded.review.supplierResponse.body, "Thank you.");
    assert.equal(calls.some((call) => call.url === "http://api.test/api/reviews?visible=me"), true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/reviews?asset_id=asset-api-1"), true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/reviews/review-api-1" && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode review unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => reviewAdapter.forMode("api").submit(null, {
      user: { id: "customer-demo", role: "customer" },
      booking: { id: "booking-api-1", assetId: "asset-api-1", supplierId: "supplier-demo", customerId: "customer-demo" },
      input: { rating: 5, title: "Great", comment: "Smooth", reviewType: "asset" },
    }, { devAuth: false }),
    (err) => err instanceof ReviewApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => reviewAdapter.forMode("api").listPublishedForAsset(null, "asset-api-1"),
    (err) => err instanceof ReviewApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => reviewAdapter.forMode("api").getById(null, "review-api-1"),
    (err) => err instanceof ReviewApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode trust supplier customer asset risk queue ranking and recalculation use backend endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  const score = (entityType, entityId, value = 82) => ({ entityType, entityId, score: value, riskLevel: "low", badges: [], flags: [], inputs: {}, version: "api-pilot-v1" });
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/api/trust/risk-queue")) {
      return { ok: true, status: 200, async json() { return { data: [score("supplier", "supplier-demo", 45)], count: 1 }; } };
    }
    if (url.includes("/api/trust/recalculate/")) {
      return { ok: true, status: 200, async json() { return { data: score("supplier", "supplier-demo", 82) }; } };
    }
    if (url.endsWith("/api/trust/supplier")) {
      return { ok: true, status: 200, async json() { return { data: [score("supplier", "supplier-demo", 82)], count: 1 }; } };
    }
    if (url.endsWith("/api/trust/customer")) {
      return { ok: true, status: 200, async json() { return { data: [score("customer", "customer-demo", 78)], count: 1 }; } };
    }
    if (url.endsWith("/api/trust/asset")) {
      return { ok: true, status: 200, async json() { return { data: [score("asset", "asset-api-1", 88)], count: 1 }; } };
    }
    if (url.endsWith("/api/trust/supplier/supplier-demo")) {
      return { ok: true, status: 200, async json() { return { data: score("supplier", "supplier-demo", 82) }; } };
    }
    if (url.endsWith("/api/trust/customer/customer-demo")) {
      return { ok: true, status: 200, async json() { return { data: score("customer", "customer-demo", 78) }; } };
    }
    if (url.endsWith("/api/trust/asset/asset-low")) {
      return { ok: true, status: 200, async json() { return { data: score("asset", "asset-low", 35) }; } };
    }
    return { ok: true, status: 200, async json() { return { data: score("asset", "asset-api-1", 88) }; } };
  };

  try {
    const user = { id: "customer-demo", role: "customer" };
    const admin = { id: "admin-demo", role: "admin" };
    const overview = await trustAdapter.forMode("api").overview(null, { user });
    const supplier = await trustAdapter.forMode("api").supplierScore(null, "supplier-demo", { user });
    const customer = await trustAdapter.forMode("api").customerScore(null, "customer-demo", { user });
    const asset = await trustAdapter.forMode("api").assetScore(null, "asset-api-1", { user });
    const queue = await trustAdapter.forMode("api").riskQueue(null, { user: admin });
    const ranked = await trustAdapter.forMode("api").rankListings(null, [{ id: "asset-low" }, { id: "asset-api-1" }], { user });
    const recalculated = await trustAdapter.forMode("api").recalculate(null, "supplier", "supplier-demo", admin, { user: admin });

    assert.equal(overview.suppliers[0].entityId, "supplier-demo");
    assert.equal(supplier.score, 82);
    assert.equal(customer.entityType, "customer");
    assert.equal(asset.entityType, "asset");
    assert.equal(queue[0].riskLevel, "low");
    assert.equal(ranked[0].id, "asset-api-1");
    assert.equal(recalculated.entityId, "supplier-demo");
    assert.equal(calls.some((call) => call.url === "http://api.test/api/trust/recalculate/supplier/supplier-demo" && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode trust unauthorized recalculation and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => trustAdapter.forMode("api").recalculate(null, "supplier", "supplier-demo", { id: "admin-demo", role: "admin" }, { devAuth: false }),
    (err) => err instanceof TrustApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => trustAdapter.forMode("api").supplierScore(null, "supplier-demo"),
    (err) => err instanceof TrustApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => trustAdapter.forMode("api").riskQueue(null, { user: { id: "admin-demo", role: "admin" } }),
    (err) => err instanceof TrustApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode protection and claims use backend endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (url.endsWith("/api/protection/plans")) {
      return { ok: true, status: 200, async json() { return { data: [{ id: "plan-api-1", name: "API Damage Waiver", type: "damage_waiver", priceValue: 0.08, status: "active" }], count: 1 }; } };
    }
    if (url.endsWith("/api/protection/plans/plan-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "plan-api-1", name: "API Damage Waiver", type: "damage_waiver", priceValue: 0.08, status: "active" } }; } };
    }
    if (url.endsWith("/api/protection/booking/booking-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { booking: { id: "booking-api-1", customer_id: "customer-demo" }, selections: [{ id: "selection-api-1", booking_id: "booking-api-1", plan_id: body.plan_ids?.[0] || "plan-api-1", fee_amount: 100 }], protectionCost: 100 } }; } };
    }
    if (url.endsWith("/api/claims/claim-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "claim-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", claimType: "damage", description: "Detail claim", status: body.status || "submitted" } }; } };
    }
    if (url.endsWith("/api/admin/claims/claim-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "claim-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", claimType: "damage", description: "Admin update", status: body.status } }; } };
    }
    if (options.method === "POST" && url.endsWith("/api/claims")) {
      return { ok: true, status: 201, async json() { return { data: { id: "claim-api-1", ...body, claimType: body.claim_type, description: body.description, status: "submitted" } }; } };
    }
    return { ok: true, status: 200, async json() { return { data: [{ id: "claim-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", claimType: "damage", description: "List claim", status: "submitted" }], count: 1 }; } };
  };

  try {
    const user = { id: "customer-demo", role: "customer" };
    const admin = { id: "admin-demo", role: "admin" };
    const plans = await protectionAdapter.forMode("api").listPlans();
    const plan = await protectionAdapter.forMode("api").getPlanById("plan-api-1");
    const bookingProtection = await protectionAdapter.forMode("api").getBookingProtection(null, "booking-api-1", { user });
    const selected = await protectionAdapter.forMode("api").selectBookingProtection(null, { user, bookingId: "booking-api-1", planIds: ["plan-api-1"] }, { user });
    const claims = await protectionAdapter.forMode("api").listClaims(null, { user });
    const detail = await protectionAdapter.forMode("api").getClaimById(null, "claim-api-1", { user });
    const created = await protectionAdapter.forMode("api").submitClaim(null, { user, bookingId: "booking-api-1", booking: { id: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo" }, input: { claimType: "damage", description: "API claim." } }, { user });
    const updated = await protectionAdapter.forMode("api").adminUpdateClaimStatus(null, "claim-api-1", "under_review", admin, { user: admin });

    assert.equal(plans[0].id, "plan-api-1");
    assert.equal(plan.name, "API Damage Waiver");
    assert.equal(bookingProtection.booking.id, "booking-api-1");
    assert.equal(selected.valid, true);
    assert.equal(claims[0].id, "claim-api-1");
    assert.equal(detail.description, "Detail claim");
    assert.equal(created.valid, true);
    assert.equal(updated.claim.status, "under_review");
    assert.equal(calls.some((call) => call.url === "http://api.test/api/protection/booking/booking-api-1" && call.options.method === "PATCH"), true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/claims" && call.options.method === "POST"), true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/admin/claims/claim-api-1" && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode protection unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => protectionAdapter.forMode("api").submitClaim(null, {
      user: { id: "customer-demo", role: "customer" },
      bookingId: "booking-api-1",
      booking: { id: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo" },
      input: { claimType: "damage", description: "API claim." },
    }, { devAuth: false }),
    (err) => err instanceof ProtectionApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => protectionAdapter.forMode("api").listPlans(),
    (err) => err instanceof ProtectionApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => protectionAdapter.forMode("api").getClaimById(null, "claim-api-1"),
    (err) => err instanceof ProtectionApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode disputes use backend endpoints and prefer bearer auth", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const storage = createMemoryStorage();
  const calls = [];
  writeApiTokenPlaceholder(storage, "dispute-bearer-token");
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (url.endsWith("/api/disputes/dispute-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "dispute-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", openedBy: "customer-demo", reason: "damage", summary: "Detail dispute.", status: "submitted" } }; } };
    }
    if (url.endsWith("/api/admin/disputes/dispute-api-1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "dispute-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", openedBy: "customer-demo", reason: "damage", summary: "Admin dispute.", status: body.status, adminNotes: body.admin_notes } }; } };
    }
    if (options.method === "POST" && url.endsWith("/api/disputes")) {
      return { ok: true, status: 201, async json() { return { data: { id: "dispute-api-1", bookingId: body.booking_id, assetId: body.asset_id, customerId: body.customer_id, supplierId: body.supplier_id, openedBy: body.opened_by, reason: body.reason, summary: body.summary, status: "submitted" } }; } };
    }
    return { ok: true, status: 200, async json() { return { data: [{ id: "dispute-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", openedBy: "customer-demo", reason: "damage", summary: "List dispute.", status: "submitted" }], count: 1 }; } };
  };

  try {
    const user = { id: "customer-demo", role: "customer" };
    const admin = { id: "admin-demo", role: "admin" };
    const listed = await disputeAdapter.forMode("api").listVisible(storage, user, { storage, user });
    const detail = await disputeAdapter.forMode("api").getById(storage, "dispute-api-1", { storage, user });
    const opened = await disputeAdapter.forMode("api").open(storage, {
      user,
      bookingId: "booking-api-1",
      booking: { id: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo" },
      input: { reason: "damage", summary: "API dispute." },
    }, { storage, user });
    const adminList = await disputeAdapter.forMode("api").adminList(storage, admin, { storage, user: admin });
    const updated = await disputeAdapter.forMode("api").adminUpdateStatus(storage, "dispute-api-1", "under_review", admin, "Reviewing.", { storage, user: admin });

    assert.equal(listed[0].id, "dispute-api-1");
    assert.equal(detail.summary, "Detail dispute.");
    assert.equal(opened.valid, true);
    assert.equal(adminList[0].reason, "damage");
    assert.equal(updated.dispute.status, "under_review");
    assert.equal(calls.every((call) => call.options.headers.authorization === "Bearer dispute-bearer-token"), true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/disputes" && call.options.method === "POST"), true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/admin/disputes/dispute-api-1" && call.options.method === "PATCH"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode disputes unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => disputeAdapter.forMode("api").open(null, {
      user: { id: "customer-demo", role: "customer" },
      bookingId: "booking-api-1",
      booking: { id: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo" },
      input: { reason: "damage", summary: "API dispute." },
    }, { devAuth: false }),
    (err) => err instanceof DisputeApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => disputeAdapter.forMode("api").list(null, { user: { id: "customer-demo", role: "customer" } }),
    (err) => err instanceof DisputeApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => disputeAdapter.forMode("api").getById(null, "dispute-api-1"),
    (err) => err instanceof DisputeApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("api mode payments use backend endpoints without real provider claims", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  const transaction = { id: "txn-api-1", bookingId: "booking-api-1", assetId: "asset-api-1", customerId: "customer-demo", supplierId: "supplier-demo", type: "payment", status: "simulated_paid", rentalSubtotal: 1000, deposit: 100, platformFee: 100, supplierEarnings: 900, total: 1200, note: PAYMENT_API_PILOT_NOTICE };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/api/payments/intent")) return { ok: true, status: 200, async json() { return { data: { provider: "simulated", status: "preview_only", summary: { total: 1200 }, notice: PAYMENT_API_PILOT_NOTICE } }; } };
    if (url.endsWith("/api/payments/simulate")) return { ok: true, status: 201, async json() { return { data: { transaction, booking: { id: "booking-api-1", payment_status: "paid" }, provider: { status: "simulated_paid" } } }; } };
    if (url.endsWith("/api/wallet")) return { ok: true, status: 200, async json() { return { data: { simulatedPaid: 1200, depositsHeld: 100, platformFees: 100, transactionCount: 1 } }; } };
    if (url.endsWith("/api/earnings")) return { ok: true, status: 200, async json() { return { data: { pendingEarnings: 0, availableEarnings: 900, paidOutEarnings: 0, platformFees: 100 } }; } };
    if (url.endsWith("/api/payouts/request")) return { ok: true, status: 201, async json() { return { data: { transaction: { ...transaction, id: "payout-api-1", type: "payout", total: 900 }, notice: "Simulated payout request only." } }; } };
    if (url.endsWith("/api/payouts")) return { ok: true, status: 200, async json() { return { data: [{ ...transaction, id: "payout-api-1", type: "payout", total: 900 }], count: 1 }; } };
    if (url.endsWith("/api/transactions/txn-api-1")) return { ok: true, status: 200, async json() { return { data: transaction }; } };
    return { ok: true, status: 200, async json() { return { data: [transaction], count: 1 }; } };
  };

  try {
    const user = { id: "customer-demo", role: "customer" };
    const supplier = { id: "supplier-demo", role: "supplier" };
    const list = await paymentAdapter.forMode("api").listLedger(null, { user });
    const detail = await paymentAdapter.forMode("api").getTransaction(null, "txn-api-1", { user });
    const intent = await paymentAdapter.forMode("api").createIntent(null, { bookingId: "booking-api-1" }, { user });
    const paid = await paymentAdapter.forMode("api").createSimulatedPayment(null, { user, booking: { id: "booking-api-1" } }, { user });
    const wallet = await paymentAdapter.forMode("api").getCustomerWalletSummary(null, "customer-demo", { user });
    const earnings = await paymentAdapter.forMode("api").getSupplierEarningsSummary(null, "supplier-demo", { user: supplier });
    const payouts = await paymentAdapter.forMode("api").listPayouts(null, supplier, { user: supplier });
    const payout = await paymentAdapter.forMode("api").requestSimulatedPayout(null, supplier, { user: supplier });

    assert.equal(list[0].id, "txn-api-1");
    assert.equal(detail.total, 1200);
    assert.equal(intent.status, "preview_only");
    assert.equal(paid.valid, true);
    assert.equal(wallet.simulatedPaid, 1200);
    assert.equal(earnings.availableEarnings, 900);
    assert.equal(payouts[0].type, "payout");
    assert.equal(payout.valid, true);
    assert.equal(calls.some((call) => call.url === "http://api.test/api/payments/simulate" && call.options.method === "POST"), true);
    assert.match(PAYMENT_API_PILOT_NOTICE, /does not collect cards/);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("api mode payments unauthorized write and backend unavailable return controlled errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "unauthorized", message: "Authentication is required for this endpoint." };
    },
  });
  await assert.rejects(
    () => paymentAdapter.forMode("api").createSimulatedPayment(null, { user: { id: "customer-demo", role: "customer" }, booking: { id: "booking-api-1" } }, { devAuth: false }),
    (err) => err instanceof PaymentApiError && err.code === "unauthorized",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => paymentAdapter.forMode("api").listLedger(null, { user: { id: "customer-demo", role: "customer" } }),
    (err) => err instanceof PaymentApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => paymentAdapter.forMode("api").getTransaction(null, "txn-api-1"),
    (err) => err instanceof PaymentApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("Module 27 asset-facing pages use the asset adapter layer", () => {
  for (const file of [
    "src/pages/ListAsset.jsx",
    "src/pages/EditAsset.jsx",
    "src/pages/MyListings.jsx",
    "src/pages/AssetDetail.jsx",
    "src/pages/MarketplaceSearch.jsx",
    "src/pages/ExchangeMarketplace.jsx",
    "src/pages/MarketplaceOffer.jsx",
    "src/pages/BookingRequest.jsx",
    "src/pages/ReviewsPage.jsx",
    "src/pages/ProtectionPages.jsx",
    "src/pages/MessagesPage.jsx",
    "src/pages/AiAssistant.jsx",
  ]) {
    assert.match(read(file), /assetAdapter/, `${file} should route asset data through assetAdapter`);
  }
  for (const file of [
    "src/pages/BookingRequest.jsx",
    "src/pages/BookingDetail.jsx",
    "src/pages/CustomerBookings.jsx",
    "src/pages/SupplierRentalRequests.jsx",
  ]) {
    assert.match(read(file), /bookingAdapter/, `${file} should route booking data through bookingAdapter`);
  }
});

test("Module 29 asset API pilot is documented and limited to asset domain", () => {
  assert.match(ASSET_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Asset API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /VITE_DATA_MODE=api/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /stored bearer auth/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /local\/demo pilot fallback/);
  assert.match(read("src/pages/ListAsset.jsx"), /await Promise\.resolve\(assetAdapter\.upsert/);
  assert.match(read("src/pages/EditAsset.jsx"), /await Promise\.resolve\(assetAdapter\.upsert/);
  assert.match(read("src/pages/MarketplaceSearch.jsx"), /Promise\.resolve\(assetAdapter\.list/);
});

test("Module 30 booking API pilot is documented and limited to booking domain", () => {
  assert.match(BOOKING_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Booking API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/bookings/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /x-user-role/);
  assert.match(read("src/pages/BookingRequest.jsx"), /bookingAdapter\.createRequest/);
  assert.match(read("src/pages/BookingDetail.jsx"), /bookingAdapter\.resolveContext/);
  assert.match(read("src/pages/CustomerBookings.jsx"), /bookingAdapter\.listByCustomer/);
  assert.match(read("src/pages/SupplierRentalRequests.jsx"), /bookingAdapter\.listBySupplier/);
  assert.equal(Array.isArray(SEED_BOOKINGS), true);
});

test("Module 31 inspection API pilot is documented and limited to inspection domain", () => {
  assert.match(INSPECTION_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Inspection API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/inspections/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /inspection domain is now adapter-mediated/);
  assert.match(read("src/pages/InspectionForm.jsx"), /inspectionAdapter\.submit/);
  assert.match(read("src/pages/InspectionDetail.jsx"), /inspectionAdapter\.getContext/);
  assert.match(read("src/pages/BookingDetail.jsx"), /inspectionAdapter\.listByBooking/);
});

test("Module 32 messages and notifications API pilot is documented and adapter-mediated", () => {
  assert.match(MESSAGE_API_PILOT_NOTICE, /development pilot/);
  assert.match(NOTIFICATION_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Messages & Notifications API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/messages/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/notifications/);
  assert.match(read("src/pages/MessagesPage.jsx"), /messageAdapter\./);
  assert.match(read("src/pages/NotificationsPage.jsx"), /notificationAdapter\./);
  assert.match(read("src/components/AppShell.jsx"), /messageAdapter\.listVisibleThreads/);
  assert.match(read("src/components/AppShell.jsx"), /notificationAdapter\.listByUser/);
});

test("Module 33 reviews ratings and reputation API pilot is documented and adapter-mediated", () => {
  assert.match(REVIEW_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Reviews, Ratings & Reputation API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/reviews/);
  assert.match(read("src/pages/ReviewForm.jsx"), /reviewAdapter\.submit/);
  assert.match(read("src/pages/ReviewsPage.jsx"), /reviewAdapter\.listPublishedForAsset/);
  assert.match(read("src/pages/AssetDetail.jsx"), /reviewAdapter\.getAssetRatingSummary/);
  assert.match(read("src/components/AssetCard.jsx"), /reviewAdapter\.getAssetRatingSummary/);
});

test("Module 34 trust API pilot is documented and adapter-mediated", () => {
  assert.match(TRUST_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Trust Engine API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/trust\/supplier/);
  assert.match(read("src/pages/TrustCenter.jsx"), /trustAdapter\./);
  assert.match(read("src/pages/MarketplaceSearch.jsx"), /trustAdapter\.rankListings/);
  assert.match(read("src/pages/AssetDetail.jsx"), /trustAdapter\.summaryForListing/);
  assert.match(read("src/components/AssetCard.jsx"), /trustAdapter\.summaryForListing/);
});

test("Module 35 protection and claims API pilot is documented and adapter-mediated", () => {
  assert.match(PROTECTION_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Protection & Claims API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/protection\/plans/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/claims/);
  assert.match(read("src/pages/ProtectionPages.jsx"), /protectionAdapter\./);
});

test("Module 37 disputes API pilot is documented and adapter-mediated", () => {
  assert.match(DISPUTE_API_PILOT_NOTICE, /development pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Disputes API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/disputes/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /GET \/api\/admin\/disputes/);
  assert.match(read("src/pages/DisputePages.jsx"), /disputeAdapter\./);
  assert.match(read("src/pages/BookingDetail.jsx"), /\/disputes\/new/);
});

test("Module 38 payments API pilot is documented and adapter-mediated", () => {
  assert.match(PAYMENT_API_PILOT_NOTICE, /provider-ready but simulated/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /Payments API Mode Pilot/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /POST \/api\/payments\/simulate/);
  assert.match(read("docs/frontend-api-adapter-layer.md"), /PAYMENT_PROVIDER=stripe/);
  for (const file of ["src/pages/BookingPayment.jsx", "src/pages/PaymentsPage.jsx", "src/pages/WalletPage.jsx", "src/pages/EarningsPage.jsx", "src/pages/PayoutsPage.jsx", "src/pages/TransactionDetail.jsx"]) {
    assert.match(read(file), /paymentAdapter\./, `${file} should route payment data through paymentAdapter`);
  }
});
