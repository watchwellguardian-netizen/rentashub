import { validateCoreRentalRepositoryContract } from "../repositories/coreRentalRepositoryContracts.js";
import { getRepositories } from "./persistenceService.js";
import { parseMetadata, performCoreRentalAction } from "./coreRentalService.js";
import { getCoreRentalProductionBridgeReadiness } from "./coreRentalProductionBridge.js";

const lockQueues = new Map();

function providerStatusFor(database) {
  return {
    provider: database?.provider || "unknown",
    transactionalStrategy: typeof database?.snapshot === "function" && typeof database?.restore === "function"
      ? "snapshot_rollback"
      : "best_effort_no_rollback_hook",
    lockStrategy: "in_process_keyed_mutex",
    productionSuitable: false,
    providerStatus: "provider_independent_local",
  };
}

function createConflict(message, details = []) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = "rental_conflict";
  error.publicMessage = message;
  error.details = details;
  return error;
}

function createForbidden(message, details = []) {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = "forbidden";
  error.publicMessage = message;
  error.details = details;
  return error;
}

function createNotFound(entityType, id) {
  const error = new Error(`${entityType} was not found.`);
  error.statusCode = 404;
  error.code = "not_found";
  error.publicMessage = `${entityType} was not found.`;
  error.details = id ? [{ field: "id", message: id }] : [];
  return error;
}

async function withKeyedLock(key, callback) {
  const lockKey = key || "core-rental-global";
  const previous = lockQueues.get(lockKey) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  lockQueues.set(lockKey, chained);
  await previous;
  try {
    return await callback();
  } finally {
    release();
    if (lockQueues.get(lockKey) === chained) lockQueues.delete(lockKey);
  }
}

async function withTransaction(database, callback) {
  if (!database || typeof database.snapshot !== "function" || typeof database.restore !== "function") {
    return callback({ transactionStatus: "NO_ROLLBACK_HOOK" });
  }
  const snapshot = database.snapshot();
  try {
    const result = await callback({ transactionStatus: "COMMITTED" });
    return result;
  } catch (error) {
    await database.restore(snapshot);
    error.details = [
      ...(error.details || []),
      { field: "transaction", message: "Local provider-independent transaction rolled back from snapshot." },
    ];
    throw error;
  }
}

async function deriveLockKey(repositories, action, payload = {}) {
  if (payload.asset_id) return `asset:${payload.asset_id}`;
  if (payload.booking_id) {
    const booking = await repositories.bookings.findById(payload.booking_id);
    return booking?.asset_id ? `asset:${booking.asset_id}` : `booking:${payload.booking_id}`;
  }
  return `action:${action}`;
}

function requiresSerializedExecution(action) {
  return new Set([
    "requestBooking",
    "acceptBooking",
    "rejectBooking",
    "requirePayment",
    "confirmBooking",
    "triggerContract",
    "checkIn",
    "activateRental",
    "requestExtension",
    "approveExtension",
    "rejectExtension",
    "checkOut",
    "calculateFinalCharge",
    "prepareSettlement",
    "markReviewEligible",
    "cancelBooking",
    "openDispute",
  ]).has(action);
}

async function assertActionNotDuplicated(repositories, action, payload = {}) {
  if (!payload.booking_id) return;
  const booking = await repositories.bookings.findById(payload.booking_id);
  if (!booking) return;
  const duplicateStates = {
    acceptBooking: ["approved", "confirmed", "checked_in", "active", "extension_requested", "completed", "cancelled", "declined", "disputed"],
    rejectBooking: ["declined", "cancelled", "approved", "confirmed", "active", "completed", "disputed"],
    checkIn: ["checked_in", "active", "extension_requested", "completed", "disputed"],
    activateRental: ["active", "extension_requested", "completed", "disputed"],
    checkOut: ["completed", "disputed"],
    confirmBooking: ["confirmed", "checked_in", "active", "completed", "disputed"],
  };
  if (duplicateStates[action]?.includes(booking.status)) {
    throw createConflict(`${action} was already applied or the booking moved beyond that state.`, [
      { field: "status", message: booking.status },
    ]);
  }
}

async function assertExpectedVersion(repositories, payload = {}) {
  if (!payload.booking_id || payload.expected_version === undefined) return;
  const booking = await repositories.bookings.findById(payload.booking_id);
  if (!booking) return;
  const expected = Number(payload.expected_version);
  const actual = Number(booking.version || 0);
  if (!Number.isFinite(expected) || expected !== actual) {
    throw createConflict("Booking version is stale. Reload the booking before retrying this action.", [
      { field: "expected_version", message: String(payload.expected_version) },
      { field: "actual_version", message: String(actual) },
    ]);
  }
}

function rangesOverlap(first, second) {
  return new Date(first.start_at).getTime() < new Date(second.end_at).getTime()
    && new Date(second.start_at).getTime() < new Date(first.end_at).getTime();
}

