export const RENTAL_LISTING_STATES = [
  "draft",
  "pending_review",
  "changes_required",
  "approved",
  "published",
  "paused",
  "suspended",
  "expired",
  "archived",
];

export const RENTAL_BOOKING_STATES = [
  "draft",
  "requested",
  "pending_supplier",
  "accepted",
  "payment_pending",
  "confirmed",
  "checkin_due",
  "active",
  "checkout_due",
  "completed",
  "cancelled",
  "disputed",
  "closed",
];

export const RENTAL_PAYMENT_STATES = [
  "created",
  "requires_action",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
  "disputed",
  "reconciled",
];

export const CORE_RENTAL_API_CONTRACTS = [
  { step: "supplier_profile", method: "POST", path: "/api/supplier-profiles", input: "supplier profile input", output: "supplier profile", validations: ["business name", "service area"], permission: "supplier:profile", stateTransition: "profile:draft->pending_verification", errors: ["validation_error", "permission_denied"], events: ["supplier.profile_submitted"], auditEvent: "supplier.profile_submitted", idempotencyRequired: true },
  { step: "asset_creation", method: "POST", path: "/api/assets", input: "asset input", output: "asset", validations: ["title", "category", "owner"], permission: "listing:own", stateTransition: "asset:none->draft", errors: ["validation_error", "permission_denied"], events: ["assets.created"], auditEvent: "assets.created", idempotencyRequired: true },
  { step: "listing_creation", method: "POST", path: "/api/listings", input: "listing input", output: "listing", validations: ["asset", "price", "availability"], permission: "listing:own", stateTransition: "listing:draft->pending_review", errors: ["validation_error", "asset_not_found"], events: ["listings.submitted"], auditEvent: "listings.submitted", idempotencyRequired: true },
  { step: "moderation", method: "PATCH", path: "/api/listings/:id/moderation", input: "moderation decision", output: "listing status", validations: ["decision", "admin role"], permission: "listing:moderate", stateTransition: "listing:pending_review->approved|changes_required", errors: ["permission_denied", "invalid_transition"], events: ["listings.moderated"], auditEvent: "listings.moderated", idempotencyRequired: true },
  { step: "availability", method: "GET", path: "/api/listings/:id/availability", input: "date range", output: "availability quote basis", validations: ["start date", "end date"], permission: "marketplace:read", stateTransition: "none", errors: ["invalid_date_range"], events: ["availability.checked"], auditEvent: "availability.checked", idempotencyRequired: false },
  { step: "pricing", method: "POST", path: "/api/bookings/quote", input: "listing and date range", output: "price quote", validations: ["availability", "rate rules"], permission: "booking:create", stateTransition: "quote:none->created", errors: ["unavailable", "pricing_error"], events: ["pricing.quoted"], auditEvent: "pricing.quoted", idempotencyRequired: true },
  { step: "booking_request", method: "POST", path: "/api/bookings", input: "booking request", output: "booking", validations: ["customer", "listing", "date range"], permission: "booking:create", stateTransition: "booking:draft->requested", errors: ["validation_error", "unavailable"], events: ["bookings.requested"], auditEvent: "bookings.requested", idempotencyRequired: true },
  { step: "supplier_acceptance", method: "PATCH", path: "/api/bookings/:id/accept", input: "acceptance decision", output: "booking", validations: ["supplier owns listing"], permission: "booking:accept", stateTransition: "booking:requested->accepted", errors: ["permission_denied", "invalid_transition"], events: ["bookings.accepted"], auditEvent: "bookings.status_changed", idempotencyRequired: true },
  { step: "payment_required", method: "POST", path: "/api/payments/intents", input: "booking payment request", output: "payment intent", validations: ["booking accepted", "amount"], permission: "payment:create", stateTransition: "payment:none->created", errors: ["invalid_booking", "payment_provider_unavailable"], events: ["payments.intent_created"], auditEvent: "payments.intent_created", idempotencyRequired: true },
  { step: "contract_generation", method: "POST", path: "/api/contracts", input: "booking contract request", output: "contract", validations: ["booking accepted", "parties"], permission: "contract:create", stateTransition: "contract:none->generated", errors: ["missing_party", "invalid_booking"], events: ["contracts.generated"], auditEvent: "documents.generated", idempotencyRequired: true },
  { step: "check_in", method: "POST", path: "/api/inspections/check-in", input: "check-in evidence", output: "inspection", validations: ["booking confirmed", "photos"], permission: "inspection:create", stateTransition: "booking:confirmed->active", errors: ["invalid_transition", "missing_evidence"], events: ["handover.checkin_completed"], auditEvent: "handover.checkin_completed", idempotencyRequired: true },
  { step: "active_rental", method: "PATCH", path: "/api/bookings/:id/activate", input: "activation signal", output: "booking", validations: ["check-in complete"], permission: "booking:mutate", stateTransition: "booking:checkin_due->active", errors: ["invalid_transition"], events: ["bookings.status_changed"], auditEvent: "bookings.status_changed", idempotencyRequired: true },
  { step: "extension", method: "POST", path: "/api/bookings/:id/extensions", input: "extension request", output: "extension quote", validations: ["active booking", "availability"], permission: "booking:extend", stateTransition: "booking:active->active", errors: ["unavailable", "invalid_transition"], events: ["bookings.extension_requested"], auditEvent: "bookings.status_changed", idempotencyRequired: true },
  { step: "check_out", method: "POST", path: "/api/inspections/check-out", input: "check-out evidence", output: "inspection", validations: ["active booking", "photos"], permission: "inspection:create", stateTransition: "booking:active->completed", errors: ["invalid_transition", "missing_evidence"], events: ["handover.checkout_completed"], auditEvent: "handover.checkout_completed", idempotencyRequired: true },
  { step: "settlement", method: "POST", path: "/api/settlements", input: "completed booking", output: "settlement preview", validations: ["completed booking", "ledger balance"], permission: "settlement:create", stateTransition: "payment:captured->reconciled", errors: ["ledger_unbalanced", "payment_missing"], events: ["settlements.calculated"], auditEvent: "payments.captured", idempotencyRequired: true },
  { step: "review", method: "POST", path: "/api/reviews", input: "review", output: "review", validations: ["completed booking", "reviewer party"], permission: "review:create", stateTransition: "review:none->created", errors: ["duplicate_review", "permission_denied"], events: ["reviews.created"], auditEvent: "reviews.created", idempotencyRequired: true },
  { step: "cancellation", method: "POST", path: "/api/bookings/:id/cancel", input: "cancellation request", output: "booking", validations: ["cancellable state", "party"], permission: "booking:cancel", stateTransition: "booking:requested|accepted|confirmed->cancelled", errors: ["invalid_transition", "permission_denied"], events: ["bookings.cancelled"], auditEvent: "bookings.status_changed", idempotencyRequired: true },
  { step: "dispute", method: "POST", path: "/api/disputes", input: "dispute request", output: "dispute", validations: ["booking party", "reason"], permission: "dispute:create", stateTransition: "booking:completed|active->disputed", errors: ["permission_denied", "missing_reason"], events: ["disputes.created"], auditEvent: "disputes.created", idempotencyRequired: true },
];

