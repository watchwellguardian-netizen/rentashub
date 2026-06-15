import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS, createEmptySearchFilters, searchAssetListings } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY } from "../../src/lib/bookingService.js";
import { INSPECTION_STORAGE_KEY } from "../../src/lib/inspectionService.js";
import { MESSAGE_STORAGE_KEY, THREAD_STORAGE_KEY } from "../../src/lib/messagingService.js";
import { LEDGER_STORAGE_KEY } from "../../src/lib/paymentLedger.js";
import { REVIEWS_STORAGE_KEY } from "../../src/lib/reviewService.js";
import { SUPPLIER_PROFILE_STORAGE_KEY } from "../../src/lib/supplierProfile.js";
import {
  RISK_FLAGS,
  TRUST_BADGES,
  calculateAssetReputationMetrics,
  calculateAssetTrustScore,
  calculateCustomerReputationMetrics,
  calculateCustomerTrustScore,
  calculateSupplierReputationMetrics,
  calculateSupplierTrustScore,
  createTrustOverview,
  getRiskQueue,
  getTrustSummaryForListing,
  rankListingsByTrust,
} from "../../src/lib/trustEngine.js";

const root = process.cwd();
const supplierId = "review-supplier";
const customerId = "review-customer";

function booking(overrides = {}) {
  return {
    id: "booking-trust-1",
    assetId: "asset-seed-supplier-1",
    assetTitle: "7-seater SUV for airport and family rentals",
    customerId,
    customerName: "Review Customer",
    supplierId,
    supplierName: "Review Supplier",
    status: "completed",
    paymentStatus: "paid",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

function review(overrides = {}) {
  return {
    id: "review-trust-1",
    bookingId: "booking-trust-1",
    assetId: "asset-seed-supplier-1",
    supplierId,
    customerId,
    reviewerId: customerId,
    reviewerRole: "customer",
    rating: 5,
    title: "Reliable",
    comment: "Clean and easy handoff.",
    reviewType: "asset",
    status: "published",
    createdAt: "2026-06-03T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
    supplierResponse: null,
    ...overrides,
  };
}

function thread(overrides = {}) {
  return {
    id: "thread-booking-trust-1",
    bookingId: "booking-trust-1",
    assetId: "asset-seed-supplier-1",
    customerId,
    supplierId,
    participants: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T03:00:00.000Z",
    ...overrides,
  };
}

function message(overrides = {}) {
  return {
    id: "msg-trust-1",
    threadId: "thread-booking-trust-1",
    senderId: customerId,
    senderRole: "customer",
    body: "Is this available?",
    timestamp: "2026-06-01T01:00:00.000Z",
    readBy: [customerId],
    isSystem: false,
    ...overrides,
  };
}

function storage({ listings = SEED_LISTINGS, bookings = [booking()], reviews = [review()], inspections = [], ledger = [], profiles = [], threads = [], messages = [] } = {}) {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(listings)],
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    [REVIEWS_STORAGE_KEY, JSON.stringify(reviews)],
    [INSPECTION_STORAGE_KEY, JSON.stringify(inspections)],
    [LEDGER_STORAGE_KEY, JSON.stringify(ledger)],
    [THREAD_STORAGE_KEY, JSON.stringify(threads)],
    [MESSAGE_STORAGE_KEY, JSON.stringify(messages)],
    [SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify(profiles.length ? profiles : [{
      supplierId,
      businessName: "Trusted Rentals Ltd",
      contactPerson: "Review Supplier",
      phone: "555",
      email: "supplier@rentashub.local",
      businessAddress: "Kingston",
      serviceAreas: "Kingston",
      supplierType: "company",
      bio: "Supplier bio",
      businessHours: "Mon-Fri",
      emergencyContact: "555",
      publicSummary: "Verified supplier",
      verificationStatus: "verified",
      verificationDocuments: {},
      updatedAt: "2026-06-03T00:00:00.000Z",
    }])],
  ]);
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

test("trust routes are wired with controlled admin risk route", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/trust", "/trust/supplier/:supplierId", "/trust/asset/:assetId", "/trust/customer/:customerId", "/admin/risk"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /<AdminRiskPage \/>/);
  assert.match(app, /<CustomerTrustPage \/>/);
});

test("supplier trust score uses verification, listings, bookings, reviews, and risk flags", () => {
  const local = storage();
  const score = calculateSupplierTrustScore(local, supplierId);
  assert.equal(score.entityType, "supplier");
  assert.ok(score.score >= 70);
  assert.ok(score.badges.includes(TRUST_BADGES.verifiedSupplier));
  assert.ok(score.badges.includes(TRUST_BADGES.trustedSupplier));

  const risky = calculateSupplierTrustScore(storage({
    bookings: [booking({ id: "cancel-1", status: "cancelled" }), booking({ id: "decline-1", status: "declined" })],
    reviews: [review({ rating: 2 }), review({ id: "review-flagged", rating: 1, status: "flagged" })],
    inspections: [{ id: "inspection-flag-1", assetId: "asset-seed-supplier-1", supplierReview: { status: "flagged" } }],
    profiles: [{ supplierId, verificationStatus: "not_started", verificationDocuments: {} }],
  }), supplierId);
  assert.ok(risky.score < score.score);
  assert.ok(risky.flags.includes(RISK_FLAGS.incompleteVerification));
});