async function assertRepositoryInvariants(repositories) {
  const bookings = await repositories.bookings.list();
  const assets = await repositories.assets.list();
  const assetIds = new Set(assets.map((asset) => asset.id));
  const blocking = new Set(["pending", "approved", "confirmed", "checked_in", "active", "extension_requested"]);
  const idempotencyKeys = new Set();

  for (const booking of bookings) {
    if (!booking.asset_id || !assetIds.has(booking.asset_id)) {
      throw createConflict("Repository invariant failed: booking asset reference must exist.", [
        { field: "asset_id", message: booking.asset_id || "missing" },
      ]);
    }
    if (!booking.customer_id || !booking.supplier_id) {
      throw createConflict("Repository invariant failed: booking parties are required.", [
        { field: "booking_id", message: booking.id },
      ]);
    }
    if (booking.start_at && booking.end_at && new Date(booking.end_at) <= new Date(booking.start_at)) {
      throw createConflict("Repository invariant failed: booking end must be after start.", [
        { field: "booking_id", message: booking.id },
      ]);
    }
    const idempotencyKey = booking.idempotency_key || parseMetadata(booking).idempotency_key;
    if (idempotencyKey) {
      const scopedKey = `${booking.customer_id}:${idempotencyKey}`;
      if (idempotencyKeys.has(scopedKey)) {
        throw createConflict("Repository invariant failed: idempotency key must be unique per customer.", [
          { field: "idempotency_key", message: "duplicate" },
        ]);
      }
      idempotencyKeys.add(scopedKey);
    }
  }

  const activeBookings = bookings.filter((booking) => blocking.has(booking.status));
  for (let index = 0; index < activeBookings.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < activeBookings.length; compareIndex += 1) {
      const first = activeBookings[index];
      const second = activeBookings[compareIndex];
      if (first.asset_id === second.asset_id && rangesOverlap(first, second)) {
        throw createConflict("Repository invariant failed: blocking bookings cannot overlap for the same asset.", [
          { field: "asset_id", message: first.asset_id },
        ]);
      }
    }
  }
}

export async function executeCoreRentalPersistenceAction(context = {}, action, payload = {}, req = {}) {
  const repositories = await getRepositories(context);
  const contract = validateCoreRentalRepositoryContract(repositories);
  if (contract.status !== "CONTRACT_READY") {
    const error = new Error("Core rental repository contract is incomplete.");
    error.statusCode = 500;
    error.code = "repository_contract_incomplete";
    error.publicMessage = "Core rental repository contract is incomplete.";
    error.details = contract.findings;
    throw error;
  }
  const database = context.database;
  const lockKey = await deriveLockKey(repositories, action, payload);
  const runner = async () => withTransaction(database, async () => {
    await assertExpectedVersion(repositories, payload);
    await assertActionNotDuplicated(repositories, action, payload);
    const result = await performCoreRentalAction(repositories, action, payload, req);
    await assertRepositoryInvariants(repositories);
    return {
      ...result,
      meta: {
        ...result.meta,
        persistence: providerStatusFor(database),
        repository_contract: contract.status,
        lock_key: lockKey,
        repository_invariants: "PASS",
      },
    };
  });
  return requiresSerializedExecution(action) ? withKeyedLock(lockKey, runner) : runner();
}

export async function readCoreRentalBooking(context = {}, bookingId, req = {}) {
  const repositories = await getRepositories(context);
  const booking = await repositories.bookings.findById(bookingId);
  if (!booking) throw createNotFound("Booking", bookingId);
  const role = req.user?.role || "anonymous";
  const actorId = req.user?.id || "anonymous";
  const allowed = role === "admin"
    || (role === "customer" && booking.customer_id === actorId)
    || (role === "supplier" && booking.supplier_id === actorId);
  if (!allowed) {
    throw createForbidden("Only booking parties or admin can view this core rental booking.", [
      { field: "booking_id", message: booking.id },
    ]);
  }
  return {
    status: 200,
    data: booking,
    meta: {
      provider_status: "provider_independent_local",
      persistence: providerStatusFor(context.database),
      repository_contract: validateCoreRentalRepositoryContract(repositories).status,
      repository_invariants: "READ_ONLY",
    },
  };
}

export async function listCoreRentalBookings(context = {}, filter = {}, req = {}) {
  const repositories = await getRepositories(context);
  const role = req.user?.role || "anonymous";
  const actorId = req.user?.id || "anonymous";
  let bookings;

  if (role === "admin") {
    bookings = await repositories.bookings.list(filter);
  } else if (role === "customer") {
    const requestedCustomer = filter.customer_id || actorId;
    if (requestedCustomer !== actorId) {
      throw createForbidden("Customers can only list their own core rental bookings.", [
        { field: "customer_id", message: requestedCustomer },
      ]);
    }
    bookings = await repositories.bookings.list({ ...filter, customer_id: actorId });
  } else if (role === "supplier") {
    const requestedSupplier = filter.supplier_id || actorId;
    if (requestedSupplier !== actorId) {
      throw createForbidden("Suppliers can only list bookings for their own assets.", [
        { field: "supplier_id", message: requestedSupplier },
      ]);
    }
    bookings = await repositories.bookings.list({ ...filter, supplier_id: actorId });
  } else {
    throw createForbidden("Only customers, suppliers, or admins can list core rental bookings.", [
      { field: "role", message: role },
    ]);
  }

  return {
    status: 200,
    data: bookings,
    meta: {
      provider_status: "provider_independent_local",
      persistence: providerStatusFor(context.database),
      repository_contract: validateCoreRentalRepositoryContract(repositories).status,
      repository_invariants: "READ_ONLY",
      list_scope: role,
    },
  };
}

export function getCoreRentalPersistenceReadiness(context = {}) {
  const contract = validateCoreRentalRepositoryContract(context.repositories || {});
  return {
    status: contract.status,
    repositoryContract: contract,
    persistence: providerStatusFor(context.database),
    productionReadinessBridge: getCoreRentalProductionBridgeReadiness(),
    boundaries: [
      "No executable PostgreSQL validation claimed.",
      "No live Supabase Auth, Storage, RLS, payment, or escrow provider activated.",
      "Local snapshot rollback and in-process locks are not a production substitute.",
    ],
  };
}
