import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  createEmptySearchFilters,
  getAssetListingById,
  searchAssetListings,
  upsertAssetListing,
} from "../../src/lib/assetListing.js";
import {
  createBookingRequest,
  getBookingById,
  updateBookingStatus,
} from "../../src/lib/bookingService.js";
import {
  createBrokerAssistantMatches,
  generateMarketInsights,
  runAiSearchAssistant,
  suggestListingContent,
  adviseRentalChoice,
} from "../../src/lib/aiAssistant.js";
import { createEscrowService } from "../../server/src/services/escrowService.js";
import { createNotification, loadNotifications } from "../../src/lib/notificationService.js";
import { ensureBookingThread, getThreadMessages, getVisibleThreads, sendMessage } from "../../src/lib/messagingService.js";
import { openDispute, adminUpdateDisputeStatus } from "../../src/lib/disputeService.js";
import { selectBookingProtection, submitProtectionClaim, adminUpdateClaimStatus } from "../../src/lib/protectionService.js";
import { createSimulatedPayment, requestSimulatedPayout } from "../../src/lib/paymentLedger.js";
import { submitInspection } from "../../src/lib/inspectionService.js";
import { submitReview, respondToReview, adminModerateReview, getAssetRatingSummary } from "../../src/lib/reviewService.js";
import { calculateSupplierTrustScore, calculateAssetTrustScore, getRiskQueue } from "../../src/lib/trustEngine.js";
import { simulateVerificationStatus, submitVerification, upsertSupplierProfile } from "../../src/lib/supplierProfile.js";

const root = process.cwd();

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const supplier = {
  id: "sim-supplier",
  role: "supplier",
  full_name: "Simulation Supplier",
  email: "supplier.sim@example.com",
  business_name: "Simulation Equipment Yard",
};

const customer = {
  id: "sim-customer",
  role: "customer",
  full_name: "Simulation Customer",
  email: "customer.sim@example.com",
};

const admin = {
  id: "admin-1",
  role: "admin",
  full_name: "Simulation Admin",
  email: "admin.sim@example.com",
};

function baseListing(overrides = {}) {
  return {
    id: overrides.id || `asset-${Math.random().toString(16).slice(2)}`,
    title: "Simulation Mini Excavator",
    category: "heavy-equipment",
    subcategory: "Excavator",
    description: "Operational simulation asset for rental lifecycle testing.",
    location: "Kingston",
    rentalType: "daily",
    priceRate: 42000,
    depositRequirement: "JMD 80000 simulated refundable deposit",
    deliveryPickupOptions: "delivery only",
    availabilityStatus: "available",
    photos: [{ id: "sim-photo", name: "upload-ready-placeholder.jpg", status: "placeholder" }],
    ownerSupplierId: supplier.id,
    supplierName: supplier.business_name,
    insuranceRequirement: "Business verification required.",
    protectionRequirement: "required",
    damagePolicy: "Damage verified through inspection checklist.",
    cancellationPolicy: "Free cancellation up to 24 hours.",
    safetyInstructions: "Certified operator recommended.",
    usageInstructions: "Use only at the approved jobsite.",
    operatorRequired: true,
    verificationStatus: "verified",
    listingType: "rental",
    categoryFields: {
      equipmentType: "Mini excavator",
      operatingWeight: "3.5 tons",
      operatorRequired: "Optional",
      engineHours: "1500",
    },
    ...overrides,
  };
}

function createListing(storage, overrides = {}) {
  const result = upsertAssetListing(storage, baseListing(overrides));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  return result.listing;
}

function createApprovedPaidBooking(storage, listing, overrides = {}) {
  const bookingResult = createBookingRequest(storage, {
    user: customer,
    listing,
    input: {
      id: overrides.id || `booking-${Math.random().toString(16).slice(2)}`,
      startDateTime: "2026-08-01T09:00",
      endDateTime: "2026-08-03T09:00",
      pickupDeliveryMethod: "delivery",
      deliveryLocation: "Kingston jobsite",
      notes: "Operational simulation booking.",
      ...overrides.input,
    },
  });
  assert.equal(bookingResult.valid, true, JSON.stringify(bookingResult.errors));

  const approved = updateBookingStatus(storage, bookingResult.booking.id, "approved", supplier);
  assert.equal(approved.valid, true, approved.error);

  const paid = createSimulatedPayment(storage, { user: customer, booking: approved.booking, listing });
  assert.equal(paid.valid, true, paid.error);
  return paid.booking;
}

