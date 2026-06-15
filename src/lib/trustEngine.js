import { getAssetListingById, getSupplierListings, loadAssetListings } from "./assetListing.js";
import { getCustomerBookings, getSupplierBookings, loadBookings } from "./bookingService.js";
import { loadInspections } from "./inspectionService.js";
import { loadMessages, loadThreads } from "./messagingService.js";
import { loadLedger } from "./paymentLedger.js";
import { getClaimsForAsset, getClaimsForSupplier, getProtectedListingRatio, loadClaims } from "./protectionService.js";
import { getAssetRatingSummary, getSupplierRatingSummary, loadReviews } from "./reviewService.js";
import { calculateProfileCompleteness, getSupplierProfile } from "./supplierProfile.js";

export const TRUST_SCORE_VERSION = "local-v1.1";

export const TRUST_BADGES = {
  verifiedSupplier: "Verified Supplier",
  trustedSupplier: "Trusted Supplier",
  goldSupplier: "Gold Supplier",
  platinumSupplier: "Platinum Supplier",
  topBroker: "Top Broker",
  fastResponder: "Fast Responder",
  safeOperator: "Safe Operator",
  reliableCustomer: "Reliable Customer",
  trustedAsset: "Trusted Asset",
};

export const RISK_FLAGS = {
  excessiveDisputes: "Excessive disputes",
  frequentCancellations: "Frequent cancellations",
  poorReviewTrend: "Poor review trends",
  suspiciousActivity: "Suspicious activity",
  incompleteVerification: "Incomplete verification",
  damageFrequency: "Damage frequency",
  lateReturns: "Late returns",
  noShows: "No-shows",
  lowFulfillment: "Low fulfillment",
  lowUptime: "Low asset uptime",
  depositForfeitures: "Deposit forfeitures",
  escalatedClaims: "Escalated claims",
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioScore(numerator, denominator) {
  if (!denominator) return 50;
  return clampScore((numerator / denominator) * 100);
}

function ratingScore(summary) {
  if (!summary.count) return 50;
  return clampScore((Number(summary.average || 0) / 5) * 100);
}

function listingQualityScore(listing) {
  const fields = ["title", "description", "location", "priceRate", "depositRequirement", "insuranceRequirement", "damagePolicy", "cancellationPolicy", "safetyInstructions", "usageInstructions"];
  const complete = fields.filter((field) => String(listing?.[field] || "").trim()).length;
  const photos = Array.isArray(listing?.photos) && listing.photos.length ? 1 : 0;
  return clampScore(((complete + photos) / (fields.length + 1)) * 100);
}

function average(values = []) {
  if (!values.length) return 50;
  return values.reduce((total, value) => total + Number(value || 0), 0) / values.length;
}

function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function hoursBetween(first, second) {
  const start = new Date(first).getTime();
  const end = new Date(second).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / 36e5;
}

function hasDamageSignal(inspection) {
  return Boolean(
    inspection?.supplierReview?.status === "flagged"
    || String(inspection?.damageNotes || "").trim()
    || String(inspection?.conditionStatus || "").toLowerCase().includes("damage")
  );
}

function isLateReturn(booking) {
  if (booking?.lateReturn === true) return true;
  if (!booking?.actualReturnDateTime || !booking?.endDateTime) return false;
  return new Date(booking.actualReturnDateTime).getTime() > new Date(booking.endDateTime).getTime();
}

function isNoShow(booking) {
  return booking?.noShow === true || booking?.status === "no_show";
}

function isDepositForfeited(transaction) {
  return transaction?.depositForfeited === true || transaction?.type === "deposit_forfeiture" || transaction?.status === "forfeited";
}

function isSeriousClaim(claim) {
  return ["escalated_placeholder", "approved_placeholder"].includes(claim?.status);
}

function reviewTrendScore(reviews = []) {
  const published = reviews
    .filter((review) => review.status === "published")
    .sort((a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0));
  if (published.length < 2) return 50;
  const midpoint = Math.ceil(published.length / 2);
  const earlier = average(published.slice(0, midpoint).map((review) => review.rating));
  const later = average(published.slice(midpoint).map((review) => review.rating));
  return clampScore(50 + ((later - earlier) * 20));
}

function responseTimeMetrics(storage, supplierId) {
  const threads = loadThreads(storage).filter((thread) => thread.supplierId === supplierId);
  const responseHours = [];
  for (const thread of threads) {
    const messages = loadMessages(storage)
      .filter((message) => message.threadId === thread.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let index = 0; index < messages.length - 1; index += 1) {
      const message = messages[index];
      if (message.senderRole !== "customer") continue;
      const reply = messages.slice(index + 1).find((candidate) => candidate.senderRole === "supplier");
      const hours = reply ? hoursBetween(message.timestamp, reply.timestamp) : null;
      if (hours !== null) responseHours.push(hours);
    }
  }
  const averageResponseHours = responseHours.length ? Math.round(average(responseHours) * 10) / 10 : null;
  return {
    averageResponseHours,
    responseTimeScore: averageResponseHours === null ? 50 : clampScore(100 - Math.min(72, averageResponseHours) * 1.25),
  };
}

function assetAgeScore(listing) {
  const year = Number(listing?.categoryFields?.year || listing?.year || "");
  if (Number.isFinite(year) && year > 1900) {
    const age = Math.max(0, new Date().getFullYear() - year);
    return { assetAgeYears: age, assetAgeScore: clampScore(100 - Math.min(30, age) * 2) };
  }
  const createdAt = listing?.createdAt ? new Date(listing.createdAt).getTime() : null;
  if (createdAt && !Number.isNaN(createdAt)) {
    const age = Math.max(0, (Date.now() - createdAt) / 31536e6);
    return { assetAgeYears: Math.round(age * 10) / 10, assetAgeScore: clampScore(95 - Math.min(20, age)) };
  }
  return { assetAgeYears: null, assetAgeScore: 50 };
}

function supplierBookings(storage, supplierId) {
  return getSupplierBookings(storage, supplierId);
}

function supplierInspections(storage, supplierId) {
  const assetIds = new Set(getSupplierListings(storage, supplierId).map((listing) => listing.id));
  return loadInspections(storage).filter((inspection) => assetIds.has(inspection.assetId));
}

function riskLevel(score, flags = []) {
  if (flags.length >= 2 || score < 45) return "high";
  if (flags.length || score < 70) return "medium";
  return "low";
}

export function calculateSupplierReputationMetrics(storage, supplierId) {
  const listings = getSupplierListings(storage, supplierId);
  const bookings = supplierBookings(storage, supplierId);
  const inspections = supplierInspections(storage, supplierId);
  const reviews = loadReviews(storage).filter((review) => review.supplierId === supplierId);
  const ledger = loadLedger(storage).filter((transaction) => transaction.supplierId === supplierId);
  const quotes = bookings.filter((booking) => ["approved", "declined", "active", "completed", "cancelled"].includes(booking.status));
  const fulfilled = bookings.filter((booking) => booking.status === "completed").length;
  const accepted = bookings.filter((booking) => ["approved", "active", "completed"].includes(booking.status)).length;
  const uniqueCustomers = new Set(bookings.map((booking) => booking.customerId).filter(Boolean));
  const repeatCustomers = [...uniqueCustomers].filter((customerId) => bookings.filter((booking) => booking.customerId === customerId).length > 1).length;
  const availableListings = listings.filter((listing) => !["maintenance", "unavailable"].includes(listing.availabilityStatus)).length;
  const flaggedInspections = inspections.filter(hasDamageSignal).length;
  const resolvedDisputes = inspections.filter((inspection) => inspection.supplierReview?.status === "accepted").length;
  const revenueVolume = sum(ledger.filter((transaction) => transaction.type === "payment").map((transaction) => transaction.supplierEarnings || transaction.total));
  const claims = getClaimsForSupplier(storage, supplierId);
  const seriousClaims = claims.filter(isSeriousClaim).length;
  const response = responseTimeMetrics(storage, supplierId);
  return {
    averageResponseHours: response.averageResponseHours,
    responseTimeScore: response.responseTimeScore,
    quoteAcceptanceRate: ratioScore(accepted, Math.max(1, quotes.length)),
    bookingFulfillmentRate: ratioScore(fulfilled, Math.max(1, bookings.length)),
    assetUptimePercentage: ratioScore(availableListings, Math.max(1, listings.length)),
    repeatCustomerPercentage: ratioScore(repeatCustomers, Math.max(1, uniqueCustomers.size)),
    revenueVolume,
    revenueScore: clampScore(Math.min(100, revenueVolume / 1000)),
    disputeResolutionScore: flaggedInspections ? ratioScore(resolvedDisputes, flaggedInspections + resolvedDisputes) : 80,
    averageReviewTrendScore: reviewTrendScore(reviews),
    protectionAvailabilityPercentage: getProtectedListingRatio(storage, supplierId),
    claimSignalScore: clampScore(100 - Math.min(60, seriousClaims * 20)),
    totalClaims: claims.length,
    seriousClaims,
  };
}

export function calculateCustomerReputationMetrics(storage, customerId) {
  const bookings = getCustomerBookings(storage, customerId);
  const inspections = loadInspections(storage).filter((inspection) => bookings.some((booking) => booking.id === inspection.bookingId));
  const ledger = loadLedger(storage).filter((transaction) => transaction.customerId === customerId);
  const claims = loadClaims(storage).filter((claim) => claim.customerId === customerId);
  const seriousClaims = claims.filter(isSeriousClaim).length;
  const uniqueAssets = new Set(bookings.map((booking) => booking.assetId).filter(Boolean));
  const repeatAssets = [...uniqueAssets].filter((assetId) => bookings.filter((booking) => booking.assetId === assetId).length > 1).length;
  const damageIncidents = inspections.filter(hasDamageSignal).length;
  const noShows = bookings.filter(isNoShow).length;
  const lateReturns = bookings.filter(isLateReturn).length;
  const depositForfeitures = ledger.filter(isDepositForfeited).length;
  return {
    noShowRate: ratioScore(Math.max(0, bookings.length - noShows), Math.max(1, bookings.length)),
    lateReturnRate: ratioScore(Math.max(0, bookings.length - lateReturns), Math.max(1, bookings.length)),
    damageHistoryScore: clampScore(100 - Math.min(80, damageIncidents * 20)),
    depositForfeitureScore: clampScore(100 - Math.min(80, depositForfeitures * 25)),
    repeatBookingScore: ratioScore(repeatAssets, Math.max(1, uniqueAssets.size)),
    claimSignalScore: clampScore(100 - Math.min(60, seriousClaims * 20)),
    totalClaims: claims.length,
    seriousClaims,
    noShows,
    lateReturns,
    damageIncidents,
    depositForfeitures,
  };
}

export function calculateAssetReputationMetrics(storage, assetId) {
  const listing = getAssetListingById(storage, assetId);
  const bookings = loadBookings(storage).filter((booking) => booking.assetId === assetId);
  const inspections = loadInspections(storage).filter((inspection) => inspection.assetId === assetId);
  const reviews = loadReviews(storage).filter((review) => review.assetId === assetId);
  const claims = getClaimsForAsset(storage, assetId);
  const seriousClaims = claims.filter(isSeriousClaim).length;
  const breakdowns = inspections.filter((inspection) => (
    hasDamageSignal(inspection)
    || String(inspection.customerNotes || "").toLowerCase().includes("breakdown")
    || String(inspection.damageNotes || "").toLowerCase().includes("breakdown")
  )).length;
  const maintenanceEvents = inspections.filter((inspection) => (
    inspection.supplierReview?.status === "accepted"
    || String(inspection.customerNotes || "").toLowerCase().includes("maintenance")
    || String(inspection.damageNotes || "").toLowerCase().includes("maintenance")
  )).length;
  const passedInspections = inspections.filter((inspection) => !hasDamageSignal(inspection)).length;
  const age = assetAgeScore(listing);
  const hasInsurance = Boolean(String(listing?.insuranceRequirement || "").trim());
  return {
    breakdownFrequencyScore: clampScore(100 - Math.min(80, breakdowns * 20)),
    maintenanceHistoryScore: inspections.length ? ratioScore(maintenanceEvents, inspections.length) : 50,
    averageReviewTrendScore: reviewTrendScore(reviews),
    assetAgeYears: age.assetAgeYears,
    assetAgeScore: age.assetAgeScore,
    insuranceStatusScore: hasInsurance ? 100 : 40,
    inspectionPassRate: ratioScore(passedInspections, Math.max(1, inspections.length)),
    protectionAvailabilityScore: ["required", "optional"].includes(listing?.protectionRequirement || "optional") ? 100 : 40,
    claimSignalScore: clampScore(100 - Math.min(60, seriousClaims * 20)),
    totalClaims: claims.length,
    seriousClaims,
    breakdowns,
    maintenanceEvents,
  };
}

export function calculateSupplierTrustScore(storage, supplierId) {
  const profile = getSupplierProfile(storage, supplierId);
  const listings = getSupplierListings(storage, supplierId);
  const bookings = supplierBookings(storage, supplierId);
  const inspections = supplierInspections(storage, supplierId);
  const reviews = getSupplierRatingSummary(storage, supplierId);
  const completed = bookings.filter((booking) => booking.status === "completed").length;
  const cancelledDeclined = bookings.filter((booking) => ["cancelled", "declined"].includes(booking.status)).length;
  const flaggedInspections = inspections.filter((inspection) => inspection.supplierReview?.status === "flagged").length;
  const flaggedReviews = loadReviews(storage).filter((review) => review.supplierId === supplierId && ["hidden", "flagged"].includes(review.status)).length;
  const profileScore = calculateProfileCompleteness(profile);
  const verificationScore = profile.verificationStatus === "verified" ? 100 : profile.verificationStatus === "pending" ? 70 : profile.verificationStatus === "needs_more_info" ? 45 : 25;
  const bookingScore = ratioScore(completed, Math.max(1, bookings.length));
  const listingScore = average(listings.map(listingQualityScore));
  const reviewScore = ratingScore(reviews);
  const reputation = calculateSupplierReputationMetrics(storage, supplierId);
  const advancedScore = average([
    reputation.responseTimeScore,
    reputation.quoteAcceptanceRate,
    reputation.bookingFulfillmentRate,
    reputation.assetUptimePercentage,
    reputation.repeatCustomerPercentage,
    reputation.revenueScore,
    reputation.disputeResolutionScore,
    reputation.averageReviewTrendScore,
    reputation.protectionAvailabilityPercentage,
    reputation.claimSignalScore,
  ]);
  const disputePenalty = Math.min(30, (flaggedInspections + flaggedReviews) * 10);
  const cancellationPenalty = Math.min(20, cancelledDeclined * 8);
  const score = clampScore((verificationScore * 0.2) + (profileScore * 0.12) + (listingScore * 0.13) + (bookingScore * 0.12) + (reviewScore * 0.18) + (advancedScore * 0.15) + 10 - disputePenalty - cancellationPenalty);
  const badges = [];
  if (profile.verificationStatus === "verified") badges.push(TRUST_BADGES.verifiedSupplier);
  if (score >= 70) badges.push(TRUST_BADGES.trustedSupplier);
  if (score >= 85) badges.push(TRUST_BADGES.goldSupplier);
  if (score >= 95) badges.push(TRUST_BADGES.platinumSupplier);
  if (flaggedInspections === 0) badges.push(TRUST_BADGES.safeOperator);
  if (bookings.length && cancelledDeclined === 0) badges.push(TRUST_BADGES.fastResponder);
  const flags = [];
  if (profile.verificationStatus !== "verified") flags.push(RISK_FLAGS.incompleteVerification);
  if (flaggedInspections + flaggedReviews >= 2) flags.push(RISK_FLAGS.excessiveDisputes);
  if (cancelledDeclined >= 2) flags.push(RISK_FLAGS.frequentCancellations);
  if (reviews.count && reviews.average < 3.5) flags.push(RISK_FLAGS.poorReviewTrend);
  if (reputation.bookingFulfillmentRate < 50 && bookings.length >= 2) flags.push(RISK_FLAGS.lowFulfillment);
  if (reputation.assetUptimePercentage < 60 && listings.length) flags.push(RISK_FLAGS.lowUptime);
  if (reputation.seriousClaims >= 2) flags.push(RISK_FLAGS.escalatedClaims);
  return {
    entityType: "supplier",
    entityId: supplierId,
    score,
    riskLevel: riskLevel(score, flags),
    badges,
    flags,
    inputs: { verificationScore, profileScore, listingScore: clampScore(listingScore), bookingScore, reviewScore, advancedScore: clampScore(advancedScore), completedBookings: completed, totalBookings: bookings.length, flaggedInspections, flaggedReviews, cancelledDeclined, ...reputation },
    version: TRUST_SCORE_VERSION,
  };
}

export function calculateCustomerTrustScore(storage, customerId) {
  const bookings = getCustomerBookings(storage, customerId);
  const reviews = loadReviews(storage).filter((review) => review.customerId === customerId || review.reviewerId === customerId);
  const ledger = loadLedger(storage).filter((transaction) => transaction.customerId === customerId);
  const completed = bookings.filter((booking) => booking.status === "completed").length;
  const cancelled = bookings.filter((booking) => booking.status === "cancelled").length;
  const paid = ledger.filter((transaction) => transaction.status === "paid" || transaction.status === "completed").length;
  const flaggedReviews = reviews.filter((review) => ["hidden", "flagged"].includes(review.status)).length;
  const reputation = calculateCustomerReputationMetrics(storage, customerId);
  const paymentScore = ratioScore(paid, Math.max(1, bookings.filter((booking) => ["approved", "active", "completed"].includes(booking.status)).length));
  const completionScore = ratioScore(completed, Math.max(1, bookings.length));
  const reviewScore = reviews.length ? ratingScore({ average: average(reviews.map((review) => review.rating)), count: reviews.length }) : 60;
  const accountAgeScore = bookings.length ? 75 : 45;
  const advancedScore = average([reputation.noShowRate, reputation.lateReturnRate, reputation.damageHistoryScore, reputation.depositForfeitureScore, reputation.repeatBookingScore, reputation.claimSignalScore]);
  const score = clampScore((completionScore * 0.25) + (paymentScore * 0.2) + (reviewScore * 0.18) + (accountAgeScore * 0.12) + (advancedScore * 0.15) + 10 - (cancelled * 8) - (flaggedReviews * 10));
  const flags = [];
  if (cancelled >= 2) flags.push(RISK_FLAGS.frequentCancellations);
  if (flaggedReviews >= 2) flags.push(RISK_FLAGS.poorReviewTrend);
  if (reputation.noShows >= 2) flags.push(RISK_FLAGS.noShows);
  if (reputation.lateReturns >= 2) flags.push(RISK_FLAGS.lateReturns);
  if (reputation.depositForfeitures >= 1) flags.push(RISK_FLAGS.depositForfeitures);
  if (reputation.seriousClaims >= 2) flags.push(RISK_FLAGS.escalatedClaims);
  const badges = [];
  if (score >= 75) badges.push(TRUST_BADGES.reliableCustomer);
  return { entityType: "customer", entityId: customerId, score, riskLevel: riskLevel(score, flags), badges, flags, inputs: { completedBookings: completed, totalBookings: bookings.length, paymentScore, reviewScore, accountAgeScore, advancedScore: clampScore(advancedScore), cancelled, flaggedReviews, ...reputation }, version: TRUST_SCORE_VERSION };
}

export function calculateAssetTrustScore(storage, assetId) {
  const listing = getAssetListingById(storage, assetId);
  const bookings = loadBookings(storage).filter((booking) => booking.assetId === assetId);
  const inspections = loadInspections(storage).filter((inspection) => inspection.assetId === assetId);
  const reviews = getAssetRatingSummary(storage, assetId);
  const completed = bookings.filter((booking) => booking.status === "completed").length;
  const damageFlags = inspections.filter((inspection) => inspection.supplierReview?.status === "flagged" || String(inspection.damageNotes || "").trim()).length;
  const verificationScore = listing?.verificationStatus === "verified" ? 100 : listing?.verificationStatus === "pending review" ? 70 : 45;
  const inspectionScore = inspections.length ? clampScore(100 - (damageFlags / inspections.length) * 60) : 60;
  const bookingScore = ratioScore(completed, Math.max(1, bookings.length));
  const reviewScore = ratingScore(reviews);
  const qualityScore = listingQualityScore(listing);
  const reputation = calculateAssetReputationMetrics(storage, assetId);
  const advancedScore = average([
    reputation.breakdownFrequencyScore,
    reputation.maintenanceHistoryScore,
    reputation.averageReviewTrendScore,
    reputation.assetAgeScore,
    reputation.insuranceStatusScore,
    reputation.inspectionPassRate,
    reputation.protectionAvailabilityScore,
    reputation.claimSignalScore,
  ]);
  const score = clampScore((verificationScore * 0.17) + (inspectionScore * 0.2) + (bookingScore * 0.12) + (reviewScore * 0.2) + (qualityScore * 0.13) + (advancedScore * 0.18));
  const flags = [];
  if (damageFlags >= 2) flags.push(RISK_FLAGS.damageFrequency);
  if (reviews.count && reviews.average < 3.5) flags.push(RISK_FLAGS.poorReviewTrend);
  if (listing?.verificationStatus !== "verified") flags.push(RISK_FLAGS.incompleteVerification);
  if (reputation.breakdowns >= 2) flags.push(RISK_FLAGS.damageFrequency);
  if (reputation.seriousClaims >= 2) flags.push(RISK_FLAGS.escalatedClaims);
  const badges = [];
  if (score >= 75) badges.push(TRUST_BADGES.trustedAsset);
  if (damageFlags === 0) badges.push(TRUST_BADGES.safeOperator);
  return { entityType: "asset", entityId: assetId, score, riskLevel: riskLevel(score, flags), badges, flags: [...new Set(flags)], inputs: { verificationScore, inspectionScore, bookingScore, reviewScore, qualityScore, advancedScore: clampScore(advancedScore), completedBookings: completed, totalBookings: bookings.length, damageFlags, ...reputation }, version: TRUST_SCORE_VERSION };
}

export function getTrustSummaryForListing(storage, listing) {
  if (!listing) return null;
  return {
    supplier: calculateSupplierTrustScore(storage, listing.ownerSupplierId),
    asset: calculateAssetTrustScore(storage, listing.id),
  };
}

export function rankListingsByTrust(storage, listings = []) {
  return [...listings].sort((a, b) => calculateAssetTrustScore(storage, b.id).score - calculateAssetTrustScore(storage, a.id).score);
}

export function createTrustOverview(storage) {
  const listings = loadAssetListings(storage);
  const supplierIds = [...new Set(listings.map((listing) => listing.ownerSupplierId))];
  return {
    suppliers: supplierIds.map((supplierId) => calculateSupplierTrustScore(storage, supplierId)),
    assets: listings.map((listing) => calculateAssetTrustScore(storage, listing.id)),
    customers: [...new Set(loadBookings(storage).map((booking) => booking.customerId))].map((customerId) => calculateCustomerTrustScore(storage, customerId)),
  };
}

export function getRiskQueue(storage) {
  const overview = createTrustOverview(storage);
  return [...overview.suppliers, ...overview.assets, ...overview.customers]
    .filter((item) => item.riskLevel !== "low" || item.flags.length)
    .sort((a, b) => a.score - b.score);
}
