import { assetsRepository } from "../repositories/assetsRepository.js";
import { API_CONFIG } from "../apiClient.js";
import { createAssetListing } from "../assetListing.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const ASSET_API_PILOT_NOTICE =
  "Asset API mode is a guarded development pilot. Writes prefer backend bearer auth and use development role headers only as a local/demo fallback.";

export class AssetApiError extends Error {
  constructor(message, { status = 0, code = "asset_api_error", details = [] } = {}) {
    super(message);
    this.name = "AssetApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeBaseUrl(baseUrl = API_CONFIG.baseUrl) {
  return String(baseUrl || "").replace(/\/$/, "");
}

function requireBaseUrl() {
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    throw new AssetApiError("Asset API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function parseMaybeJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toCamelAsset(record = {}) {
  return {
    id: record.id,
    title: record.title || "",
    category: record.category || "cars",
    subcategory: record.subcategory || "",
    description: record.description || "",
    location: record.location || "",
    rentalType: record.rentalType ?? record.rental_type ?? "daily",
    priceRate: record.priceRate ?? record.price_rate ?? "",
    depositRequirement: record.depositRequirement ?? record.deposit_requirement ?? "",
    deliveryPickupOptions: record.deliveryPickupOptions ?? record.delivery_pickup_options ?? "pickup",
    availabilityStatus: record.availabilityStatus ?? record.availability_status ?? "available",
    photos: parseMaybeJson(record.photos, []),
    ownerSupplierId: record.ownerSupplierId ?? record.owner_id ?? "",
    supplierName: record.supplierName ?? record.supplier_name ?? "Supplier",
    insuranceRequirement: record.insuranceRequirement ?? record.insurance_requirement ?? "",
    protectionRequirement: record.protectionRequirement ?? record.protection_requirement ?? "optional",
    damagePolicy: record.damagePolicy ?? record.damage_policy ?? "",
    cancellationPolicy: record.cancellationPolicy ?? record.cancellation_policy ?? "",
    safetyInstructions: record.safetyInstructions ?? record.safety_instructions ?? "",
    usageInstructions: record.usageInstructions ?? record.usage_instructions ?? "",
    operatorRequired: Boolean(record.operatorRequired ?? record.operator_required),
    verificationStatus: record.verificationStatus ?? record.verification_status ?? "draft",
    listingType: record.listingType ?? record.listing_type ?? "rental",
    salePrice: record.salePrice ?? record.sale_price ?? "",
    tradeValue: record.tradeValue ?? record.trade_value ?? "",
    swapInterested: Boolean(record.swapInterested ?? record.swap_interested),
    wantedCategories: parseMaybeJson(record.wantedCategories ?? record.wanted_categories, []),
    brokerAssistRequired: Boolean(record.brokerAssistRequired ?? record.broker_assist_required),
    negotiationAllowed: record.negotiationAllowed ?? record.negotiation_allowed ?? true,
    categoryFields: parseMaybeJson(record.categoryFields ?? record.category_fields, {}),
    createdAt: record.createdAt ?? record.created_at,
    updatedAt: record.updatedAt ?? record.updated_at,
    deletedAt: record.deletedAt ?? record.deleted_at,
  };
}

function toApiAsset(input = {}) {
  return {
    id: input.id,
    owner_id: input.ownerSupplierId || input.owner_id,
    title: input.title,
    category: input.category,
    subcategory: input.subcategory,
    description: input.description,
    location: input.location,
    rental_type: input.rentalType,
    price_rate: input.priceRate === "" ? undefined : Number(input.priceRate),
    deposit_requirement: input.depositRequirement,
    delivery_pickup_options: input.deliveryPickupOptions,
    availability_status: input.availabilityStatus,
    photos: input.photos || [],
    supplier_name: input.supplierName,
    insurance_requirement: input.insuranceRequirement,
    protection_requirement: input.protectionRequirement,
    damage_policy: input.damagePolicy,
    cancellation_policy: input.cancellationPolicy,
    safety_instructions: input.safetyInstructions,
    usage_instructions: input.usageInstructions,
    operator_required: Boolean(input.operatorRequired),
    verification_status: input.verificationStatus,
    listing_type: input.listingType,
    sale_price: input.salePrice === "" ? undefined : Number(input.salePrice),
    trade_value: input.tradeValue === "" ? undefined : Number(input.tradeValue),
    swap_interested: Boolean(input.swapInterested),
    wanted_categories: input.wantedCategories || [],
    broker_assist_required: Boolean(input.brokerAssistRequired),
    negotiation_allowed: input.negotiationAllowed !== false,
    category_fields: input.categoryFields || {},
  };
}

function devAuthHeaders(input = {}, options = {}) {
  const userId = input.ownerSupplierId || input.owner_id;
  return apiPilotAuthHeaders(options.user, options, {
    role: userId ? "supplier" : "",
    id: userId,
    defaultId: "frontend-asset-api-pilot",
  });
}

async function requestAssetApi(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AssetApiError("Asset API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AssetApiError(payload.message || `Asset API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "asset_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

const assetApiImplementation = {
  adapter: "backendApiPilot",
  notice: ASSET_API_PILOT_NOTICE,
  async list() {
    const payload = await requestAssetApi("/api/assets");
    return (payload.data || []).map(toCamelAsset);
  },
  async getById(_storage, assetId) {
    const payload = await requestAssetApi(`/api/assets/${encodeURIComponent(assetId)}`);
    return payload.data ? toCamelAsset(payload.data) : null;
  },
  async listBySupplier(_storage, supplierId) {
    const listings = await this.list();
    return listings.filter((listing) => listing.ownerSupplierId === supplierId);
  },
  async upsert(_storage, input, options = {}) {
    const validation = createAssetListing(input);
    if (!validation.valid) return validation;
    const body = toApiAsset(validation.listing);
    const isUpdate = Boolean(input.id);
    const payload = await requestAssetApi(isUpdate ? `/api/assets/${encodeURIComponent(input.id)}` : "/api/assets", {
      method: isUpdate ? "PATCH" : "POST",
      body,
      headers: devAuthHeaders(body, options),
    });
    const listing = toCamelAsset(payload.data);
    return { valid: true, errors: {}, listing, listings: [listing], apiMode: true };
  },
  async softDelete(_storage, assetId, options = {}) {
    const payload = await requestAssetApi(`/api/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
      headers: devAuthHeaders({}, options),
    });
    return toCamelAsset(payload.data);
  },
  saveAll() {
    throw new AssetApiError("Bulk asset save is not supported in the asset API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("assets", assetsRepository);

export const assetAdapter = {
  ...baseAdapter,
  api: assetApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? assetApiImplementation : assetsRepository;
  },
};

for (const methodName of Object.keys(assetsRepository).filter((key) => typeof assetsRepository[key] === "function")) {
  assetAdapter[methodName] = (...args) => assetAdapter.forMode()[methodName](...args);
}

assetAdapter.softDelete = (...args) => assetAdapter.forMode().softDelete?.(...args);
assetAdapter.toCamelAsset = toCamelAsset;
assetAdapter.toApiAsset = toApiAsset;
