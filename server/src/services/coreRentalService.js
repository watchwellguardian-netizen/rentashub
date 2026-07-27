const BOOKING_STATUSES = [
  "pending",
  "approved",
  "confirmed",
  "checked_in",
  "active",
  "extension_requested",
  "completed",
  "cancelled",
  "declined",
  "disputed",
];

const BOOKING_TRANSITIONS = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["confirmed", "active", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["active"],
  active: ["extension_requested", "completed", "disputed"],
  extension_requested: ["active", "completed", "disputed"],
  completed: ["disputed"],
  cancelled: [],
  declined: [],
  disputed: [],
};

const RENTAL_TYPES = {
  hourly: { unitMs: 60 * 60 * 1000, minimumUnits: 1 },
  daily: { unitMs: 24 * 60 * 60 * 1000, minimumUnits: 1 },
  weekly: { unitMs: 7 * 24 * 60 * 60 * 1000, minimumUnits: 1 },
  monthly: { unitMs: 30 * 24 * 60 * 60 * 1000, minimumUnits: 1 },
};

const BLOCKING_BOOKING_STATES = new Set(["pending", "approved", "confirmed", "checked_in", "active", "extension_requested"]);
const SUPPLIER_ROLES = new Set(["supplier", "admin"]);
const CUSTOMER_ROLES = new Set(["customer", "admin"]);
const ADMIN_ROLES = new Set(["admin"]);
const MAX_EXTENSION_DAYS = 7;
const MAX_EXTENSION_REQUESTS = 1;

function createError({ statusCode, code, message, details = [] }) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function validationError(details) {
  return createError({
    statusCode: 400,
    code: "validation_error",
    message: "Please correct the highlighted fields.",
    details,
  });
}

function conflictError(message, details = []) {
  return createError({ statusCode: 409, code: "rental_conflict", message, details });
}

function forbiddenError(message, details = []) {
  return createError({ statusCode: 403, code: "forbidden", message, details });
}

function notFoundError(entityType, id) {
  return createError({
    statusCode: 404,
    code: "not_found",
    message: `${entityType} was not found.`,
    details: id ? [{ field: "id", message: id }] : [],
  });
}