test("customer and asset trust scores compute from local transaction history", () => {
  const local = storage({
    ledger: [{ id: "txn-trust-1", customerId, status: "paid", type: "payment", total: 1000 }],
    inspections: [{ id: "inspection-trust-1", assetId: "asset-seed-supplier-1", supplierReview: { status: "accepted" }, damageNotes: "" }],
  });
  const customer = calculateCustomerTrustScore(local, customerId);
  const asset = calculateAssetTrustScore(local, "asset-seed-supplier-1");
  assert.equal(customer.entityType, "customer");
  assert.equal(asset.entityType, "asset");
  assert.ok(customer.score > 0);
  assert.ok(asset.score > 0);
  assert.ok(asset.badges.includes(TRUST_BADGES.trustedAsset) || asset.badges.includes(TRUST_BADGES.safeOperator));
});

test("advanced supplier reputation metrics include response, quotes, fulfillment, uptime, repeat customers, revenue, disputes, and trends", () => {
  const local = storage({
    bookings: [
      booking({ id: "booking-trust-1", customerId, status: "completed" }),
      booking({ id: "booking-trust-2", customerId, status: "completed" }),
      booking({ id: "booking-trust-3", customerId: "other-customer", status: "approved" }),
      booking({ id: "booking-trust-4", customerId: "lost-customer", status: "declined" }),
    ],
    reviews: [
      review({ id: "review-old", rating: 3, createdAt: "2026-05-01T00:00:00.000Z" }),
      review({ id: "review-new", rating: 5, createdAt: "2026-06-01T00:00:00.000Z" }),
    ],
    inspections: [
      { id: "inspection-resolved", assetId: "asset-seed-supplier-1", supplierReview: { status: "accepted" }, damageNotes: "" },
      { id: "inspection-flagged", assetId: "asset-seed-supplier-1", supplierReview: { status: "flagged" }, damageNotes: "Damage noted" },
    ],
    ledger: [{ id: "txn-trust", supplierId, type: "payment", supplierEarnings: 72000, total: 80000 }],
    threads: [thread()],
    messages: [
      message({ id: "msg-customer", timestamp: "2026-06-01T01:00:00.000Z", senderRole: "customer", senderId: customerId }),
      message({ id: "msg-supplier", timestamp: "2026-06-01T03:00:00.000Z", senderRole: "supplier", senderId: supplierId }),
    ],
  });
  const metrics = calculateSupplierReputationMetrics(local, supplierId);
  const score = calculateSupplierTrustScore(local, supplierId);
  assert.equal(metrics.averageResponseHours, 2);
  assert.ok(metrics.quoteAcceptanceRate > 0);
  assert.ok(metrics.bookingFulfillmentRate > 0);
  assert.ok(metrics.assetUptimePercentage > 0);
  assert.ok(metrics.repeatCustomerPercentage > 0);
  assert.equal(metrics.revenueVolume, 72000);
  assert.ok(metrics.disputeResolutionScore > 0);
  assert.ok(metrics.averageReviewTrendScore > 50);
  for (const key of ["averageResponseHours", "quoteAcceptanceRate", "bookingFulfillmentRate", "assetUptimePercentage", "repeatCustomerPercentage", "revenueVolume", "disputeResolutionScore"]) {
    assert.ok(Object.hasOwn(score.inputs, key), `${key} should be exposed in supplier trust inputs`);
  }
});

test("advanced customer reputation metrics include no-shows, late returns, damage, deposits, and repeat behavior", () => {
  const local = storage({
    bookings: [
      booking({ id: "booking-trust-1", status: "completed", actualReturnDateTime: "2026-06-02T02:00:00.000Z", endDateTime: "2026-06-02T00:00:00.000Z" }),
      booking({ id: "booking-trust-2", status: "no_show", noShow: true }),
      booking({ id: "booking-trust-3", status: "completed", assetId: "asset-seed-supplier-1" }),
    ],
    inspections: [{ id: "inspection-damage", bookingId: "booking-trust-1", assetId: "asset-seed-supplier-1", supplierReview: { status: "flagged" }, damageNotes: "Scratch found" }],
    ledger: [{ id: "deposit-forfeit", customerId, type: "deposit_forfeiture", status: "forfeited", total: 5000 }],
  });
  const metrics = calculateCustomerReputationMetrics(local, customerId);
  const score = calculateCustomerTrustScore(local, customerId);
  assert.equal(metrics.noShows, 1);
  assert.equal(metrics.lateReturns, 1);
  assert.equal(metrics.damageIncidents, 1);
  assert.equal(metrics.depositForfeitures, 1);
  assert.ok(metrics.repeatBookingScore > 0);
  assert.ok(score.flags.includes(RISK_FLAGS.depositForfeitures));
  for (const key of ["noShowRate", "lateReturnRate", "damageHistoryScore", "depositForfeitureScore", "repeatBookingScore"]) {
    assert.ok(Object.hasOwn(score.inputs, key), `${key} should be exposed in customer trust inputs`);
  }
});

