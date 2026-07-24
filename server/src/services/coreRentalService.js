const BOOKING_STATUSES = ["pending", "approved", "active", "completed", "cancelled", "declined"];
const BOOKING_TRANSITIONS = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["active", "cancelled"],
  active: ["completed"],
  completed: [],
  cancelled: [],
  declined: [],
};

const RENTAL_TYPES = {
  hourly: { unitMs: 60 * 60 * 1000, minimumUnits: 1 },
  daily: { unitMs: 24 * 60 * 60 * 1000, minimumUnits: 1 },
  weekly: { unitMs: 7 * 24 * 60 * 60 * 1000, minimumUnits: 1 },
  monthly: { unitMs: 30 * 24 * 60 * 60 * 1000, minimumUnits: 1 },
};

function validationError(details) {
  const error = new Error("The request contains validation errors.");
  error.statusCode = 400;
  error.code = "validation_error";
  error.publicMessage = "Please correct the highlighted fields.";
  error.details = details;
  return error;
}

function conflictError(message, details = []) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = "rental_conflict";
  error.publicMessage = message;
  error.details = details;
  return error;
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getIdempotencyKey(payload = {}, req = {}) {
  return req.headers?.["idempotency-key"] || req.headers?.["x-idempotency-key"] || payload.idempotency_key || "";
}

function parseMetadata(record = {}) {
  if (!record.metadata_json) return {};
  if (typeof record.metadata_json === "object") return record.metadata_json;
  try {
    return JSON.parse(record.metadata_json);
  } catch {
    return {};
  }
}

