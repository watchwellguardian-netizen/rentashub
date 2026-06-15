import { API_CONFIG } from "../apiClient.js";
import { getCategoryById } from "../assetListing.js";
import { validateInspection } from "../inspectionService.js";
import { inspectionsRepository } from "../repositories/inspectionsRepository.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { assetAdapter } from "./assetAdapter.js";
import { bookingAdapter } from "./bookingAdapter.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const INSPECTION_API_PILOT_NOTICE =
  "Inspection API mode is a guarded development pilot. Writes prefer backend bearer auth and use development role headers only as a local/demo fallback.";

export class InspectionApiError extends Error {
  constructor(message, { status = 0, code = "inspection_api_error", details = [] } = {}) {
    super(message);
    this.name = "InspectionApiError";
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
    throw new InspectionApiError("Inspection API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function safeObject(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toCamelInspection(record = {}) {
  return {
    id: record.id,
    type: record.type || "check-in",
    bookingId: record.bookingId ?? record.booking_id ?? "",
    assetId: record.assetId ?? record.asset_id ?? "",
    assetTitle: record.assetTitle ?? record.asset_title ?? "Asset",
    assetCategory: record.assetCategory ?? record.asset_category ?? "",
    categoryLabel: record.categoryLabel ?? record.category_label ?? "",
    conditionStatus: record.conditionStatus ?? record.condition_status ?? "",
    checklist: safeObject(record.checklist, {}),
    photos: safeObject(record.photos, []),
    fuelBatteryLevel: record.fuelBatteryLevel ?? record.fuel_battery_level ?? "",
    odometer: record.odometer || "",
    engineHours: record.engineHours ?? record.engine_hours ?? "",
    accessoriesIncluded: record.accessoriesIncluded ?? record.accessories_included ?? "",
    missingAccessories: record.missingAccessories ?? record.missing_accessories ?? "",
    customerNotes: record.customerNotes ?? record.customer_notes ?? "",
    damageNotes: record.damageNotes ?? record.damage_notes ?? "",
    location: safeObject(record.location, { label: "", gpsReady: true, coordinates: null }),
    submittedByUserId: record.submittedByUserId ?? record.submitted_by_user_id ?? "",
    submittedByRole: record.submittedByRole ?? record.submitted_by_role ?? "",
    timestamp: record.timestamp || record.created_at || record.createdAt,
    supplierReview: safeObject(record.supplierReview ?? record.supplier_review, { status: "pending", reviewedByUserId: "", reviewedAt: "", notes: "" }),
    createdAt: record.createdAt ?? record.created_at,
    updatedAt: record.updatedAt ?? record.updated_at,
  };
}

function toApiInspection(inspection = {}) {
  return {
    id: inspection.id,
    type: inspection.type,
    booking_id: inspection.bookingId,
    asset_id: inspection.assetId,
    asset_title: inspection.assetTitle,
    asset_category: inspection.assetCategory,
    category_label: inspection.categoryLabel,
    condition_status: inspection.conditionStatus,
    checklist: inspection.checklist || {},
    photos: inspection.photos || [],
    fuel_battery_level: inspection.fuelBatteryLevel,
    odometer: inspection.odometer,
    engine_hours: inspection.engineHours,
    accessories_included: inspection.accessoriesIncluded,
    missing_accessories: inspection.missingAccessories,
    customer_notes: inspection.customerNotes,
    damage_notes: inspection.damageNotes,
    location: inspection.location || { label: "", gpsReady: true, coordinates: null },
    submitted_by_user_id: inspection.submittedByUserId,
    submitted_by_role: inspection.submittedByRole,
    timestamp: inspection.timestamp,
    supplier_review: inspection.supplierReview || { status: "pending", reviewedByUserId: "", reviewedAt: "", notes: "" },
  };
}

function devAuthHeaders(input = {}, options = {}) {
  return apiPilotAuthHeaders(options.user, options, {
    role: input.submitted_by_role || "",
    id: input.submitted_by_user_id,
    defaultId: "frontend-inspection-api-pilot",
  });
}

async function requestInspectionApi(path, { method = "GET", body, headers = {} } = {}) {
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
    throw new InspectionApiError("Inspection API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new InspectionApiError(payload.message || `Inspection API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "inspection_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function buildInspectionPayload({ type, user, booking, listing, input }) {
  const validation = validateInspection({ type, user, booking, listing, input });
  if (!validation.valid) return { validation };
  const now = new Date().toISOString();
  const inspection = {
    id: input.id,
    type,
    bookingId: booking.id,
    assetId: listing.id,
    assetTitle: listing.title,
    assetCategory: listing.category,
    categoryLabel: getCategoryById(listing.category).label,
    conditionStatus: validation.input.conditionStatus,
    checklist: validation.input.checklist,
    photos: validation.input.photos.length
      ? validation.input.photos
      : [{ id: `photo-placeholder-${Date.now()}`, name: "photo upload coming soon", status: "upload-ready-placeholder" }],
    fuelBatteryLevel: validation.input.fuelBatteryLevel,
    odometer: validation.input.odometer,
    engineHours: validation.input.engineHours,
    accessoriesIncluded: validation.input.accessoriesIncluded,
    missingAccessories: validation.input.missingAccessories,
    customerNotes: validation.input.customerNotes,
    damageNotes: validation.input.damageNotes,
    location: {
      label: validation.input.locationLabel,
      gpsReady: true,
      coordinates: null,
    },
    submittedByUserId: user.id,
    submittedByRole: user.role,
    timestamp: now,
    supplierReview: {
      status: "pending",
      reviewedByUserId: "",
      reviewedAt: "",
      notes: "",
    },
  };
  return { validation, inspection };
}

const inspectionApiImplementation = {
  adapter: "backendApiPilot",
  notice: INSPECTION_API_PILOT_NOTICE,
  async list(_storage, options = {}) {
    const payload = await requestInspectionApi("/api/inspections", {
      headers: devAuthHeaders({ submitted_by_role: "customer" }, { user: options.user || { id: "frontend-inspection-api-pilot", role: "customer" } }),
    });
    return (payload.data || []).map(toCamelInspection);
  },
  async getById(_storage, inspectionId, options = {}) {
    const payload = await requestInspectionApi(`/api/inspections/${encodeURIComponent(inspectionId)}`, {
      headers: devAuthHeaders({}, options),
    });
    return payload.data ? toCamelInspection(payload.data) : null;
  },
  async listByBooking(storage, bookingId, options = {}) {
    const inspections = await this.list(storage, options);
    return inspections.filter((inspection) => inspection.bookingId === bookingId);
  },
  async submit(_storage, payload, options = {}) {
    const built = buildInspectionPayload(payload);
    if (!built.validation.valid) return built.validation;
    const body = toApiInspection(built.inspection);
    const response = await requestInspectionApi("/api/inspections", {
      method: "POST",
      body,
      headers: devAuthHeaders(body, { ...options, user: options.user || payload.user }),
    });
    const inspection = toCamelInspection(response.data);
    const nextStatus = payload.type === "check-in" ? "active" : "completed";
    let booking = payload.booking;
    try {
      const update = await bookingAdapter.forMode("api").updateStatus(null, payload.booking.id, nextStatus, payload.user);
      booking = update.booking || booking;
    } catch {
      booking = { ...booking, status: nextStatus };
    }
    return { valid: true, errors: {}, inspection, booking, inspections: [inspection], apiMode: true };
  },
  async review(_storage, inspectionId, status, user, notes = "", options = {}) {
    const supplierReview = {
      status,
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      notes,
      placeholder: status === "flagged" ? "Damage claim and dispute workflow will be added in a later module." : "",
    };
    const response = await requestInspectionApi(`/api/inspections/${encodeURIComponent(inspectionId)}`, {
      method: "PATCH",
      body: { supplier_review: supplierReview },
      headers: devAuthHeaders({}, { ...options, user }),
    });
    const inspection = toCamelInspection(response.data);
    return { valid: true, inspection, inspections: [inspection], apiMode: true };
  },
  async getContext(storage, inspectionId, options = {}) {
    const inspection = await this.getById(storage, inspectionId, options);
    const booking = inspection?.bookingId ? await Promise.resolve(bookingAdapter.getById(storage, inspection.bookingId, options)) : null;
    const listing = inspection?.assetId ? await Promise.resolve(assetAdapter.getById(storage, inspection.assetId)) : null;
    return { inspection, booking, listing };
  },
  saveAll() {
    throw new InspectionApiError("Bulk inspection save is not supported in the inspection API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("inspections", inspectionsRepository);

export const inspectionAdapter = {
  ...baseAdapter,
  api: inspectionApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? inspectionApiImplementation : inspectionsRepository;
  },
};

for (const methodName of Object.keys(inspectionsRepository).filter((key) => typeof inspectionsRepository[key] === "function")) {
  inspectionAdapter[methodName] = (...args) => inspectionAdapter.forMode()[methodName](...args);
}

inspectionAdapter.toCamelInspection = toCamelInspection;
inspectionAdapter.toApiInspection = toApiInspection;
