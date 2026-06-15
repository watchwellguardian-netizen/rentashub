import { ASSET_CATEGORIES, createEmptySearchFilters, loadAssetListings, searchAssetListings } from "./assetListing.js";
import { loadBookings } from "./bookingService.js";
import { loadWantedRequests } from "./marketplaceExchange.js";
import { getTrustSummaryForListing, rankListingsByTrust } from "./trustEngine.js";

export const AI_ASSISTANT_NOTICE = "AI-style guidance is simulated locally in this development version. Suggestions are guidance only.";

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function parseDuration(text) {
  const match = text.match(/(\d+)\s*(hour|hours|day|days|week|weeks|month|months)/i);
  if (!match) return { units: "", rentalType: "" };
  const unit = match[2].toLowerCase();
  const rentalType = unit.startsWith("hour") ? "hourly" : unit.startsWith("week") ? "weekly" : unit.startsWith("month") ? "monthly" : "daily";
  return { units: match[1], rentalType };
}

function parseLocation(text) {
  const known = ["kingston", "spanish town", "montego bay", "ocho rios", "mandeville"];
  return known.find((place) => text.includes(place)) || "";
}

export function parseAiSearchQuery(query = "") {
  const text = query.toLowerCase();
  const filters = createEmptySearchFilters();
  const duration = parseDuration(text);
  const location = parseLocation(text);
  if (location) filters.location = location;
  if (duration.rentalType) filters.rentalType = duration.rentalType;
  if (includesAny(text, ["buy", "purchase", "own"])) filters.listingType = "buy";
  if (includesAny(text, ["sell", "sale"])) filters.listingType = "sell";
  if (includesAny(text, ["trade"])) filters.listingType = "trade";
  if (includesAny(text, ["swap", "exchange"])) filters.listingType = "swap";
  if (includesAny(text, ["broker", "brokerage"])) filters.listingType = "brokerage";
  if (includesAny(text, ["verified", "trusted"])) filters.sortBy = "trust";
  for (const category of ASSET_CATEGORIES) {
    const haystack = `${category.id.replace(/-/g, " ")} ${category.label}`.toLowerCase();
    if (text.split(/\s+/).some((word) => word.length > 2 && haystack.includes(word))) {
      filters.category = category.id;
    }
  }
  if (includesAny(text, ["excavator", "loader", "bulldozer", "crane", "10-ton", "10 ton"])) filters.category = "heavy-equipment";
  if (includesAny(text, ["car", "suv", "vehicle"])) filters.category = "cars";
  if (includesAny(text, ["truck", "delivery"])) filters.category = "trucks";
  if (includesAny(text, ["venue", "event", "hall"])) filters.category = "event-spaces";
  if (includesAny(text, ["property", "house", "apartment", "real estate"])) filters.category = "real-estate";
  if (includesAny(text, ["storage", "container"])) filters.category = "storage-containers";
  const under = text.match(/under\s+(?:jmd\s*)?(\d+)/i);
  if (under) filters.maxPrice = under[1];
  return { filters, duration, originalQuery: query };
}

export function runAiSearchAssistant(storage, query = "") {
  const parsed = parseAiSearchQuery(query);
  const listings = loadAssetListings(storage);
  const rawResults = searchAssetListings(listings, parsed.filters);
  const results = parsed.filters.sortBy === "trust" ? rankListingsByTrust(storage, rawResults) : rawResults;
  return {
    notice: AI_ASSISTANT_NOTICE,
    parsed,
    suggestions: results.slice(0, 5).map((listing) => ({ listing, trust: getTrustSummaryForListing(storage, listing) })),
    summary: results.length ? `Found ${results.length} local match${results.length === 1 ? "" : "es"} from your request.` : "No local matches yet. Try broader category, location, or price terms.",
  };
}

