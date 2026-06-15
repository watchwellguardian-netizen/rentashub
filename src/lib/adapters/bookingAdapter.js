import { API_CONFIG } from "../apiClient.js";
import { validateBookingRequest } from "../bookingService.js";
import { bookingsRepository } from "../repositories/bookingsRepository.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { assetAdapter } from "./assetAdapter.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const BOOKING_API_PILOT_NOTICE =
  "Booking API mode is a guarded development pilot. Writes prefer backend bearer auth and use development role headers only as a local/demo fallback.";

export class BookingApiError extends Error {
  constructor(message, { status = 0, code = "booking_api_error", details = [] } = {}) {
    super(message);
    this.name = "BookingApiError";
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
    throw new BookingApiError("Booking API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function toCamelBooking(record = {}) {
  return {
    id: record.id,
    assetId: record.assetId ?? record.asset_id ?? "",
    assetTitle: record.assetTitle ?? record.asset_title ?? "Asset",
    customerId: record.customerId ?? record.customer_id ?? "",
    customerName: record.customerName ?? record.customer_name ?? "Customer",
    supplierId: record.supplierId ?? record.supplier_id ?? "",
    supplierName: record.supplierName ?? record.supplier_name ?? "Supplier",
    startDateTime: record.startDateTime ?? record.start_date_time ?? "",
    endDateTime: record.endDateTime ?? record.end_date_time ?? "",
    rentalType: record.rentalType ?? record.rental_type ?? "daily",
    pickupDeliveryMethod: record.pickupDeliveryMethod ?? record.pickup_delivery_method ?? "pickup",
    deliveryLocation: record.deliveryLocation ?? record.delivery_location ?? "",
    notes: record.notes || "",
    estimatedDuration: record.estimatedDuration ?? record.estimated_duration ?? 0,
    estimatedDurationLabel: record.estimatedDurationLabel ?? record.estimated_duration_label ?? "",
    estimatedCost: record.estimatedCost ?? record.estimated_cost ?? 0,
    depositRequirement: record.depositRequirement ?? record.deposit_requirement ?? "",
    status: record.status || "pending_supplier_approval",
    paymentStatus: record.paymentStatus ?? record.payment_status ?? "not_active",
    protectionPlanIds: record.protectionPlanIds ?? record.protection_plan_ids ?? [],
    protectionCost: record.protectionCost ?? record.protection_cost ?? 0,
    createdAt: record.createdAt ?? record.created_at,
    updatedAt: record.updatedAt ?? record.updated_at,
    deletedAt: record.deletedAt ?? record.deleted_at,
  };
}

function toApiBooking(booking = {}) {
  return {
    id: booking.id,
    asset_id: booking.assetId,
    asset_title: booking.assetTitle,
    customer_id: booking.customerId,
    customer_name: booking.customerName,
    supplier_id: booking.supplierId,
    supplier_name: booking.supplierName,
    start_date_time: booking.startDateTime,
    end_date_time: booking.endDateTime,
    rental_type: booking.rentalType,
    pickup_delivery_method: booking.pickupDeliveryMethod,
    delivery_location: booking.deliveryLocation,
    notes: booking.notes,
    estimated_duration: booking.estimatedDuration,
    estimated_duration_label: booking.estimatedDurationLabel,
    estimated_cost: booking.estimatedCost,
    deposit_requirement: booking.depositRequirement,
    status: booking.status,
    payment_status: booking.paymentStatus,
    protection_plan_ids: booking.protectionPlanIds || [],
    protection_cost: booking.protectionCost || 0,
  };
}

function devAuthHeaders(input = {}, options = {}) {
  return apiPilotAuthHeaders(options.user, options, {
    role: input.customer_id ? "customer" : "",
    id: input.customer_id || input.supplier_id,
    defaultId: "frontend-booking-api-pilot",
  });
}

async function requestBookingApi(path, { method = "GET", body, headers = {} } = {}) {
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
    throw new BookingApiError("Booking API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BookingApiError(payload.message || `Booking API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "booking_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function buildBookingPayload({ user, listing, input }) {
  const estimate = validateBookingRequest({ user, listing, input, existingBookings: [] }).estimate;
  return {
    id: input.id,
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: user.id,
    customerName: user.full_name || user.email || "Customer",
    supplierId: listing.ownerSupplierId,
    supplierName: listing.supplierName || "Supplier",
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    rentalType: listing.rentalType,
    pickupDeliveryMethod: input.pickupDeliveryMethod,
    deliveryLocation: input.pickupDeliveryMethod === "delivery" ? input.deliveryLocation : "",
    notes: input.notes || "",
    estimatedDuration: estimate.units,
    estimatedDurationLabel: estimate.label,
    estimatedCost: estimate.estimatedCost,
    depositRequirement: listing.depositRequirement,
    status: "pending_supplier_approval",
    paymentStatus: "not_active",
  };
}

const bookingApiImplementation = {
  adapter: "backendApiPilot",
  notice: BOOKING_API_PILOT_NOTICE,
  async list(_storage, options = {}) {
    const headers = devAuthHeaders({ customer_id: "frontend-booking-api-pilot" }, {
      user: options.user || { id: "frontend-booking-api-pilot", role: "customer" },
    });
    const payload = await requestBookingApi("/api/bookings", { headers });
    return (payload.data || []).map(toCamelBooking);
  },
  async getById(_storage, bookingId, options = {}) {
    const payload = await requestBookingApi(`/api/bookings/${encodeURIComponent(bookingId)}`, {
      headers: devAuthHeaders({}, options),
    });
    return payload.data ? toCamelBooking(payload.data) : null;
  },
  async listByCustomer(storage, customerId, options = {}) {
    const bookings = await this.list(storage, { ...options, user: options.user || { id: customerId, role: "customer" } });
    return bookings.filter((booking) => booking.customerId === customerId);
  },
  async listBySupplier(storage, supplierId, options = {}) {
    const bookings = await this.list(storage, { ...options, user: options.user || { id: supplierId, role: "supplier" } });
    return bookings.filter((booking) => booking.supplierId === supplierId);
  },
  async createRequest(_storage, payload, options = {}) {
    const validation = validateBookingRequest({ user: payload.user, listing: payload.listing, input: payload.input, existingBookings: [] });
    if (!validation.valid) return validation;
    const body = toApiBooking(buildBookingPayload(payload));
    const response = await requestBookingApi("/api/bookings", {
      method: "POST",
      body,
      headers: devAuthHeaders(body, { ...options, user: options.user || payload.user }),
    });
    const booking = toCamelBooking(response.data);
    return { valid: true, errors: {}, booking, bookings: [booking], apiMode: true };
  },
  async updateStatus(_storage, bookingId, status, user, options = {}) {
    const response = await requestBookingApi(`/api/bookings/${encodeURIComponent(bookingId)}`, {
      method: "PATCH",
      body: { status },
      headers: devAuthHeaders({}, { ...options, user }),
    });
    const booking = toCamelBooking(response.data);
    return { valid: true, booking, bookings: [booking], apiMode: true };
  },
  async resolveContext(storage, bookingId, options = {}) {
    const booking = await this.getById(storage, bookingId, options);
    const listing = booking?.assetId ? await Promise.resolve(assetAdapter.getById(storage, booking.assetId)) : null;
    return { booking, listing };
  },
  saveAll() {
    throw new BookingApiError("Bulk booking save is not supported in the booking API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("bookings", bookingsRepository);

export const bookingAdapter = {
  ...baseAdapter,
  api: bookingApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? bookingApiImplementation : bookingsRepository;
  },
};

for (const methodName of Object.keys(bookingsRepository).filter((key) => typeof bookingsRepository[key] === "function")) {
  bookingAdapter[methodName] = (...args) => bookingAdapter.forMode()[methodName](...args);
}

bookingAdapter.toCamelBooking = toCamelBooking;
bookingAdapter.toApiBooking = toApiBooking;