function now() {
  return new Date().toISOString();
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getIdempotencyKey(payload = {}, req = {}) {
  return req.headers?.["idempotency-key"] || req.headers?.["x-idempotency-key"] || payload.idempotency_key || "";
}

export function parseMetadata(record = {}) {
  if (!record.metadata_json) return {};
  if (typeof record.metadata_json === "object") return record.metadata_json;
  try {
    return JSON.parse(record.metadata_json);
  } catch {
    return {};
  }
}

function serializeMetadata(record = {}, additions = {}) {
  const metadata = { ...parseMetadata(record) };
  for (const [key, value] of Object.entries(additions)) {
    if (value !== undefined) metadata[key] = value;
  }
  return JSON.stringify(metadata);
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function roleOf(req = {}) {
  return req.user?.role || "anonymous";
}

function actorId(req = {}) {
  return req.user?.id || "anonymous";
}

function isAdmin(req = {}) {
  return ADMIN_ROLES.has(roleOf(req));
}

function requireActor(req = {}) {
  if (!req.user) {
    throw createError({ statusCode: 401, code: "unauthorized", message: "Authentication is required for this endpoint." });
  }
}

function requireRole(req, roles, action) {
  requireActor(req);
  if (!roles.has(roleOf(req))) {
    throw forbiddenError(`The ${roleOf(req)} role cannot perform ${action}.`, [{ field: "role", message: roleOf(req) }]);
  }
}

function requireCustomerOwnership(req, booking, action) {
  requireRole(req, CUSTOMER_ROLES, action);
  if (!isAdmin(req) && booking.customer_id !== actorId(req)) {
    throw forbiddenError("Customers can only modify their own bookings.", [{ field: "customer_id", message: booking.customer_id }]);
  }
}

function requireSupplierOwnership(req, booking, action) {
  requireRole(req, SUPPLIER_ROLES, action);
  if (!isAdmin(req) && booking.supplier_id !== actorId(req)) {
    throw forbiddenError("Suppliers can only modify bookings for their own assets.", [{ field: "supplier_id", message: booking.supplier_id }]);
  }
}

function requireAssetOwnership(req, asset, action) {
  requireRole(req, SUPPLIER_ROLES, action);
  if (!isAdmin(req) && asset.owner_id !== actorId(req)) {
    throw forbiddenError("Suppliers can only modify their own assets.", [{ field: "owner_id", message: asset.owner_id }]);
  }
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");
  if (missing.length) throw validationError(missing.map((field) => ({ field, message: `${field} is required.` })));
}

function buildDomainEvent(type, entityType, entityId, metadata = {}) {
  return { type, entity_type: entityType, entity_id: entityId, occurred_at: now(), metadata };
}

async function recordAudit(repositories, req, action, entityType, entityId, metadata = {}) {
  await repositories.audit_logs.record(action, entityType, {
    actor_id: actorId(req),
    entity_id: entityId,
    actor_role: roleOf(req),
    provider_status: "provider_independent_local",
    ...metadata,
  });
}

function actionResult({ action, record, domainEvent, auditAction, status = 200 }) {
  return {
    status,
    data: record,
    meta: {
      action,
      domain_event: domainEvent,
      audit_action: auditAction,
      provider_status: "provider_independent_local",
    },
  };
}

function assertStatus(booking, allowed, action) {
  if (!allowed.includes(booking.status)) {
    throw validationError([{ field: "status", message: `${action} is only allowed from ${allowed.join(", ")}.` }]);
  }
}

function assertTransition(currentStatus, nextStatus) {
  if (!nextStatus || nextStatus === currentStatus) return;
  if (!BOOKING_STATUSES.includes(nextStatus)) {
    throw validationError([{ field: "status", message: "status is not a valid booking state." }]);
  }
  const allowed = BOOKING_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw validationError([{ field: "status", message: `Cannot move booking from ${currentStatus} to ${nextStatus}.` }]);
  }
}

async function findBooking(repositories, id) {
  const booking = await repositories.bookings.findById(id);
  if (!booking) throw notFoundError("Booking", id);
  return booking;
}

async function findAsset(repositories, id) {
  const asset = await repositories.assets.findById(id);
  if (!asset) throw notFoundError("Asset", id);
  return asset;
}

function listingStatus(asset = {}) {
  return parseMetadata(asset).listing_status || (asset.verification_status === "verified" ? "published" : "draft");
}

function assertListingPublished(asset) {
  if (listingStatus(asset) !== "published") {
    throw conflictError("Listing must be published before booking.", [{ field: "listing_status", message: listingStatus(asset) }]);
  }
}

function mergeBookingMetadata(booking, updates) {
  return serializeMetadata(booking, {
    ...updates,
    last_state_change_at: now(),
    provider_status: "provider_independent_local",
  });
}

export const CORE_RENTAL_AUDIT_ACTIONS = {
  supplierProfileValidated: "supplier_profiles.validated",
  assetCreated: "assets.created",
  assetUpdated: "assets.updated",
  assetDeleted: "assets.deleted",
  listingModerated: "listings.moderated",
  listingPublished: "listings.published",
  availabilityChecked: "availability.checked",
  pricingQuoted: "pricing.quoted",
  bookingRequested: "bookings.requested",
  bookingStatusChanged: "bookings.status_changed",
  bookingAccepted: "bookings.accepted",
  bookingRejected: "bookings.rejected",
  paymentRequired: "bookings.payment_required",
  bookingConfirmed: "bookings.confirmed",
  contractGenerationTriggered: "contracts.generation_triggered",
  bookingCheckedIn: "bookings.checked_in",
  rentalActivated: "rentals.activated",
  extensionRequested: "rentals.extension_requested",
  extensionApproved: "rentals.extension_approved",
  extensionRejected: "rentals.extension_rejected",
  bookingCheckedOut: "bookings.checked_out",
  finalChargeCalculated: "rentals.final_charge_calculated",
  settlementPrepared: "settlements.prepared",
  reviewEligibilityMarked: "reviews.eligibility_marked",
  bookingCancelled: "bookings.cancelled",
  disputeOpened: "disputes.opened",
};

export const CORE_RENTAL_ACTIONS = {
  validateSupplierProfile: {
    allowedStartingStates: ["supplier_profile.active"],
    actor: "supplier|admin",
    permission: "supplier:profile:validate",
    inputValidation: ["supplier_id"],
    idempotencyRule: "Same supplier profile validation can be repeated and returns latest profile status.",
    outputState: "supplier_profile.validated",
    domainEvent: "supplier_profile.validated",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.supplierProfileValidated,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "not_found"],
  },
  createAsset: {
    allowedStartingStates: ["supplier_profile.validated"],
    actor: "supplier|admin",
    permission: "asset:create",
    inputValidation: ["owner_id", "title", "category", "listing_type"],
    idempotencyRule: "Client-supplied asset id prevents accidental duplicate local records.",
    outputState: "asset.draft",
    domainEvent: "asset.created",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.assetCreated,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error"],
  },
  moderateListing: {
    allowedStartingStates: ["listing.draft", "listing.submitted"],
    actor: "supplier|admin",
    permission: "listing:moderate",
    inputValidation: ["asset_id"],
    idempotencyRule: "Repeated moderation updates preserve one latest moderation status.",
    outputState: "listing.moderated",
    domainEvent: "listing.moderated",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.listingModerated,
    expectedErrorCodes: ["unauthorized", "forbidden", "not_found"],
  },
  publishListing: {
    allowedStartingStates: ["listing.moderated", "listing.verified"],
    actor: "supplier|admin",
    permission: "listing:publish",
    inputValidation: ["asset_id"],
    idempotencyRule: "Publishing an already published listing is a duplicate transition conflict.",
    outputState: "listing.published",
    domainEvent: "listing.published",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.listingPublished,
    expectedErrorCodes: ["unauthorized", "forbidden", "not_found", "rental_conflict"],
  },
  checkAvailability: {
    allowedStartingStates: ["listing.published"],
    actor: "customer|supplier|admin",
    permission: "rental:availability:check",
    inputValidation: ["asset_id", "start_at", "end_at"],
    idempotencyRule: "Read-only deterministic check.",
    outputState: "availability.checked",
    domainEvent: "availability.checked",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.availabilityChecked,
    expectedErrorCodes: ["unauthorized", "validation_error", "rental_conflict"],
  },
  quotePrice: {
    allowedStartingStates: ["listing.published"],
    actor: "customer|supplier|admin",
    permission: "rental:pricing:quote",
    inputValidation: ["asset_id", "start_at", "end_at"],
    idempotencyRule: "Read-only deterministic pricing.",
    outputState: "price.quoted",
    domainEvent: "pricing.quoted",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.pricingQuoted,
    expectedErrorCodes: ["unauthorized", "validation_error", "rental_conflict"],
  },
  requestBooking: {
    allowedStartingStates: ["listing.published", "availability.checked", "price.quoted"],
    actor: "customer|admin",
    permission: "booking:request",
    inputValidation: ["asset_id", "customer_id", "supplier_id", "start_at", "end_at"],
    idempotencyRule: "Idempotency key returns the original local booking.",
    outputState: "booking.pending",
    domainEvent: "booking.requested",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingRequested,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  acceptBooking: {
    allowedStartingStates: ["pending"],
    actor: "supplier|admin",
    permission: "booking:accept",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate acceptance is rejected with rental_conflict.",
    outputState: "approved",
    domainEvent: "booking.accepted",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingAccepted,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  rejectBooking: {
    allowedStartingStates: ["pending"],
    actor: "supplier|admin",
    permission: "booking:reject",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate rejection is rejected with rental_conflict.",
    outputState: "declined",
    domainEvent: "booking.rejected",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingRejected,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  requirePayment: {
    allowedStartingStates: ["approved"],
    actor: "supplier|admin",
    permission: "booking:payment_required",
    inputValidation: ["booking_id"],
    idempotencyRule: "Repeated payment-required marking is rejected with rental_conflict.",
    outputState: "approved/payment_required",
    domainEvent: "booking.payment_required",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.paymentRequired,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  confirmBooking: {
    allowedStartingStates: ["approved"],
    actor: "supplier|admin",
    permission: "booking:confirm",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate confirmation is rejected with rental_conflict.",
    outputState: "confirmed",
    domainEvent: "booking.confirmed",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingConfirmed,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  triggerContract: {
    allowedStartingStates: ["confirmed"],
    actor: "supplier|admin",
    permission: "contract:generation:trigger",
    inputValidation: ["booking_id"],
    idempotencyRule: "Repeated contract trigger preserves one pending generation marker.",
    outputState: "contract.pending_generation",
    domainEvent: "contract.generation_triggered",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.contractGenerationTriggered,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error"],
  },
  checkIn: {
    allowedStartingStates: ["confirmed"],
    actor: "supplier|admin",
    permission: "booking:check_in",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate check-in is rejected with rental_conflict.",
    outputState: "checked_in",
    domainEvent: "booking.checked_in",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingCheckedIn,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  activateRental: {
    allowedStartingStates: ["checked_in", "approved"],
    actor: "supplier|admin",
    permission: "rental:activate",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate activation is rejected with rental_conflict.",
    outputState: "active",
    domainEvent: "rental.activated",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.rentalActivated,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  requestExtension: {
    allowedStartingStates: ["active"],
    actor: "customer|admin",
    permission: "rental:extension:request",
    inputValidation: ["booking_id", "requested_end_at"],
    idempotencyRule: "One active extension request is allowed per booking in local readiness mode.",
    outputState: "extension_requested",
    domainEvent: "rental.extension_requested",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.extensionRequested,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  approveExtension: {
    allowedStartingStates: ["extension_requested"],
    actor: "supplier|admin",
    permission: "rental:extension:approve",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate approval is rejected with rental_conflict.",
    outputState: "active",
    domainEvent: "rental.extension_approved",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.extensionApproved,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  rejectExtension: {
    allowedStartingStates: ["extension_requested"],
    actor: "supplier|admin",
    permission: "rental:extension:reject",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate rejection is rejected with rental_conflict.",
    outputState: "active",
    domainEvent: "rental.extension_rejected",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.extensionRejected,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  checkOut: {
    allowedStartingStates: ["active", "extension_requested"],
    actor: "supplier|admin",
    permission: "booking:check_out",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate check-out is rejected with rental_conflict.",
    outputState: "completed",
    domainEvent: "booking.checked_out",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingCheckedOut,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  calculateFinalCharge: {
    allowedStartingStates: ["completed"],
    actor: "supplier|admin",
    permission: "rental:final_charge:calculate",
    inputValidation: ["booking_id"],
    idempotencyRule: "Repeated calculation overwrites no financial provider data and preserves local evidence only.",
    outputState: "final_charge.calculated",
    domainEvent: "rental.final_charge_calculated",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.finalChargeCalculated,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error"],
  },
  prepareSettlement: {
    allowedStartingStates: ["completed"],
    actor: "supplier|admin",
    permission: "settlement:prepare",
    inputValidation: ["booking_id"],
    idempotencyRule: "Repeated settlement preparation returns one local ready marker.",
    outputState: "settlement.ready",
    domainEvent: "settlement.prepared",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.settlementPrepared,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error"],
  },
  markReviewEligible: {
    allowedStartingStates: ["completed"],
    actor: "customer|admin",
    permission: "review:eligibility:mark",
    inputValidation: ["booking_id"],
    idempotencyRule: "Repeated review eligibility returns one local marker.",
    outputState: "review.eligible",
    domainEvent: "review.eligibility_marked",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.reviewEligibilityMarked,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error"],
  },
  cancelBooking: {
    allowedStartingStates: ["pending", "approved", "confirmed"],
    actor: "customer|supplier|admin",
    permission: "booking:cancel",
    inputValidation: ["booking_id"],
    idempotencyRule: "Duplicate cancellation is rejected with rental_conflict.",
    outputState: "cancelled",
    domainEvent: "booking.cancelled",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.bookingCancelled,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error", "rental_conflict"],
  },
  openDispute: {
    allowedStartingStates: ["active", "completed"],
    actor: "customer|supplier|admin",
    permission: "dispute:open",
    inputValidation: ["booking_id", "reason"],
    idempotencyRule: "One active dispute record is created per submitted request.",
    outputState: "dispute.opened",
    domainEvent: "dispute.opened",
    auditEvent: CORE_RENTAL_AUDIT_ACTIONS.disputeOpened,
    expectedErrorCodes: ["unauthorized", "forbidden", "validation_error"],
  },
};

export function getCoreRentalActionMatrix() {
  return Object.entries(CORE_RENTAL_ACTIONS).map(([key, value]) => ({ key, ...value, testCoverage: "server/tests/core-rental-api.test.mjs" }));
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
  assertListingPublished(asset);
  if (!["available", "verified"].includes(asset.availability_status || "available")) {
    throw conflictError("Asset is not available for booking.", [{ field: "asset_id", message: "Asset availability status blocks booking." }]);
  }
  const start = normalizeDate(payload.start_at);
  const end = normalizeDate(payload.end_at);
  const existing = await repositories.bookings.list({ asset_id: payload.asset_id });
  const conflicts = existing.filter((booking) => {
    if (booking.id === ignoreBookingId) return false;
    if (!BLOCKING_BOOKING_STATES.has(booking.status)) return false;
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
  return bookings.find((booking) => booking.idempotency_key === key || parseMetadata(booking).idempotency_key === key) || null;
}

export async function prepareBookingCreate(repositories, payload, req = {}) {
  validateBookingPayload(payload);
  const idempotent = await findIdempotentBooking(repositories, payload, req);
  if (idempotent) return { idempotent, payload: idempotent };
  const asset = await repositories.assets.findById(payload.asset_id);
  if (!asset) {
    throw validationError([{ field: "asset_id", message: "asset_id does not reference an active asset." }]);
  }
  if (asset.owner_id !== payload.supplier_id) {
    throw validationError([{ field: "supplier_id", message: "supplier_id must own the requested asset." }]);
  }
  await assertBookingAvailability(repositories, payload);
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
      idempotency_key: metadata.idempotency_key,
      version: 1,
      metadata_json: serializeMetadata(payload, metadata),
    },
  };
}

export function assertBookingTransition(currentStatus, nextStatus) {
  assertTransition(currentStatus, nextStatus);
}

export async function prepareBookingUpdate(repositories, id, payload) {
  const existing = await repositories.bookings.findById(id);
  if (!existing) return { missing: true };
  if (payload.status) assertTransition(existing.status, payload.status);
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

export async function validateSupplierProfile(repositories, payload, req) {
  requireRole(req, SUPPLIER_ROLES, "validateSupplierProfile");
  const supplierId = payload.supplier_id || actorId(req);
  if (!isAdmin(req) && supplierId !== actorId(req)) {
    throw forbiddenError("Suppliers can only validate their own profile.", [{ field: "supplier_id", message: supplierId }]);
  }
  const profiles = await repositories.supplier_profiles.list({ supplier_id: supplierId });
  const profile = profiles[0];
  if (!profile) throw notFoundError("Supplier profile", supplierId);
  const metadata = parseMetadata({ metadata_json: profile.profile_json });
  const validated = {
    ...profile,
    readiness: profile.business_name && metadata.verificationStatus === "verified" ? "validated" : "partial",
  };
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.supplierProfileValidated, "supplier_profile", profile.id, { supplier_id: supplierId });
  return actionResult({
    action: "validateSupplierProfile",
    record: validated,
    domainEvent: buildDomainEvent("supplier_profile.validated", "supplier_profile", profile.id),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.supplierProfileValidated,
  });
}

export async function createRentalAsset(repositories, payload, req) {
  requireRole(req, SUPPLIER_ROLES, "createAsset");
  const ownerId = payload.owner_id || actorId(req);
  if (!isAdmin(req) && ownerId !== actorId(req)) {
    throw forbiddenError("Suppliers can only create assets for their own account.", [{ field: "owner_id", message: ownerId }]);
  }
  validateAssetForRental({ ...payload, owner_id: ownerId });
  const record = await repositories.assets.create({
    ...payload,
    owner_id: ownerId,
    availability_status: payload.availability_status || "available",
    verification_status: payload.verification_status || "pending",
    version: 1,
    metadata_json: serializeMetadata(payload, { listing_status: "draft", provider_status: "provider_independent_local" }),
  });
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.assetCreated, "asset", record.id);
  return actionResult({
    action: "createAsset",
    record,
    domainEvent: buildDomainEvent("asset.created", "asset", record.id),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.assetCreated,
    status: 201,
  });
}

export async function moderateListing(repositories, payload, req) {
  requireFields(payload, ["asset_id"]);
  const asset = await findAsset(repositories, payload.asset_id);
  requireAssetOwnership(req, asset, "moderateListing");
  const record = await repositories.assets.update(asset.id, {
    verification_status: payload.verification_status || "verified",
    version: Number(asset.version || 0) + 1,
    metadata_json: serializeMetadata(asset, { listing_status: "moderated", moderation_note: payload.note || "local provider-independent moderation" }),
  });
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.listingModerated, "asset", asset.id);
  return actionResult({
    action: "moderateListing",
    record,
    domainEvent: buildDomainEvent("listing.moderated", "asset", asset.id),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.listingModerated,
  });
}

export async function publishListing(repositories, payload, req) {
  requireFields(payload, ["asset_id"]);
  const asset = await findAsset(repositories, payload.asset_id);
  requireAssetOwnership(req, asset, "publishListing");
  if (listingStatus(asset) === "published") {
    throw conflictError("Listing is already published.", [{ field: "asset_id", message: asset.id }]);
  }
  const record = await repositories.assets.update(asset.id, {
    availability_status: "available",
    verification_status: payload.verification_status || asset.verification_status || "verified",
    version: Number(asset.version || 0) + 1,
    metadata_json: serializeMetadata(asset, { listing_status: "published", published_at: now() }),
  });
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.listingPublished, "asset", asset.id);
  return actionResult({
    action: "publishListing",
    record,
    domainEvent: buildDomainEvent("listing.published", "asset", asset.id),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.listingPublished,
  });
}

export async function checkAvailability(repositories, payload, req) {
  requireActor(req);
  requireFields(payload, ["asset_id", "start_at", "end_at"]);
  await assertBookingAvailability(repositories, payload);
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.availabilityChecked, "asset", payload.asset_id);
  return actionResult({
    action: "checkAvailability",
    record: { available: true, asset_id: payload.asset_id, start_at: payload.start_at, end_at: payload.end_at },
    domainEvent: buildDomainEvent("availability.checked", "asset", payload.asset_id),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.availabilityChecked,
  });
}

export async function quotePrice(repositories, payload, req) {
  requireActor(req);
  requireFields(payload, ["asset_id", "start_at", "end_at"]);
  const asset = await findAsset(repositories, payload.asset_id);
  await assertBookingAvailability(repositories, { ...payload, supplier_id: asset.owner_id });
  const quote = calculateRentalQuote(asset, payload);
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.pricingQuoted, "asset", asset.id, { quote });
  return actionResult({
    action: "quotePrice",
    record: { asset_id: asset.id, quote },
    domainEvent: buildDomainEvent("pricing.quoted", "asset", asset.id, { total: quote.total, currency: quote.currency }),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.pricingQuoted,
  });
}

export async function requestBooking(repositories, payload, req) {
  requireCustomerOwnership(req, { customer_id: payload.customer_id || actorId(req) }, "requestBooking");
  const asset = await findAsset(repositories, payload.asset_id);
  const bookingPayload = { ...payload, customer_id: payload.customer_id || actorId(req), supplier_id: payload.supplier_id || asset.owner_id };
  const prepared = await prepareBookingCreate(repositories, bookingPayload, req);
  if (prepared.idempotent) {
    return actionResult({
      action: "requestBooking",
      record: prepared.idempotent,
      domainEvent: buildDomainEvent("booking.requested.idempotent", "booking", prepared.idempotent.id),
      auditAction: CORE_RENTAL_AUDIT_ACTIONS.bookingRequested,
      status: 200,
    });
  }
  const record = await repositories.bookings.create(prepared.payload);
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.bookingRequested, "booking", record.id);
  return actionResult({
    action: "requestBooking",
    record,
    domainEvent: buildDomainEvent("booking.requested", "booking", record.id),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.bookingRequested,
    status: 201,
  });
}

async function updateBookingAction(repositories, req, booking, action, changes, auditAction, domainType, ownerCheck = requireSupplierOwnership) {
  ownerCheck(req, booking, action);
  if (changes.status) assertTransition(booking.status, changes.status);
  const record = await repositories.bookings.update(booking.id, {
    ...changes,
    version: Number(booking.version || 0) + 1,
    metadata_json: mergeBookingMetadata(booking, {
      ...(changes.metadata || {}),
      last_action: action,
      last_state_change: changes.status ? `${booking.status}->${changes.status}` : undefined,
    }),
  });
  await recordAudit(repositories, req, auditAction, "booking", booking.id, { previous_status: booking.status, next_status: record.status });
  return actionResult({
    action,
    record,
    domainEvent: buildDomainEvent(domainType, "booking", booking.id),
    auditAction,
  });
}

async function acceptBooking(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "acceptBooking");
  assertStatus(booking, ["pending"], "acceptBooking");
  await assertBookingAvailability(repositories, booking, { ignoreBookingId: booking.id });
  return updateBookingAction(
    repositories,
    req,
    booking,
    "acceptBooking",
    { status: "approved", metadata: { availability_reserved_at: now(), reservation_strategy: "provider_independent_local_lock" } },
    CORE_RENTAL_AUDIT_ACTIONS.bookingAccepted,
    "booking.accepted",
  );
}

async function rejectBooking(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "rejectBooking");
  assertStatus(booking, ["pending"], "rejectBooking");
  return updateBookingAction(repositories, req, booking, "rejectBooking", { status: "declined" }, CORE_RENTAL_AUDIT_ACTIONS.bookingRejected, "booking.rejected");
}

async function requirePayment(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "requirePayment");
  assertStatus(booking, ["approved"], "requirePayment");
  if (booking.payment_status === "payment_required") {
    throw conflictError("Payment is already marked as required.", [{ field: "payment_status", message: booking.payment_status }]);
  }
  return updateBookingAction(repositories, req, booking, "requirePayment", { payment_status: "payment_required" }, CORE_RENTAL_AUDIT_ACTIONS.paymentRequired, "booking.payment_required");
}

async function confirmBooking(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "confirmBooking");
  assertStatus(booking, ["approved"], "confirmBooking");
  return updateBookingAction(repositories, req, booking, "confirmBooking", { status: "confirmed" }, CORE_RENTAL_AUDIT_ACTIONS.bookingConfirmed, "booking.confirmed");
}

async function triggerContract(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "triggerContract");
  assertStatus(booking, ["confirmed"], "triggerContract");
  return updateBookingAction(
    repositories,
    req,
    booking,
    "triggerContract",
    { metadata: { contract_status: "pending_generation", contract_triggered_at: now() } },
    CORE_RENTAL_AUDIT_ACTIONS.contractGenerationTriggered,
    "contract.generation_triggered",
  );
}

