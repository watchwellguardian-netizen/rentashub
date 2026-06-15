import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  getApprovedInspectors,
  getAuctionInspectionSummary,
  getInspectionMarketplaceDashboard,
  loadInspectionReports,
  loadInspectionRequests,
  loadInspectorProfiles,
  registerInspectorProfile,
  requestAuctionInspection,
  updateInspectionRequestStatus,
  updateInspectorStatus,
  uploadInspectionReportPlaceholder,
} from "../../src/lib/inspectionMarketplaceService.js";

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

test("Phase 2A inspector routes are wired without replacing auction routes", () => {
  const app = source("src/App.jsx");
  for (const route of ["/inspectors", "/inspectors/register", "/inspectors/dashboard", "/inspectors/bookings", "/inspectors/reports", "/inspectors/payouts", "/auction/:auctionId/inspection", "/admin/inspectors"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /AuctionInspectionRequestPage/);
  assert.match(app, /AdminInspectorsPage/);
});

test("inspectors can register and admin can approve or suspend locally", () => {
  const local = storage();
  const invalid = registerInspectorProfile(local, supplier, {});
  assert.equal(invalid.valid, false);
  const registered = registerInspectorProfile(local, supplier, {
    companyName: "North Coast Inspection Services",
    individualName: "Dana Brown",
    certifications: ["VIN verification"],
    insuranceDocuments: ["insurance_placeholder.pdf"],
    serviceCategories: ["vehicles"],
    parishesServed: ["St. Ann"],
    baseRate: 22000,
  });
  assert.equal(registered.valid, true);
  assert.equal(registered.profile.status, "pending_review");
  assert.equal(loadInspectorProfiles(local).length, 3);
  const blocked = updateInspectorStatus(local, supplier, registered.profile.inspectorId, "approved");
  assert.equal(blocked.valid, false);
  const approved = updateInspectorStatus(local, admin, registered.profile.inspectorId, "approved");
  assert.equal(approved.valid, true);
  assert.equal(getApprovedInspectors(local, { parish: "St. Ann" }).some((profile) => profile.inspectorId === registered.profile.inspectorId), true);
  const suspended = updateInspectorStatus(local, admin, registered.profile.inspectorId, "suspended");
  assert.equal(suspended.valid, true);
  assert.equal(suspended.profile.status, "suspended");
});

test("buyer can request quote, book inspection, and assigned inspector can upload report placeholder", () => {
  const local = storage();
  const inspector = getApprovedInspectors(local, { parish: "St. Catherine" })[0];
  const missing = requestAuctionInspection(local, customer, "auction-excavator-001", { inspectorId: inspector.inspectorId });
  assert.equal(missing.valid, false);
  const requested = requestAuctionInspection(local, customer, "auction-excavator-001", {
    inspectorId: inspector.inspectorId,
    requestNotes: "Check chassis, serial plate, hydraulic leaks, and photo gallery.",
    scheduledDate: "2026-06-20",
  });
  assert.equal(requested.valid, true);
  assert.equal(requested.request.status, "quote_requested");
  assert.equal(loadInspectionRequests(local).length, 1);
  const booked = updateInspectionRequestStatus(local, customer, requested.request.requestId, "booked");
  assert.equal(booked.valid, true);
  const unauthorizedReport = uploadInspectionReportPlaceholder(local, customer, requested.request.requestId, { conditionScore: "80/100", damageNotes: "Minor wear.", inspectorSignature: "Customer" });
  assert.equal(unauthorizedReport.valid, false);
  const report = uploadInspectionReportPlaceholder(local, supplier, requested.request.requestId, {
    vinVerification: "not_applicable",
    chassisVerification: "verified_placeholder",
    serialVerification: "verified_placeholder",
    conditionScore: "82/100",
    damageNotes: "Minor bucket and track wear recorded.",
    repairEstimateRange: "JMD 45,000 - 70,000",
    inspectorSignature: "Marsha Reid",
  });
  assert.equal(report.valid, true);
  assert.equal(loadInspectionReports(local).length, 1);
  assert.equal(getAuctionInspectionSummary(local, "auction-excavator-001").badge, "Inspection report available");
});

test("inspection marketplace dashboards scope customer supplier and admin records", () => {
  const local = storage();
  const inspector = getApprovedInspectors(local, { parish: "St. Catherine" })[0];
  const requested = requestAuctionInspection(local, customer, "auction-excavator-001", { inspectorId: inspector.inspectorId, requestNotes: "Need pre-bid condition check." });
  assert.equal(requested.valid, true);
  const customerDashboard = getInspectionMarketplaceDashboard(local, customer);
  const supplierDashboard = getInspectionMarketplaceDashboard(local, supplier);
  const adminDashboard = getInspectionMarketplaceDashboard(local, admin);
  assert.equal(customerDashboard.requests.length, 1);
  assert.equal(supplierDashboard.requests.length, 1);
  assert.ok(adminDashboard.profiles.length >= 2);
  assert.ok(adminDashboard.requests.length >= 1);
});

test("inspection marketplace UI integrates auctions dashboards admin and keeps provider boundaries controlled", () => {
  const pages = source("src/pages/InspectionMarketplacePages.jsx");
  const auctionPages = source("src/pages/AuctionPages.jsx");
  const customerDashboard = source("src/pages/CustomerDashboard.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  const shell = source("src/components/AppShell.jsx");
  assert.match(pages, /RentasHub Inspection Marketplace/);
  assert.match(pages, /No live provider dispatch or payment is active/);
  assert.match(pages, /VIN\/chassis\/serial checks/);
  assert.match(pages, /Upload report placeholder/);
  assert.match(auctionPages, /AuctionInspectionBadge/);
  assert.match(auctionPages, /Choose an approved inspector/);
  assert.match(customerDashboard, /Find inspectors/);
  assert.match(supplierDashboard, /Inspection workspace/);
  assert.match(shell, /Inspectors/);
  assert.doesNotMatch(pages, /live payment processed|licensed auctioneer active|government integration active|escrow released/i);
});
