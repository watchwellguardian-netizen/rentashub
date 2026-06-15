import { API_CONFIG } from "../apiClient.js";
import {
  adminUpdateDisputeStatus,
  getDisputeById,
  listVisibleDisputes,
  openDispute,
  resolveDisputeContext,
} from "../disputeService.js";
import { disputesRepository } from "../repositories/disputesRepository.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";
import { createFrontendAdapter } from "./createAdapter.js";

export const DISPUTE_API_PILOT_NOTICE =
  "Disputes API mode is a guarded development pilot. It prefers backend bearer auth and does not provide legal mediation, arbitration, payout, or escrow.";

export class DisputeApiError extends Error {
  constructor(message, { status = 0, code = "dispute_api_error", details = [] } = {}) {
    super(message);
    this.name = "DisputeApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requireBaseUrl() {
  const baseUrl = String(API_CONFIG.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) throw new DisputeApiError("Disputes API mode is enabled, but VITE_API_BASE_URL is not configured.", { code: "backend_unavailable" });
  return baseUrl;
}

async function requestDisputeApi(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new DisputeApiError("Disputes API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", { code: "backend_unavailable" });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new DisputeApiError(payload.message || `Disputes API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "dispute_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function toCamelDispute(dispute = {}) {
  return {
    id: dispute.id,
    bookingId: dispute.bookingId || dispute.booking_id || "",
    assetId: dispute.assetId || dispute.asset_id || "",
    customerId: dispute.customerId || dispute.customer_id || "",
    supplierId: dispute.supplierId || dispute.supplier_id || "",
    openedBy: dispute.openedBy || dispute.opened_by || "",
    openedByRole: dispute.openedByRole || dispute.opened_by_role || "",
    reason: dispute.reason || "other",
    summary: dispute.summary || dispute.details || "",
    evidence: dispute.evidence || [],
    status: dispute.status || "submitted",
    adminNotes: dispute.adminNotes || dispute.admin_notes || "",
    createdAt: dispute.createdAt || dispute.created_at,
    updatedAt: dispute.updatedAt || dispute.updated_at,
    notice: dispute.notice || DISPUTE_API_PILOT_NOTICE,
  };
}

function toApiDispute({ user, bookingId, input = {}, booking = {} }) {
  return {
    booking_id: bookingId || booking.id,
    asset_id: input.assetId || booking.assetId || booking.asset_id,
    customer_id: input.customerId || booking.customerId || booking.customer_id,
    supplier_id: input.supplierId || booking.supplierId || booking.supplier_id,
    opened_by: user?.id,
    opened_by_role: user?.role,
    reason: input.reason,
    summary: input.summary,
    evidence: input.evidence || [],
  };
}

const localDisputeImplementation = {
  list: disputesRepository.list,
  getById: getDisputeById,
  listVisible: listVisibleDisputes,
  open: openDispute,
  resolveContext: resolveDisputeContext,
  adminList: disputesRepository.list,
  adminUpdateStatus: adminUpdateDisputeStatus,
  saveAll: disputesRepository.saveAll,
};

const disputeApiImplementation = {
  adapter: "backendApiPilot",
  notice: DISPUTE_API_PILOT_NOTICE,
  async list(_storage, options = {}) {
    const payload = await requestDisputeApi("/api/disputes", {
      headers: apiPilotAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelDispute);
  },
  async listVisible(storage, user, options = {}) {
    return this.list(storage, { ...options, user });
  },
  async adminList(_storage, adminUser, options = {}) {
    const payload = await requestDisputeApi("/api/admin/disputes", {
      headers: apiPilotAuthHeaders(adminUser, options),
    });
    return (payload.data || []).map(toCamelDispute);
  },
  async getById(_storage, disputeId, options = {}) {
    const payload = await requestDisputeApi(`/api/disputes/${encodeURIComponent(disputeId)}`, {
      headers: apiPilotAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data ? toCamelDispute(payload.data) : null;
  },
  async open(_storage, payload, options = {}) {
    const body = toApiDispute(payload);
    const response = await requestDisputeApi("/api/disputes", {
      method: "POST",
      body,
      headers: apiPilotAuthHeaders(payload.user, options),
    });
    return { valid: true, dispute: toCamelDispute(response.data), apiMode: true };
  },
  resolveContext() {
    throw new DisputeApiError("Dispute context joins remain local until booking and asset views are fully API-authenticated.", { code: "unsupported_operation" });
  },
  async adminUpdateStatus(_storage, disputeId, status, adminUser, adminNotes = "", options = {}) {
    const response = await requestDisputeApi(`/api/admin/disputes/${encodeURIComponent(disputeId)}`, {
      method: "PATCH",
      body: { status, admin_notes: adminNotes },
      headers: apiPilotAuthHeaders(adminUser, options),
    });
    return { valid: true, dispute: toCamelDispute(response.data), apiMode: true };
  },
  saveAll() {
    throw new DisputeApiError("Bulk dispute save is not supported in the disputes API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("disputes", localDisputeImplementation);

export const disputeAdapter = {
  ...baseAdapter,
  api: disputeApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? disputeApiImplementation : localDisputeImplementation;
  },
};

for (const methodName of Object.keys(localDisputeImplementation).filter((key) => typeof localDisputeImplementation[key] === "function")) {
  disputeAdapter[methodName] = (...args) => disputeAdapter.forMode()[methodName](...args);
}

disputeAdapter.toCamelDispute = toCamelDispute;