async function checkIn(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "checkIn");
  assertStatus(booking, ["confirmed"], "checkIn");
  return updateBookingAction(repositories, req, booking, "checkIn", { status: "checked_in", checkin_at: now() }, CORE_RENTAL_AUDIT_ACTIONS.bookingCheckedIn, "booking.checked_in");
}

async function activateRental(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "activateRental");
  assertStatus(booking, ["checked_in", "approved"], "activateRental");
  return updateBookingAction(repositories, req, booking, "activateRental", { status: "active" }, CORE_RENTAL_AUDIT_ACTIONS.rentalActivated, "rental.activated");
}

async function requestExtension(repositories, payload, req) {
  requireFields(payload, ["booking_id", "requested_end_at"]);
  const booking = await findBooking(repositories, payload.booking_id);
  requireCustomerOwnership(req, booking, "requestExtension");
  assertStatus(booking, ["active"], "requestExtension");
  const requestedEnd = normalizeDate(payload.requested_end_at);
  const currentEnd = normalizeDate(booking.end_at);
  if (!requestedEnd || !currentEnd || requestedEnd <= currentEnd) {
    throw validationError([{ field: "requested_end_at", message: "requested_end_at must be after current end_at." }]);
  }
  const extensionDays = Math.ceil((requestedEnd.getTime() - currentEnd.getTime()) / RENTAL_TYPES.daily.unitMs);
  const metadata = parseMetadata(booking);
  if (extensionDays > MAX_EXTENSION_DAYS || Number(metadata.extension_request_count || 0) >= MAX_EXTENSION_REQUESTS) {
    throw conflictError("Extension request exceeds local readiness limits.", [{ field: "requested_end_at", message: `Maximum ${MAX_EXTENSION_DAYS} days and ${MAX_EXTENSION_REQUESTS} request.` }]);
  }
  return updateBookingAction(
    repositories,
    req,
    booking,
    "requestExtension",
    { status: "extension_requested", metadata: { requested_end_at: payload.requested_end_at, extension_request_count: Number(metadata.extension_request_count || 0) + 1 } },
    CORE_RENTAL_AUDIT_ACTIONS.extensionRequested,
    "rental.extension_requested",
    requireCustomerOwnership,
  );
}

