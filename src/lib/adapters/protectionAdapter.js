import { claimsRepository } from "../repositories/claimsRepository.js";
import { protectionPlansRepository } from "../repositories/protectionPlansRepository.js";
import { API_CONFIG } from "../apiClient.js";
import {
  calculateProtectionPlanCost,
  getProtectionAvailabilitySummary,
  resolveClaimContext,
  selectBookingProtection,
} from "../protectionService.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const PROTECTION_API_PILOT_NOTICE =
  "Protection and claims API mode is a guarded development pilot. Writes prefer backend bearer auth, use development role headers only as a local/demo fallback, and do not create real insurance, adjudication, payout, or escrow.";

export class ProtectionApiError extends Error {
  constructor(message, { status = 0, code = "protection_api_error", details = [] } = {}) {
    super(message);
    this.name = "ProtectionApiError";
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
    throw new ProtectionApiError("Protection API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function devAuthHeaders(user = {}, options = {}) {
  return apiPilotAuthHeaders(user, options, { defaultId: "frontend-protection-api-pilot" });
}

async function requestProtectionApi(path, { method = "GET", body, headers = {} } = {}) {
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
    throw new ProtectionApiError("Protection API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProtectionApiError(payload.message || `Protection API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "protection_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function toCamelPlan(plan = {}) {
  return {
    id: plan.id,
    name: plan.name || "",
    type: plan.type || plan.planType || plan.plan_type || "damage_waiver",
    coverageSummary: plan.coverageSummary || plan.description || "",
    exclusions: plan.exclusions || "See simulated protection terms.",
    deductible: plan.deductible || "No real deductible is active.",
    priceModel: plan.priceModel || "percentage_of_booking",
    priceValue: Number(plan.priceValue ?? plan.feeRate ?? plan.fee_rate ?? 0),
    status: plan.status || "simulated",
    notice: plan.notice || PROTECTION_API_PILOT_NOTICE,
  };
}

function toCamelClaim(claim = {}) {
  return {
    id: claim.id,
    bookingId: claim.bookingId || claim.booking_id || "",
    assetId: claim.assetId || claim.asset_id || "",
    customerId: claim.customerId || claim.customer_id || "",
    supplierId: claim.supplierId || claim.supplier_id || "",
    claimantId: claim.claimantId || claim.claimant_id || "",
    claimType: claim.claimType || claim.claim_type || "damage",
    description: claim.description || "",
    evidence: claim.evidence || [],
    linkedDisputeId: claim.linkedDisputeId || claim.linked_dispute_id || "",
    linkedInspectionId: claim.linkedInspectionId || claim.linked_inspection_id || "",
    status: claim.status || "submitted",
    submittedByUserId: claim.submittedByUserId || claim.submitted_by_user_id || "",
    submittedByRole: claim.submittedByRole || claim.submitted_by_role || "",
    createdAt: claim.createdAt || claim.created_at,
    updatedAt: claim.updatedAt || claim.updated_at,
    notice: claim.notice || PROTECTION_API_PILOT_NOTICE,
  };
}

function toApiClaim({ user, bookingId, input = {}, booking = {} }) {
  return {
    booking_id: bookingId || booking.id || input.bookingId,
    asset_id: input.assetId || booking.assetId || booking.asset_id,
    customer_id: input.customerId || booking.customerId || booking.customer_id,
    supplier_id: input.supplierId || booking.supplierId || booking.supplier_id,
    claim_type: input.claimType,
    description: input.description,
    evidence: input.evidence || [],
    linked_dispute_id: input.linkedDisputeId || "",
    linked_inspection_id: input.linkedInspectionId || "",
    submitted_by_user_id: user?.id,
    submitted_by_role: user?.role,
  };
}

const localProtectionImplementation = {
  listPlans: protectionPlansRepository.list,
  getPlanById: protectionPlansRepository.getById,
  recommendedPlansForCategory: protectionPlansRepository.recommendedForCategory,
  calculatePlanCost: calculateProtectionPlanCost,
  getProtectionAvailabilitySummary,
  selectBookingProtection,
  resolveClaimContext,
  listClaims: claimsRepository.list,
  getClaimById: claimsRepository.getById,
  listClaimsForAsset: claimsRepository.listForAsset,
  listClaimsForSupplier: claimsRepository.listForSupplier,
  submitClaim: claimsRepository.submit,
  adminUpdateClaimStatus: claimsRepository.adminUpdateStatus,
  saveClaims: claimsRepository.saveAll,
};

const protectionApiImplementation = {
  adapter: "backendApiPilot",
  notice: PROTECTION_API_PILOT_NOTICE,
  async listPlans() {
    const payload = await requestProtectionApi("/api/protection/plans");
    return (payload.data || []).map(toCamelPlan);
  },
  async getPlanById(planId) {
    const payload = await requestProtectionApi(`/api/protection/plans/${encodeURIComponent(planId)}`);
    return payload.data ? toCamelPlan(payload.data) : null;
  },
  async recommendedPlansForCategory(category) {
    const plans = await this.listPlans();
    const categoryMap = {
      cars: ["damage_waiver", "liability_protection", "roadside_support"],
      trucks: ["damage_waiver", "liability_protection", "roadside_support"],
      "heavy-equipment": ["damage_waiver", "equipment_breakdown", "theft_protection"],
      "small-tools-machines": ["damage_waiver", "equipment_breakdown", "theft_protection"],
      "event-spaces": ["event_space_protection", "liability_protection"],
      "real-estate": ["property_protection", "liability_protection"],
      trailers: ["damage_waiver", "theft_protection", "roadside_support"],
      "storage-containers": ["property_protection", "theft_protection"],
      "specialty-assets": ["damage_waiver", "equipment_breakdown", "theft_protection"],
    };
    const allowed = categoryMap[category] || ["damage_waiver"];
    return plans.filter((plan) => allowed.includes(plan.type));
  },
  calculatePlanCost: calculateProtectionPlanCost,
  getProtectionAvailabilitySummary,
  async getBookingProtection(_storage, bookingId, options = {}) {
    const payload = await requestProtectionApi(`/api/protection/booking/${encodeURIComponent(bookingId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data;
  },
  async selectBookingProtection(_storage, { user, bookingId, planIds = [] }, options = {}) {
    const payload = await requestProtectionApi(`/api/protection/booking/${encodeURIComponent(bookingId)}`, {
      method: "PATCH",
      body: { plan_ids: planIds },
      headers: devAuthHeaders(user, options),
    });
    return { valid: true, booking: payload.data.booking, selectedPlans: payload.data.selections, protectionCost: payload.data.protectionCost, apiMode: true };
  },
  async listClaims(_storage, options = {}) {
    const payload = await requestProtectionApi("/api/claims", {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelClaim);
  },
  async getClaimById(_storage, claimId, options = {}) {
    const payload = await requestProtectionApi(`/api/claims/${encodeURIComponent(claimId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data ? toCamelClaim(payload.data) : null;
  },
  async listClaimsForAsset(storage, assetId, options = {}) {
    const claims = await this.listClaims(storage, options);
    return claims.filter((claim) => claim.assetId === assetId);
  },
  async listClaimsForSupplier(storage, supplierId, options = {}) {
    const claims = await this.listClaims(storage, options);
    return claims.filter((claim) => claim.supplierId === supplierId);
  },
  async submitClaim(_storage, payload, options = {}) {
    const body = toApiClaim(payload);
    const response = await requestProtectionApi("/api/claims", {
      method: "POST",
      body,
      headers: devAuthHeaders(payload.user, options),
    });
    return { valid: true, claim: toCamelClaim(response.data), apiMode: true };
  },
  resolveClaimContext() {
    throw new ProtectionApiError("Claim context joins remain local until the protection API pilot is fully connected to booking and asset views.", {
      code: "unsupported_operation",
    });
  },
  async adminUpdateClaimStatus(_storage, claimId, status, adminUser, options = {}) {
    const response = await requestProtectionApi(`/api/admin/claims/${encodeURIComponent(claimId)}`, {
      method: "PATCH",
      body: { status },
      headers: devAuthHeaders(adminUser, options),
    });
    return { valid: true, claim: toCamelClaim(response.data), apiMode: true };
  },
  saveClaims() {
    throw new ProtectionApiError("Bulk claim save is not supported in the protection and claims API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("protection", localProtectionImplementation);

export const protectionAdapter = {
  ...baseAdapter,
  api: protectionApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? protectionApiImplementation : localProtectionImplementation;
  },
};

for (const methodName of Object.keys(localProtectionImplementation).filter((key) => typeof localProtectionImplementation[key] === "function")) {
  protectionAdapter[methodName] = (...args) => protectionAdapter.forMode()[methodName](...args);
}

protectionAdapter.toCamelPlan = toCamelPlan;
protectionAdapter.toCamelClaim = toCamelClaim;
