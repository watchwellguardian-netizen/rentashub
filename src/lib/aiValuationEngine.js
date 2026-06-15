import { getCategoryById, loadAssetListings } from "./assetListing.js";
import { loadAuctionListings } from "./auctionService.js";
import { normalizeRole } from "./rbac.js";

export const AI_VALUATION_AUDIT_STORAGE_KEY = "rentashub_ai_valuation_audit";
export const AI_VALUATION_ACCEPTANCE_STORAGE_KEY = "rentashub_ai_valuation_acceptance";

export const AI_VALUATION_PROVIDER_NOTICE =
  "AI valuation is local/provider-ready only. No real valuation API, Kelley Blue Book, Black Book, auction market feed, machine-learning valuation model, or automated reserve setting is active.";

const CATEGORY_MODELS = {
  cars: { label: "Vehicle valuation", wholesale: 0.78, retail: 1.12, reserve: 0.78, starting: 0.62, depreciation: 0.09 },
  trucks: { label: "Vehicle valuation", wholesale: 0.76, retail: 1.14, reserve: 0.77, starting: 0.6, depreciation: 0.085 },
  vans: { label: "Vehicle valuation", wholesale: 0.75, retail: 1.13, reserve: 0.76, starting: 0.58, depreciation: 0.085 },
  suvs: { label: "Vehicle valuation", wholesale: 0.77, retail: 1.14, reserve: 0.78, starting: 0.61, depreciation: 0.085 },
  "heavy-equipment": { label: "Equipment valuation", wholesale: 0.72, retail: 1.18, reserve: 0.74, starting: 0.56, depreciation: 0.065 },
  "small-equipment": { label: "Tool valuation", wholesale: 0.62, retail: 1.2, reserve: 0.65, starting: 0.48, depreciation: 0.12 },
  "small-tools-machines": { label: "Tool valuation", wholesale: 0.62, retail: 1.2, reserve: 0.65, starting: 0.48, depreciation: 0.12 },
  tools: { label: "Tool valuation", wholesale: 0.6, retail: 1.22, reserve: 0.64, starting: 0.46, depreciation: 0.13 },
  "commercial-inventory": { label: "Commercial inventory valuation", wholesale: 0.68, retail: 1.16, reserve: 0.7, starting: 0.52, depreciation: 0.1 },
  "specialty-assets": { label: "Commercial inventory valuation", wholesale: 0.66, retail: 1.18, reserve: 0.68, starting: 0.5, depreciation: 0.11 },
};

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

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function money(value) {
  return Math.max(0, Math.round(Number(value || 0)));
}

function categoryConfig(category) {
  return CATEGORY_MODELS[category] || CATEGORY_MODELS[getCategoryById(category).id] || CATEGORY_MODELS["commercial-inventory"];
}

function extractYear(item = {}) {
  const candidates = [
    item.year,
    item.modelYear,
    item.categoryFields?.year,
    item.title,
    item.description,
  ].map((value) => String(value || ""));
  for (const candidate of candidates) {
    const match = candidate.match(/\b(19|20)\d{2}\b/);
    if (match) return Number(match[0]);
  }
  return null;
}

function baseValue(item = {}) {
  return money(item.salePrice || item.tradeValue || item.reservePrice || item.currentBid || item.startingBid || Number(item.priceRate || 0) * 120);
}

