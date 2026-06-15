import { trustRiskRepository } from "../repositories/trustRiskRepository.js";
import { API_CONFIG } from "../apiClient.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const TRUST_API_PILOT_NOTICE =
  "Trust API mode is a guarded development pilot. Recalculation prefers backend bearer auth and uses development role headers only as a local/demo fallback.";

export class TrustApiError extends Error {
  constructor(message, { status = 0, code = "trust_api_error", details = [] } = {}) {
    super(message);
    this.name = "TrustApiError";
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
    throw new TrustApiError("Trust API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function devAuthHeaders(user = {}, options = {}) {
  return apiPilotAuthHeaders(user, options, { defaultId: "frontend-trust-api-pilot" });
}

async function requestTrustApi(path, { method = "GET", body, headers = {} } = {}) {
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
    throw new TrustApiError("Trust API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new TrustApiError(payload.message || `Trust API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "trust_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

const trustApiImplementation = {
  adapter: "backendApiPilot",
  notice: TRUST_API_PILOT_NOTICE,
  async overview(_storage, options = {}) {
    const [suppliers, assets, customers] = await Promise.all([
      requestTrustApi("/api/trust/supplier", { headers: devAuthHeaders(options.user || { role: "customer" }, options) }),
      requestTrustApi("/api/trust/asset", { headers: devAuthHeaders(options.user || { role: "customer" }, options) }),
      requestTrustApi("/api/trust/customer", { headers: devAuthHeaders(options.user || { role: "customer" }, options) }),
    ]);
    return {
      suppliers: suppliers.data || [],
      assets: assets.data || [],
      customers: customers.data || [],
    };
  },
  async riskQueue(_storage, options = {}) {
    const payload = await requestTrustApi("/api/trust/risk-queue", {
      headers: devAuthHeaders(options.user || { role: "admin" }, options),
    });
    return payload.data || [];
  },
  async supplierScore(_storage, supplierId, options = {}) {
    const payload = await requestTrustApi(`/api/trust/supplier/${encodeURIComponent(supplierId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data;
  },
  async customerScore(_storage, customerId, options = {}) {
    const payload = await requestTrustApi(`/api/trust/customer/${encodeURIComponent(customerId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data;
  },
  async assetScore(_storage, assetId, options = {}) {
    const payload = await requestTrustApi(`/api/trust/asset/${encodeURIComponent(assetId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data;
  },
  async summaryForListing(storage, listing, options = {}) {
    if (!listing) return null;
    const [supplier, asset] = await Promise.all([
      this.supplierScore(storage, listing.ownerSupplierId, options),
      this.assetScore(storage, listing.id, options),
    ]);
    return { supplier, asset };
  },
  async rankListings(storage, listings = [], options = {}) {
    const scored = await Promise.all(listings.map(async (listing) => ({
      listing,
      score: (await this.assetScore(storage, listing.id, options))?.score || 0,
    })));
    return scored.sort((a, b) => b.score - a.score).map((item) => item.listing);
  },
  async recalculate(_storage, entityType, entityId, user, options = {}) {
    const payload = await requestTrustApi(`/api/trust/recalculate/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, {
      method: "PATCH",
      body: { entity_type: entityType, entity_id: entityId },
      headers: devAuthHeaders(user, options),
    });
    return payload.data;
  },
};

const baseAdapter = createFrontendAdapter("trust", trustRiskRepository);

export const trustAdapter = {
  ...baseAdapter,
  api: trustApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? trustApiImplementation : trustRiskRepository;
  },
};

for (const methodName of Object.keys(trustRiskRepository).filter((key) => typeof trustRiskRepository[key] === "function")) {
  trustAdapter[methodName] = (...args) => trustAdapter.forMode()[methodName](...args);
}
