import { getRepositories } from "./persistenceService.js";

const VALID_CLAIM_STATUSES = ["draft", "submitted", "under_review", "approved_placeholder", "rejected_placeholder", "escalated_placeholder"];
const VALID_CLAIM_TYPES = ["damage", "theft", "breakdown", "liability", "late_return", "missing_accessory", "other"];
const PROTECTION_NOTICE = "Protection and claims API mode is a guarded development pilot. It does not provide real insurance, underwriting, adjudication, payout, or escrow.";

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

function notFound(resourceName) {
  return publicError(404, "not_found", `${resourceName} was not found.`);
}

function forbidden(message = "This role cannot access this endpoint.") {
  return publicError(403, "forbidden", message);
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");
  if (missing.length) throw validationError(missing.map((field) => ({ field, message: `${field} is required.` })));
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

function serializeDetails(value = {}) {
  return JSON.stringify(value || {});
}

function mapPlan(record = {}) {
  return {
    id: record.id,
    planType: record.plan_type,
    type: record.plan_type,
    name: record.name,
    description: record.description || "",
    coverageSummary: record.description || "",
    feeRate: Number(record.fee_rate || 0),
    priceModel: record.price_model || "percentage_of_booking",
    priceValue: Number(record.fee_rate || record.price_value || 0),
    status: record.status || "simulated",
    notice: PROTECTION_NOTICE,
    createdAt: record.created_at,
  };
}

function mapSelection(record = {}) {
  return {
    id: record.id,
    bookingId: record.booking_id,
    customerId: record.customer_id,
    planId: record.plan_id,
    status: record.status,
    feeAmount: Number(record.fee_amount || 0),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    notice: PROTECTION_NOTICE,
  };
}

function activeSelections(selections = []) {
  return selections.filter((selection) => !["replaced_placeholder", "removed_placeholder"].includes(selection.status));
}

function mapClaim(record = {}) {
  const details = parseDetails(record.details_json, {});
  return {
    id: record.id,
    bookingId: record.booking_id || details.bookingId || "",
    assetId: record.asset_id || details.assetId || "",
    customerId: details.customerId || record.customer_id || "",
    supplierId: details.supplierId || record.supplier_id || "",
    claimantId: record.claimant_id,
    claimType: record.claim_type,
    description: details.description || "",
    evidence: details.evidence || [],
    linkedDisputeId: details.linkedDisputeId || "",
    linkedInspectionId: details.linkedInspectionId || "",
    submittedByUserId: details.submittedByUserId || record.claimant_id,
    submittedByRole: details.submittedByRole || "",
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    notice: PROTECTION_NOTICE,
  };
}

function canViewClaim(user, claim) {
  const role = normalizeRole(user?.role);
  if (role === "admin") return true;
  const mapped = mapClaim(claim);
  if (role === "customer") return mapped.customerId === user?.id || mapped.claimantId === user?.id;
  if (role === "supplier") return mapped.supplierId === user?.id;
  return false;
}

function canViewBooking(user, booking) {
  const role = normalizeRole(user?.role);
  if (role === "admin") return true;
  if (role === "customer") return booking.customer_id === user?.id || booking.customerId === user?.id;
  if (role === "supplier") return booking.supplier_id === user?.id || booking.supplierId === user?.id;
  return false;
}

async function audit(repos, action, entityType, entityId, req, metadata = {}) {
  await repos.audit_logs.record(action, entityType, {
    actor_id: req.user?.id || "anonymous",
    entity_id: entityId,
    ...metadata,
  });
}

async function listActivePlans(repos) {
  const plans = await repos.protection_plans.list();
  return plans.length
    ? plans
    : [
        { id: "plan-damage-waiver", plan_type: "damage_waiver", name: "Damage Waiver", description: "Simulated damage-waiver placeholder.", fee_rate: 0.08, status: "active" },
        { id: "plan-liability", plan_type: "liability_protection", name: "Liability Protection", description: "Simulated liability protection placeholder.", fee_rate: 0.05, status: "active" },
      ];
}

export function createProtectionClaimsApiService(options = {}) {
  const context = options.context || options;

  async function repositories() {
    return getRepositories(context);
  }

  return {
    async protectionOverview() {
      const repos = await repositories();
      const plans = await listActivePlans(repos);
      return { notice: PROTECTION_NOTICE, plans: plans.map(mapPlan) };
    },

    async listPlans() {
      const repos = await repositories();
      return (await listActivePlans(repos)).map(mapPlan);
    },

    async findPlan(planId) {
      const repos = await repositories();
      const plan = (await listActivePlans(repos)).find((item) => item.id === planId);
      if (!plan) throw notFound("Protection plan");
      return mapPlan(plan);
    },

    async getBookingProtection(bookingId, req) {
      const repos = await repositories();
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) throw notFound("Booking");
      if (!canViewBooking(req.user, booking)) throw forbidden("You cannot view protection for this booking.");
      const selections = activeSelections(await repos.protection_selections.list({ booking_id: bookingId }));
      return {
        booking,
        selections: selections.map(mapSelection),
        selectedPlanIds: selections.map((selection) => selection.plan_id),
        protectionCost: selections.reduce((total, selection) => total + Number(selection.fee_amount || 0), 0),
        notice: PROTECTION_NOTICE,
      };
    },

    async selectBookingProtection(bookingId, payload, req) {
      const repos = await repositories();
      const booking = await repos.bookings.findById(bookingId);
      if (!booking) throw notFound("Booking");
      if (normalizeRole(req.user?.role) !== "admin" && booking.customer_id !== req.user?.id) {
        throw forbidden("Only the booking customer can update protection selection in this pilot.");
      }
      const planIds = [...new Set(Array.isArray(payload.plan_ids) ? payload.plan_ids : [])];
      const plans = await listActivePlans(repos);
      const validPlanIds = planIds.filter((planId) => plans.some((plan) => plan.id === planId));
      if (planIds.length !== validPlanIds.length) throw validationError([{ field: "plan_ids", message: "One or more protection plans are invalid." }]);

      const existing = activeSelections(await repos.protection_selections.list({ booking_id: bookingId }));
      for (const selection of existing) await repos.protection_selections.update(selection.id, { status: "replaced_placeholder" });

      const created = [];
      for (const planId of validPlanIds) {
        const plan = plans.find((item) => item.id === planId);
        const feeAmount = Number(payload.fee_amounts?.[planId] ?? plan.fee_amount ?? plan.fee_rate ?? 0);
        created.push(await repos.protection_selections.create({
          booking_id: bookingId,
          customer_id: booking.customer_id,
          plan_id: planId,
          status: "selected_placeholder",
          fee_amount: feeAmount,
        }));
      }
      await audit(repos, "protection.selection.updated", "protection_selection", bookingId, req, { plan_ids: validPlanIds });
      return {
        booking,
        selections: created.map(mapSelection),
        selectedPlanIds: validPlanIds,
        protectionCost: created.reduce((total, selection) => total + Number(selection.fee_amount || 0), 0),
        notice: PROTECTION_NOTICE,
      };
    },

    async listClaims(req, { admin = false } = {}) {
      const repos = await repositories();
      const claims = await repos.claims.list();
      const visibleClaims = admin ? claims : claims.filter((claim) => canViewClaim(req.user, claim));
      return visibleClaims.map(mapClaim);
    },

    async findClaim(claimId, req) {
      const repos = await repositories();
      const claim = await repos.claims.findById(claimId);
      if (!claim) throw notFound("Claim");
      if (!canViewClaim(req.user, claim)) throw forbidden("You cannot view this claim.");
      return mapClaim(claim);
    },

    async createClaim(payload, req) {
      requireFields(payload, ["booking_id", "asset_id", "claim_type", "description"]);
      if (!VALID_CLAIM_TYPES.includes(payload.claim_type)) throw validationError([{ field: "claim_type", message: "Choose a valid claim type." }]);
      const description = String(payload.description || "").trim();
      if (!description || description.length > 1200) throw validationError([{ field: "description", message: "Claim description is required and must be 1200 characters or fewer." }]);

      const repos = await repositories();
      const booking = await repos.bookings.findById(payload.booking_id);
      if (!booking) throw notFound("Booking");
      const role = normalizeRole(req.user?.role);
      if (role !== "admin" && booking.customer_id !== req.user?.id && booking.supplier_id !== req.user?.id) {
        throw forbidden("You cannot submit a claim for this booking.");
      }
      const claim = await repos.claims.create({
        booking_id: payload.booking_id,
        asset_id: payload.asset_id,
        claimant_id: req.user.id,
        claim_type: payload.claim_type,
        status: "submitted",
        details_json: serializeDetails({
          description,
          customerId: payload.customer_id || booking.customer_id,
          supplierId: payload.supplier_id || booking.supplier_id,
          evidence: payload.evidence || [{ id: `evidence-${Date.now()}`, name: "evidence upload coming soon", status: "upload-ready-placeholder" }],
          linkedDisputeId: payload.linked_dispute_id || "",
          linkedInspectionId: payload.linked_inspection_id || "",
          submittedByUserId: req.user.id,
          submittedByRole: role,
        }),
      });
      await audit(repos, "claims.created", "claim", claim.id, req);
      return mapClaim(claim);
    },

    async updateClaim(claimId, payload, req, { admin = false } = {}) {
      const repos = await repositories();
      const existing = await repos.claims.findById(claimId);
      if (!existing) throw notFound("Claim");
      if (!admin && !canViewClaim(req.user, existing)) throw forbidden("You cannot update this claim.");
      const nextStatus = payload.status || existing.status;
      if (!VALID_CLAIM_STATUSES.includes(nextStatus)) throw validationError([{ field: "status", message: "Choose a valid claim status." }]);
      const details = parseDetails(existing.details_json, {});
      const updated = await repos.claims.update(claimId, {
        status: nextStatus,
        details_json: serializeDetails({
          ...details,
          adminNote: payload.admin_note ?? details.adminNote,
          description: payload.description ? String(payload.description).trim() : details.description,
        }),
      });
      await audit(repos, admin ? "admin.claims.updated" : "claims.updated", "claim", claimId, req, { status: nextStatus });
      return mapClaim(updated);
    },
  };
}
