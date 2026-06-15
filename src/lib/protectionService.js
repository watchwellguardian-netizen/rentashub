import { getAssetListingById, loadAssetListings } from "./assetListing.js";
import { getBookingById, isCustomerRole, isSupplierRole, loadBookings, saveBookings } from "./bookingService.js";
import { appendSystemMessage, ensureBookingThread } from "./messagingService.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const CLAIM_STORAGE_KEY = "rentashub_protection_claims";
export const PROTECTION_NOTICE = "Protection options are simulated in this development version and are not real insurance products.";

export const PROTECTION_PLAN_TYPES = [
  "damage_waiver",
  "liability_protection",
  "theft_protection",
  "roadside_support",
  "equipment_breakdown",
  "event_space_protection",
  "property_protection",
];

export const CLAIM_TYPES = ["damage", "theft", "breakdown", "liability", "late_return", "missing_accessory", "other"];
export const CLAIM_STATUSES = ["draft", "submitted", "under_review", "approved_placeholder", "rejected_placeholder", "escalated_placeholder"];
export const PROTECTION_REQUIREMENTS = ["required", "optional", "not_offered"];

export const PROTECTION_PLANS = [
  {
    id: "plan-damage-waiver",
    name: "Damage Waiver",
    type: "damage_waiver",
    coverageSummary: "Local damage-waiver placeholder for accidental minor damage noted through inspection.",
    exclusions: "Wear and tear, unauthorized use, intentional damage, and pre-existing condition issues are excluded.",
    deductible: "JMD 10000 simulated deductible",
    priceModel: "percentage_of_booking",
    priceValue: 0.08,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
  {
    id: "plan-liability",
    name: "Liability Protection",
    type: "liability_protection",
    coverageSummary: "Liability protection placeholder for vehicle, truck, event, and property bookings.",
    exclusions: "No legal defense, official liability coverage, or third-party insurer is connected.",
    deductible: "JMD 15000 simulated deductible",
    priceModel: "flat",
    priceValue: 3500,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
  {
    id: "plan-theft",
    name: "Theft Protection",
    type: "theft_protection",
    coverageSummary: "Theft protection placeholder for tools, machines, equipment, and transport assets.",
    exclusions: "Unsecured storage, missing police reports, and unauthorized handoff are excluded placeholders.",
    deductible: "JMD 20000 simulated deductible",
    priceModel: "percentage_of_booking",
    priceValue: 0.06,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
  {
    id: "plan-roadside",
    name: "Roadside Support",
    type: "roadside_support",
    coverageSummary: "Roadside support placeholder for cars and trucks.",
    exclusions: "No tow dispatch, mechanic network, or emergency service provider is connected.",
    deductible: "No simulated deductible",
    priceModel: "daily_rate",
    priceValue: 1200,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
  {
    id: "plan-equipment-breakdown",
    name: "Equipment Breakdown",
    type: "equipment_breakdown",
    coverageSummary: "Equipment breakdown placeholder for heavy machinery, small tools, and specialty equipment.",
    exclusions: "Operator misuse, ignored safety rules, and undocumented pre-rental condition are excluded.",
    deductible: "JMD 25000 simulated deductible",
    priceModel: "daily_rate",
    priceValue: 2500,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
  {
    id: "plan-event-space",
    name: "Event Space Protection",
    type: "event_space_protection",
    coverageSummary: "Event space protection placeholder for venue bookings.",
    exclusions: "Noise penalties, permits, legal claims, and third-party vendor damage are excluded.",
    deductible: "JMD 20000 simulated deductible",
    priceModel: "flat",
    priceValue: 5000,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
  {
    id: "plan-property",
    name: "Property Protection",
    type: "property_protection",
    coverageSummary: "Property protection placeholder for real estate and storage/container bookings.",
    exclusions: "Tenant legal matters, structural defects, title issues, and official property coverage are excluded.",
    deductible: "JMD 30000 simulated deductible",
    priceModel: "flat",
    priceValue: 6500,
    status: "active",
    notice: PROTECTION_NOTICE,
  },
];

export function loadProtectionPlans() {
  return PROTECTION_PLANS;
}

export function getProtectionPlanById(planId) {
  return PROTECTION_PLANS.find((plan) => plan.id === planId) || null;
}

export function getRecommendedProtectionPlans(category) {
  const byCategory = {
    cars: ["damage_waiver", "liability_protection", "roadside_support"],
    trucks: ["damage_waiver", "liability_protection", "roadside_support"],
    "heavy-equipment": ["damage_waiver", "equipment_breakdown", "theft_protection"],
    "small-tools-machines": ["damage_waiver", "equipment_breakdown", "theft_protection"],
    trailers: ["damage_waiver", "theft_protection", "roadside_support"],
    "specialty-assets": ["damage_waiver", "equipment_breakdown", "theft_protection"],
    "event-spaces": ["event_space_protection", "liability_protection"],
    "real-estate": ["property_protection", "liability_protection"],
    "storage-containers": ["property_protection", "theft_protection"],
  };
  const allowed = byCategory[category] || ["damage_waiver"];
  return PROTECTION_PLANS.filter((plan) => plan.status === "active" && allowed.includes(plan.type));
}

export function calculateProtectionPlanCost(plan, booking = {}) {
  if (!plan || plan.status !== "active") return 0;
  const subtotal = Number(booking.estimatedCost || 0);
  if (plan.priceModel === "percentage_of_booking") return Math.round(subtotal * Number(plan.priceValue || 0));
  if (plan.priceModel === "daily_rate") return Math.round(Number(plan.priceValue || 0) * Math.max(1, Number(booking.estimatedDuration || 1)));
  return Math.round(Number(plan.priceValue || 0));
}

export function calculateBookingProtectionCost(booking = {}) {
  const planIds = Array.isArray(booking.protectionPlanIds) ? booking.protectionPlanIds : [];
  return planIds.reduce((total, planId) => total + calculateProtectionPlanCost(getProtectionPlanById(planId), booking), 0);
}

export function canSelectBookingProtection(user, booking) {
  return Boolean(user && booking && isCustomerRole(user.role) && booking.customerId === user.id && booking.status === "approved" && booking.paymentStatus !== "paid");
}

export function canViewBookingProtection(user, booking, listing) {
  if (!user || !booking) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (isCustomerRole(role)) return booking.customerId === user.id;
  if (isSupplierRole(role)) return listing?.ownerSupplierId === user.id || booking.supplierId === user.id;
  return false;
}

export function selectBookingProtection(storage, { user, bookingId, planIds = [] }) {
  const bookings = loadBookings(storage);
  const booking = bookings.find((item) => item.id === bookingId);
  if (!canSelectBookingProtection(user, booking)) {
    return { valid: false, error: "Only the booking customer can select simulated protection before payment." };
  }
  const validPlanIds = [...new Set(planIds)].filter((planId) => getProtectionPlanById(planId)?.status === "active");
  const selectedPlans = validPlanIds.map(getProtectionPlanById);
  const protectionCost = validPlanIds.reduce((total, planId) => total + calculateProtectionPlanCost(getProtectionPlanById(planId), booking), 0);
  const nextBooking = {
    ...booking,
    protectionPlanIds: validPlanIds,
    protectionCost,
    protectionNotice: PROTECTION_NOTICE,
    updatedAt: new Date().toISOString(),
  };
  const nextBookings = bookings.map((item) => (item.id === bookingId ? nextBooking : item));
  saveBookings(storage, nextBookings);
  const listing = getAssetListingById(storage, booking.assetId);
  const thread = ensureBookingThread(storage, nextBooking, listing);
  appendSystemMessage(storage, thread.id, validPlanIds.length ? "Simulated protection options selected for this booking." : "Simulated protection options removed from this booking.", "system");
  createNotification(storage, {
    recipientId: booking.supplierId,
    type: "protection_selected",
    title: "Protection selection updated",
    body: `${booking.customerName} updated simulated protection for ${booking.assetTitle}.`,
    relatedRoute: `/booking/${booking.id}/manage`,
  });
  return { valid: true, booking: nextBooking, selectedPlans, protectionCost, bookings: nextBookings };
}

export function loadClaims(storage) {
  if (!storage) return [];
  const raw = storage.getItem(CLAIM_STORAGE_KEY);
  if (!raw) {
    storage.setItem(CLAIM_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveClaims(storage, claims) {
  if (!storage) return claims;
  storage.setItem(CLAIM_STORAGE_KEY, JSON.stringify(claims));
  return claims;
}

export function getClaimById(storage, claimId) {
  return loadClaims(storage).find((claim) => claim.id === claimId) || null;
}

export function getClaimsForAsset(storage, assetId) {
  return loadClaims(storage).filter((claim) => claim.assetId === assetId);
}

export function getClaimsForSupplier(storage, supplierId) {
  return loadClaims(storage).filter((claim) => claim.supplierId === supplierId);
}

export function canSubmitClaim(user, booking, listing) {
  if (!user || !booking || !listing) return false;
  const role = normalizeRole(user.role);
  if (isCustomerRole(role)) return booking.customerId === user.id;
  if (isSupplierRole(role)) return listing.ownerSupplierId === user.id || booking.supplierId === user.id;
  return false;
}

export function canViewClaim(user, claim) {
  if (!user || !claim) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (isCustomerRole(role)) return claim.customerId === user.id;
  if (isSupplierRole(role)) return claim.supplierId === user.id;
  return false;
}

export function validateClaimInput(input = {}) {
  const errors = {};
  if (!CLAIM_TYPES.includes(input.claimType)) errors.claimType = "Choose a valid claim type.";
  if (!String(input.description || "").trim()) errors.description = "Claim description is required.";
  if (String(input.description || "").trim().length > 1200) errors.description = "Claim description must be 1200 characters or fewer.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function submitProtectionClaim(storage, { user, bookingId, input = {} }) {
  const booking = getBookingById(storage, bookingId);
  const listing = booking ? getAssetListingById(storage, booking.assetId) : null;
  if (!canSubmitClaim(user, booking, listing)) return { valid: false, error: "You cannot submit a claim for this booking." };
  const validation = validateClaimInput(input);
  if (!validation.valid) return validation;
  const now = new Date().toISOString();
  const claim = {
    id: input.id || `claim-${Date.now()}`,
    bookingId: booking.id,
    assetId: booking.assetId,
    customerId: booking.customerId,
    supplierId: booking.supplierId || listing.ownerSupplierId,
    claimType: input.claimType,
    description: String(input.description).trim(),
    evidence: Array.isArray(input.evidence) && input.evidence.length
      ? input.evidence
      : [{ id: `evidence-${Date.now()}`, name: "evidence upload coming soon", status: "upload-ready-placeholder" }],
    linkedDisputeId: input.linkedDisputeId || "",
    linkedInspectionId: input.linkedInspectionId || "",
    status: "submitted",
    submittedByUserId: user.id,
    submittedByRole: normalizeRole(user.role),
    createdAt: now,
    updatedAt: now,
    notice: PROTECTION_NOTICE,
  };
  const claims = [claim, ...loadClaims(storage)];
  saveClaims(storage, claims);
  const thread = ensureBookingThread(storage, booking, listing);
  appendSystemMessage(storage, thread.id, `Simulated protection claim submitted: ${claim.claimType}.`, "system");
  const otherPartyId = user.id === booking.customerId ? claim.supplierId : booking.customerId;
  createNotification(storage, {
    recipientId: otherPartyId,
    type: "claim_submitted",
    title: "Protection claim submitted",
    body: `${claim.claimType} claim submitted for ${booking.assetTitle}.`,
    relatedRoute: `/claim/${claim.id}`,
  });
  createNotification(storage, {
    recipientId: "admin-1",
    type: "claim_submitted_admin",
    title: "New simulated claim",
    body: `${claim.claimType} claim submitted for ${booking.assetTitle}.`,
    relatedRoute: "/admin/claims",
  });
  return { valid: true, claim, claims };
}

export function adminUpdateClaimStatus(storage, claimId, status, adminUser) {
  if (normalizeRole(adminUser?.role) !== "admin") return { valid: false, error: "Admin access is required." };
  if (!CLAIM_STATUSES.includes(status)) return { valid: false, error: "Choose a valid claim status." };
  const claims = loadClaims(storage);
  const claim = claims.find((item) => item.id === claimId);
  if (!claim) return { valid: false, error: "Claim was not found." };
  const nextClaim = { ...claim, status, updatedAt: new Date().toISOString() };
  const nextClaims = claims.map((item) => (item.id === claimId ? nextClaim : item));
  saveClaims(storage, nextClaims);
  for (const recipientId of [claim.customerId, claim.supplierId]) {
    createNotification(storage, {
      recipientId,
      type: "claim_status_updated",
      title: "Claim status updated",
      body: `Simulated claim ${claim.id} is now ${status}. No payout or legal decision was made.`,
      relatedRoute: `/claim/${claim.id}`,
    });
  }
  return { valid: true, claim: nextClaim, claims: nextClaims };
}

export function resolveClaimContext(storage, claimId) {
  const claim = getClaimById(storage, claimId);
  const booking = claim ? getBookingById(storage, claim.bookingId) : null;
  const listing = claim ? getAssetListingById(storage, claim.assetId) : null;
  return { claim, booking, listing };
}

export function getProtectionAvailabilitySummary(listing) {
  const status = listing?.protectionRequirement || "optional";
  const recommendedPlans = getRecommendedProtectionPlans(listing?.category);
  return {
    status,
    recommendedPlans,
    available: status !== "not_offered" && recommendedPlans.length > 0,
    required: status === "required",
  };
}

export function getProtectedListingRatio(storage, supplierId) {
  const listings = loadAssetListings(storage).filter((listing) => listing.ownerSupplierId === supplierId);
  const protectedListings = listings.filter((listing) => ["required", "optional"].includes(listing.protectionRequirement || "optional")).length;
  return listings.length ? Math.round((protectedListings / listings.length) * 100) : 50;
}
