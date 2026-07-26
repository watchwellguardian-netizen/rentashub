import { validateCoreRentalRepositoryContract } from "../repositories/coreRentalRepositoryContracts.js";
import { getRepositories } from "./persistenceService.js";
import { performCoreRentalAction } from "./coreRentalService.js";

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
    await assertActionNotDuplicated(repositories, action, payload);
    const result = await performCoreRentalAction(repositories, action, payload, req);
    return {
      ...result,
      meta: {
        ...result.meta,
        persistence: providerStatusFor(database),
        repository_contract: contract.status,
        lock_key: lockKey,
      },
    };
  });
  return requiresSerializedExecution(action) ? withKeyedLock(lockKey, runner) : runner();
}

export function getCoreRentalPersistenceReadiness(context = {}) {
  const contract = validateCoreRentalRepositoryContract(context.repositories || {});
  return {
    status: contract.status,
    repositoryContract: contract,
    persistence: providerStatusFor(context.database),
    boundaries: [
      "No executable PostgreSQL validation claimed.",
      "No live Supabase Auth, Storage, RLS, payment, or escrow provider activated.",
      "Local snapshot rollback and in-process locks are not a production substitute.",
    ],
  };
}
