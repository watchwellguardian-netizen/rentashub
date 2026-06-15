import { ASSET_CATEGORIES, loadAssetListings } from "./assetListing.js";
import { loadBookings } from "./bookingService.js";
import { loadInspections } from "./inspectionService.js";
import { loadLedger } from "./paymentLedger.js";
import { loadThreads } from "./messagingService.js";
import { loadReviews } from "./reviewService.js";
import { REVIEW_USERS, normalizeRole } from "./rbac.js";
import { VERIFICATION_STATUSES, loadSupplierProfiles, simulateVerificationStatus } from "./supplierProfile.js";
import { loadBrokerLeads, loadOffers, loadWantedRequests } from "./marketplaceExchange.js";
import { loadClaims } from "./protectionService.js";
import { getCredentialReadinessSummary } from "./credentialReadiness.js";
import { getRiskQueue } from "./trustEngine.js";
import { calculateAuctionKpis, loadAuctionAudit, loadAuctionBids, loadAuctionEscrowLedger, loadAuctionListings } from "./auctionService.js";

export const ADMIN_NAV = [
  { route: "/admin", label: "Overview" },
  { route: "/admin/users", label: "Users" },
  { route: "/admin/listings", label: "Listings" },
  { route: "/admin/auctions", label: "Auctions" },
  { route: "/admin/bookings", label: "Bookings" },
  { route: "/admin/verifications", label: "Verifications" },
  { route: "/admin/payments", label: "Payments" },
  { route: "/admin/messages", label: "Messages" },
  { route: "/admin/reviews", label: "Reviews" },
  { route: "/admin/claims", label: "Claims" },
  { route: "/admin/disputes", label: "Disputes" },
  { route: "/admin/risk", label: "Risk" },
  { route: "/admin/compliance", label: "Compliance" },
  { route: "/admin/revenue", label: "Revenue" },
  { route: "/admin/ai-listing-recommendations", label: "AI Recommendations" },
  { route: "/admin/ai-valuations", label: "AI Valuations" },
  { route: "/admin/reports", label: "Reports" },
  { route: "/admin/settings", label: "Settings" },
];

export function canAccessAdminCenter(role) {
  return normalizeRole(role) === "admin";
}

