import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  AUCTION_CATEGORIES,
  AUCTION_DOCUMENT_TYPES,
  AUCTION_DISPUTE_STATUSES,
  AUCTION_NOTIFICATION_EVENTS,
  AUCTION_PAYMENT_STATUSES,
  AUCTION_ROUTE_GROUPS,
  adminUpdateAuctionStatus,
  calculateAuctionKpis,
  canBid,
  createAuctionListing,
  createAuctionDispute,
  generateAuctionDocumentPlaceholder,
  getAuctionById,
  getAuctionDashboard,
  getAuctionOperationalWorkflow,
  getBidderVerification,
  getVisibleBidHistory,
  loadAuctionAudit,
  loadAuctionBids,
  loadAuctionDisputes,
  loadAuctionEscrowLedger,
  loadAuctionListings,
  placeAuctionBid,
  queueAuctionNotificationEvent,
  toggleAuctionWatchlist,
  updateAuctionComplianceStep,
  updateAuctionDisputeStatus,
  updateAuctionPaymentWorkflow,
  validateAuctionEscrowTransition,
  validateAuctionPaymentTransition,
  validateAuctionStatusTransition,
  validateAuctionInput,
} from "../../src/lib/auctionService.js";
import { canAccessRole, expandAllowedRoles, roleLabel } from "../../src/lib/rbac.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const unverifiedCustomer = { id: "new-customer", role: "customer", full_name: "New Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const broker = { id: "review-broker", role: "broker", full_name: "Review Broker" };
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };

function storage() {
  const store = new Map();
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("RentasHub Auctions routes are wired as first-class public buyer seller dealer and admin routes", () => {
  const app = source("src/App.jsx");
  const allRoutes = [
    ...AUCTION_ROUTE_GROUPS.public,
    ...AUCTION_ROUTE_GROUPS.buyer,
    ...AUCTION_ROUTE_GROUPS.seller,
    ...AUCTION_ROUTE_GROUPS.dealer,
    ...AUCTION_ROUTE_GROUPS.admin,
    "/auctions/category/:category",
    "/auctions/parish/:parish",
    "/auction/:auctionId",
    "/auction/:auctionId/bid",
    "/auction/:auctionId/inspection",
    "/auction/:auctionId/transport",
    "/auction/:auctionId/financing",
    "/auction/:auctionId/documents",
    "/auction/:auctionId/notification-audit",
    "/auction/:auctionId/escrow-ledger",
    "/auction/:auctionId/dispute",
  ];
  for (const route of allRoutes) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /AuctionPages/);
  assert.match(source("src/components/AppShell.jsx"), /Auctions/);
});

test("auction categories exclude immovable real estate and validation rejects unsupported categories", () => {
  const ids = AUCTION_CATEGORIES.map((category) => category.id);
  assert.ok(ids.includes("cars"));
  assert.ok(ids.includes("heavy-equipment"));
  assert.ok(ids.includes("government-surplus"));
  assert.ok(!ids.includes("real-estate"));
  assert.equal(validateAuctionInput({ title: "House", category: "real-estate", parish: "Kingston", auctionType: "timed", startingBid: 1, minimumIncrement: 1, endTime: "2026-07-01" }).valid, false);
});

test("auction RBAC source of truth covers bidder seller dealer and auction admin aliases", () => {
  assert.ok(expandAllowedRoles(["bidder"]).includes("customer"));
  assert.ok(expandAllowedRoles(["seller"]).includes("supplier"));
  assert.ok(expandAllowedRoles(["dealer"]).includes("broker"));
  assert.ok(expandAllowedRoles(["auction_admin"]).includes("admin"));
  assert.equal(canAccessRole("vehicle_dealer", ["dealer"]), true);
  assert.equal(canAccessRole("auction_admin", ["auction_admin"]), true);
  assert.equal(roleLabel("high_value_bidder"), "High-Value Bidder");
});

test("supplier can create auction listing and local audit captures the action", () => {
  const local = storage();
  const result = createAuctionListing(local, supplier, {
    title: "Auction-ready forklift",
    category: "heavy-equipment",
    parish: "Kingston",
    location: "Kingston",
    auctionType: "timed",
    startingBid: 500000,
    minimumIncrement: 10000,
    endTime: "2026-07-01T20:00",
  });
  assert.equal(result.valid, true);
  assert.match(result.auction.lotNumber, /^RH-AUC-2026-/);
  assert.equal(result.auction.status, "pending_approval");
  assert.equal(loadAuctionListings(local).length, 4);
  assert.equal(loadAuctionAudit(local)[0].action, "auction_created");
});

test("buyers cannot bid without verification and sellers cannot bid on their own lots", () => {
  const local = storage();
  const auction = getAuctionById(local, "auction-excavator-001");
  assert.equal(getBidderVerification(local, unverifiedCustomer).status, "not_started");
  assert.equal(canBid(unverifiedCustomer, auction, getBidderVerification(local, unverifiedCustomer)).allowed, false);
  assert.equal(placeAuctionBid(local, unverifiedCustomer, auction.id, { amount: 9000000 }).valid, false);
  assert.equal(placeAuctionBid(local, supplier, auction.id, { amount: 9000000 }).valid, false);
});