export function validateRentalContracts(contracts = CORE_RENTAL_API_CONTRACTS) {
  const errors = [];
  const seen = new Set();
  for (const contract of contracts) {
    const key = `${contract.method} ${contract.path}`;
    if (seen.has(key)) errors.push(`Duplicate contract: ${key}`);
    seen.add(key);
    if (!/^(GET|POST|PATCH|PUT|DELETE)$/.test(contract.method)) errors.push(`${key} has invalid method`);
    if (!contract.path.startsWith("/api/")) errors.push(`${key} must be an API path`);
    if (!contract.step) errors.push(`${key} missing step`);
    if (!contract.input) errors.push(`${key} missing input`);
    if (!contract.output) errors.push(`${key} missing output`);
    if (!Array.isArray(contract.validations) || contract.validations.length === 0) errors.push(`${key} missing validations`);
    if (!contract.permission) errors.push(`${key} missing permission`);
    if (!contract.stateTransition) errors.push(`${key} missing state transition`);
    if (!Array.isArray(contract.errors) || contract.errors.length === 0) errors.push(`${key} missing errors`);
    if (!Array.isArray(contract.events) || contract.events.length === 0) errors.push(`${key} missing events`);
    if (!contract.auditEvent) errors.push(`${key} missing audit event`);
    if (typeof contract.idempotencyRequired !== "boolean") errors.push(`${key} missing idempotency requirement`);
  }
  return { valid: errors.length === 0, errors, contractCount: contracts.length };
}
