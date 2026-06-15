import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SEED_LISTINGS } from "../../src/lib/assetListing.js";
import {
  BOOKING_STORAGE_KEY,
  SEED_BOOKINGS,
  canCreateBooking,
  canManageBooking,
  canViewBooking,
  createBookingRequest,
  estimateBookingCost,
  getCustomerBookings,
  getSupplierBookings,
  updateBookingStatus,
  validateBookingRequest,
} from "../../src/lib/bookingService.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };
const listing = SEED_LISTINGS[0];

function memoryStorage(bookings = SEED_BOOKINGS, listings = SEED_LISTINGS) {
  const store = new Map([
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    ["rentashub_asset_listings", JSON.stringify(listings)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function validInput(overrides = {}) {
  return {
    startDateTime: "2026-06-20T09:00",
    endDateTime: "2026-06-22T09:00",
    pickupDeliveryMethod: "pickup",
    deliveryLocation: "",
    notes: "Need child seat if available.",
    ...overrides,
  };
}

test("booking routes and RBAC are wired in the standalone app", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/bookings", "/asset/:id/book", "/assets/:id/book", "/booking/:id", "/booking/:id/manage", "/rental-requests"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["customer"\]}/);
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.equal(canCreateBooking(customer), true);
  assert.equal(canCreateBooking(null), false);
  assert.equal(canCreateBooking(supplier), false);
});

test("customer can create a valid booking request with pending supplier approval", () => {
  const result = createBookingRequest(memoryStorage([]), { user: customer, listing, input: validInput() });
  assert.equal(result.valid, true);
  assert.equal(result.booking.status, "pending_supplier_approval");
  assert.equal(result.booking.paymentStatus, "not_active");
  assert.equal(result.booking.estimatedCost, 36000);
  assert.equal(result.booking.depositRequirement, listing.depositRequirement);
});

test("booking validation blocks missing dates and invalid date ranges", () => {
  const missing = validateBookingRequest({ user: customer, listing, input: validInput({ startDateTime: "", endDateTime: "" }), existingBookings: [] });
  assert.equal(missing.valid, false);
  assert.match(missing.errors.startDateTime, /required/);
  assert.match(missing.errors.endDateTime, /required/);

  const invalidRange = validateBookingRequest({ user: customer, listing, input: validInput({ endDateTime: "2026-06-19T09:00" }), existingBookings: [] });
  assert.equal(invalidRange.valid, false);
  assert.match(invalidRange.errors.endDateTime, /after the start/);
});

test("booking validation blocks unavailable assets and approved overlaps", () => {
  const unavailable = { ...listing, availabilityStatus: "maintenance" };
  const unavailableResult = validateBookingRequest({ user: customer, listing: unavailable, input: validInput(), existingBookings: [] });
  assert.equal(unavailableResult.valid, false);
  assert.match(unavailableResult.errors.asset, /not available/);

  const approved = { ...SEED_BOOKINGS[0], id: "approved-overlap", status: "approved", startDateTime: "2026-06-20T12:00", endDateTime: "2026-06-21T12:00" };
  const overlap = validateBookingRequest({ user: customer, listing, input: validInput(), existingBookings: [approved] });
  assert.equal(overlap.valid, false);
  assert.match(overlap.errors.overlap, /approved or active booking/);
});

test("booking cost estimate is calculated from rental type and asset rate", () => {
  const estimate = estimateBookingCost(listing, "2026-06-20T09:00", "2026-06-22T09:00");
  assert.equal(estimate.valid, true);
  assert.equal(estimate.units, 2);
  assert.equal(estimate.estimatedCost, 36000);
});

test("customer bookings and supplier rental requests return owned records only", () => {
  const customerBookings = getCustomerBookings(memoryStorage(), "review-customer");
  assert.equal(customerBookings.every((booking) => booking.customerId === "review-customer"), true);

  const supplierBookings = getSupplierBookings(memoryStorage(), "review-supplier");
  assert.equal(supplierBookings.length >= 1, true);
  assert.equal(supplierBookings.every((booking) => booking.supplierId === "review-supplier"), true);
});

test("supplier can approve and decline own booking requests", () => {
  const approvedStorage = memoryStorage();
  const approved = updateBookingStatus(approvedStorage, "booking-seed-pending-1", "approved", supplier);
  assert.equal(approved.valid, true);
  assert.equal(approved.booking.status, "approved");

  const declinedStorage = memoryStorage();
  const declined = updateBookingStatus(declinedStorage, "booking-seed-pending-1", "declined", supplier);
  assert.equal(declined.valid, true);
  assert.equal(declined.booking.status, "declined");
});

test("supplier cannot manage another supplier booking", () => {
  const booking = SEED_BOOKINGS[0];
  assert.equal(canManageBooking(otherSupplier, booking, listing), false);
  const result = updateBookingStatus(memoryStorage(), "booking-seed-pending-1", "approved", otherSupplier);
  assert.equal(result.valid, false);
  assert.match(result.error, /another supplier/);
});

test("booking detail visibility is limited to related customer, supplier, or controlled admin role", () => {
  const booking = SEED_BOOKINGS[0];
  assert.equal(canViewBooking(customer, booking, listing), true);
  assert.equal(canViewBooking(supplier, booking, listing), true);
  assert.equal(canViewBooking({ id: "admin-1", role: "admin" }, booking, listing), true);
  assert.equal(canViewBooking({ id: "other-customer", role: "customer" }, booking, listing), false);
});

test("booking pages include required UX states and no fake payment success", () => {
  for (const file of ["src/pages/BookingRequest.jsx", "src/pages/CustomerBookings.jsx", "src/pages/SupplierRentalRequests.jsx", "src/pages/BookingDetail.jsx"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i);
    assert.doesNotMatch(source, /payment success|paid successfully/i);
  }

  const request = readFileSync(join(root, "src/pages/BookingRequest.jsx"), "utf8");
  assert.match(request, /Payment is not active yet/);
  assert.match(request, /Submit booking request/);
  assert.match(request, /Loading booking request/);

  const customerPage = readFileSync(join(root, "src/pages/CustomerBookings.jsx"), "utf8");
  assert.match(customerPage, /No bookings yet/);
  assert.match(customerPage, /Cancel/);

  const supplierPage = readFileSync(join(root, "src/pages/SupplierRentalRequests.jsx"), "utf8");
  assert.match(supplierPage, /No rental requests/);
  assert.match(supplierPage, /Approve/);
  assert.match(supplierPage, /Decline/);

  const detail = readFileSync(join(root, "src/pages/BookingDetail.jsx"), "utf8");
  assert.match(detail, /Inspection records are local until backend\/API storage is added/);
  assert.match(detail, /Estimated cost/);
});
