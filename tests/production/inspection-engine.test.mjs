import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY } from "../../src/lib/bookingService.js";
import {
  CONDITION_ITEMS,
  INSPECTION_STORAGE_KEY,
  canCheckInBooking,
  canCheckOutBooking,
  canReviewInspection,
  getInspectionById,
  hasAccessoryFields,
  hasEngineHoursField,
  hasMeterFields,
  hasOdometerField,
  reviewInspection,
  submitInspection,
  validateInspection,
} from "../../src/lib/inspectionService.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const otherCustomer = { id: "other-customer", role: "customer", full_name: "Other Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };
const carListing = SEED_LISTINGS[0];
const equipmentListing = SEED_LISTINGS[1];
const toolListing = {
  ...SEED_LISTINGS[0],
  id: "asset-tool-test",
  category: "small-tools-machines",
  subcategory: "Cutting",
  title: "Tile cutter test asset",
};

function approvedBooking(overrides = {}) {
  return {
    id: "booking-approved-test",
    assetId: carListing.id,
    assetTitle: carListing.title,
    customerId: "review-customer",
    customerName: "Review Customer",
    supplierId: "review-supplier",
    supplierName: "Review Supplier",
    startDateTime: "2026-06-20T09:00",
    endDateTime: "2026-06-22T09:00",
    rentalType: "daily",
    pickupDeliveryMethod: "pickup",
    estimatedCost: 36000,
    depositRequirement: carListing.depositRequirement,
    status: "approved",
    paymentStatus: "paid",
    ...overrides,
  };
}

function memoryStorage({ bookings = [approvedBooking()], listings = SEED_LISTINGS, inspections = [] } = {}) {
  const store = new Map([
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    ["rentashub_asset_listings", JSON.stringify(listings)],
    [INSPECTION_STORAGE_KEY, JSON.stringify(inspections)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function validInput(overrides = {}) {
  return {
    conditionStatus: "good",
    checklist: { [CONDITION_ITEMS[0]]: true },
    photos: [],
    fuelBatteryLevel: "75%",
    odometer: "45000",
    engineHours: "",
    accessoriesIncluded: "Jack and spare tire",
    missingAccessories: "none",
    customerNotes: "Condition looks clear.",
    damageNotes: "none",
    locationLabel: "Supplier yard",
    ...overrides,
  };
}

test("inspection routes and RBAC protection are wired", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/booking/:id/check-in", "/booking/:id/check-out", "/inspection/:id", "/inspection/:id/review"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["customer"\]}/);
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.equal(canCheckInBooking(null, approvedBooking()), false);
});

test("customer can open check-in for own approved booking but not another customer or pending booking", () => {
  assert.equal(canCheckInBooking(customer, approvedBooking()), true);
  assert.equal(canCheckInBooking(otherCustomer, approvedBooking()), false);
  assert.equal(canCheckInBooking(customer, approvedBooking({ status: "pending_supplier_approval" })), false);
  assert.equal(canCheckInBooking(customer, approvedBooking({ status: "declined" })), false);
  assert.equal(canCheckInBooking(customer, approvedBooking({ paymentStatus: "not_active" })), false);
  assert.equal(canCheckInBooking(customer, approvedBooking({ paymentStatus: "manual_offline" })), true);
});

test("successful check-in creates inspection and marks booking active", () => {
  const storage = memoryStorage();
  const result = submitInspection(storage, {
    type: "check-in",
    user: customer,
    booking: approvedBooking(),
    listing: carListing,
    input: validInput(),
  });

  assert.equal(result.valid, true);
  assert.equal(result.inspection.type, "check-in");
  assert.equal(result.inspection.bookingId, "booking-approved-test");
  assert.equal(result.inspection.photos[0].status, "upload-ready-placeholder");
  assert.equal(result.booking.status, "active");
  assert.ok(getInspectionById(storage, result.inspection.id));
});

test("customer can check out active booking and mark booking completed", () => {
  const active = approvedBooking({ status: "active" });
  assert.equal(canCheckOutBooking(customer, active), true);
  const result = submitInspection(memoryStorage({ bookings: [active] }), {
    type: "check-out",
    user: customer,
    booking: active,
    listing: carListing,
    input: validInput({ damageNotes: "No new damage.", missingAccessories: "none" }),
  });

  assert.equal(result.valid, true);
  assert.equal(result.inspection.type, "check-out");
  assert.equal(result.booking.status, "completed");
});

test("check-out is blocked unless booking is active", () => {
  const validation = validateInspection({
    type: "check-out",
    user: customer,
    booking: approvedBooking({ status: "approved" }),
    listing: carListing,
    input: validInput(),
  });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.permission, /active booking/);
});

test("supplier can review inspection for own asset and flag placeholder stays controlled", () => {
  const storage = memoryStorage();
  const created = submitInspection(storage, {
    type: "check-in",
    user: customer,
    booking: approvedBooking(),
    listing: carListing,
    input: validInput(),
  });
  assert.equal(canReviewInspection(supplier, created.inspection, created.booking, carListing), true);
  const reviewed = reviewInspection(storage, created.inspection.id, "flagged", supplier, "Scratch needs review.");
  assert.equal(reviewed.valid, true);
  assert.equal(reviewed.inspection.supplierReview.status, "flagged");
  assert.match(reviewed.inspection.supplierReview.placeholder, /Damage claim and dispute workflow/);
});

test("supplier cannot review another supplier asset inspection", () => {
  const storage = memoryStorage();
  const created = submitInspection(storage, {
    type: "check-in",
    user: customer,
    booking: approvedBooking(),
    listing: carListing,
    input: validInput(),
  });
  assert.equal(canReviewInspection(otherSupplier, created.inspection, created.booking, carListing), false);
  const reviewed = reviewInspection(storage, created.inspection.id, "accepted", otherSupplier, "");
  assert.equal(reviewed.valid, false);
  assert.match(reviewed.error, /another supplier/);
});

test("meter and accessory helpers match vehicle, truck, heavy equipment, and tools", () => {
  assert.equal(hasMeterFields(carListing), true);
  assert.equal(hasOdometerField(carListing), true);
  assert.equal(hasEngineHoursField(equipmentListing), true);
  assert.equal(hasAccessoryFields(equipmentListing), true);
  assert.equal(hasAccessoryFields(toolListing), true);
});

test("inspection pages render required fields, states, and no legacy branding", () => {
  for (const file of ["src/pages/InspectionForm.jsx", "src/pages/InspectionDetail.jsx", "src/lib/inspectionService.js"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i);
    assert.doesNotMatch(source, /payment success|paid successfully|fake AI/i);
  }

  const form = readFileSync(join(root, "src/pages/InspectionForm.jsx"), "utf8");
  for (const text of ["RentasHub Digital Check-In", "RentasHub Digital Check-Out", "Photo upload coming soon / upload-ready", "Fuel / battery / charge level", "Odometer reading", "Engine hours", "Accessories included", "Missing accessories", "Location placeholder / GPS-ready metadata", "Loading inspection flow"]) {
    assert.match(form, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const detail = readFileSync(join(root, "src/pages/InspectionDetail.jsx"), "utf8");
  for (const text of ["Inspection summary", "Checklist", "Meters and accessories", "Supplier review", "Accept inspection", "Flag for follow-up", "Loading inspection detail"]) {
    assert.match(detail, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