async function approveExtension(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "approveExtension");
  assertStatus(booking, ["extension_requested"], "approveExtension");
  const requestedEnd = parseMetadata(booking).requested_end_at;
  return updateBookingAction(
    repositories,
    req,
    booking,
    "approveExtension",
    { status: "active", end_at: requestedEnd || booking.end_at, metadata: { extension_status: "approved" } },
    CORE_RENTAL_AUDIT_ACTIONS.extensionApproved,
    "rental.extension_approved",
  );
}

async function rejectExtension(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "rejectExtension");
  assertStatus(booking, ["extension_requested"], "rejectExtension");
  return updateBookingAction(
    repositories,
    req,
    booking,
    "rejectExtension",
    { status: "active", metadata: { extension_status: "rejected", extension_rejection_reason: payload.reason || "not provided" } },
    CORE_RENTAL_AUDIT_ACTIONS.extensionRejected,
    "rental.extension_rejected",
  );
}

async function checkOut(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "checkOut");
  if (booking.status === "completed") {
    throw conflictError("Booking has already been checked out.", [{ field: "status", message: booking.status }]);
  }
  assertStatus(booking, ["active", "extension_requested"], "checkOut");
  const asset = await findAsset(repositories, booking.asset_id);
  const quote = calculateRentalQuote(asset, booking);
  return updateBookingAction(
    repositories,
    req,
    booking,
    "checkOut",
    { status: "completed", checkout_at: now(), total_amount: quote.subtotal, deposit_amount: quote.deposit, metadata: { final_charge: quote.total } },
    CORE_RENTAL_AUDIT_ACTIONS.bookingCheckedOut,
    "booking.checked_out",
  );
}

