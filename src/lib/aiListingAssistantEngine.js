import { ASSET_CATEGORIES, getCategoryById, loadAssetListings } from "./assetListing.js";
import { loadAuctionListings } from "./auctionService.js";
import { normalizeRole } from "./rbac.js";

export const AI_LISTING_RECOMMENDATION_STORAGE_KEY = "rentashub_ai_listing_recommendations";
export const AI_LISTING_ACCEPTANCE_STORAGE_KEY = "rentashub_ai_listing_recommendation_acceptance";

export const AI_LISTING_PROVIDER_NOTICE =
  "AI listing assistance is local/provider-ready only. No external LLM, OpenAI, Anthropic, Gemini, real valuation engine, or automated listing generation is active.";

const REQUIRED_FIELDS = [
  "title",
  "description",
  "category",
  "subcategory",
  "location",
  "priceRate",
  "depositRequirement",
  "deliveryPickupOptions",
  "insuranceRequirement",
  "damagePolicy",
  "cancellationPolicy",
  "safetyInstructions",
  "usageInstructions",
];

function readJson(storage, key, fallback) {
  if (!storage) return fallback;
  const raw = storage.getItem(key);
  if (!raw) {
    storage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw);
}

function writeJson(storage, key, value) {
  if (storage) storage.setItem(key, JSON.stringify(value));
  return value;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function wordCount(value = "") {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function categoryKeywords(categoryId) {
  const category = getCategoryById(categoryId);
  return [
    category.label,
    category.id.replaceAll("-", " "),
    ...(category.subcategories || []),
    ...(category.specificFields || []),
  ].map((item) => String(item).toLowerCase());
}

function recommendCategory(listing = {}) {
  const text = [listing.title, listing.description, listing.subcategory, Object.values(listing.categoryFields || {}).join(" ")].join(" ").toLowerCase();
  const scored = ASSET_CATEGORIES.map((category) => ({
    categoryId: category.id,
    score: categoryKeywords(category.id).filter((word) => word && text.includes(word.toLowerCase())).length,
  })).sort((a, b) => b.score - a.score);
  const best = scored[0];
  return {
    currentCategory: listing.category,
    recommendedCategory: best?.score > 0 ? best.categoryId : listing.category || "cars",
    confidence: best?.score ? clampScore(55 + best.score * 10) : 45,
    reason: best?.score ? "Matched title, description, subcategory, or category-specific wording." : "Not enough text to confidently recommend a different category.",
  };
}

function createTags(listing = {}) {
  const tags = new Set();
  const text = [listing.title, listing.description, listing.location, listing.subcategory].join(" ").toLowerCase();
  if (listing.category) tags.add(getCategoryById(listing.category).label);
  if (listing.subcategory) tags.add(listing.subcategory);
  if (listing.location) tags.add(listing.location);
  if (listing.deliveryPickupOptions && String(listing.deliveryPickupOptions).includes("delivery")) tags.add("Delivery available");
  if (listing.operatorRequired) tags.add("Operator required");
  if (listing.verificationStatus === "verified") tags.add("Verified listing");
  if (["sale", "rent_or_buy"].includes(listing.listingType)) tags.add("Purchase option");
  if (["trade", "swap", "rent_or_trade"].includes(listing.listingType)) tags.add("Trade-ready");
  if (text.includes("family")) tags.add("Family use");
  if (text.includes("construction") || text.includes("jobsite")) tags.add("Construction");
  if (text.includes("event")) tags.add("Event-ready");
  return Array.from(tags).slice(0, 8);
}

function mediaReview(listing = {}) {
  const photos = Array.isArray(listing.photos) ? listing.photos : [];
  const warnings = [];
  if (photos.length === 0) warnings.push("Add at least 3 clear photos before public promotion.");
  if (photos.length > 0 && photos.length < 3) warnings.push("Add more angles: front, side, interior/control panel, and damage close-ups where relevant.");
  const names = photos.map((photo) => `${photo.name || ""} ${photo.label || ""}`.toLowerCase()).join(" ");
  const category = listing.category;
  if (["cars", "trucks"].includes(category) && !/vin|plate|chassis/.test(names)) warnings.push("Add a VIN, chassis, or plate photo placeholder before buyer review.");
  if (category === "heavy-equipment" && !/serial|engine|hours|chassis/.test(names)) warnings.push("Add serial number, engine hours, and chassis photo placeholders for heavy equipment.");
  if (!photos.some((photo) => String(photo.status || "").includes("placeholder") || photo.uploadReady)) warnings.push("Photo records should remain upload-ready metadata until object storage is active.");
  return {
    imageCount: photos.length,
    warnings,
    score: clampScore(photos.length >= 5 ? 95 : photos.length >= 3 ? 80 : photos.length === 2 ? 60 : photos.length === 1 ? 45 : 20),
  };
}

function missingFields(listing = {}) {
  const missing = REQUIRED_FIELDS.filter((field) => !hasValue(listing[field]));
  const category = getCategoryById(listing.category);
  for (const field of category.specificFields || []) {
    if (!hasValue(listing.categoryFields?.[field])) missing.push(`categoryFields.${field}`);
  }
  return missing;
}

export function analyzeListingQuality(listing = {}) {
  const missing = missingFields(listing);
  const titleWords = wordCount(listing.title);
  const descriptionWords = wordCount(listing.description);
  const titleScore = clampScore(100 - Math.abs(8 - titleWords) * 8 - (String(listing.title || "").length < 18 ? 20 : 0));
  const descriptionScore = clampScore(descriptionWords >= 45 ? 95 : descriptionWords >= 25 ? 78 : descriptionWords >= 12 ? 58 : 30);
  const media = mediaReview(listing);
  const category = recommendCategory(listing);
  const completenessScore = clampScore(100 - missing.length * 6);
  const listingCompletenessScore = clampScore((titleScore * 0.18) + (descriptionScore * 0.24) + (media.score * 0.2) + (completenessScore * 0.28) + (category.confidence * 0.1));
  const auctionReadinessScore = clampScore(
    listingCompletenessScore
    - (!listing.salePrice && !listing.tradeValue ? 8 : 0)
    - (media.warnings.length ? 8 : 0)
    - (listing.verificationStatus !== "verified" ? 8 : 0)
    - (!listing.depositRequirement ? 5 : 0)
  );
  return {
    listingId: listing.id,
    title: listing.title || "Untitled listing",
    titleQualityScore: titleScore,
    descriptionQualityScore: descriptionScore,
    listingCompletenessScore,
    auctionReadinessScore,
    categoryRecommendation: category,
    tags: createTags(listing),
    mediaReview: media,
    missingFields: missing,
    reservePriceRecommendation: {
      status: "placeholder_only",
      suggestedRange: listing.salePrice
        ? `JMD ${Math.round(Number(listing.salePrice) * 0.72).toLocaleString()} - ${Math.round(Number(listing.salePrice) * 0.88).toLocaleString()}`
        : listing.tradeValue
        ? `JMD ${Math.round(Number(listing.tradeValue) * 0.7).toLocaleString()} - ${Math.round(Number(listing.tradeValue) * 0.85).toLocaleString()}`
        : "Add sale price or trade value to calculate a placeholder reserve range.",
      note: "Reserve guidance is rule-based placeholder only. No real valuation engine is active.",
    },
    recommendations: [
      ...(titleScore < 70 ? ["Rewrite the title with asset type, primary use, and location."] : []),
      ...(descriptionScore < 75 ? ["Expand the description with condition, permitted use, delivery, safety, and restrictions."] : []),
      ...missing.slice(0, 6).map((field) => `Complete ${field.replace("categoryFields.", "")}.`),
      ...media.warnings,
      ...(listing.verificationStatus !== "verified" ? ["Complete listing verification before auction promotion."] : []),
    ].slice(0, 10),
    providerNotice: AI_LISTING_PROVIDER_NOTICE,
    generatedAt: new Date().toISOString(),
  };
}

export function loadAiListingRecommendationAudit(storage) {
  return readJson(storage, AI_LISTING_RECOMMENDATION_STORAGE_KEY, []);
}

export function saveAiListingRecommendationAudit(storage, records) {
  return writeJson(storage, AI_LISTING_RECOMMENDATION_STORAGE_KEY, records);
}

export function loadAiListingAcceptance(storage) {
  return readJson(storage, AI_LISTING_ACCEPTANCE_STORAGE_KEY, []);
}

export function saveAiListingAcceptance(storage, records) {
  return writeJson(storage, AI_LISTING_ACCEPTANCE_STORAGE_KEY, records);
}

export function auditListingRecommendation(storage, user, listing, analysis = analyzeListingQuality(listing)) {
  const record = {
    recommendationId: `ai-listing-rec-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    listingId: listing?.id || analysis.listingId || "",
    listingTitle: listing?.title || analysis.title,
    supplierId: listing?.ownerSupplierId || "",
    actorId: user?.id || "system",
    actorRole: normalizeRole(user?.role || "system"),
    titleQualityScore: analysis.titleQualityScore,
    descriptionQualityScore: analysis.descriptionQualityScore,
    listingCompletenessScore: analysis.listingCompletenessScore,
    auctionReadinessScore: analysis.auctionReadinessScore,
    missingFields: analysis.missingFields,
    recommendations: analysis.recommendations,
    providerStatus: "local_provider_ready_only",
    acceptanceStatus: "pending_review",
    createdAt: new Date().toISOString(),
  };
  saveAiListingRecommendationAudit(storage, [record, ...loadAiListingRecommendationAudit(storage)]);
  return record;
}

export function acceptListingRecommendation(storage, user, recommendationId, decision = "accepted_placeholder") {
  const audit = loadAiListingRecommendationAudit(storage);
  const record = audit.find((item) => item.recommendationId === recommendationId);
  if (!record) return { valid: false, error: "Recommendation was not found." };
  const role = normalizeRole(user?.role);
  const allowed = role === "admin" || record.supplierId === user?.id || record.actorId === user?.id;
  if (!allowed) return { valid: false, error: "You can only accept recommendations for your own listings." };
  const acceptance = {
    acceptanceId: `ai-listing-acceptance-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    recommendationId,
    listingId: record.listingId,
    actorId: user.id,
    decision,
    note: "Acceptance tracking is local only. No automated listing rewrite or external AI provider action occurred.",
    createdAt: new Date().toISOString(),
  };
  saveAiListingAcceptance(storage, [acceptance, ...loadAiListingAcceptance(storage)]);
  saveAiListingRecommendationAudit(storage, audit.map((item) => item.recommendationId === recommendationId ? { ...item, acceptanceStatus: decision, updatedAt: new Date().toISOString() } : item));
  return { valid: true, acceptance };
}

export function getAiListingAssistantDashboard(storage, user, scope = "supplier") {
  const role = normalizeRole(user?.role);
  const allListings = loadAssetListings(storage);
  const auctions = loadAuctionListings(storage);
  const listings = scope === "admin" || role === "admin"
    ? allListings
    : allListings.filter((listing) => listing.ownerSupplierId === user?.id || listing.ownerSupplierId === "review-supplier");
  const analyses = listings.map((listing) => ({ listing, analysis: analyzeListingQuality(listing) }));
  const audit = loadAiListingRecommendationAudit(storage).filter((record) => (
    scope === "admin" || role === "admin" || record.supplierId === user?.id || record.actorId === user?.id
  ));
  const acceptance = loadAiListingAcceptance(storage).filter((record) => audit.some((item) => item.recommendationId === record.recommendationId));
  const averageCompleteness = analyses.length ? Math.round(analyses.reduce((total, item) => total + item.analysis.listingCompletenessScore, 0) / analyses.length) : 0;
  const averageAuctionReadiness = analyses.length ? Math.round(analyses.reduce((total, item) => total + item.analysis.auctionReadinessScore, 0) / analyses.length) : 0;
  return {
    scope,
    listings,
    analyses,
    audit,
    acceptance,
    auctions,
    counts: {
      listings: listings.length,
      recommendations: analyses.reduce((total, item) => total + item.analysis.recommendations.length, 0),
      missingFields: analyses.reduce((total, item) => total + item.analysis.missingFields.length, 0),
      mediaWarnings: analyses.reduce((total, item) => total + item.analysis.mediaReview.warnings.length, 0),
      accepted: acceptance.length,
      providerActive: 0,
    },
    averageCompleteness,
    averageAuctionReadiness,
    notice: AI_LISTING_PROVIDER_NOTICE,
  };
}