function serializeMetadata(record = {}, additions = {}) {
  return JSON.stringify({ ...parseMetadata(record), ...additions });
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function calculateRentalQuote(asset, { start_at, end_at } = {}) {
  const start = normalizeDate(start_at);
  const end = normalizeDate(end_at);
  if (!start || !end || end <= start) {
    throw validationError([{ field: "end_at", message: "Booking end date must be after start date." }]);
  }
  const rentalType = asset.rental_type || "daily";
  const pricing = RENTAL_TYPES[rentalType] || RENTAL_TYPES.daily;
  const units = Math.max(pricing.minimumUnits, Math.ceil((end.getTime() - start.getTime()) / pricing.unitMs));
  const rate = Number(asset.price_rate || 0);
  if (!rate || rate < 0) {
    throw validationError([{ field: "price_rate", message: "Asset must have a valid rental rate before booking." }]);
  }
  const subtotal = units * rate;
  const deposit = Number(asset.deposit_amount || 0);
  return {
    rentalType,
    units,
    rate,
    subtotal,
    deposit,
    total: subtotal + deposit,
    currency: asset.currency || "JMD",
  };
}

export function validateAssetForRental(payload = {}) {
  const details = [];
  if (!payload.owner_id) details.push({ field: "owner_id", message: "owner_id is required." });
  if (!payload.title) details.push({ field: "title", message: "title is required." });
  if (!payload.category) details.push({ field: "category", message: "category is required." });
  if (!payload.listing_type) details.push({ field: "listing_type", message: "listing_type is required." });
  if (payload.price_rate !== undefined && Number(payload.price_rate) < 0) details.push({ field: "price_rate", message: "price_rate cannot be negative." });
  if (payload.deposit_amount !== undefined && Number(payload.deposit_amount) < 0) details.push({ field: "deposit_amount", message: "deposit_amount cannot be negative." });
  if (details.length) throw validationError(details);
}

export function validateBookingPayload(payload = {}) {
  const details = [];
  for (const field of ["asset_id", "customer_id", "supplier_id"]) {
    if (!payload[field]) details.push({ field, message: `${field} is required.` });
  }
  if (payload.status && !BOOKING_STATUSES.includes(payload.status)) details.push({ field: "status", message: "status is not a valid booking state." });
  if (payload.start_at || payload.end_at) {
    const start = normalizeDate(payload.start_at);
    const end = normalizeDate(payload.end_at);
    if (!start) details.push({ field: "start_at", message: "start_at must be a valid date." });
    if (!end) details.push({ field: "end_at", message: "end_at must be a valid date." });
    if (start && end && end <= start) details.push({ field: "end_at", message: "end_at must be after start_at." });
  }
  if (details.length) throw validationError(details);
}

export async function assertBookingAvailability(repositories, payload, { ignoreBookingId = "" } = {}) {
  if (!payload.start_at || !payload.end_at) return { checked: false, conflicts: [] };
  const asset = await repositories.assets.findById(payload.asset_id);
  if (!asset) {
    throw validationError([{ field: "asset_id", message: "asset_id does not reference an active asset." }]);
  }
  if (!["available", "verified"].includes(asset.availability_status || "available")) {
    throw conflictError("Asset is not available for booking.", [{ field: "asset_id", message: "Asset availability status blocks booking." }]);
  }
  const start = normalizeDate(payload.start_at);
  const end = normalizeDate(payload.end_at);
  const existing = await repositories.bookings.list({ asset_id: payload.asset_id });
  const conflicts = existing.filter((booking) => {
    if (booking.id === ignoreBookingId) return false;
    if (!["pending", "approved", "active"].includes(booking.status)) return false;
    const bookingStart = normalizeDate(booking.start_at);
    const bookingEnd = normalizeDate(booking.end_at);
    return bookingStart && bookingEnd && dateRangesOverlap(start, end, bookingStart, bookingEnd);
  });
  if (conflicts.length) {
    throw conflictError("Asset is already booked for the requested time window.", conflicts.map((booking) => ({ field: "asset_id", booking_id: booking.id })));
  }
  return { checked: true, conflicts: [] };
}

export async function findIdempotentBooking(repositories, payload, req) {
  const key = getIdempotencyKey(payload, req);
  if (!key) return null;
  const bookings = await repositories.bookings.list({ customer_id: payload.customer_id });
  return bookings.find((booking) => parseMetadata(booking).idempotency_key === key) || null;
}

export async function prepareBookingCreate(repositories, payload, req = {}) {
  validateBookingPayload(payload);
  const idempotent = await findIdempotentBooking(repositories, payload, req);
  if (idempotent) return { idempotent, payload: idempotent };
  await assertBookingAvailability(repositories, payload);
  const asset = await repositories.assets.findById(payload.asset_id);
  if (!asset) {
    throw validationError([{ field: "asset_id", message: "asset_id does not reference an active asset." }]);
  }
  const quote = payload.start_at && payload.end_at ? calculateRentalQuote(asset, payload) : null;
  const metadata = {
    idempotency_key: getIdempotencyKey(payload, req) || undefined,
    pricing_quote: quote || undefined,
    provider_status: "provider_independent_local",
  };
  return {
    payload: {
      ...payload,
      status: payload.status || "pending",
      payment_status: payload.payment_status || "unpaid",
      total_amount: payload.total_amount ?? quote?.subtotal ?? payload.total_amount,
      deposit_amount: payload.deposit_amount ?? quote?.deposit,
      metadata_json: serializeMetadata(payload, metadata),
    },
  };
}

export function assertBookingTransition(currentStatus, nextStatus) {
  if (!nextStatus || nextStatus === currentStatus) return;
  if (!BOOKING_STATUSES.includes(nextStatus)) {
    throw validationError([{ field: "status", message: "status is not a valid booking state." }]);
  }
  const allowed = BOOKING_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw validationError([{ field: "status", message: `Cannot move booking from ${currentStatus} to ${nextStatus}.` }]);
  }
}

export async function prepareBookingUpdate(repositories, id, payload) {
  const existing = await repositories.bookings.findById(id);
  if (!existing) return { missing: true };
  if (payload.status) assertBookingTransition(existing.status, payload.status);
  if (payload.start_at || payload.end_at) {
    const candidate = { ...existing, ...payload };
    validateBookingPayload(candidate);
    await assertBookingAvailability(repositories, candidate, { ignoreBookingId: id });
  }
  return {
    payload: {
      ...payload,
      metadata_json: serializeMetadata(existing, { last_state_change: payload.status ? `${existing.status}->${payload.status}` : undefined }),
    },
  };
}

export const CORE_RENTAL_AUDIT_ACTIONS = {
  assetCreated: "assets.created",
  assetUpdated: "assets.updated",
  assetDeleted: "assets.deleted",
  bookingRequested: "bookings.requested",
  bookingStatusChanged: "bookings.status_changed",
  availabilityChecked: "availability.checked",
  pricingQuoted: "pricing.quoted",
};
