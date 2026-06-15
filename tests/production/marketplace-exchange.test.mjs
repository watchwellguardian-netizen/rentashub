import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { MARKETPLACE_LISTING_LABELS, MARKETPLACE_LISTING_TYPES, SEED_LISTINGS, createEmptySearchFilters, searchAssetListings, validateAssetListing } from "../../src/lib/assetListing.js";
import {
  BROKER_LEADS_STORAGE_KEY,
  OFFERS_STORAGE_KEY,
  WANTED_REQUESTS_STORAGE_KEY,
  canCreateOffer,
  canCreateWantedRequest,
  canManageBrokerLead,
  createMarketplaceOffer,
  createWantedRequest,
  loadBrokerLeads,
  loadOffers,
  loadWantedRequests,
  seedBrokerageLeads,
  updateBrokerLeadStatus,
} from "../../src/lib/marketplaceExchange.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const broker = { id: "review-broker", role: "broker", full_name: "Review Broker" };
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };

function storage({ listings = SEED_LISTINGS, offers = [], wanted = [], leads = [] } = {}) {
  const store = new Map([
    ["rentashub_asset_listings", JSON.stringify(listings)],
    [OFFERS_STORAGE_KEY, JSON.stringify(offers)],
    [WANTED_REQUESTS_STORAGE_KEY, JSON.stringify(wanted)],
    [BROKER_LEADS_STORAGE_KEY, JSON.stringify(leads)],
  ]);
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

test("marketplace exchange routes are wired", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/marketplace", "/buy", "/sell", "/trade", "/swap", "/brokerage", "/wanted", "/listing/:id/offer", "/trade-request/:id", "/brokerage/leads"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /<MarketplaceLanding listingType="buy"/);
  assert.match(app, /<MarketplaceOffer \/>/);
  assert.match(app, /allowedRoles={\["broker", "admin"\]}/);
});

test("asset model supports rent, buy, sell, trade, auction, swap, and brokerage fields", () => {
  assert.deepEqual(MARKETPLACE_LISTING_TYPES, ["rental", "sale", "trade", "swap", "brokerage", "rent_or_buy", "rent_or_trade"]);
  assert.equal(MARKETPLACE_LISTING_LABELS.sale, "Available for Sale");
  const sale = validateAssetListing({ ...SEED_LISTINGS[0], listingType: "sale", salePrice: 0 });
  assert.equal(sale.valid, false);
  assert.match(sale.errors.salePrice, /sale price/);
  const trade = validateAssetListing({ ...SEED_LISTINGS[0], listingType: "trade", tradeValue: 0 });
  assert.equal(trade.valid, false);
  assert.match(trade.errors.tradeValue, /trade value/);
});

test("search supports marketplace listing types", () => {
  const localListings = [
    { ...SEED_LISTINGS[0], id: "sale-asset", listingType: "sale", salePrice: 1000000 },
    { ...SEED_LISTINGS[0], id: "trade-asset", listingType: "trade", tradeValue: 800000 },
    { ...SEED_LISTINGS[0], id: "swap-asset", listingType: "swap", tradeValue: 700000, swapInterested: true },
    { ...SEED_LISTINGS[1], id: "brokerage-asset", listingType: "brokerage", brokerAssistRequired: true },
  ];
  assert.equal(searchAssetListings(localListings, createEmptySearchFilters({ listingType: "buy" })).length, 1);
  assert.equal(searchAssetListings(localListings, createEmptySearchFilters({ listingType: "sell" })).length, 1);
  assert.equal(searchAssetListings(localListings, createEmptySearchFilters({ listingType: "trade" })).length, 1);
  assert.equal(searchAssetListings(localListings, createEmptySearchFilters({ listingType: "swap" })).length, 1);
  assert.equal(searchAssetListings(localListings, createEmptySearchFilters({ listingType: "brokerage" })).length, 1);
});

test("offer creation works and unauthenticated or owner attempts are blocked", () => {
  const local = storage();
  const listing = SEED_LISTINGS[0];
  assert.equal(canCreateOffer(customer, listing), true);
  assert.equal(canCreateOffer(null, listing), false);
  assert.equal(canCreateOffer(supplier, listing), false);
  const result = createMarketplaceOffer(local, { user: customer, listing, input: { offerType: "cash_offer", offerAmount: 1230000 } });
  assert.equal(result.valid, true);
  assert.equal(loadOffers(local).length, 1);
  assert.equal(result.offer.ownerId, listing.ownerSupplierId);
  const blocked = createMarketplaceOffer(local, { user: null, listing, input: { offerType: "cash_offer", offerAmount: 100 } });
  assert.equal(blocked.valid, false);
});

test("wanted request creation works and is customer-scoped", () => {
  const local = storage();
  assert.equal(canCreateWantedRequest(customer), true);
  assert.equal(canCreateWantedRequest(broker), false);
  const result = createWantedRequest(local, {
    user: customer,
    input: { requestTitle: "Need a compact loader", category: "heavy-equipment", description: "Small loader for a short job.", budgetRange: "JMD 300000 - 500000", location: "Kingston", urgency: "soon" },
  });
  assert.equal(result.valid, true);
  assert.equal(loadWantedRequests(local).length, 1);
  assert.equal(createWantedRequest(local, { user: null, input: {} }).valid, false);
});

test("broker role can manage brokerage leads while non-brokers are blocked", () => {
  const local = storage();
  const leads = seedBrokerageLeads(local);
  assert.ok(leads.length >= 1);
  assert.equal(canManageBrokerLead(broker), true);
  assert.equal(canManageBrokerLead(admin), true);
  assert.equal(canManageBrokerLead(customer), false);
  const accepted = updateBrokerLeadStatus(local, broker, leads[0].leadId, "accepted");
  assert.equal(accepted.valid, true);
  assert.equal(accepted.lead.assignedBrokerId, broker.id);
  assert.equal(updateBrokerLeadStatus(local, customer, leads[0].leadId, "under_review").valid, false);
  assert.equal(loadBrokerLeads(local)[0].status, "accepted");
});

test("asset detail and marketplace pages display listing type controls without transaction claims", () => {
  const detail = readFileSync(join(root, "src/pages/AssetDetail.jsx"), "utf8");
  const search = readFileSync(join(root, "src/pages/MarketplaceSearch.jsx"), "utf8");
  const exchange = readFileSync(join(root, "src/pages/ExchangeMarketplace.jsx"), "utf8");
  const offer = readFileSync(join(root, "src/pages/MarketplaceOffer.jsx"), "utf8");
  assert.match(detail, /MARKETPLACE_LISTING_LABELS/);
  assert.match(detail, /Make offer \/ proposal/);
  assert.match(search, /Marketplace type/);
  assert.match(exchange, /RentasHub Marketplace/);
  assert.match(offer, /No financing, escrow, or legal agreement/);
  for (const source of [detail, search, exchange, offer]) {
    assert.doesNotMatch(source, new RegExp("Plannas" + "Hub", "i"));
    assert.doesNotMatch(source, new RegExp("production" + "-ready", "i"));
    assert.doesNotMatch(source, /transaction success|legal agreement created/i);
  }
});
