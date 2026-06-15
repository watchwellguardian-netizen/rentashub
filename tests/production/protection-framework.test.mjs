import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS, createAssetListing } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY, getBookingById } from "../../src/lib/bookingService.js";
import { NOTIFICATION_STORAGE_KEY, getUserNotifications } from "../../src/lib/notificationService.js";
import { calculatePaymentSummary } from "../../src/lib/paymentLedger.js";
import {
  CLAIM_STORAGE_KEY,
  PROTECTION_NOTICE,
  adminUpdateClaimStatus,
  canSubmitClaim,
  canViewBookingProtection,
  canSelectBookingProtection,
  calculateBookingProtectionCost,
  getProtectionAvailabilitySummary,
  getRecommendedProtectionPlans,
  loadClaims,
  selectBookingProtection,
  submitProtectionClaim,
} from "../../src/lib/protectionService.js";
import { calculateAssetTrustScore, calculateSupplierTrustScore } from "../../src/lib/trustEngine.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const otherCustomer = { id: "other-customer", role: "customer", full_name: "Other Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };
const admin = { id: "admin-1", role: "admin", full_name: "Admin User" };
const listing = SEED_LISTINGS[0];

function approvedBooking(overrides = {}) {
  return {
    id: "booking-protection-test",
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: "review-customer",
    customerName: "Review Customer",
    supplierId: "review-supplier",
    supplierName: "Review Supplier",
    startDateTime: "2026-06-20T09:00",
    endDateTime: "2026-06-22T09:00",
    rentalType: "daily",
    estimatedDuration: 2,
    estimatedCost: 36000,
    depositRequirement: listing.depositRequirement,
    status: "approved",
    paymentStatus: "not_active",
    ...overrides,
  };
}

function memoryStorage({ bookings = [approvedBooking()], listings = SEED_LISTINGS, claims = [] } = {}) {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(listings)],
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    [CLAIM_STORAGE_KEY, JSON.stringify(claims)],
    [NOTIFICATION_STORAGE_KEY, JSON.stringify([])],
    ["rentashub_message_threads", JSON.stringify([])],
    ["rentashub_messages", JSON.stringify([])],
    ["rentashub_payment_ledger", JSON.stringify([])],
    ["rentashub_reviews", JSON.stringify([])],
    ["rentashub_inspections", JSON.stringify([])],
    ["rentashub_supplier_profiles", JSON.stringify([])],
  ]);
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

test("protection routes are wired with public, protected, and admin access", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/protection", "/protection/plans", "/protection/booking/:bookingId", "/protection/asset/:assetId", "/claims", "/claims/new/:bookingId", "/claim/:id", "/admin/claims"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /<AdminClaimsPage \/>/);
  assert.match(app, /allowedRoles={\["admin"\]}/);
});

test("protection plan model includes required plan types and simulated notice", () => {
  const page = readFileSync(join(root, "src/pages/ProtectionPages.jsx"), "utf8");
  for (const type of ["damage_waiver", "liability_protection", "theft_protection", "roadside_support", "equipment_breakdown", "event_space_protection", "property_protection"]) {
    assert.match(page + readFileSync(join(root, "src/lib/protectionService.js"), "utf8"), new RegExp(type));
  }
  assert.match(PROTECTION_NOTICE, /simulated in this development version/);
  assert.doesNotMatch(page, /underwriting approved|payout executed|real insurance policy/i);
});

test("customer can select protection for own booking and payment estimate updates", () => {
  const storage = memoryStorage();
  const result = selectBookingProtection(storage, { user: customer, bookingId: "booking-protection-test", planIds: ["plan-damage-waiver", "plan-roadside"] });
  assert.equal(result.valid, true);
  const booking = getBookingById(storage, "booking-protection-test");
  assert.deepEqual(booking.protectionPlanIds, ["plan-damage-waiver", "plan-roadside"]);
  assert.equal(calculateBookingProtectionCost(booking), 5280);
  const summary = calculatePaymentSummary(booking, listing);
  assert.equal(summary.protectionFee, 5280);
  assert.equal(summary.total, 74880);
  assert.equal(getUserNotifications(storage, "review-supplier").some((note) => note.type === "protection_selected"), true);
});

test("supplier can view own booking protection context but cannot select customer protection", () => {
  const booking = approvedBooking();
  assert.equal(canViewBookingProtection(customer, booking, listing), true);
  assert.equal(canViewBookingProtection(supplier, booking, listing), true);
  assert.equal(canViewBookingProtection(admin, booking, listing), true);
  assert.equal(canViewBookingProtection(otherCustomer, booking, listing), false);
  assert.equal(canViewBookingProtection(otherSupplier, booking, listing), false);
  assert.equal(canSelectBookingProtection(customer, booking), true);
  assert.equal(canSelectBookingProtection(supplier, booking), false);

  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  assert.match(app, /allowedRoles={\["customer", "supplier", "admin"\]}/);
  const page = readFileSync(join(root, "src/pages/ProtectionPages.jsx"), "utf8");
  assert.match(page, /Protection context is read-only/);
});

test("customer cannot select protection for another customer's booking", () => {
  const storage = memoryStorage();
  const result = selectBookingProtection(storage, { user: otherCustomer, bookingId: "booking-protection-test", planIds: ["plan-damage-waiver"] });
  assert.equal(result.valid, false);
  assert.match(result.error, /Only the booking customer/);
});