async function calculateFinalCharge(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "calculateFinalCharge");
  assertStatus(booking, ["completed"], "calculateFinalCharge");
  const asset = await findAsset(repositories, booking.asset_id);
  const quote = calculateRentalQuote(asset, booking);
  return updateBookingAction(
    repositories,
    req,
    booking,
    "calculateFinalCharge",
    { total_amount: quote.subtotal, deposit_amount: quote.deposit, metadata: { final_charge: quote.total, final_charge_currency: quote.currency } },
    CORE_RENTAL_AUDIT_ACTIONS.finalChargeCalculated,
    "rental.final_charge_calculated",
  );
}

async function prepareSettlement(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireSupplierOwnership(req, booking, "prepareSettlement");
  assertStatus(booking, ["completed"], "prepareSettlement");
  return updateBookingAction(
    repositories,
    req,
    booking,
    "prepareSettlement",
    { metadata: { settlement_status: "ready", settlement_provider_status: "not_active" } },
    CORE_RENTAL_AUDIT_ACTIONS.settlementPrepared,
    "settlement.prepared",
  );
}

async function markReviewEligible(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireCustomerOwnership(req, booking, "markReviewEligible");
  assertStatus(booking, ["completed"], "markReviewEligible");
  return updateBookingAction(
    repositories,
    req,
    booking,
    "markReviewEligible",
    { metadata: { review_eligible: true } },
    CORE_RENTAL_AUDIT_ACTIONS.reviewEligibilityMarked,
    "review.eligibility_marked",
    requireCustomerOwnership,
  );
}