test("standard proxy and sealed bids are timestamped and sealed bid amounts are hidden from public history", () => {
  const local = storage();
  const standard = placeAuctionBid(local, customer, "auction-excavator-001", { amount: 9000000, bidType: "standard" });
  assert.equal(standard.valid, true);
  const proxy = placeAuctionBid(local, customer, "auction-excavator-001", { amount: 9100000, bidType: "proxy", maxBid: 9500000 });
  assert.equal(proxy.valid, true);
  assert.equal(proxy.bid.maxBid, 9500000);
  const sealed = placeAuctionBid(local, customer, "auction-generator-003", { amount: 1400000, bidType: "sealed" });
  assert.equal(sealed.valid, true);
  const history = getVisibleBidHistory(local, "auction-generator-003");
  assert.equal(history[0].bidType, "sealed");
  assert.equal(history[0].amount, 0);
  assert.equal(history[0].sealedAmount, undefined);
  assert.ok(loadAuctionAudit(local).some((entry) => entry.action.includes("bid")));
});

test("reserve-met bid creates simulated escrow ledger but no real funds claim", () => {
  const local = storage();
  const result = placeAuctionBid(local, customer, "auction-excavator-001", { amount: 9000000, bidType: "standard" });
  assert.equal(result.valid, true);
  const ledger = loadAuctionEscrowLedger(local);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].simulatedOnly, true);
  assert.match(ledger[0].note, /no real funds/i);
});

test("watchlist, buyer dashboard, supplier dashboard, and admin KPI summaries work", () => {
  const local = storage();
  assert.equal(toggleAuctionWatchlist(local, customer, "auction-excavator-001").valid, true);
  assert.equal(getAuctionDashboard(local, customer).watchlist.length, 1);
  assert.ok(getAuctionDashboard(local, supplier).auctions.length >= 1);
  assert.ok(calculateAuctionKpis(local).active >= 1);
  const adminAction = adminUpdateAuctionStatus(local, admin, "auction-car-002", "live");
  assert.equal(adminAction.valid, true);
  assert.equal(getAuctionById(local, "auction-car-002").status, "live");
  assert.equal(adminUpdateAuctionStatus(local, customer, "auction-car-002", "suspended").valid, false);
});

test("auction lifecycle transitions are controlled and invalid jumps are blocked", () => {
  assert.equal(validateAuctionStatusTransition("pending_approval", "live").valid, true);
  assert.equal(validateAuctionStatusTransition("live", "sold").valid, false);
  assert.equal(validateAuctionStatusTransition("closed", "sold").valid, true);
  const local = storage();
  assert.equal(adminUpdateAuctionStatus(local, admin, "auction-excavator-001", "sold").valid, false);
  assert.equal(adminUpdateAuctionStatus(local, admin, "auction-excavator-001", "closed").valid, true);
  assert.equal(adminUpdateAuctionStatus(local, admin, "auction-excavator-001", "sold").valid, true);
  assert.equal(getAuctionById(local, "auction-excavator-001").assetLifecycleState, "sold");
});

test("compliance, payment escrow, documents, and notification workflows are operational placeholders", () => {
  const local = storage();
  const compliance = updateAuctionComplianceStep(local, admin, "auction-excavator-001", "trn_capture", "complete");
  assert.equal(compliance.valid, true);
  assert.ok(compliance.auction.complianceChecklist.some((item) => item.step === "trn_capture" && item.status === "complete"));
  const deposit = updateAuctionPaymentWorkflow(local, admin, "auction-excavator-001", { paymentStatus: "deposit_pending", escrowStatus: "deposit_pending", amount: 250000 });
  assert.equal(deposit.valid, true);
  assert.equal(updateAuctionPaymentWorkflow(local, admin, "auction-excavator-001", { paymentStatus: "deposit_simulated", escrowStatus: "deposit_recorded_simulated", amount: 250000 }).valid, true);
  assert.equal(updateAuctionPaymentWorkflow(local, admin, "auction-excavator-001", { paymentStatus: "balance_pending", escrowStatus: "auction_won", amount: 250000 }).valid, true);
  assert.equal(updateAuctionPaymentWorkflow(local, admin, "auction-excavator-001", { paymentStatus: "fully_simulated_paid", escrowStatus: "balance_pending", amount: 250000 }).valid, true);
  const payment = updateAuctionPaymentWorkflow(local, admin, "auction-excavator-001", { paymentStatus: "escrow_held_simulated", escrowStatus: "fully_paid_simulated", amount: 250000 });
  assert.equal(payment.valid, true);
  const escrowHeld = updateAuctionPaymentWorkflow(local, admin, "auction-excavator-001", { escrowStatus: "escrow_held_simulated", amount: 250000 });
  assert.equal(escrowHeld.valid, true);
  assert.equal(escrowHeld.auction.paymentStatus, "escrow_held_simulated");
  assert.equal(escrowHeld.auction.escrowStatus, "escrow_held_simulated");
  assert.equal(loadAuctionEscrowLedger(local)[0].simulatedOnly, true);
  const document = generateAuctionDocumentPlaceholder(local, admin, "auction-excavator-001", "gct_invoice");
  assert.equal(document.valid, true);
  assert.equal(document.document.generated, true);
  assert.equal(document.document.downloadReady, false);
  const event = queueAuctionNotificationEvent(local, admin, "auction-excavator-001", "auction_ending_soon", "review-customer");
  assert.equal(event.valid, true);
  assert.equal(event.event.status, "queued_local_only");
});

