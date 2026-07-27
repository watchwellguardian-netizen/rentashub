import { apiRequest, isLocalStorageMode, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { isFeatureEnabled } from "../featureFlags.js";

const FLAG_KEY = "rental_core_backend_path";

function assertBackendPath(options = {}) {
  const environment = options.environment || "development";
  const enabled = isFeatureEnabled(FLAG_KEY, environment, options.featureOverrides || {});
  if (!enabled || isLocalStorageMode()) {
    return {
      enabled: false,
      status: "legacy_local_storage_fallback",
      notice: LOCAL_STORAGE_ADAPTER_NOTICE,
      removalPath: "Enable rental_core_backend_path only after A4 persistence, Auth, Storage, and API evidence pass.",
    };
  }
  return { enabled: true };
}

async function callCoreRental(path, body, options = {}) {
  const readiness = assertBackendPath(options);
  if (!readiness.enabled) return readiness;
  return apiRequest(path, {
    method: "POST",
    headers: options.headers || {},
    body: JSON.stringify(body || {}),
    storage: options.storage,
  });
}

async function getCoreRental(path, options = {}) {
  const readiness = assertBackendPath(options);
  if (!readiness.enabled) return readiness;
  return apiRequest(path, {
    method: "GET",
    headers: options.headers || {},
    storage: options.storage,
  });
}

function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function patchCoreRental(path, body, options = {}) {
  const readiness = assertBackendPath(options);
  if (!readiness.enabled) return readiness;
  return apiRequest(path, {
    method: "PATCH",
    headers: options.headers || {},
    body: JSON.stringify(body || {}),
    storage: options.storage,
  });
}

export const coreRentalApiAdapter = {
  readiness(options = {}) {
    return assertBackendPath(options);
  },
  validateSupplierProfile(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/supplier-profile/validate", payload, options);
  },
  createAsset(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/assets", payload, options);
  },
  quote(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/quote", payload, options);
  },
  checkAvailability(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/availability", payload, options);
  },
  requestBooking(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/bookings", payload, options);
  },
  listBookings(query = {}, options = {}) {
    return getCoreRental(withQuery("/api/v1/rentals/bookings", query), options);
  },
  getBooking(bookingId, options = {}) {
    return getCoreRental(`/api/v1/rentals/bookings/${encodeURIComponent(bookingId)}`, options);
  },
  runBookingAction(bookingId, action, payload = {}, options = {}) {
    return patchCoreRental(`/api/v1/rentals/bookings/${encodeURIComponent(bookingId)}/${action}`, payload, options);
  },
  runListingAction(assetId, action, payload = {}, options = {}) {
    return patchCoreRental(`/api/v1/rentals/listings/${encodeURIComponent(assetId)}/${action}`, payload, options);
  },
  async runProviderIndependentLifecycle({ asset, booking, extension = {}, dispute = {} } = {}, options = {}) {
    const supplierOptions = {
      ...options,
      headers: { ...(options.headers || {}), "x-user-role": "supplier", "x-user-id": asset?.owner_id || booking?.supplier_id || "supplier-demo" },
    };
    const customerOptions = {
      ...options,
      headers: { ...(options.headers || {}), "x-user-role": "customer", "x-user-id": booking?.customer_id || "customer-demo" },
    };
    const createdAsset = asset?.id ? { data: asset } : await this.createAsset(asset || {}, supplierOptions);
    const assetId = createdAsset.data?.id || asset.id;
    const moderated = await this.runListingAction(assetId, "moderate", {}, supplierOptions);
    const published = await this.runListingAction(assetId, "publish", {}, supplierOptions);
    const availability = await this.checkAvailability({ ...booking, asset_id: assetId }, customerOptions);
    const quote = await this.quote({ ...booking, asset_id: assetId }, customerOptions);
    const requested = await this.requestBooking({ ...booking, asset_id: assetId }, customerOptions);
    const bookingId = requested.data.id;
    const accepted = await this.runBookingAction(bookingId, "accept", { expected_version: requested.data.version }, supplierOptions);
    const paymentRequired = await this.runBookingAction(bookingId, "payment-required", { expected_version: accepted.data.version }, supplierOptions);
    const confirmed = await this.runBookingAction(bookingId, "confirm", { expected_version: paymentRequired.data.version }, supplierOptions);
    const contract = await this.runBookingAction(bookingId, "trigger-contract", { expected_version: confirmed.data.version }, supplierOptions);
    const checkedIn = await this.runBookingAction(bookingId, "check-in", { expected_version: contract.data.version }, supplierOptions);
    const active = await this.runBookingAction(bookingId, "activate", { expected_version: checkedIn.data.version }, supplierOptions);
    const extensionRequest = extension.requested_end_at
      ? await this.runBookingAction(bookingId, "request-extension", { requested_end_at: extension.requested_end_at, expected_version: active.data.version }, customerOptions)
      : null;
    const extensionDecision = extensionRequest
      ? await this.runBookingAction(bookingId, extension.decision === "reject" ? "reject-extension" : "approve-extension", { expected_version: extensionRequest.data.version }, supplierOptions)
      : active;
    const checkedOut = await this.runBookingAction(bookingId, "check-out", { expected_version: extensionDecision.data.version }, supplierOptions);
    const finalCharge = await this.runBookingAction(bookingId, "calculate-final-charge", { expected_version: checkedOut.data.version }, supplierOptions);
    const settlement = await this.runBookingAction(bookingId, "prepare-settlement", { expected_version: finalCharge.data.version }, supplierOptions);
    const reviewEligibility = await this.runBookingAction(bookingId, "mark-review-eligible", { expected_version: settlement.data.version }, customerOptions);
    const disputeRecord = dispute.reason
      ? await this.runBookingAction(bookingId, "open-dispute", { reason: dispute.reason, expected_version: reviewEligibility.data.version }, customerOptions)
      : null;
    const customerBooking = await this.getBooking(bookingId, customerOptions);
    const supplierBookings = await this.listBookings({ supplier_id: booking?.supplier_id || "supplier-demo" }, supplierOptions);
    const customerBookings = await this.listBookings({ customer_id: booking?.customer_id || "customer-demo" }, customerOptions);
    return {
      createdAsset,
      moderated,
      published,
      availability,
      quote,
      requested,
      accepted,
      paymentRequired,
      confirmed,
      contract,
      checkedIn,
      active,
      extensionRequest,
      extensionDecision,
      checkedOut,
      finalCharge,
      settlement,
      reviewEligibility,
      disputeRecord,
      customerBooking,
      supplierBookings,
      customerBookings,
      providerStatus: "provider_independent_local",
    };
  },
};
