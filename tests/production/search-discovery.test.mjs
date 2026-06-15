import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  ASSET_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  SEED_LISTINGS,
  applyAiSearchSuggestion,
  canCreateAssetListing,
  canEditAssetListing,
  canViewAssetListing,
  createEmptySearchFilters,
  searchAssetListings,
} from "../../src/lib/assetListing.js";

const root = process.cwd();
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };

test("marketplace search and asset routes are wired as standalone routes", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/search", "/assets", "/category/:categorySlug", "/asset/:id", "/assets/:id"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /element={<MarketplaceSearch/);
  assert.match(app, /element={<CategoryPage/);
  assert.doesNotMatch(app, new RegExp("/" + "rent" + "broker", "i"));
});

test("category pages include required category slugs and explanations", () => {
  const required = ["cars", "trucks", "heavy-equipment", "small-tools-machines", "event-spaces", "real-estate", "trailers", "storage-containers", "specialty-assets"];
  assert.deepEqual(ASSET_CATEGORIES.map((category) => category.id), required);
  for (const slug of required) {
    assert.ok(CATEGORY_DESCRIPTIONS[slug], `${slug} should have a category explanation`);
  }
});

test("keyword, category, location, and price filters narrow marketplace results", () => {
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ keyword: "SUV" })).length, 1);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ category: "heavy-equipment" })).length, 1);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ location: "Kingston" })).length, 1);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ maxPrice: "20000" })).length, 1);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ keyword: "nothing-matches-this" })).length, 0);
});

test("advanced marketplace filters and sort options work", () => {
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ rentalType: "daily" })).length, 2);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ deliveryPickupOptions: "delivery" })).length, 2);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ operatorRequired: "true" })).length, 1);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ verificationStatus: "verified" })).length, 1);
  assert.equal(searchAssetListings(SEED_LISTINGS, createEmptySearchFilters({ sortBy: "price" }))[0].id, "asset-seed-supplier-1");
});

test("AI-assisted search placeholder maps simple language to filters without claiming real AI", () => {
  const suggestion = applyAiSearchSuggestion("Need an excavator with operator under 50000 and delivery");
  assert.equal(suggestion.filters.category, "heavy-equipment");
  assert.equal(suggestion.filters.operatorRequired, "true");
  assert.equal(suggestion.filters.deliveryPickupOptions, "delivery");
  assert.equal(suggestion.filters.maxPrice, "50000");
  assert.match(suggestion.message, /Full AI matching will be added/);
});

test("asset cards link results to valid detail routes", () => {
  const card = readFileSync(join(root, "src/components/AssetCard.jsx"), "utf8");
  const search = readFileSync(join(root, "src/pages/MarketplaceSearch.jsx"), "utf8");
  assert.match(card, /navigate\(`\/asset\/\$\{listing\.id\}`\)/);
  assert.match(search, /\/asset\/\$\{listing\.id\}/);
});

test("public and signed-in users can view search and asset detail while create and edit stay supplier-only", () => {
  const listing = SEED_LISTINGS[0];
  assert.equal(canViewAssetListing(null, listing), true);
  assert.equal(canViewAssetListing(customer, listing), true);
  assert.equal(canViewAssetListing(supplier, listing), true);
  assert.equal(canCreateAssetListing(customer), false);
  assert.equal(canCreateAssetListing(null), false);
  assert.equal(canEditAssetListing(customer, listing), false);
  assert.equal(canEditAssetListing(null, listing), false);
});

test("marketplace pages include required states and no legacy branding", () => {
  for (const file of ["src/pages/MarketplaceSearch.jsx", "src/pages/CategoryPage.jsx", "src/components/AssetCard.jsx"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /RentasHub|RentasHub Marketplace|Category|Supplier:/);
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i);
  }
  const page = readFileSync(join(root, "src/pages/MarketplaceSearch.jsx"), "utf8");
  assert.match(page, /Loading marketplace search/);
  assert.match(page, /could not load marketplace listings/);
  assert.match(page, /No assets found/);
  assert.match(page, /Reset filters/);
});