export function createAdminSnapshot(storage) {
  const users = REVIEW_USERS;
  const listings = loadAssetListings(storage);
  const bookings = loadBookings(storage);
  const ledger = loadLedger(storage);
  const threads = loadThreads(storage);
  const reviews = loadReviews(storage);
  const profiles = loadSupplierProfiles(storage);
  const inspections = loadInspections(storage);
  const marketplaceOffers = loadOffers(storage);
  const wantedRequests = loadWantedRequests(storage);
  const brokerLeads = loadBrokerLeads(storage);
  const claims = loadClaims(storage);
  const trustRiskQueue = getRiskQueue(storage);
  const credentialReadiness = getCredentialReadinessSummary();
  const auctionListings = loadAuctionListings(storage);
  const auctionBids = loadAuctionBids(storage);
  const auctionAudit = loadAuctionAudit(storage);
  const auctionEscrow = loadAuctionEscrowLedger(storage);
  const auctionKpis = calculateAuctionKpis(storage);

  const bookingsByStatus = bookings.reduce((totals, booking) => ({ ...totals, [booking.status]: (totals[booking.status] || 0) + 1 }), {});
  const verificationPipeline = VERIFICATION_STATUSES.reduce((totals, status) => ({ ...totals, [status]: profiles.filter((profile) => profile.verificationStatus === status).length }), {});
  const simulatedPaymentTotal = ledger.filter((txn) => txn.type === "payment").reduce((total, txn) => total + Number(txn.total || 0), 0);
  const supplierEarningsTotal = ledger.filter((txn) => txn.type === "payment").reduce((total, txn) => total + Number(txn.supplierEarnings || 0), 0);

  return {
    users,
    listings,
    bookings,
    ledger,
    threads,
    reviews,
    profiles,
    inspections,
    marketplaceActivity: { offers: marketplaceOffers, wantedRequests, brokerLeads },
    claims,
    auctions: { listings: auctionListings, bids: auctionBids, audit: auctionAudit, escrow: auctionEscrow, kpis: auctionKpis },
    trustRiskQueue,
    credentialReadiness,
    overview: {
      users: users.length,
      suppliers: users.filter((user) => ["supplier", "vendor"].includes(user.role)).length,
      customers: users.filter((user) => ["customer", "guest", "user"].includes(user.role)).length,
      listings: listings.length,
      bookings: bookings.length,
      payments: ledger.length,
      pendingVerifications: profiles.filter((profile) => profile.verificationStatus === "pending").length,
      openInspectionFlags: inspections.filter((inspection) => inspection.supplierReview?.status === "flagged").length,
      reviews: reviews.length,
      marketplaceOffers: marketplaceOffers.length,
      wantedRequests: wantedRequests.length,
      brokerLeads: brokerLeads.length,
      claims: claims.length,
      auctions: auctionListings.length,
      auctionBids: auctionBids.length,
      auctionAudit: auctionAudit.length,
      auctionEscrow: auctionEscrow.length,
      trustRiskItems: trustRiskQueue.length,
      credentialReadinessItems: credentialReadiness.workstreams.length,
      securityBaselineItems: credentialReadiness.securityBaseline.length,
      deploymentReadinessItems: credentialReadiness.deploymentReadiness.length,
      pilotReadinessScore: credentialReadiness.pilotOperations.score,
      paymentReadinessScore: credentialReadiness.paymentActivation.score,
      escrowReadinessScore: credentialReadiness.escrowActivation.score,
      infrastructureReadinessScore: credentialReadiness.infrastructureActivation.score,
      securityHardeningScore: credentialReadiness.securityHardening.score,
      complianceReadinessScore: credentialReadiness.complianceActivation.score,
      revenueReadinessScore: credentialReadiness.revenueActivation.score,
      securityCertificationScore: credentialReadiness.securityCertification.score,
    },
    reports: {
      totalListings: listings.length,
      bookingsByStatus,
      simulatedPaymentTotal,
      supplierEarningsTotal,
      verificationPipeline,
    },
    recentActivity: [
      ...bookings.slice(0, 3).map((booking) => ({ id: booking.id, label: `Booking ${booking.status}`, route: `/booking/${booking.id}` })),
      ...ledger.slice(0, 3).map((transaction) => ({ id: transaction.id, label: `Transaction ${transaction.type}`, route: `/transaction/${transaction.id}` })),
      ...reviews.slice(0, 3).map((review) => ({ id: review.id, label: `Review ${review.status}`, route: "/admin/reviews" })),
      ...claims.slice(0, 3).map((claim) => ({ id: claim.id, label: `Claim ${claim.status}`, route: "/admin/claims" })),
      ...auctionBids.slice(0, 3).map((bid) => ({ id: bid.bidId, label: `Auction bid ${bid.status}`, route: "/admin/bid-ledger" })),
    ],
    riskQueue: [
      ...profiles.filter((profile) => ["pending", "needs_more_info"].includes(profile.verificationStatus)).map((profile) => ({ id: profile.supplierId, label: `${profile.businessName || profile.supplierId} verification ${profile.verificationStatus}`, route: "/admin/verifications" })),
      ...inspections.filter((inspection) => inspection.supplierReview?.status === "flagged").map((inspection) => ({ id: inspection.id, label: `${inspection.assetTitle} inspection flagged`, route: `/inspection/${inspection.id}/review` })),
      ...claims.filter((claim) => ["submitted", "under_review", "escalated_placeholder"].includes(claim.status)).map((claim) => ({ id: claim.id, label: `${claim.claimType} claim ${claim.status}`, route: "/admin/claims" })),
      ...auctionListings.filter((auction) => ["pending_approval", "suspended", "under_investigation"].includes(auction.status)).map((auction) => ({ id: auction.id, label: `${auction.lotNumber} auction ${auction.status}`, route: "/admin/auction-approvals" })),
    ],
    settings: {
      platformFeePercentage: "10% placeholder",
      currency: "JMD placeholder",
      verificationRequirements: VERIFICATION_STATUSES.join(", "),
      categorySettings: ASSET_CATEGORIES.map((category) => category.label).join(", "),
      auctionSettings: `${auctionListings.length} local/demo lots, ${auctionBids.length} bids, ${auctionKpis.sellThroughRate}% sell-through readiness`,
      notificationSettings: "In-app local notifications only",
      credentialReadiness: `${credentialReadiness.workstreams.length} workstreams documented to credential-level readiness`,
      securityBaseline: `${credentialReadiness.securityBaseline.length} baseline controls tracked`,
      deploymentReadiness: `${credentialReadiness.deploymentReadiness.length} deployment and operations gates tracked`,
      pilotOperations: `${credentialReadiness.pilotOperations.score}% pilot operations readiness score`,
      paymentActivation: `${credentialReadiness.paymentActivation.score}% payment activation readiness score`,
      escrowActivation: `${credentialReadiness.escrowActivation.score}% escrow and deposit protection readiness score`,
      infrastructureActivation: `${credentialReadiness.infrastructureActivation.score}% production infrastructure activation readiness score`,
      securityHardening: `${credentialReadiness.securityHardening.score}% security hardening readiness score`,
      complianceActivation: `${credentialReadiness.complianceActivation.score}% privacy and compliance readiness score`,
      revenueActivation: `${credentialReadiness.revenueActivation.score}% revenue activation readiness score`,
      securityCertification: `${credentialReadiness.securityCertification.score}% security certification readiness score`,
    },
  };
}

export function adminSimulateVerification(storage, supplierId, status) {
  return simulateVerificationStatus(storage, supplierId, status);
}
