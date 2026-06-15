import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY } from "../../src/lib/bookingService.js";
import { WANTED_REQUESTS_STORAGE_KEY } from "../../src/lib/marketplaceExchange.js";
import { SUPPLIER_PROFILE_STORAGE_KEY } from "../../src/lib/supplierProfile.js";
import {
  AI_ASSISTANT_NOTICE,
  adviseRentalChoice,
  createBrokerAssistantMatches,
  generateMarketInsights,
  parseAiSearchQuery,
  runAiSearchAssistant,
  suggestListingContent,
} from "../../src/lib/aiAssistant.js";

const root = process.cwd();

function storage({ listings = SEED_LISTINGS, wanted = [], bookings = [] } = {}) {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(listings)],
    [WANTED_REQUESTS_STORAGE_KEY, JSON.stringify(wanted)],
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    [SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify([{ supplierId: "review-supplier", verificationStatus: "verified", businessName: "Trusted Rentals", publicSummary: "Local supplier" }])],
  ]);
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

test("AI assistant routes are wired and legacy AI help remains working", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/ai", "/ai/search", "/ai/listing-assistant", "/ai/rental-advisor", "/ai/broker-assistant", "/ai/market-insights", "/ai-help"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /<AiSearchPage \/>/);
  assert.match(app, /<AiHome \/>/);
});

test("AI search parses natural language into marketplace filters", () => {
  const parsed = parseAiSearchQuery("I need a 10-ton excavator in Kingston for 3 days");
  assert.equal(parsed.filters.category, "heavy-equipment");
  assert.equal(parsed.filters.location, "kingston");
  assert.equal(parsed.filters.rentalType, "daily");
  assert.equal(parsed.duration.units, "3");
});

test("AI search assistant returns local suggested assets without claiming live AI", () => {
  const local = storage();
  const result = runAiSearchAssistant(local, "trusted SUV in Kingston for 2 days");
  assert.equal(result.notice, AI_ASSISTANT_NOTICE);
  assert.equal(result.parsed.filters.category, "cars");
  assert.ok(result.suggestions.length >= 1);
  assert.ok(result.suggestions[0].trust.asset.score >= 0);
});

test("AI listing assistant creates supplier title, description, pricing, and trust suggestions", () => {
  const suggestion = suggestListingContent({ assetName: "Mini excavator", category: "heavy-equipment", location: "Kingston", priceRate: 45000 });
  assert.match(suggestion.title, /Mini excavator/);
  assert.match(suggestion.description, /safety rules/);
  assert.match(suggestion.pricingSuggestion, /JMD 45,000/);
  assert.ok(suggestion.trustImprovements.includes("Complete supplier verification"));
});

test("AI rental advisor compares assets and explains trust and pricing", () => {
  const advice = adviseRentalChoice(storage(), { assetId: "asset-seed-supplier-1", compareAssetId: "asset-seed-other-supplier" });
  assert.ok(advice.selected);
  assert.ok(advice.compared);
  assert.match(advice.recommendation, /trust signal/);
  assert.match(advice.pricingExplanation, /supplier trust score/);
});

test("AI broker assistant matches wanted requests and trade opportunities", () => {
  const local = storage({
    wanted: [{ requestId: "wanted-1", requestTitle: "Need excavator", category: "heavy-equipment", location: "Spanish Town", budgetRange: "JMD 40000", description: "Short job", urgency: "soon" }],
  });
  const matches = createBrokerAssistantMatches(local);
  assert.match(matches.summary, /wanted-request/);
  assert.ok(matches.opportunities.length >= 1);
  assert.ok(matches.tradeMatches.length >= 1);
});

test("AI market insights generate local category, location, demand, and supply summaries", () => {
  const insights = generateMarketInsights(storage({
    wanted: [{ requestId: "wanted-1", category: "trailers", requestTitle: "Need trailer", location: "Kingston", budgetRange: "JMD 10000", description: "Moving", urgency: "soon" }],
    bookings: [{ id: "booking-1", customerId: "review-customer", assetId: "asset-seed-supplier-1" }],
  }));
  assert.ok(insights.popularCategories.length >= 1);
  assert.ok(insights.trendingLocations.length >= 1);
  assert.equal(insights.bookingVolume, 1);
  assert.ok(insights.undersuppliedMarkets.some((item) => item.category === "trailers"));
});

test("AI pages show controlled local-assistant copy and no production claims", () => {
  const page = readFileSync(join(root, "src/pages/AiAssistant.jsx"), "utf8");
  const service = readFileSync(join(root, "src/lib/aiAssistant.js"), "utf8");
  assert.match(page, /AI Search Assistant/);
  assert.match(page, /AI Listing Assistant/);
  assert.match(page, /AI Broker Assistant/);
  assert.match(page, /AI Market Insights/);
  assert.match(service, /simulated locally/);
  for (const source of [page, service]) {
    assert.doesNotMatch(source, new RegExp("production" + "-ready", "i"));
    assert.doesNotMatch(source, /autonomous decision|real AI provider|guaranteed recommendation/i);
  }
});
