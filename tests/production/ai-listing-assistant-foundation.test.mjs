import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS } from "../../src/lib/assetListing.js";
import {
  AI_LISTING_ACCEPTANCE_STORAGE_KEY,
  AI_LISTING_RECOMMENDATION_STORAGE_KEY,
  acceptListingRecommendation,
  analyzeListingQuality,
  auditListingRecommendation,
  getAiListingAssistantDashboard,
} from "../../src/lib/aiListingAssistantEngine.js";

const root = process.cwd();
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };

function storage(listings = SEED_LISTINGS) {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(listings)],
    [AI_LISTING_RECOMMENDATION_STORAGE_KEY, JSON.stringify([])],
    [AI_LISTING_ACCEPTANCE_STORAGE_KEY, JSON.stringify([])],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 2G AI listing assistant routes and dashboard integrations are wired", () => {
  const app = source("src/App.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  const shell = source("src/components/AppShell.jsx");
  const adminCenter = source("src/lib/adminCenter.js");
  assert.match(app, /path="\/ai\/listing-assistant"/);
  assert.match(app, /path="\/admin\/ai-listing-recommendations"/);
  assert.match(supplierDashboard, /AI listing help/);
  assert.match(supplierDashboard, /getAiListingAssistantDashboard/);
  assert.match(shell, /AI Recs/);
  assert.match(adminCenter, /AI Recommendations/);
});

test("listing quality analysis scores title description completeness media and auction readiness", () => {
  const analysis = analyzeListingQuality(SEED_LISTINGS[0]);
  assert.equal(typeof analysis.titleQualityScore, "number");
  assert.equal(typeof analysis.descriptionQualityScore, "number");
  assert.equal(typeof analysis.listingCompletenessScore, "number");
  assert.equal(typeof analysis.auctionReadinessScore, "number");
  assert.ok(analysis.tags.length >= 3);
  assert.equal(analysis.categoryRecommendation.recommendedCategory, SEED_LISTINGS[0].category);
  assert.match(analysis.reservePriceRecommendation.note, /placeholder only/);
});

test("media analysis flags missing VIN chassis serial photos where appropriate", () => {
  const weakVehicle = {
    ...SEED_LISTINGS[0],
    id: "weak-vehicle",
    photos: [{ id: "photo-1", name: "front.jpg", status: "placeholder" }],
  };
  const vehicleAnalysis = analyzeListingQuality(weakVehicle);
  assert.equal(vehicleAnalysis.mediaReview.warnings.some((warning) => /VIN|chassis|plate/i.test(warning)), true);
  const weakEquipment = {
    ...SEED_LISTINGS[1],
    id: "weak-equipment",
    photos: [],
  };
  const equipmentAnalysis = analyzeListingQuality(weakEquipment);
  assert.equal(equipmentAnalysis.mediaReview.warnings.some((warning) => /serial|engine hours|chassis/i.test(warning)), true);
});

test("recommendation audit and acceptance tracking are local and permission-scoped", () => {
  const local = storage();
  const analysis = analyzeListingQuality(SEED_LISTINGS[0]);
  const record = auditListingRecommendation(local, supplier, SEED_LISTINGS[0], analysis);
  assert.equal(record.providerStatus, "local_provider_ready_only");
  assert.equal(record.acceptanceStatus, "pending_review");
  assert.equal(acceptListingRecommendation(local, otherSupplier, record.recommendationId).valid, false);
  const accepted = acceptListingRecommendation(local, supplier, record.recommendationId);
  assert.equal(accepted.valid, true);
  assert.equal(accepted.acceptance.decision, "accepted_placeholder");
  const dashboard = getAiListingAssistantDashboard(local, supplier, "supplier");
  assert.equal(dashboard.counts.accepted, 1);
});

test("admin dashboard scopes all listings while supplier dashboard scopes own/review listings", () => {
  const local = storage();
  const adminDashboard = getAiListingAssistantDashboard(local, admin, "admin");
  const supplierDashboard = getAiListingAssistantDashboard(local, supplier, "supplier");
  assert.ok(adminDashboard.counts.listings >= supplierDashboard.counts.listings);
  assert.equal(adminDashboard.counts.providerActive, 0);
  assert.match(adminDashboard.notice, /No external LLM/);
});

test("AI listing UI keeps provider-ready boundaries and no real valuation claims", () => {
  const page = source("src/pages/AiAssistant.jsx");
  assert.match(page, /AI listing readiness scorecard/);
  assert.match(page, /AI recommendations panel/);
  assert.match(page, /Recommendation acceptance tracking/);
  assert.match(page, /Admin AI Recommendation Audit/);
  assert.match(page, /No automated listing rewrite or external AI provider action occurs/);
  assert.doesNotMatch(page, /OpenAI API|Anthropic API|Gemini API|real valuation engine active|automated listing generation active/i);
});