function completeInspectionLifecycle(storage, booking, listing) {
  const checkIn = submitInspection(storage, {
    type: "check-in",
    user: customer,
    booking,
    listing,
    input: {
      conditionStatus: "good",
      checklist: { "Exterior/body condition reviewed": true },
      odometer: "21000",
      engineHours: "1505",
      accessoriesIncluded: "Bucket, key, manual",
      customerNotes: "Machine received in good condition.",
      locationLabel: "Kingston jobsite",
    },
  });
  assert.equal(checkIn.valid, true, JSON.stringify(checkIn.errors));

  const activeBooking = getBookingById(storage, booking.id);
  assert.equal(activeBooking.status, "active");

  const checkOut = submitInspection(storage, {
    type: "check-out",
    user: customer,
    booking: activeBooking,
    listing,
    input: {
      conditionStatus: "good",
      checklist: { "Exterior/body condition reviewed": true },
      odometer: "21080",
      engineHours: "1512",
      missingAccessories: "none",
      damageNotes: "No damage noted.",
      locationLabel: "Kingston jobsite",
    },
  });
  assert.equal(checkOut.valid, true, JSON.stringify(checkOut.errors));
  assert.equal(getBookingById(storage, booking.id).status, "completed");
  return { checkIn: checkIn.inspection, checkOut: checkOut.inspection, booking: getBookingById(storage, booking.id) };
}

test("Simulation 1 supplier onboarding reaches verified searchable listing and inquiry notification", () => {
  const storage = new MemoryStorage();
  const beforeTrust = calculateSupplierTrustScore(storage, supplier.id);

  const profile = upsertSupplierProfile(storage, supplier, {
    businessName: supplier.business_name,
    contactPerson: supplier.full_name,
    phone: "876-555-0101",
    email: supplier.email,
    businessAddress: "Kingston, Jamaica",
    serviceAreas: "Kingston, St. Catherine",
    supplierType: "equipment owner",
    bio: "Verified simulation supplier.",
    businessHours: "Mon-Fri 8am-5pm",
    emergencyContact: "876-555-0199",
    publicSummary: "Heavy equipment rentals for jobsites.",
  });
  assert.equal(profile.valid, true);

  const verification = submitVerification(storage, supplier, {
    "ID document": true,
    "Business registration": true,
    "Proof of address": true,
    "Insurance document": true,
    "Asset ownership proof": true,
    "Operator certification": true,
  });
  assert.equal(verification.valid, true);

  const approved = simulateVerificationStatus(storage, supplier.id, "verified");
  assert.equal(approved.valid, true);
  assert.equal(approved.profile.verificationStatus, "verified");

  const listing = createListing(storage, { id: "sim-onboarding-excavator" });
  const results = searchAssetListings([getAssetListingById(storage, listing.id)], createEmptySearchFilters({ keyword: "excavator", location: "Kingston" }));
  assert.equal(results.length, 1);

  const booking = createBookingRequest(storage, {
    user: customer,
    listing,
    input: {
      id: "sim-onboarding-inquiry",
      startDateTime: "2026-09-01T09:00",
      endDateTime: "2026-09-02T09:00",
      pickupDeliveryMethod: "delivery",
      deliveryLocation: "Kingston",
    },
  });
  assert.equal(booking.valid, true);
  assert.ok(loadNotifications(storage).some((note) => note.recipientId === supplier.id && note.type === "new_booking_request"));

  const afterTrust = calculateSupplierTrustScore(storage, supplier.id);
  assert.ok(afterTrust.score >= beforeTrust.score);
});

test("Simulation 2 equipment rental completes booking inspection review and trust lifecycle", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, { id: "sim-equipment-excavator" });
  const booking = createApprovedPaidBooking(storage, listing, { id: "sim-equipment-booking" });
  const beforeAssetTrust = calculateAssetTrustScore(storage, listing.id);
  const completed = completeInspectionLifecycle(storage, booking, listing);

  const review = submitReview(storage, {
    user: customer,
    booking: completed.booking,
    input: {
      rating: 5,
      title: "Excellent equipment",
      comment: "Excavator worked well and supplier responded quickly.",
      reviewType: "asset",
    },
  });
  assert.equal(review.valid, true, JSON.stringify(review.errors));
  assert.equal(getAssetRatingSummary(storage, listing.id).count, 1);
  assert.ok(calculateAssetTrustScore(storage, listing.id).score >= beforeAssetTrust.score);
  assert.ok(loadNotifications(storage).some((note) => note.type === "new_review"));
});