test("operational workflow exposes inactive provider interfaces and connection points", () => {
  const local = storage();
  const workflow = getAuctionOperationalWorkflow(local, "auction-excavator-001");
  assert.equal(workflow.connectionPoints.inspection.live, false);
  assert.equal(workflow.connectionPoints.transport.live, false);
  assert.equal(workflow.connectionPoints.financing.live, false);
  assert.equal(workflow.connectionPoints.payments.status, "simulated_only");
  assert.ok(workflow.complianceChecklist.length >= 10);
  assert.deepEqual(AUCTION_DOCUMENT_TYPES.includes("bill_of_sale"), true);
  assert.deepEqual(AUCTION_NOTIFICATION_EVENTS.includes("auction_won"), true);
  assert.deepEqual(AUCTION_PAYMENT_STATUSES.includes("fully_simulated_paid"), true);
});

test("invalid payment and escrow transitions are blocked", () => {
  assert.equal(validateAuctionPaymentTransition("not_started", "fully_simulated_paid").valid, false);
  assert.equal(validateAuctionPaymentTransition("not_started", "deposit_pending").valid, true);
  assert.equal(validateAuctionEscrowTransition("not_created", "escrow_held_simulated").valid, false);
  assert.equal(validateAuctionEscrowTransition("not_created", "deposit_pending").valid, true);
  const local = storage();
  const invalid = updateAuctionPaymentWorkflow(local, admin, "auction-car-002", { paymentStatus: "fully_simulated_paid" });
  assert.equal(invalid.valid, false);
});

test("auction dispute workflow creates buyer dispute and admin can review status locally", () => {
  const local = storage();
  const missing = createAuctionDispute(local, customer, "auction-excavator-001", {});
  assert.equal(missing.valid, false);
  const created = createAuctionDispute(local, customer, "auction-excavator-001", { reason: "Condition mismatch", description: "Inspection placeholder does not match lot notes." });
  assert.equal(created.valid, true);
  assert.equal(loadAuctionDisputes(local).length, 1);
  assert.ok(AUCTION_DISPUTE_STATUSES.includes("admin_review"));
  const blocked = updateAuctionDisputeStatus(local, customer, created.dispute.disputeId, "admin_review");
  assert.equal(blocked.valid, false);
  const reviewed = updateAuctionDisputeStatus(local, admin, created.dispute.disputeId, "admin_review");
  assert.equal(reviewed.valid, true);
  assert.equal(reviewed.dispute.status, "admin_review");
});

test("Phase 1C operational screens and seller wizard copy are present", () => {
  const app = source("src/App.jsx");
  const pages = source("src/pages/AuctionPages.jsx");
  for (const route of ["/auction/:auctionId/documents", "/auction/:auctionId/notification-audit", "/auction/:auctionId/escrow-ledger", "/auction/:auctionId/dispute"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(pages, /Create auction listing wizard/);
  assert.match(pages, /Step 1 - Lot basics/);
  assert.match(pages, /Step 2 - Bidding terms/);
  assert.match(pages, /Step 3 - Compliance disclosures/);
  assert.match(pages, /AuctionEscrowLedgerPage/);
  assert.match(pages, /AuctionDocumentLibraryPage/);
  assert.match(pages, /AuctionNotificationAuditPage/);
  assert.match(pages, /AuctionDisputePage/);
});

test("auction UI keeps live-provider and legal claims controlled", () => {
  const pages = source("src/pages/AuctionPages.jsx");
  const service = source("src/lib/auctionService.js");
  assert.match(pages, /No real auctioneer, legal, escrow, payment, email, SMS, or push operation is active/);
  assert.match(pages, /No real funds/);
  assert.match(pages, /PDF generation, live payment, legal escrow, title transfer, email, SMS, push, and live socket updates remain inactive provider interfaces/);
  assert.match(service, /does not warrant, insure, or guarantee title/);
  assert.doesNotMatch(pages, /live payment processed|escrow released to bank|title guaranteed/i);
  assert.doesNotMatch(pages, new RegExp("Plannas" + "Hub", "i"));
});