function missingIndicators(item = {}) {
  const missing = [];
  if (!item.category) missing.push("category");
  if (!baseValue(item)) missing.push("salePrice or reserve/current bid baseline");
  if (!extractYear(item)) missing.push("model year");
  if (!item.location && !item.parish) missing.push("location or parish");
  const fields = item.categoryFields || {};
  const category = item.category;
  if (["cars", "trucks", "vans", "suvs"].includes(category)) {
    if (!fields.make && !String(item.title || "").match(/toyota|honda|nissan|ford|mitsubishi|isuzu|hyundai/i)) missing.push("make");
    if (!fields.model && !String(item.title || "").match(/hiace|noah|hilux|ranger|canter|elantra|corolla/i)) missing.push("model");
    if (!fields.plateVin && !item.vin && !item.chassis) missing.push("VIN/chassis");
  }
  if (["heavy-equipment", "small-equipment", "small-tools-machines", "tools"].includes(category)) {
    if (!fields.engineHours && !item.engineHours) missing.push("engine hours or usage hours");
    if (!fields.equipmentType && !item.equipmentType && !item.subcategory) missing.push("equipment type");
    if (!item.serialNumber && !fields.serialNumber) missing.push("serial number");
  }
  return missing;
}

export function analyzeValuation(item = {}, sourceType = item.lotNumber ? "auction" : "listing") {
  const category = item.category || "commercial-inventory";
  const config = categoryConfig(category);
  const baseline = baseValue(item);
  const year = extractYear(item);
  const age = year ? Math.max(0, 2026 - year) : 4;
  const depreciationPercent = clamp(age * config.depreciation * 100, 4, 78);
  const conditionBoost = String(item.status || item.availabilityStatus || "").match(/live|available|verified/i) ? 1.04 : 0.96;
  const demandBoost = Number(item.watchers || item.bidCount || 0) > 10 ? 1.05 : 1;
  const marketValue = money(baseline * conditionBoost * demandBoost);
  const estimatedWholesaleValue = money(marketValue * config.wholesale);
  const estimatedRetailValue = money(marketValue * config.retail);
  const suggestedReservePrice = money(marketValue * config.reserve);
  const suggestedStartingBid = money(marketValue * config.starting);
  const missing = missingIndicators(item);
  const confidenceScore = clamp(86 - missing.length * 9 + (baseline ? 8 : 0) + (year ? 6 : 0) + (item.currentBid || item.salePrice ? 4 : 0), 20, 92);
  return {
    valuationId: `valuation-${sourceType}-${item.id || item.auctionId || "unknown"}`,
    sourceType,
    sourceId: item.id || item.auctionId || "",
    title: item.title || "Untitled asset",
    category,
    valuationModel: config.label,
    estimatedMarketValue: marketValue,
    estimatedWholesaleValue,
    estimatedRetailValue,
    depreciationEstimate: `${depreciationPercent}% placeholder depreciation`,
    suggestedReservePrice,
    suggestedStartingBid,
    confidenceScore,
    missingDataIndicators: missing,
    strategyNotes: [
      `Use ${config.label.toLowerCase()} placeholder model until a real valuation provider is activated.`,
      missing.length ? `Improve confidence by adding ${missing.slice(0, 4).join(", ")}.` : "Core valuation inputs are present for local review.",
      "Supplier must review all reserve and starting-bid guidance manually.",
    ],
    providerStatus: "local_provider_ready_only",
    providerNotice: AI_VALUATION_PROVIDER_NOTICE,
    generatedAt: new Date().toISOString(),
  };
}

export function loadAiValuationAudit(storage) {
  return readJson(storage, AI_VALUATION_AUDIT_STORAGE_KEY, []);
}

export function saveAiValuationAudit(storage, records) {
  return writeJson(storage, AI_VALUATION_AUDIT_STORAGE_KEY, records);
}

export function loadAiValuationAcceptance(storage) {
  return readJson(storage, AI_VALUATION_ACCEPTANCE_STORAGE_KEY, []);
}

export function saveAiValuationAcceptance(storage, records) {
  return writeJson(storage, AI_VALUATION_ACCEPTANCE_STORAGE_KEY, records);
}