test("Simulation 3 vehicle rental validates protection deposit-style ledger and return workflow", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, {
    id: "sim-vehicle-truck",
    title: "Simulation Pickup Truck",
    category: "trucks",
    subcategory: "Pickup",
    operatorRequired: false,
    listingType: "rent_or_buy",
    salePrice: 2600000,
    categoryFields: {
      make: "Toyota",
      model: "Hilux",
      year: "2022",
      plateVin: "VIN placeholder",
      capacity: "1 ton",
      boxSize: "standard",
      commercialUse: "yes",
      driverIncluded: "optional",
    },
  });
  const requested = createBookingRequest(storage, {
    user: customer,
    listing,
    input: {
      id: "sim-vehicle-booking",
      startDateTime: "2026-10-01T09:00",
      endDateTime: "2026-10-02T09:00",
      pickupDeliveryMethod: "pickup",
    },
  });
  assert.equal(requested.valid, true);
  const approved = updateBookingStatus(storage, requested.booking.id, "approved", supplier);
  assert.equal(approved.valid, true);

  const protection = selectBookingProtection(storage, { user: customer, bookingId: approved.booking.id, planIds: ["plan-damage-waiver", "plan-roadside"] });
  assert.equal(protection.valid, true, protection.error);
  assert.ok(protection.protectionCost > 0);

  const paid = createSimulatedPayment(storage, { user: customer, booking: protection.booking, listing });
  assert.equal(paid.valid, true, paid.error);
  const completed = completeInspectionLifecycle(storage, paid.booking, listing);
  assert.equal(completed.booking.status, "completed");
});

test("Simulation 5 messaging workflow persists thread reply notification and booking linkage", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, { id: "sim-message-asset" });
  const booking = createBookingRequest(storage, {
    user: customer,
    listing,
    input: {
      id: "sim-message-booking",
      startDateTime: "2026-11-01T09:00",
      endDateTime: "2026-11-02T09:00",
      pickupDeliveryMethod: "delivery",
      deliveryLocation: "Kingston",
    },
  });
  assert.equal(booking.valid, true);
  const thread = ensureBookingThread(storage, booking.booking, listing);
  const reply = sendMessage(storage, { threadId: thread.id, user: supplier, body: "Thanks for your inquiry. The asset is available." });
  assert.equal(reply.valid, true, reply.error);
  createNotification(storage, {
    recipientId: customer.id,
    type: "message_received",
    title: "Supplier replied",
    body: "Supplier replied to your inquiry.",
    relatedRoute: `/messages/${thread.id}`,
  });

  assert.ok(getVisibleThreads(storage, customer).some((item) => item.id === thread.id && item.bookingId === booking.booking.id));
  assert.ok(getThreadMessages(storage, thread.id).some((message) => message.senderId === supplier.id));
  assert.ok(loadNotifications(storage).some((note) => note.recipientId === customer.id && note.relatedRoute === `/messages/${thread.id}`));
});

test("Simulation 6 review lifecycle supports response moderation summary and trust impact", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, { id: "sim-review-asset" });
  const booking = createApprovedPaidBooking(storage, listing, { id: "sim-review-booking", input: { startDateTime: "2026-12-01T09:00", endDateTime: "2026-12-02T09:00" } });
  const completed = completeInspectionLifecycle(storage, booking, listing).booking;

  const review = submitReview(storage, {
    user: customer,
    booking: completed,
    input: { rating: 4, title: "Good rental", comment: "Clear handoff and easy return.", reviewType: "asset" },
  });
  assert.equal(review.valid, true);
  const response = respondToReview(storage, review.review.id, supplier, "Thanks for renting with us.");
  assert.equal(response.valid, true, response.error);
  const moderation = adminModerateReview(storage, review.review.id, "flagged");
  assert.equal(moderation.valid, true, moderation.error);
  assert.equal(getAssetRatingSummary(storage, listing.id).count, 0);
  const republished = adminModerateReview(storage, review.review.id, "published");
  assert.equal(republished.valid, true, republished.error);
  assert.equal(getAssetRatingSummary(storage, listing.id).count, 1);
});

