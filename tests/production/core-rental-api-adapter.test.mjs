import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingAdapter } from "../../src/lib/adapters/bookingAdapter.js";
import { coreRentalApiAdapter } from "../../src/lib/adapters/coreRentalApiAdapter.js";
import { API_CONFIG } from "../../src/lib/apiClient.js";
import { generateCoreRentalLegacyMigrationPlan } from "../../src/lib/coreRentalLegacyMigration.js";

test("core rental API adapter remains behind feature flag and localStorage fallback", async () => {
  const readiness = coreRentalApiAdapter.readiness();
  assert.equal(readiness.enabled, false);
  assert.equal(readiness.status, "legacy_local_storage_fallback");
  assert.match(readiness.removalPath, /A4 persistence/);

  const quote = await coreRentalApiAdapter.quote({ asset_id: "asset-demo-excavator" });
  assert.equal(quote.enabled, false);
  assert.equal(quote.status, "legacy_local_storage_fallback");
});

test("core rental API adapter supports bounded vertical slice when feature flag is enabled", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const originalDataMode = API_CONFIG.dataMode;
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  API_CONFIG.dataMode = "api";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (url.endsWith("/api/v1/rentals/assets")) {
      return { ok: true, status: 201, async json() { return { data: { ...body, id: "asset-core-v1", version: 1 } }; } };
    }
    if (url.endsWith("/api/v1/rentals/listings/asset-core-v1/publish")) {
      return { ok: true, status: 200, async json() { return { data: { id: "asset-core-v1", version: 2, status: "published" } }; } };
    }
    if (url.endsWith("/api/v1/rentals/availability")) {
      return { ok: true, status: 200, async json() { return { data: { available: true, asset_id: body.asset_id } }; } };
    }
    if (url.endsWith("/api/v1/rentals/bookings") && options.method === "POST") {
      return { ok: true, status: 201, async json() { return { data: { id: "booking-core-v1", ...body, status: "pending", version: 1 } }; } };
    }
    if (url.endsWith("/api/v1/rentals/bookings/booking-core-v1/accept")) {
      return { ok: true, status: 200, async json() { return { data: { id: "booking-core-v1", status: "approved", version: 2 }, meta: { repository_invariants: "PASS" } }; } };
    }
    if (url.endsWith("/api/v1/rentals/bookings/booking-core-v1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "booking-core-v1", status: "approved", version: 2 }, meta: { repository_invariants: "READ_ONLY" } }; } };
    }
    return { ok: false, status: 404, async json() { return { error: "not_found" }; } };
  };

  try {
    const options = {
      environment: "development",
      featureOverrides: { rental_core_backend_path: true },
      headers: { "x-user-role": "supplier", "x-user-id": "supplier-demo" },
    };
    const asset = await coreRentalApiAdapter.createAsset({ title: "Core V1 asset" }, options);
    const published = await coreRentalApiAdapter.runListingAction("asset-core-v1", "publish", {}, options);
    const availability = await coreRentalApiAdapter.checkAvailability({ asset_id: "asset-core-v1" }, {
      ...options,
      headers: { "x-user-role": "customer", "x-user-id": "customer-demo" },
    });
    const booking = await coreRentalApiAdapter.requestBooking({ asset_id: "asset-core-v1" }, {
      ...options,
      headers: { "x-user-role": "customer", "x-user-id": "customer-demo" },
    });
    const accepted = await coreRentalApiAdapter.runBookingAction("booking-core-v1", "accept", { expected_version: 1 }, options);
    const read = await coreRentalApiAdapter.getBooking("booking-core-v1", {
      ...options,
      headers: { "x-user-role": "customer", "x-user-id": "customer-demo" },
    });

    assert.equal(asset.data.id, "asset-core-v1");
    assert.equal(published.data.status, "published");
    assert.equal(availability.data.available, true);
    assert.equal(booking.data.version, 1);
    assert.equal(accepted.data.status, "approved");
    assert.equal(read.data.status, "approved");
    assert.deepEqual(calls.map((call) => call.url), [
      "http://api.test/api/v1/rentals/assets",
      "http://api.test/api/v1/rentals/listings/asset-core-v1/publish",
      "http://api.test/api/v1/rentals/availability",
      "http://api.test/api/v1/rentals/bookings",
      "http://api.test/api/v1/rentals/bookings/booking-core-v1/accept",
      "http://api.test/api/v1/rentals/bookings/booking-core-v1",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
    API_CONFIG.dataMode = originalDataMode;
  }
});

test("legacy migration planner is idempotent reconciles counts and quarantines invalid records", () => {
  const assets = [
    { id: "asset-legacy-1", title: "Legacy loader", category: "heavy-equipment", ownerSupplierId: "supplier-demo", priceRate: 100, availabilityStatus: "available", verificationStatus: "verified" },
    { id: "asset-legacy-1", title: "Duplicate loader", category: "heavy-equipment", ownerSupplierId: "supplier-demo", priceRate: 100 },
    { id: "asset-invalid", title: "", category: "cars", ownerSupplierId: "", priceRate: 0 },
  ];
  const bookings = [
    { id: "booking-legacy-1", assetId: "asset-legacy-1", customerId: "customer-demo", supplierId: "supplier-demo", startDateTime: "2026-11-01T09:00:00.000Z", endDateTime: "2026-11-02T09:00:00.000Z", status: "approved", estimatedCost: 100 },
    { id: "booking-existing", assetId: "asset-legacy-1", customerId: "customer-demo", supplierId: "supplier-demo", startDateTime: "2026-11-03T09:00:00.000Z", endDateTime: "2026-11-04T09:00:00.000Z", status: "approved", estimatedCost: 100 },
    { id: "booking-invalid", assetId: "missing-asset", customerId: "customer-demo", supplierId: "supplier-demo", startDateTime: "2026-11-05T09:00:00.000Z", endDateTime: "2026-11-06T09:00:00.000Z", status: "approved" },
  ];
  const plan = generateCoreRentalLegacyMigrationPlan({
    assets,
    bookings,
    existingBookingIds: ["booking-existing"],
    initiatedBy: "test-operator",
  });

  assert.equal(plan.status, "READY_WITH_QUARANTINE");
  assert.equal(plan.mappedAssets.length, 1);
  assert.equal(plan.mappedBookings.length, 1);
  assert.equal(plan.skipped.length, 1);
  assert.equal(plan.quarantined.length, 3);
  assert.equal(plan.reconciliation.countsMatch, true);
  assert.equal(plan.controls.idempotent, true);
  assert.equal(plan.controls.featureFlagRollback, "rental_core_backend_path");
  assert.equal(plan.mappedBookings[0].idempotency_key, "booking:booking-legacy-1");
});

test("core rental API adapter orchestrates complete provider-independent lifecycle and dashboard refresh", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const originalDataMode = API_CONFIG.dataMode;
  const calls = [];
  const versions = {
    request: 1,
    accept: 2,
    "payment-required": 3,
    confirm: 4,
    "trigger-contract": 5,
    "check-in": 6,
    activate: 7,
    "request-extension": 8,
    "approve-extension": 9,
    "check-out": 10,
    "calculate-final-charge": 11,
    "prepare-settlement": 12,
    "mark-review-eligible": 13,
  };
  API_CONFIG.baseUrl = "http://api.test";
  API_CONFIG.dataMode = "api";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (url.endsWith("/api/v1/rentals/assets")) {
      return { ok: true, status: 201, async json() { return { data: { id: "asset-full-v1", owner_id: "supplier-demo", ...body, version: 1 } }; } };
    }
    if (url.includes("/api/v1/rentals/listings/asset-full-v1/")) {
      const action = url.split("/").pop();
      return { ok: true, status: 200, async json() { return { data: { id: "asset-full-v1", status: action === "publish" ? "published" : "moderated", version: action === "publish" ? 3 : 2 } }; } };
    }
    if (url.endsWith("/api/v1/rentals/availability")) {
      return { ok: true, status: 200, async json() { return { data: { available: true, asset_id: body.asset_id } }; } };
    }
    if (url.endsWith("/api/v1/rentals/quote")) {
      return { ok: true, status: 200, async json() { return { data: { asset_id: body.asset_id, quote: { total: 1000, currency: "JMD" } } }; } };
    }
    if (url.endsWith("/api/v1/rentals/bookings") && options.method === "POST") {
      return { ok: true, status: 201, async json() { return { data: { id: "booking-full-v1", ...body, status: "pending", version: versions.request } }; } };
    }
    if (url.includes("/api/v1/rentals/bookings/booking-full-v1/")) {
      const action = url.split("/").pop();
      const status = {
        accept: "approved",
        "payment-required": "approved",
        confirm: "confirmed",
        "trigger-contract": "confirmed",
        "check-in": "checked_in",
        activate: "active",
        "request-extension": "extension_requested",
        "approve-extension": "active",
        "check-out": "completed",
        "calculate-final-charge": "completed",
        "prepare-settlement": "completed",
        "mark-review-eligible": "completed",
        "open-dispute": "open",
      }[action];
      return { ok: true, status: action === "open-dispute" ? 201 : 200, async json() { return { data: { id: action === "open-dispute" ? "dispute-full-v1" : "booking-full-v1", status, version: versions[action] || 14 }, meta: { repository_invariants: "PASS" } }; } };
    }
    if (url.endsWith("/api/v1/rentals/bookings/booking-full-v1")) {
      return { ok: true, status: 200, async json() { return { data: { id: "booking-full-v1", customer_id: "customer-demo", supplier_id: "supplier-demo", status: "completed", version: 13 } }; } };
    }
    if (url.includes("/api/v1/rentals/bookings?")) {
      return { ok: true, status: 200, async json() { return { data: [{ id: "booking-full-v1", customer_id: "customer-demo", supplier_id: "supplier-demo", status: "completed", version: 13 }] }; } };
    }
    return { ok: false, status: 404, async json() { return { error: "not_found" }; } };
  };

  try {
    const featureOverrides = { rental_core_backend_path: true };
    const journey = await coreRentalApiAdapter.runProviderIndependentLifecycle({
      asset: {
        title: "Full V1 loader",
        category: "heavy-equipment",
        listing_type: "rental",
        owner_id: "supplier-demo",
      },
      booking: {
        customer_id: "customer-demo",
        supplier_id: "supplier-demo",
        start_at: "2026-12-01T09:00:00.000Z",
        end_at: "2026-12-02T09:00:00.000Z",
      },
      extension: { requested_end_at: "2026-12-03T09:00:00.000Z" },
      dispute: { reason: "adapter dispute evidence" },
    }, {
      environment: "development",
      featureOverrides,
    });

    assert.equal(journey.providerStatus, "provider_independent_local");
    assert.equal(journey.customerBooking.data.status, "completed");
    assert.equal(journey.supplierBookings.data[0].id, "booking-full-v1");
    assert.ok(calls.some((call) => call.url.endsWith("/api/v1/rentals/quote")));
    assert.ok(calls.some((call) => call.url.endsWith("/api/v1/rentals/bookings/booking-full-v1/check-out")));

    const customerDashboardRows = await bookingAdapter.forMode("api").listByCustomer(null, "customer-demo", {
      featureOverrides,
      user: { id: "customer-demo", role: "customer" },
    });
    const supplierDashboardRows = await bookingAdapter.forMode("api").listBySupplier(null, "supplier-demo", {
      featureOverrides,
      user: { id: "supplier-demo", role: "supplier" },
    });
    assert.equal(customerDashboardRows[0].id, "booking-full-v1");
    assert.equal(supplierDashboardRows[0].supplierId, "supplier-demo");
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
    API_CONFIG.dataMode = originalDataMode;
  }
});