async function cancelBooking(repositories, payload, req) {
  const booking = await findBooking(repositories, payload.booking_id);
  requireActor(req);
  const actorIsSupplier = roleOf(req) === "supplier" && booking.supplier_id === actorId(req);
  const actorIsCustomer = roleOf(req) === "customer" && booking.customer_id === actorId(req);
  if (!isAdmin(req) && !actorIsSupplier && !actorIsCustomer) {
    throw forbiddenError("Only the booking customer, supplier, or admin can cancel.", []);
  }
  assertStatus(booking, ["pending", "approved", "confirmed"], "cancelBooking");
  return updateBookingAction(
    repositories,
    req,
    booking,
    "cancelBooking",
    { status: "cancelled", metadata: { cancellation_reason: payload.reason || "not provided" } },
    CORE_RENTAL_AUDIT_ACTIONS.bookingCancelled,
    "booking.cancelled",
    () => {},
  );
}

async function openDispute(repositories, payload, req) {
  requireFields(payload, ["booking_id", "reason"]);
  const booking = await findBooking(repositories, payload.booking_id);
  requireActor(req);
  const actorIsSupplier = roleOf(req) === "supplier" && booking.supplier_id === actorId(req);
  const actorIsCustomer = roleOf(req) === "customer" && booking.customer_id === actorId(req);
  if (!isAdmin(req) && !actorIsSupplier && !actorIsCustomer) {
    throw forbiddenError("Only booking parties or admin can open a dispute.", []);
  }
  assertStatus(booking, ["active", "completed"], "openDispute");
  const dispute = await repositories.disputes.create({
    booking_id: booking.id,
    opened_by: actorId(req),
    status: "open",
    reason: payload.reason,
    metadata_json: JSON.stringify({ provider_status: "provider_independent_local" }),
  });
  await repositories.bookings.update(booking.id, { metadata_json: mergeBookingMetadata(booking, { dispute_id: dispute.id }) });
  await recordAudit(repositories, req, CORE_RENTAL_AUDIT_ACTIONS.disputeOpened, "dispute", dispute.id, { booking_id: booking.id });
  return actionResult({
    action: "openDispute",
    record: dispute,
    domainEvent: buildDomainEvent("dispute.opened", "dispute", dispute.id, { booking_id: booking.id }),
    auditAction: CORE_RENTAL_AUDIT_ACTIONS.disputeOpened,
    status: 201,
  });
}

export async function performCoreRentalAction(repositories, action, payload = {}, req = {}) {
  const handlers = {
    validateSupplierProfile,
    createAsset: createRentalAsset,
    moderateListing,
    publishListing,
    checkAvailability,
    quotePrice,
    requestBooking,
    acceptBooking,
    rejectBooking,
    requirePayment,
    confirmBooking,
    triggerContract,
    checkIn,
    activateRental,
    requestExtension,
    approveExtension,
    rejectExtension,
    checkOut,
    calculateFinalCharge,
    prepareSettlement,
    markReviewEligible,
    cancelBooking,
    openDispute,
  };
  const handler = handlers[action];
  if (!handler) {
    throw validationError([{ field: "action", message: `Unsupported rental action: ${action}` }]);
  }
  return handler(repositories, payload, req);
}
