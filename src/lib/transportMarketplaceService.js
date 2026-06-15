import { createNotification } from "./notificationService.js";
import { getAuctionById } from "./auctionService.js";
import { normalizeRole } from "./rbac.js";

export const TRANSPORT_PROFILES_STORAGE_KEY = "rentashub_transport_profiles";
export const TRANSPORT_REQUESTS_STORAGE_KEY = "rentashub_transport_requests";

export const TRANSPORT_PROVIDER_STATUSES = ["pending_review", "approved", "suspended", "rejected"];
export const TRANSPORT_REQUEST_STATUSES = ["quote_requested", "quote_sent", "booked_placeholder", "pickup_scheduled", "in_transit_placeholder", "delivered_placeholder", "cancelled"];
export const TRANSPORT_SERVICE_TYPES = ["tow_truck", "flatbed", "equipment_haulage", "container_truck", "box_truck", "courier_pickup", "marine_transport"];
export const TRANSPORT_PARISHES = ["Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. James", "St. Ann", "Westmoreland", "St. Elizabeth", "Hanover", "Trelawny", "St. Mary", "Portland", "St. Thomas"];

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

export function createSeedTransportProviders() {
  return [
    {
      providerId: "transport-flatbed-kingston",
      ownerUserId: "review-supplier",
      companyName: "Kingston Flatbed & Recovery",
      contactName: "Andre Lewis",
      serviceTypes: ["flatbed", "tow_truck"],
      parishesServed: ["Kingston", "St. Andrew", "St. Catherine"],
      fleetSummary: "2 flatbeds, 1 tow truck",
      baseRate: 25000,
      insuranceDocuments: ["motor_carrier_insurance_placeholder.pdf"],
      availability: "Daily by appointment",
      status: "approved",
      completedJobs: 28,
      rating: 4.7,
      simulatedOnly: true,
      createdAt: "2026-06-04T10:00:00.000Z",
      updatedAt: "2026-06-13T12:00:00.000Z",
    },
    {
      providerId: "transport-heavy-equipment-demo",
      ownerUserId: "heavy-haul-demo",
      companyName: "Island Heavy Haul Logistics",
      contactName: "Patrice Morgan",
      serviceTypes: ["equipment_haulage", "container_truck"],
      parishesServed: ["St. Catherine", "Clarendon", "Manchester", "St. Ann"],
      fleetSummary: "Lowboy trailer and escort-ready equipment haulage placeholders",
      baseRate: 85000,
      insuranceDocuments: ["cargo_liability_placeholder.pdf"],
      availability: "Heavy haul by scheduled route",
      status: "approved",
      completedJobs: 19,
      rating: 4.6,
      simulatedOnly: true,
      createdAt: "2026-06-05T10:00:00.000Z",
      updatedAt: "2026-06-13T12:00:00.000Z",
    },
  ];
}

export function loadTransportProviders(storage) {
  return readJson(storage, TRANSPORT_PROFILES_STORAGE_KEY, createSeedTransportProviders());
}

export function saveTransportProviders(storage, providers) {
  return writeJson(storage, TRANSPORT_PROFILES_STORAGE_KEY, providers);
}

export function loadTransportRequests(storage) {
  return readJson(storage, TRANSPORT_REQUESTS_STORAGE_KEY, []);
}

export function saveTransportRequests(storage, requests) {
  return writeJson(storage, TRANSPORT_REQUESTS_STORAGE_KEY, requests);
}

export function getTransportProvider(storage, providerId) {
  return loadTransportProviders(storage).find((provider) => provider.providerId === providerId) || null;
}

export function getApprovedTransportProviders(storage, filters = {}) {
  return loadTransportProviders(storage).filter((provider) => {
    if (provider.status !== "approved") return false;
    if (filters.serviceType && !provider.serviceTypes.includes(filters.serviceType)) return false;
    if (filters.parish && !provider.parishesServed.includes(filters.parish)) return false;
    return true;
  });
}