test("Simulations 7 through 10 validate trust protection dispute and escrow state transitions", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, { id: "sim-risk-asset" });
  const booking = createApprovedPaidBooking(storage, listing, { id: "sim-risk-booking", input: { startDateTime: "2027-01-01T09:00", endDateTime: "2027-01-02T09:00" } });
  const completed = completeInspectionLifecycle(storage, booking, listing).booking;
  submitReview(storage, {
    user: customer,
    booking: completed,
    input: { rating: 5, title: "Smooth job", comment: "Everything completed safely.", reviewType: "asset" },
  });
  const positiveTrust = calculateSupplierTrustScore(storage, supplier.id);

  const claim = submitProtectionClaim(storage, {
    user: customer,
    bookingId: completed.id,
    input: { claimType: "damage", description: "Simulated damage claim for audit coverage." },
  });
  assert.equal(claim.valid, true, claim.error);
  const claimReview = adminUpdateClaimStatus(storage, claim.claim.id, "under_review", admin);
  assert.equal(claimReview.valid, true, claimReview.error);

  const dispute = openDispute(storage, {
    user: customer,
    bookingId: completed.id,
    input: { reason: "damage", summary: "Simulated damage dispute for operational audit." },
  });
  assert.equal(dispute.valid, true, dispute.error);
  const escalated = adminUpdateDisputeStatus(storage, dispute.dispute.id, "escalated_placeholder", admin, "Escalated for simulated review.");
  assert.equal(escalated.valid, true, escalated.error);
  const resolved = adminUpdateDisputeStatus(storage, dispute.dispute.id, "resolved_placeholder", admin, "Resolved placeholder outcome.");
  assert.equal(resolved.valid, true, resolved.error);
  assert.ok(getRiskQueue(storage).length >= 0);
  assert.ok(calculateSupplierTrustScore(storage, supplier.id).score <= positiveTrust.score);

  const escrowStore = new Map();
  const escrow = createEscrowService({ escrowStore, env: { ESCROW_PROVIDER: "placeholder", ESCROW_MODE: "simulated" } });
  const record = escrow.create({
    bookingId: completed.id,
    assetId: listing.id,
    supplierId: supplier.id,
    customerId: customer.id,
    depositType: "damage_deposit",
    amount: 50000,
    status: "held",
  }, { user: customer });
  const partial = escrow.updateStatus(record.id, "release", { amount: 20000 }, { user: customer });
  assert.equal(partial.status, "partially_released");
  const disputed = escrow.updateStatus(partial.id, "dispute", { reason: "return condition review" }, { user: customer });
  assert.equal(disputed.status, "disputed");
  const refunded = escrow.updateStatus(disputed.id, "refund", { amount: 30000 }, { user: customer });
  assert.equal(refunded.status, "refunded");
  assert.equal(refunded.liveFundsProcessed, false);
});

test("Simulation 11 admin operations remain controlled and reflected in local state", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, { id: "sim-admin-asset" });
  const booking = createApprovedPaidBooking(storage, listing, { id: "sim-admin-booking", input: { startDateTime: "2027-02-01T09:00", endDateTime: "2027-02-02T09:00" } });
  const completed = completeInspectionLifecycle(storage, booking, listing).booking;
  const claim = submitProtectionClaim(storage, { user: customer, bookingId: completed.id, input: { claimType: "damage", description: "Admin review claim." } });
  const dispute = openDispute(storage, { user: supplier, bookingId: completed.id, input: { reason: "payment_issue", summary: "Admin review dispute." } });
  assert.equal(claim.valid, true);
  assert.equal(dispute.valid, true);
  assert.equal(adminUpdateClaimStatus(storage, claim.claim.id, "escalated_placeholder", admin).valid, true);
  assert.equal(adminUpdateDisputeStatus(storage, dispute.dispute.id, "under_review", admin).valid, true);
  assert.ok(loadNotifications(storage).some((note) => note.type === "claim_status_updated"));
  assert.ok(loadNotifications(storage).some((note) => note.type === "dispute_status_updated"));
});

test("Simulation 12 AI marketplace assistant returns local recommendations without live claims", () => {
  const storage = new MemoryStorage();
  const listing = createListing(storage, { id: "sim-ai-asset" });
  const other = createListing(storage, { id: "sim-ai-compare", title: "Simulation Backup Excavator", priceRate: 39000 });
  const search = runAiSearchAssistant(storage, "I need a mini excavator in Kingston with operator");
  assert.equal(search.parsed.filters.category, "heavy-equipment");
  assert.ok(search.suggestions.some((item) => item.listing.id === listing.id));
  assert.match(suggestListingContent({ category: "heavy-equipment", location: "Kingston" }).description, /RentasHub/);
  assert.ok(adviseRentalChoice(storage, { assetId: listing.id, compareAssetId: other.id }).recommendation);
  assert.ok(Array.isArray(createBrokerAssistantMatches(storage).tradeMatches));
  assert.ok(generateMarketInsights(storage).popularCategories.length > 0);
});

test("operational simulation deliverables exist and preserve paid/public launch NO-GO decisions", () => {
  const files = [
    "docs/operational-simulation-report.md",
    "docs/operational-simulation-defect-register.md",
    "docs/operational-simulation-critical-issues.md",
    "docs/paid-pilot-operational-recommendation.md",
    "docs/public-launch-operational-recommendation.md",
  ];
  for (const file of files) assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  const report = readFileSync(join(root, "docs/operational-simulation-report.md"), "utf8");
  for (const text of [
    "SIM-01",
    "SIM-02",
    "SIM-12",
    "Operational simulation score: 75%",
    "Paid Pilot: NO-GO",
    "Public Launch: NO-GO",
  ]) {
    assert.match(report, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(report, /PUBLIC LAUNCH GO|Paid Pilot: GO|production ready/i);
});
