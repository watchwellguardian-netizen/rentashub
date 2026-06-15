import { getRepositories } from "./persistenceService.js";

const VALID_REASONS = ["damage", "late_return", "missing_item", "payment_issue", "booking_terms", "safety_issue", "other"];
const VALID_STATUSES = ["submitted", "under_review", "needs_more_info", "resolved_placeholder", "rejected_placeholder", "escalated_placeholder"];
const DISPUTE_NOTICE = "Dispute handling is simulated in this development version. No legal mediation, arbitration, payout, or escrow action is active.";

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

function notFound() {
  return publicError(404, "not_found", "Dispute was not found.");
}

function forbidden(message = "You cannot access this dispute.") {
  return publicError(403, "forbidden", message);
}

function normalizeRole(role = "") {
  const value = String(role || "").toLowerCase();
  if (value === "vendor") return "supplier";
  if (value === "guest" || value === "user") return "customer";
  return value;
}

function parseDetails(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapDispute(record = {}) {
  const details = parseDetails(record.details_json, {});
  return {
    id: record.id,
    bookingId: record.booking_id || "",
    assetId: record.asset_id || "",
    customerId: details.customerId || "",
    supplierId: details.supplierId || "",
    openedBy: record.opened_by || "",
    openedByRole: details.openedByRole || "",
    reason: record.reason || "other",
    summary: details.summary || "",
    evidence: details.evidence || [],
    status: record.status || "submitted",
    adminNotes: details.adminNotes || "",
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    notice: DISPUTE_NOTICE,
  };
}

function canView(user, dispute) {
  const mapped = mapDispute(dispute);
  const role = normalizeRole(user?.role);
  if (role === "admin") return true;
  if (role === "customer") return mapped.customerId === user?.id || mapped.openedBy === user?.id;
  if (role === "supplier") return mapped.supplierId === user?.id;
  return false;
}

async function audit(repos, action, entityId, req, metadata = {}) {
  await repos.audit_logs.record(action, "dispute", {
    actor_id: req.user?.id || "anonymous",
    entity_id: entityId,
    ...metadata,
  });
}

export function createDisputeApiService(options = {}) {
  const context = options.context || options;
  async function repositories() {
    return getRepositories(context);
  }

  return {
    async list(req, { admin = false } = {}) {
      const repos = await repositories();
      const disputes = await repos.disputes.list();
      return (admin ? disputes : disputes.filter((dispute) => canView(req.user, dispute))).map(mapDispute);
    },

    async findById(disputeId, req) {
      const repos = await repositories();
      const dispute = await repos.disputes.findById(disputeId);
      if (!dispute) throw notFound();
      if (!canView(req.user, dispute)) throw forbidden();
      return mapDispute(dispute);
    },

    async create(payload = {}, req) {
      const errors = [];
      if (!payload.booking_id) errors.push({ field: "booking_id", message: "booking_id is required." });
      if (!payload.asset_id) errors.push({ field: "asset_id", message: "asset_id is required." });
      if (!VALID_REASONS.includes(payload.reason)) errors.push({ field: "reason", message: "Choose a valid dispute reason." });
      if (!String(payload.summary || "").trim()) errors.push({ field: "summary", message: "Dispute summary is required." });
      if (String(payload.summary || "").trim().length > 1200) errors.push({ field: "summary", message: "Dispute summary must be 1200 characters or fewer." });
      if (errors.length) throw validationError(errors);

      const repos = await repositories();
      const booking = await repos.bookings.findById(payload.booking_id);
      if (!booking) throw publicError(404, "not_found", "Booking was not found.");
      const role = normalizeRole(req.user?.role);
      if (role !== "admin" && booking.customer_id !== req.user?.id && booking.supplier_id !== req.user?.id) {
        throw forbidden("You cannot open a dispute for this booking.");
      }
      const dispute = await repos.disputes.create({
        booking_id: payload.booking_id,
        asset_id: payload.asset_id,
        opened_by: req.user.id,
        status: "submitted",
        reason: payload.reason,
        details_json: JSON.stringify({
          customerId: payload.customer_id || booking.customer_id,
          supplierId: payload.supplier_id || booking.supplier_id,
          openedByRole: role,
          summary: String(payload.summary).trim(),
          evidence: payload.evidence || [{ id: `evidence-${Date.now()}`, name: "evidence upload coming soon", status: "upload-ready-placeholder" }],
        }),
      });
      await audit(repos, "disputes.created", dispute.id, req);
      return mapDispute(dispute);
    },

    async update(disputeId, payload = {}, req, { admin = false } = {}) {
      const repos = await repositories();
      const existing = await repos.disputes.findById(disputeId);
      if (!existing) throw notFound();
      if (!admin && !canView(req.user, existing)) throw forbidden("You cannot update this dispute.");
      const status = payload.status || existing.status;
      if (!VALID_STATUSES.includes(status)) throw validationError([{ field: "status", message: "Choose a valid dispute status." }]);
      const details = parseDetails(existing.details_json, {});
      const updated = await repos.disputes.update(disputeId, {
        status,
        details_json: JSON.stringify({
          ...details,
          summary: payload.summary ? String(payload.summary).trim() : details.summary,
          adminNotes: payload.admin_notes ?? details.adminNotes,
        }),
      });
      await audit(repos, admin ? "admin.disputes.updated" : "disputes.updated", disputeId, req, { status });
      return mapDispute(updated);
    },
  };
}
