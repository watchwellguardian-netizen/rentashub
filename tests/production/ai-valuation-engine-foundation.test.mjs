import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { AUCTION_LISTINGS_STORAGE_KEY, createSeedAuctions } from "../../src/lib/auctionService.js";
import {
  AI_VALUATION_ACCEPTANCE_STORAGE_KEY,
  AI_VALUATION_AUDIT_STORAGE_KEY,
  acceptValuationRecommendation,
  analyzeValuation,
  auditValuationRecommendation,
  getAiValuationDashboard,
} from "../../src/lib/aiValuationEngine.js";

const root = process.cwd();
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };

function storage(listings = SEED_LISTINGS, auctions = createSeedAuctions()) {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(listings)],
    [AUCTION_LISTINGS_STORAGE_KEY, JSON.stringify(auctions)],
    [AI_VALUATION_AUDIT_STORAGE_KEY, JSON.stringify([])],
    [AI_VALUATION_ACCEPTANCE_STORAGE_KEY, JSON.stringify([])],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 2H AI valuation routes and dashboard integrations are wired", () => {
  const app = source("src/App.jsx");
  const aiPages = source("src/pages/AiAssistant.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  const shell = source("src/components/AppShell.jsx");
  const adminCenter = source("src/lib/adminCenter.js");
  assert.match(app, /path="\/ai\/valuation"/);
  assert.match(app, /path="\/admin\/ai-valuations"/);
  assert.match(aiPages, /AI Valuation Engine/);
  assert.match(supplierDashboard, /AI valuation help/);
  assert.match(supplierDashboard, /getAiValuationDashboard/);
  assert.match(shell, /Valuations/);
  assert.match(adminCenter, /AI Valuations/);
});

test("valuation analysis returns market wholesale retail reserve starting bid confidence and missing data", () => {
  const valuation = analyzeValuation(SEED_LISTINGS[0], "listing");
  assert.equal(typeof valuation.estimatedMarketValue, "number");
  assert.equal(typeof valuation.estimatedWholesaleValue, "number");
  assert.equal(typeof valuation.estimatedRetailValue, "number");
  assert.equal(typeof valuation.suggestedReservePrice, "number");
  assert.equal(typeof valuation.suggestedStartingBid, "number");
  assert.equal(typeof valuation.confidenceScore, "number");
  assert.match(valuation.depreciationEstimate, /placeholder depreciation/);
  assert.match(valuation.providerNotice, /No real valuation API/);
});

test("valuation framework supports vehicle equipment tool and commercial inventory models", () => {
  const vehicle = analyzeValuation({ ...SEED_LISTINGS[0], category: "cars" });
  const equipment = analyzeValuation({ ...SEED_LISTINGS[1], category: "heavy-equipment" });
  const tool = analyzeValuation({ ...SEED_LISTINGS[1], category: "small-tools-machines", salePrice: 85000 });
  const inventory = analyzeValuation({ ...SEED_LISTINGS[1], category: "commercial-inventory", salePrice: 500000 });
  assert.equal(vehicle.valuationModel, "Vehicle valuation");
  assert.equal(equipment.valuationModel, "Equipment valuation");
  assert.equal(tool.valuationModel, "Tool valuation");
  assert.equal(inventory.valuationModel, "Commercial inventory valuation");
});

test("valuation audit and acceptance tracking remain local and permission-scoped", () => {
  const local = storage();
  const valuation = analyzeValuation(SEED_LISTINGS[0], "listing");
  const record = auditValuationRecommendation(local, supplier, SEED_LISTINGS[0], valuation);
  assert.equal(record.providerStatus, "local_provider_ready_only");
  assert.equal(record.acceptanceStatus, "pending_review");
  assert.equal(acceptValuationRecommendation(local, otherSupplier, record.recommendationId).valid, false);
  const accepted = acceptValuationRecommendation(local, supplier, record.recommendationId);
  assert.equal(accepted.valid, true);
  assert.equal(accepted.acceptance.decision, "accepted_placeholder");
  const dashboard = getAiValuationDashboard(local, supplier, "supplier");
  assert.equal(dashboard.counts.accepted, 1);
});

test("admin valuation dashboard scopes all records while supplier sees own review records", () => {
  const local = storage();
  auditValuationRecommendation(local, admin, SEED_LISTINGS[0]);
  auditValuationRecommendation(local, admin, SEED_LISTINGS[1]);
  const adminDashboard = getAiValuationDashboard(local, admin, "admin");
  const supplierDashboard = getAiValuationDashboard(local, supplier, "supplier");
  assert.ok(adminDashboard.counts.valuations >= supplierDashboard.counts.valuations);
  assert.ok(adminDashboard.audit.length >= 2);
  assert.equal(supplierDashboard.audit.some((record) => record.supplierId === "supplier-two"), false);
});

test("valuation UI keeps provider-ready boundaries and avoids automated reserve claims", () => {
  const page = source("src/pages/AiAssistant.jsx");
  const engine = source("src/lib/aiValuationEngine.js");
  assert.match(page, /Asset valuation panel/);
  assert.match(page, /Reserve recommendation panel/);
  assert.match(page, /Auction strategy panel/);
  assert.match(page, /Valuation audit dashboard/);
  assert.match(engine, /No real valuation API/);
  assert.match(engine, /automated reserve setting/);
  assert.doesNotMatch(engine, /Kelley Blue Book integration active|Black Book integration active|real valuation provider active/i);
});
