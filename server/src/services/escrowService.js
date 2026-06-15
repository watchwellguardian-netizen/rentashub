import { ESCROW_DEPOSIT_TYPES, ESCROW_STATES, getEscrowReadiness } from "../escrow/escrowReadiness.js";

const ESCROW_NOTICE = "Escrow and deposit protection are readiness-only. No live funds, legal escrow hold, provider release, refund, payout, or bank transfer occurs.";

function publicError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function validationError(details) {
  return publicError(400, "validation_error", "Please correct the highlighted fields.", details);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeState(status) {
  const normalized = String(status || "pending").toLowerCase();
  return ESCROW_STATES.includes(normalized) ? normalized : "pending";
}

function mapRecord(record) {
  return {
    ...record,
    liveFundsProcessed: false,
    legalEscrowActive: false,
    notice: ESCROW_NOTICE,
  };
}

function canView(user, record) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "customer") return record.customerId === user.id || record.requesterId === user.id;
  if (user.role === "supplier") return record.supplierId === user.id || record.ownerId === user.id;
  return false;
}

function validateCreate(payload = {}) {
  const details = [];
  if (!payload.bookingId && !payload.booking_id) details.push({ field: "bookingId", message: "bookingId is required." });
  if (!payload.assetId && !payload.asset_id) details.push({ field: "assetId", message: "assetId is required." });
  if (!payload.depositType || !ESCROW_DEPOSIT_TYPES.includes(payload.depositType)) details.push({ field: "depositType", message: `depositType must be one of: ${ESCROW_DEPOSIT_TYPES.join(", ")}.` });
  if (normalizeMoney(payload.amount) <= 0) details.push({ field: "amount", message: "amount must be greater than zero." });
  if (payload.status && !ESCROW_STATES.includes(String(payload.status).toLowerCase())) details.push({ field: "status", message: `status must be one of: ${ESCROW_STATES.join(", ")}.` });
  if (details.length) throw validationError(details);
}

function transition(record, action, payload = {}) {
  const amount = normalizeMoney(payload.amount ?? record.amount);
  if (action === "release") {
    if (!["held", "disputed"].includes(record.status)) throw validationError([{ field: "status", message: "Only held or disputed escrow records can be released." }]);
    return { ...record, status: amount > 0 && amount < record.amount ? "partially_released" : "released", releasedAmount: amount || record.amount };
  }
  if (action === "refund") {
    if (!["pending", "held", "disputed"].includes(record.status)) throw validationError([{ field: "status", message: "Only pending, held, or disputed escrow records can be refunded." }]);
    return { ...record, status: "refunded", refundedAmount: amount || record.amount };
  }
  if (action === "dispute") {
    if (!["pending", "held", "partially_released"].includes(record.status)) throw validationError([{ field: "status", message: "Only pending, held, or partially released escrow records can be disputed." }]);
    return { ...record, status: "disputed", disputeReason: payload.reason || "Dispute reason pending." };
  }
  return record;
}

export function createEscrowService(options = {}) {
  const env = options.env || process.env;
  const store = options.escrowStore || new Map();

  return {
    readiness() {
      return getEscrowReadiness(env);
    },

    list(req) {
      return [...store.values()].filter((record) => canView(req.user, record)).map(mapRecord);
    },

    find(id, req) {
      const record = store.get(id);
      if (!record) throw publicError(404, "not_found", "Escrow record was not found.");
      if (!canView(req.user, record)) throw publicError(403, "forbidden", "You cannot access this escrow record.");
      return mapRecord(record);
    },

    create(payload = {}, req) {
      validateCreate(payload);
      const id = `escrow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = {
        id,
        bookingId: payload.bookingId || payload.booking_id,
        assetId: payload.assetId || payload.asset_id,
        customerId: payload.customerId || payload.customer_id || req.user?.id || "",
        supplierId: payload.supplierId || payload.supplier_id || payload.ownerId || "",
        requesterId: req.user?.id || "",
        ownerId: payload.ownerId || payload.supplierId || payload.supplier_id || "",
        depositType: payload.depositType,
        amount: normalizeMoney(payload.amount),
        currency: payload.currency || env.ESCROW_SETTLEMENT_CURRENCY || "JMD",
        provider: this.readiness().provider,
        status: normalizeState(payload.status),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        history: [{ status: normalizeState(payload.status), action: "created", actorId: req.user?.id || "unknown", at: nowIso() }],
      };
      store.set(id, record);
      return mapRecord(record);
    },

    updateStatus(id, action, payload = {}, req) {
      const record = store.get(id);
      if (!record) throw publicError(404, "not_found", "Escrow record was not found.");
      if (!canView(req.user, record)) throw publicError(403, "forbidden", "You cannot update this escrow record.");
      const updated = transition(record, action, payload);
      updated.updatedAt = nowIso();
      updated.history = [...(record.history || []), { status: updated.status, action, actorId: req.user?.id || "unknown", at: nowIso(), note: payload.reason || payload.note || "" }];
      store.set(id, updated);
      return mapRecord(updated);
    },
  };
}