export function registerTransportProvider(storage, user, input = {}) {
  if (!user) return { valid: false, errors: { permission: "Sign in to register as a transport provider." } };
  const errors = {};
  if (!String(input.companyName || "").trim()) errors.companyName = "Company name is required.";
  if (!String(input.contactName || "").trim()) errors.contactName = "Contact name is required.";
  if (!Array.isArray(input.serviceTypes) || !input.serviceTypes.length) errors.serviceTypes = "Choose at least one transport service type.";
  if (!Array.isArray(input.parishesServed) || !input.parishesServed.length) errors.parishesServed = "Choose at least one parish served.";
  if (!Number(input.baseRate || 0)) errors.baseRate = "Base transport rate is required.";
  if (Object.keys(errors).length) return { valid: false, errors };

  const provider = {
    providerId: `transport-${Date.now()}`,
    ownerUserId: user.id,
    companyName: String(input.companyName).trim(),
    contactName: String(input.contactName).trim(),
    serviceTypes: input.serviceTypes,
    parishesServed: input.parishesServed,
    fleetSummary: String(input.fleetSummary || "Fleet details pending"),
    baseRate: Number(input.baseRate),
    insuranceDocuments: Array.isArray(input.insuranceDocuments) ? input.insuranceDocuments.filter(Boolean) : [],
    availability: String(input.availability || "By appointment"),
    status: "pending_review",
    completedJobs: 0,
    rating: 0,
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveTransportProviders(storage, [provider, ...loadTransportProviders(storage)]);
  createNotification(storage, {
    recipientId: user.id,
    type: "transport_marketplace",
    title: "Transport provider profile submitted",
    body: "Your provider profile is pending local admin review. No live insurance verification is active.",
    relatedRoute: "/transport/dashboard",
  });
  return { valid: true, provider };
}

export function updateTransportProviderStatus(storage, user, providerId, status) {
  if (normalizeRole(user?.role) !== "admin") return { valid: false, error: "Transport provider approval requires admin access." };
  if (!TRANSPORT_PROVIDER_STATUSES.includes(status)) return { valid: false, error: "Choose a valid transport provider status." };
  const providers = loadTransportProviders(storage);
  const provider = providers.find((item) => item.providerId === providerId);
  if (!provider) return { valid: false, error: "Transport provider was not found." };
  const next = { ...provider, status, reviewedBy: user.id, updatedAt: new Date().toISOString() };
  saveTransportProviders(storage, providers.map((item) => item.providerId === providerId ? next : item));
  createNotification(storage, {
    recipientId: provider.ownerUserId,
    type: "transport_marketplace",
    title: `Transport profile ${status.replaceAll("_", " ")}`,
    body: "This is a local/admin readiness action. No real insurance or transport licence adjudication occurred.",
    relatedRoute: "/transport/dashboard",
  });
  return { valid: true, provider: next };
}

export function requestAuctionTransportQuote(storage, user, auctionId, input = {}) {
  if (!user) return { valid: false, errors: { permission: "Sign in to request auction transport." } };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, errors: { auction: "Auction lot was not found." } };
  const provider = getTransportProvider(storage, input.providerId);
  const errors = {};
  if (!provider || provider.status !== "approved") errors.providerId = "Choose an approved transport provider.";
  if (!String(input.pickupLocation || "").trim()) errors.pickupLocation = "Pickup location is required.";
  if (!String(input.deliveryLocation || "").trim()) errors.deliveryLocation = "Delivery location is required.";
  if (!String(input.transportNotes || "").trim()) errors.transportNotes = "Transport notes are required.";
  if (Object.keys(errors).length) return { valid: false, errors };
  const request = {
    requestId: `transport-request-${Date.now()}`,
    auctionId,
    assetId: auctionId,
    requesterId: user.id,
    sellerId: auction.sellerId,
    providerId: provider.providerId,
    providerName: provider.companyName,
    pickupLocation: String(input.pickupLocation).trim(),
    deliveryLocation: String(input.deliveryLocation).trim(),
    requestedDate: input.requestedDate || "",
    transportNotes: String(input.transportNotes).trim(),
    quoteAmount: Number(input.quoteAmount || provider.baseRate || 0),
    status: "quote_requested",
    trackingPlaceholder: "GPS/dispatch tracking is inactive. This is a local workflow record only.",
    insuranceVerificationStatus: "placeholder_only",
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveTransportRequests(storage, [request, ...loadTransportRequests(storage)]);
  createNotification(storage, {
    recipientId: provider.ownerUserId,
    type: "transport_marketplace",
    title: "Auction transport quote requested",
    body: `${auction.title}: a buyer requested transport quote readiness.`,
    relatedRoute: "/transport/bookings",
  });
  return { valid: true, request };
}

export function updateTransportRequestStatus(storage, user, requestId, status, updates = {}) {
  if (!TRANSPORT_REQUEST_STATUSES.includes(status)) return { valid: false, error: "Choose a valid transport status." };
  const requests = loadTransportRequests(storage);
  const request = requests.find((item) => item.requestId === requestId);
  if (!request) return { valid: false, error: "Transport request was not found." };
  const role = normalizeRole(user?.role);
  const provider = getTransportProvider(storage, request.providerId);
  const allowed = role === "admin" || request.requesterId === user?.id || request.sellerId === user?.id || provider?.ownerUserId === user?.id;
  if (!allowed) return { valid: false, error: "You can only update transport requests related to your account." };
  const next = { ...request, ...updates, status, updatedAt: new Date().toISOString() };
  saveTransportRequests(storage, requests.map((item) => item.requestId === requestId ? next : item));
  return { valid: true, request: next };
}

export function getTransportMarketplaceDashboard(storage, user) {
  const role = normalizeRole(user?.role);
  const providers = loadTransportProviders(storage);
  const requests = loadTransportRequests(storage);
  if (role === "admin") return { providers, requests };
  const ownProviderIds = providers.filter((provider) => provider.ownerUserId === user?.id).map((provider) => provider.providerId);
  return {
    providers: providers.filter((provider) => provider.ownerUserId === user?.id),
    requests: requests.filter((request) => request.requesterId === user?.id || request.sellerId === user?.id || ownProviderIds.includes(request.providerId)),
  };
}

export function getAuctionTransportSummary(storage, auctionId) {
  const requests = loadTransportRequests(storage).filter((request) => request.auctionId === auctionId);
  return {
    requests,
    badge: requests.some((request) => ["booked_placeholder", "pickup_scheduled", "in_transit_placeholder", "delivered_placeholder"].includes(request.status)) ? "Transport booking placeholder active" : requests.length ? "Transport quote requested" : "Transport available",
    booked: requests.some((request) => ["booked_placeholder", "pickup_scheduled", "in_transit_placeholder", "delivered_placeholder"].includes(request.status)),
  };
}