export function suggestListingContent(input = {}) {
  const category = ASSET_CATEGORIES.find((item) => item.id === input.category) || ASSET_CATEGORIES[0];
  const location = input.location || "your service area";
  const base = input.assetName || input.title || category.subcategories[0] || "asset";
  const rate = input.priceRate ? `from JMD ${Number(input.priceRate).toLocaleString()}` : "with clear pricing";
  return {
    notice: AI_ASSISTANT_NOTICE,
    title: `${base} available on RentasHub in ${location}`,
    description: `List ${base} for ${category.label}. Highlight condition, delivery or pickup options, safety rules, deposit terms, and availability. Keep terms clear so customers can compare confidently.`,
    suggestedCategory: category.id,
    pricingSuggestion: `Use recent local demand and your operating cost as a guide. For now, publish ${rate} and revisit after real market analytics are connected.`,
    trustImprovements: ["Complete supplier verification", "Add clear photos when file storage is available", "Respond quickly to messages", "Keep inspection records current", "Write transparent damage and cancellation policies"],
  };
}

export function adviseRentalChoice(storage, { assetId = "", compareAssetId = "" } = {}) {
  const listings = loadAssetListings(storage);
  const selected = listings.find((listing) => listing.id === assetId) || listings[0];
  const compared = listings.find((listing) => listing.id === compareAssetId) || listings.find((listing) => listing.id !== selected?.id);
  const selectedTrust = selected ? getTrustSummaryForListing(storage, selected) : null;
  const comparedTrust = compared ? getTrustSummaryForListing(storage, compared) : null;
  return {
    notice: AI_ASSISTANT_NOTICE,
    selected,
    compared,
    selectedTrust,
    comparedTrust,
    recommendation: selected && compared && selectedTrust.asset.score >= comparedTrust.asset.score
      ? `${selected.title} currently has the stronger local trust signal.`
      : compared
      ? `${compared.title} currently has the stronger local trust signal.`
      : "Not enough comparable assets are available locally yet.",
    pricingExplanation: selected ? `Review the listed rate, deposit, delivery options, supplier trust score, and inspection history before booking.` : "No local asset selected.",
  };
}

export function createBrokerAssistantMatches(storage) {
  const listings = loadAssetListings(storage);
  const wanted = loadWantedRequests(storage);
  const opportunities = wanted.flatMap((request) => (
    listings
      .filter((listing) => listing.category === request.category || listing.location.toLowerCase().includes(String(request.location || "").toLowerCase()))
      .slice(0, 3)
      .map((listing) => ({ request, listing, trust: getTrustSummaryForListing(storage, listing) }))
  ));
  const tradeMatches = listings
    .filter((listing) => ["trade", "swap", "rent_or_trade"].includes(listing.listingType) || listing.swapInterested)
    .map((listing) => ({ listing, wantedCategories: listing.wantedCategories || [], trust: getTrustSummaryForListing(storage, listing) }));
  return {
    notice: AI_ASSISTANT_NOTICE,
    opportunities,
    tradeMatches,
    summary: `${opportunities.length} wanted-request match${opportunities.length === 1 ? "" : "es"} and ${tradeMatches.length} trade/swap opportunit${tradeMatches.length === 1 ? "y" : "ies"} found locally.`,
  };
}

export function generateMarketInsights(storage) {
  const listings = loadAssetListings(storage);
  const bookings = loadBookings(storage);
  const wanted = loadWantedRequests(storage);
  const categoryCounts = listings.reduce((totals, listing) => ({ ...totals, [listing.category]: (totals[listing.category] || 0) + 1 }), {});
  const locationCounts = listings.reduce((totals, listing) => ({ ...totals, [listing.location]: (totals[listing.location] || 0) + 1 }), {});
  const wantedCounts = wanted.reduce((totals, request) => ({ ...totals, [request.category]: (totals[request.category] || 0) + 1 }), {});
  const popularCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const trendingLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const highDemandAssets = Object.entries(wantedCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const undersuppliedMarkets = Object.entries(wantedCounts)
    .filter(([category, demand]) => demand > (categoryCounts[category] || 0))
    .map(([category, demand]) => ({ category, demand, supply: categoryCounts[category] || 0 }));
  return {
    notice: AI_ASSISTANT_NOTICE,
    popularCategories,
    trendingLocations,
    highDemandAssets,
    undersuppliedMarkets,
    bookingVolume: bookings.length,
  };
}
