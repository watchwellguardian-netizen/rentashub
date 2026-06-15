import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  getApprovedFinancingPartners,
  getAuctionFinancingSummary,
  getFinancingMarketplaceDashboard,
  loadFinancingPartners,
  loadFinancingRequests,
  registerFinancingPartner,
  requestAuctionFinancingPrequalification,
  updateFinancingPartnerStatus,
  updateFinancingRequestStatus,
} from "../../src/lib/financingMarketplaceService.js";

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

test("Phase 2C financing routes are wired and replace the generic auction financing placeholder", () => {
  const app = source("src/App.jsx");
  for (const route of ["/financing", "/financing/products", "/financing/register", "/financing/dashboard", "/financing/referrals", "/financing/payouts", "/auction/:auctionId/financing", "/admin/financing"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /AuctionFinancingRequestPage/);
  assert.match(app, /AdminFinancingPartnersPage/);
  assert.equal(app.includes('path="/auction/:auctionId/financing" element={<AuctionSupportPage type="financing"'), false);
});

test("financing partners can register and admin can approve or suspend locally", () => {
  const local = storage();
  const invalid = registerFinancingPartner(local, supplier, {});
  assert.equal(invalid.valid, false);
  const registered = registerFinancingPartner(local, supplier, {
    companyName: "North Coast Finance Readiness",
    contactName: "Tanya Blake",
    productTypes: ["equipment_finance"],
    parishesServed: ["St. Ann"],
    minimumAmount: 300000,
    maximumAmount: 9000000,
    documentRequirements: ["id_placeholder.pdf", "invoice_placeholder.pdf"],
  });
  assert.equal(registered.valid, true);
  assert.equal(registered.partner.status, "pending_review");
  assert.equal(loadFinancingPartners(local).length, 3);
  assert.equal(updateFinancingPartnerStatus(local, supplier, registered.partner.partnerId, "approved").valid, false);
  const approved = updateFinancingPartnerStatus(local, admin, registered.partner.partnerId, "approved");
  assert.equal(approved.valid, true);
  assert.equal(getApprovedFinancingPartners(local, { parish: "St. Ann" }).some((partner) => partner.partnerId === registered.partner.partnerId), true);
  const suspended = updateFinancingPartnerStatus(local, admin, registered.partner.partnerId, "suspended");
  assert.equal(suspended.valid, true);
  assert.equal(suspended.partner.status, "suspended");
});

test("buyer can request auction financing referral and related parties can move placeholder lifecycle", () => {
  const local = storage();
  const partner = getApprovedFinancingPartners(local, { parish: "St. Catherine" })[0];
  const missing = requestAuctionFinancingPrequalification(local, customer, "auction-excavator-001", { partnerId: partner.partnerId });
  assert.equal(missing.valid, false);
  const requested = requestAuctionFinancingPrequalification(local, customer, "auction-excavator-001", {
    partnerId: partner.partnerId,
    productType: "equipment_finance",
    requestedAmount: 2500000,
    buyerType: "business",
    useOfAsset: "Construction fleet expansion.",
    notes: "Buyer wants readiness referral before auction close.",
  });
  assert.equal(requested.valid, true);
  assert.equal(requested.request.status, "prequalification_requested");
  assert.equal(requested.request.creditDecisionStatus, "not_performed");
  assert.equal(loadFinancingRequests(local).length, 1);
  const blocked = updateFinancingRequestStatus(local, { id: "other-user", role: "customer" }, requested.request.requestId, "referred_placeholder");
  assert.equal(blocked.valid, false);
  assert.equal(updateFinancingRequestStatus(local, customer, requested.request.requestId, "partner_review_placeholder").valid, true);
  assert.equal(updateFinancingRequestStatus(local, supplier, requested.request.requestId, "referred_placeholder").valid, true);
  assert.equal(getAuctionFinancingSummary(local, "auction-excavator-001").badge, "Financing referral placeholder active");
});

test("financing marketplace dashboards scope customer supplier and admin records", () => {
  const local = storage();
  const partner = getApprovedFinancingPartners(local, { parish: "St. Catherine" })[0];
  const requested = requestAuctionFinancingPrequalification(local, customer, "auction-excavator-001", {
    partnerId: partner.partnerId,
    productType: "equipment_finance",
    requestedAmount: 1200000,
    buyerType: "individual",
    useOfAsset: "Small construction business.",
    notes: "Referral readiness only.",
  });
  assert.equal(requested.valid, true);
  assert.equal(getFinancingMarketplaceDashboard(local, customer).requests.length, 1);
  assert.equal(getFinancingMarketplaceDashboard(local, supplier).requests.length, 1);
  assert.ok(getFinancingMarketplaceDashboard(local, admin).partners.length >= 2);
  assert.ok(getFinancingMarketplaceDashboard(local, admin).requests.length >= 1);
});

test("financing marketplace UI integrates auctions dashboards admin and keeps lending boundaries controlled", () => {
  const pages = source("src/pages/FinancingMarketplacePages.jsx");
  const auctionPages = source("src/pages/AuctionPages.jsx");
  const customerDashboard = source("src/pages/CustomerDashboard.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  const shell = source("src/components/AppShell.jsx");
  assert.match(pages, /RentasHub Financing Marketplace/);
  assert.match(pages, /No lending, credit decision, banking API, KYC sharing, payment, or loan approval is active/);
  assert.match(pages, /Auction financing referral/);
  assert.match(pages, /Referral placeholder/);
  assert.match(auctionPages, /AuctionFinancingBadge/);
  assert.match(auctionPages, /No real lending or credit decision is active/);
  assert.match(customerDashboard, /Find financing/);
  assert.match(supplierDashboard, /Financing workspace/);
  assert.match(shell, /Financing/);
  assert.doesNotMatch(pages, /loan approved|credit decision approved|banking API submitted|KYC shared live|payment captured/i);
});