test("advanced asset reputation metrics include breakdown, maintenance, review trend, age, insurance, and inspection pass rate", () => {
  const local = storage({
    listings: [{ ...SEED_LISTINGS[0], id: "asset-seed-supplier-1", categoryFields: { ...SEED_LISTINGS[0].categoryFields, year: "2020" }, insuranceRequirement: "Insurance required.", verificationStatus: "verified" }],
    reviews: [
      review({ id: "review-asset-old", rating: 3, createdAt: "2026-05-01T00:00:00.000Z" }),
      review({ id: "review-asset-new", rating: 5, createdAt: "2026-06-01T00:00:00.000Z" }),
    ],
    inspections: [
      { id: "inspection-pass", assetId: "asset-seed-supplier-1", supplierReview: { status: "accepted" }, damageNotes: "", customerNotes: "Maintenance completed" },
      { id: "inspection-breakdown", assetId: "asset-seed-supplier-1", supplierReview: { status: "flagged" }, damageNotes: "Breakdown reported" },
    ],
  });
  const metrics = calculateAssetReputationMetrics(local, "asset-seed-supplier-1");
  const score = calculateAssetTrustScore(local, "asset-seed-supplier-1");
  assert.ok(metrics.breakdownFrequencyScore < 100);
  assert.ok(metrics.maintenanceHistoryScore > 0);
  assert.ok(metrics.averageReviewTrendScore > 50);
  assert.ok(metrics.assetAgeYears >= 0);
  assert.equal(metrics.insuranceStatusScore, 100);
  assert.ok(metrics.inspectionPassRate > 0);
  for (const key of ["breakdownFrequencyScore", "maintenanceHistoryScore", "averageReviewTrendScore", "assetAgeScore", "insuranceStatusScore", "inspectionPassRate"]) {
    assert.ok(Object.hasOwn(score.inputs, key), `${key} should be exposed in asset trust inputs`);
  }
});

test("trust summary and ranking support search visibility impact", () => {
  const lowTrustListing = { ...SEED_LISTINGS[0], id: "low-trust-asset", verificationStatus: "draft", title: "Low trust draft" };
  const highTrustListing = { ...SEED_LISTINGS[0], id: "high-trust-asset", verificationStatus: "verified", title: "High trust verified" };
  const local = storage({ listings: [lowTrustListing, highTrustListing], reviews: [review({ assetId: "high-trust-asset" })] });
  const ranked = rankListingsByTrust(local, [lowTrustListing, highTrustListing]);
  assert.equal(ranked[0].id, "high-trust-asset");
  const searched = searchAssetListings([lowTrustListing, highTrustListing], createEmptySearchFilters({ sortBy: "trust" }));
  assert.equal(searched.length, 2);
  assert.equal(getTrustSummaryForListing(local, highTrustListing).asset.entityId, "high-trust-asset");
});

test("trust overview and admin risk queue expose local risk signals", () => {
  const local = storage({
    bookings: [booking({ status: "cancelled" }), booking({ id: "cancel-2", status: "cancelled" })],
    inspections: [{ id: "inspection-flag-1", assetId: "asset-seed-supplier-1", supplierReview: { status: "flagged" }, damageNotes: "Damage noted" }],
    profiles: [{ supplierId, verificationStatus: "not_started", verificationDocuments: {} }],
  });
  const overview = createTrustOverview(local);
  const queue = getRiskQueue(local);
  assert.ok(overview.suppliers.length >= 1);
  assert.ok(overview.assets.length >= 1);
  assert.ok(overview.customers.length >= 1);
  assert.ok(queue.length >= 1);
});

test("trust UI integrations render badges, scores, sorting, and local-only notices", () => {
  const card = readFileSync(join(root, "src/components/AssetCard.jsx"), "utf8");
  const detail = readFileSync(join(root, "src/pages/AssetDetail.jsx"), "utf8");
  const search = readFileSync(join(root, "src/pages/MarketplaceSearch.jsx"), "utf8");
  const trust = readFileSync(join(root, "src/pages/TrustCenter.jsx"), "utf8");
  const admin = readFileSync(join(root, "src/pages/AdminCenter.jsx"), "utf8");
  assert.match(card, /Trust \{trust\.asset\.score\}\/100/);
  assert.match(detail, /Trust and risk summary/);
  assert.match(search, /trustAdapter\.rankListings/);
  assert.match(trust, /trustAdapter\./);
  assert.match(trust, /not a final risk decision/);
  assert.match(admin, /Trust risk items/);
  for (const source of [card, detail, search, trust, admin]) {
    assert.doesNotMatch(source, new RegExp("production" + "-ready", "i"));
    assert.doesNotMatch(source, new RegExp("Plannas" + "Hub", "i"));
  }
});
