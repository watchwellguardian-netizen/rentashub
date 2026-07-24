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
  quote(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/quote", payload, options);
  },
  checkAvailability(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/availability", payload, options);
  },
  requestBooking(payload, options = {}) {
    return callCoreRental("/api/v1/rentals/bookings", payload, options);
  },
  runBookingAction(bookingId, action, payload = {}, options = {}) {
    return patchCoreRental(`/api/v1/rentals/bookings/${encodeURIComponent(bookingId)}/${action}`, payload, options);
  },
  runListingAction(assetId, action, payload = {}, options = {}) {
    return patchCoreRental(`/api/v1/rentals/listings/${encodeURIComponent(assetId)}/${action}`, payload, options);
  },
};
