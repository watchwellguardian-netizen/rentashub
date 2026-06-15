import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getAuctionAnalytics, getAuctionAnalyticsForRole } from "../../src/lib/auctionAnalyticsService.js";
import { placeAuctionBid, saveAuctionWatchlist } from "../../src/lib/auctionService.js";

const root = process.cwd();
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const dealer = { id: "dealer-seed-2", role: "broker", full_name: "Dealer Demo" };
const bidder = { id: "analytics-bidder", role: "customer", full_name: "Analytics Bidder" };

function storage() {
  const store = new Map();
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 2D analytics routes are wired for admin supplier and dealer roles", () => {
  const app = source("src/App.jsx");
  for (const route of ["/admin/auction-analytics", "/supplier/auction-analytics", "/dealer/auction-analytics"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /AdminAuctionAnalyticsPage/);
  assert.match(app, /SupplierAuctionAnalyticsPage/);
  assert.match(app, /DealerAuctionAnalyticsPage/);
});

test("auction analytics calculates GMV sell-through watchlist bids recovery category and parish metrics", () => {
  const local = storage();
  saveAuctionWatchlist(local, [
    { id: "watch-1", userId: "review-customer", auctionId: "auction-excavator-001" },
    { id: "watch-2", userId: "dealer-seed-2", auctionId: "auction-generator-003" },
  ]);
  const analytics = getAuctionAnalytics(local, admin, "admin");
  assert.equal(analytics.simulationOnly, true);
  assert.ok(analytics.kpis.totalLots >= 3);
  assert.ok(analytics.kpis.gmv >= 7900000);
  assert.ok(analytics.kpis.watchers >= 73);
  assert.ok(analytics.kpis.bids >= 3);
  assert.ok(analytics.categoryPerformance.some((item) => item.categoryId === "heavy-equipment"));
  assert.ok(analytics.parishPerformance.some((item) => item.parish === "St. Catherine"));
  assert.ok(analytics.bidActivity.some((bid) => bid.sealed === true && bid.amount === 0));
  assert.ok(analytics.watchlistAnalytics[0].watchers >= analytics.watchlistAnalytics.at(-1).watchers);
  assert.ok(analytics.sellerRecovery.some((row) => row.auctionId === "auction-excavator-001" && row.reserveGap > 0));
  assert.ok(analytics.buyerDealerSummary.uniqueBidders >= 2);
});

test("analytics responds to local bid activity without external analytics dependency", () => {
  const local = storage();
  const before = getAuctionAnalytics(local, admin, "admin");
  const result = placeAuctionBid(local, bidder, "auction-excavator-001", { amount: 9000000, bidType: "standard" });
  assert.equal(result.valid, false, "unverified bidder should not mutate analytics through bidding");
  const after = getAuctionAnalytics(local, admin, "admin");
  assert.equal(after.kpis.bids, before.kpis.bids);
  assert.match(after.notice, /local\/demo records only/);
  assert.match(after.notice, /No live BI warehouse/);
});

test("analytics scopes supplier and dealer views without exposing unrelated workflows as live", () => {
  const local = storage();
  const adminAnalytics = getAuctionAnalyticsForRole(local, admin);
  const supplierAnalytics = getAuctionAnalyticsForRole(local, supplier);
  const dealerAnalytics = getAuctionAnalyticsForRole(local, dealer);
  assert.equal(adminAnalytics.scope, "admin");
  assert.equal(supplierAnalytics.scope, "supplier");
  assert.equal(dealerAnalytics.scope, "dealer");
  assert.ok(adminAnalytics.kpis.totalLots >= supplierAnalytics.kpis.totalLots);
  assert.ok(dealerAnalytics.categoryPerformance.length >= 1);
  assert.equal(adminAnalytics.simulationOnly, true);
  assert.equal(supplierAnalytics.simulationOnly, true);
  assert.equal(dealerAnalytics.simulationOnly, true);
});

test("auction analytics UI integrates nav and keeps external BI claims inactive", () => {
  const pages = source("src/pages/AuctionAnalyticsPages.jsx");
  const shell = source("src/components/AppShell.jsx");
  const auctionPages = source("src/pages/AuctionPages.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  assert.match(pages, /Auction KPI and GMV simulation dashboard/);
  assert.match(pages, /Category performance/);
  assert.match(pages, /Parish performance/);
  assert.match(pages, /Bid activity/);
  assert.match(pages, /Seller recovery analytics/);
  assert.match(pages, /Buyer and dealer activity/);
  assert.match(pages, /No live analytics provider, warehouse export, behavioral tracking SDK, or production revenue reporting is active/);
  assert.match(shell, /auction-analytics/);
  assert.match(auctionPages, /\/admin\/auction-analytics/);
  assert.match(auctionPages, /\/dealer\/auction-analytics/);
  assert.match(supplierDashboard, /Auction analytics/);
  assert.doesNotMatch(pages, /live BI connected|warehouse is active|production revenue report is active|tracking SDK is active/i);
});