test("asset detail shows category-appropriate recommendations and supplier setting", () => {
  const vehiclePlans = getRecommendedProtectionPlans("cars").map((plan) => plan.type);
  const equipmentPlans = getRecommendedProtectionPlans("heavy-equipment").map((plan) => plan.type);
  const propertyPlans = getRecommendedProtectionPlans("real-estate").map((plan) => plan.type);
  assert.deepEqual(vehiclePlans, ["damage_waiver", "liability_protection", "roadside_support"]);
  assert.ok(equipmentPlans.includes("equipment_breakdown"));
  assert.ok(propertyPlans.includes("property_protection"));
  assert.equal(getProtectionAvailabilitySummary(listing).required, true);

  const detail = readFileSync(join(root, "src/pages/AssetDetail.jsx"), "utf8");
  const form = readFileSync(join(root, "src/components/AssetForm.jsx"), "utf8");
  assert.match(detail, /Recommended protection options/);
  assert.match(detail, /Protection requirement/);
  assert.match(form, /Protection requirement/);
});

test("supplier listing protection requirement is stored in listing model", () => {
  const created = createAssetListing({
    ...listing,
    id: "",
    title: "Protected SUV",
    protectionRequirement: "not_offered",
  });
  assert.equal(created.valid, true);
  assert.equal(created.listing.protectionRequirement, "not_offered");
});

test("customer and supplier can submit authorized claims while unauthorized users are blocked", () => {
  const storage = memoryStorage();
  const booking = approvedBooking();
  assert.equal(canSubmitClaim(customer, booking, listing), true);
  assert.equal(canSubmitClaim(supplier, booking, listing), true);
  assert.equal(canSubmitClaim(otherCustomer, booking, listing), false);
  assert.equal(canSubmitClaim(otherSupplier, booking, listing), false);

  const customerClaim = submitProtectionClaim(storage, { user: customer, bookingId: "booking-protection-test", input: { claimType: "damage", description: "Scratch found after return.", linkedInspectionId: "inspection-demo" } });
  assert.equal(customerClaim.valid, true);
  assert.equal(customerClaim.claim.status, "submitted");
  assert.equal(customerClaim.claim.evidence[0].status, "upload-ready-placeholder");
  assert.equal(getUserNotifications(storage, "review-supplier").some((note) => note.type === "claim_submitted"), true);
  assert.equal(getUserNotifications(storage, "admin-1").some((note) => note.type === "claim_submitted_admin"), true);

  const supplierClaim = submitProtectionClaim(storage, { user: supplier, bookingId: "booking-protection-test", input: { claimType: "missing_accessory", description: "Child seat was not returned." } });
  assert.equal(supplierClaim.valid, true);
  assert.equal(getUserNotifications(storage, "review-customer").some((note) => note.type === "claim_submitted"), true);
});

test("admin can access and simulate claim status updates while non-admin is blocked", () => {
  const storage = memoryStorage();
  const created = submitProtectionClaim(storage, { user: customer, bookingId: "booking-protection-test", input: { id: "claim-admin-test", claimType: "theft", description: "Key missing." } });
  assert.equal(created.valid, true);
  const blocked = adminUpdateClaimStatus(storage, "claim-admin-test", "under_review", supplier);
  assert.equal(blocked.valid, false);
  const updated = adminUpdateClaimStatus(storage, "claim-admin-test", "escalated_placeholder", admin);
  assert.equal(updated.valid, true);
  assert.equal(updated.claim.status, "escalated_placeholder");
  assert.equal(getUserNotifications(storage, "review-customer").some((note) => note.type === "claim_status_updated"), true);
  assert.equal(getUserNotifications(storage, "review-supplier").some((note) => note.type === "claim_status_updated"), true);
});

test("trust engine includes protection and claim signals safely", () => {
  const storage = memoryStorage({
    claims: [
      { id: "claim-safe", assetId: listing.id, supplierId: "review-supplier", customerId: "review-customer", status: "submitted", claimType: "damage" },
      { id: "claim-serious-1", assetId: listing.id, supplierId: "review-supplier", customerId: "review-customer", status: "escalated_placeholder", claimType: "damage" },
      { id: "claim-serious-2", assetId: listing.id, supplierId: "review-supplier", customerId: "review-customer", status: "approved_placeholder", claimType: "theft" },
    ],
  });
  const supplierTrust = calculateSupplierTrustScore(storage, "review-supplier");
  const assetTrust = calculateAssetTrustScore(storage, listing.id);
  assert.ok(Object.hasOwn(supplierTrust.inputs, "protectionAvailabilityPercentage"));
  assert.ok(Object.hasOwn(supplierTrust.inputs, "claimSignalScore"));
  assert.ok(Object.hasOwn(assetTrust.inputs, "protectionAvailabilityScore"));
  assert.equal(supplierTrust.inputs.totalClaims, 3);
  assert.equal(assetTrust.inputs.seriousClaims, 2);
});

test("protection module avoids retired branding and real insurance claims", () => {
  for (const file of ["src/lib/protectionService.js", "src/pages/ProtectionPages.jsx", "src/App.jsx", "src/pages/BookingPayment.jsx", "src/pages/AssetDetail.jsx"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /PlannasHub|RentBroker|\/rentbroker|guest-marketplace|ai-travel-planner/i);
    assert.doesNotMatch(source, /real insurance product activated|underwriting approved|claim payout sent|escrow released/i);
    assert.doesNotMatch(source, /production-ready/i);
  }
});
