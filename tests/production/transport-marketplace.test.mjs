import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  getApprovedTransportProviders,
  getAuctionTransportSummary,
  getTransportMarketplaceDashboard,
  loadTransportProviders,
  loadTransportRequests,
  registerTransportProvider,
  requestAuctionTransportQuote,
  updateTransportProviderStatus,
  updateTransportRequestStatus,
} from "../../src/lib/transportMarketplaceService.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };

function storage() {
  const store = new Map();
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 2B transport routes are wired without replacing auction support boundaries", () => {
  const app = source("src/App.jsx");
  for (const route of ["/transport", "/transport/register", "/transport/dashboard", "/transport/bookings", "/transport/quotes", "/transport/payouts", "/auction/:auctionId/transport", "/admin/transport"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /AuctionTransportRequestPage/);
  assert.match(app, /AdminTransportProvidersPage/);
});

test("transport providers can register and admin can approve or suspend locally", () => {
  const local = storage();
  const invalid = registerTransportProvider(local, supplier, {});
  assert.equal(invalid.valid, false);
  const registered = registerTransportProvider(local, supplier, {
    companyName: "North Coast Haulage",
    contactName: "Tanya Blake",
    serviceTypes: ["flatbed"],
    parishesServed: ["St. Ann"],
    fleetSummary: "Flatbed and tow support",
    baseRate: 30000,
    insuranceDocuments: ["cargo_policy_placeholder.pdf"],
  });
  assert.equal(registered.valid, true);
  assert.equal(registered.provider.status, "pending_review");
  assert.equal(loadTransportProviders(local).length, 3);
  assert.equal(updateTransportProviderStatus(local, supplier, registered.provider.providerId, "approved").valid, false);
  const approved = updateTransportProviderStatus(local, admin, registered.provider.providerId, "approved");
  assert.equal(approved.valid, true);
  assert.equal(getApprovedTransportProviders(local, { parish: "St. Ann" }).some((provider) => provider.providerId === registered.provider.providerId), true);
  const suspended = updateTransportProviderStatus(local, admin, registered.provider.providerId, "suspended");
  assert.equal(suspended.valid, true);
  assert.equal(suspended.provider.status, "suspended");
});

test("buyer can request transport quote and related parties can move placeholder lifecycle", () => {
  const local = storage();
  const provider = getApprovedTransportProviders(local, { parish: "St. Catherine" })[0];
  const missing = requestAuctionTransportQuote(local, customer, "auction-excavator-001", { providerId: provider.providerId });
  assert.equal(missing.valid, false);
  const requested = requestAuctionTransportQuote(local, customer, "auction-excavator-001", {
    providerId: provider.providerId,
    pickupLocation: "Spanish Town yard",
    deliveryLocation: "Kingston depot",
    requestedDate: "2026-06-21",
    transportNotes: "Lowboy trailer needed for excavator pickup.",
  });
  assert.equal(requested.valid, true);
  assert.equal(requested.request.status, "quote_requested");
  assert.equal(loadTransportRequests(local).length, 1);
  const blocked = updateTransportRequestStatus(local, { id: "other-user", role: "customer" }, requested.request.requestId, "booked_placeholder");
  assert.equal(blocked.valid, false);
  assert.equal(updateTransportRequestStatus(local, customer, requested.request.requestId, "booked_placeholder").valid, true);
  assert.equal(updateTransportRequestStatus(local, supplier, requested.request.requestId, "delivered_placeholder").valid, true);
  assert.equal(getAuctionTransportSummary(local, "auction-excavator-001").badge, "Transport booking placeholder active");
});

test("transport marketplace dashboards scope customer supplier and admin records", () => {
  const local = storage();
  const provider = getApprovedTransportProviders(local, { parish: "St. Catherine" })[0];
  const requested = requestAuctionTransportQuote(local, customer, "auction-excavator-001", {
    providerId: provider.providerId,
    pickupLocation: "Seller yard",
    deliveryLocation: "Buyer depot",
    transportNotes: "Confirm loading access.",
  });
  assert.equal(requested.valid, true);
  assert.equal(getTransportMarketplaceDashboard(local, customer).requests.length, 1);
  assert.equal(getTransportMarketplaceDashboard(local, supplier).requests.length, 1);
  assert.ok(getTransportMarketplaceDashboard(local, admin).providers.length >= 2);
  assert.ok(getTransportMarketplaceDashboard(local, admin).requests.length >= 1);
});

test("transport marketplace UI integrates auctions dashboards admin and keeps provider boundaries controlled", () => {
  const pages = source("src/pages/TransportMarketplacePages.jsx");
  const auctionPages = source("src/pages/AuctionPages.jsx");
  const customerDashboard = source("src/pages/CustomerDashboard.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  const shell = source("src/components/AppShell.jsx");
  assert.match(pages, /RentasHub Transport Marketplace/);
  assert.match(pages, /No live dispatch, GPS tracking, payment, insurance verification, or carrier compliance activation is active/);
  assert.match(pages, /Request auction transport/);
  assert.match(pages, /Book placeholder/);
  assert.match(auctionPages, /AuctionTransportBadge/);
  assert.match(auctionPages, /approved providers/);
  assert.match(customerDashboard, /Find transport/);
  assert.match(supplierDashboard, /Transport workspace/);
  assert.match(shell, /Transport/);
  assert.doesNotMatch(pages, /live dispatch confirmed|GPS tracking active|payment captured|insurance verified live/i);
});