export function auditValuationRecommendation(storage, user, item, valuation = analyzeValuation(item)) {
  const record = {
    recommendationId: `ai-valuation-rec-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceType: valuation.sourceType,
    sourceId: valuation.sourceId,
    title: valuation.title,
    supplierId: item?.ownerSupplierId || item?.sellerId || "",
    actorId: user?.id || "system",
    actorRole: normalizeRole(user?.role || "system"),
    estimatedMarketValue: valuation.estimatedMarketValue,
    estimatedWholesaleValue: valuation.estimatedWholesaleValue,
    estimatedRetailValue: valuation.estimatedRetailValue,
    suggestedReservePrice: valuation.suggestedReservePrice,
    suggestedStartingBid: valuation.suggestedStartingBid,
    confidenceScore: valuation.confidenceScore,
    missingDataIndicators: valuation.missingDataIndicators,
    providerStatus: "local_provider_ready_only",
    acceptanceStatus: "pending_review",
    createdAt: new Date().toISOString(),
  };
  saveAiValuationAudit(storage, [record, ...loadAiValuationAudit(storage)]);
  return record;
}

export function acceptValuationRecommendation(storage, user, recommendationId, decision = "accepted_placeholder") {
  const audit = loadAiValuationAudit(storage);
  const record = audit.find((item) => item.recommendationId === recommendationId);
  if (!record) return { valid: false, error: "Valuation recommendation was not found." };
  const role = normalizeRole(user?.role);
  const allowed = role === "admin" || record.supplierId === user?.id || record.actorId === user?.id;
  if (!allowed) return { valid: false, error: "You can only accept valuation recommendations for your own assets." };
  const acceptance = {
    acceptanceId: `ai-valuation-acceptance-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    recommendationId,
    sourceId: record.sourceId,
    actorId: user.id,
    decision,
    note: "Acceptance tracking is local only. No automated reserve setting, pricing change, or external valuation provider action occurred.",
    createdAt: new Date().toISOString(),
  };
  saveAiValuationAcceptance(storage, [acceptance, ...loadAiValuationAcceptance(storage)]);
  saveAiValuationAudit(storage, audit.map((item) => item.recommendationId === recommendationId ? { ...item, acceptanceStatus: decision, updatedAt: new Date().toISOString() } : item));
  return { valid: true, acceptance };
}

export function getAiValuationDashboard(storage, user, scope = "supplier") {
  const role = normalizeRole(user?.role);
  const assets = loadAssetListings(storage);
  const auctions = loadAuctionListings(storage);
  const visibleAssets = scope === "admin" || role === "admin"
    ? assets
    : assets.filter((item) => item.ownerSupplierId === user?.id || item.ownerSupplierId === "review-supplier");
  const visibleAuctions = scope === "admin" || role === "admin"
    ? auctions
    : auctions.filter((item) => item.sellerId === user?.id || item.sellerId === "review-supplier");
  const valuations = [
    ...visibleAssets.map((item) => ({ item, valuation: analyzeValuation(item, "listing") })),
    ...visibleAuctions.map((item) => ({ item, valuation: analyzeValuation(item, "auction") })),
  ];
  const audit = loadAiValuationAudit(storage).filter((record) => (
    scope === "admin" || role === "admin" || record.supplierId === user?.id || record.actorId === user?.id
  ));
  const acceptance = loadAiValuationAcceptance(storage).filter((record) => audit.some((item) => item.recommendationId === record.recommendationId));
  const averageConfidence = valuations.length ? Math.round(valuations.reduce((total, item) => total + item.valuation.confidenceScore, 0) / valuations.length) : 0;
  const averageReserve = valuations.length ? money(valuations.reduce((total, item) => total + item.valuation.suggestedReservePrice, 0) / valuations.length) : 0;
  return {
    scope,
    assets: visibleAssets,
    auctions: visibleAuctions,
    valuations,
    audit,
    acceptance,
    averageConfidence,
    averageReserve,
    counts: {
      assets: visibleAssets.length,
      auctions: visibleAuctions.length,
      valuations: valuations.length,
      missingDataIndicators: valuations.reduce((total, item) => total + item.valuation.missingDataIndicators.length, 0),
      accepted: acceptance.length,
      providerActive: 0,
    },
    notice: AI_VALUATION_PROVIDER_NOTICE,
  };
}
