# Core Rental Vertical Slice Completion Report

Batch: ACCEL-P1-007

Classification: Provider-independent core rental vertical slice completion and operational workflow integration.

Release status: RC-0.6A unchanged. A4-01 remains open. Production readiness is not certified.

## Scope Completed

ACCEL-P1-007 connects the locally implemented core rental workflow around the ACCEL-P1-006 transaction-integrity foundation.

Implemented provider-independent coverage:

- Supplier profile validation endpoint.
- Supplier asset creation endpoint.
- Listing moderation and publication endpoint flow.
- Availability check endpoint.
- Deterministic pricing quote endpoint.
- Booking request endpoint with idempotency key support.
- Supplier accept and reject actions.
- Payment-required marker.
- Contract-generation trigger marker.
- Check-in action.
- Active-rental transition.
- Extension request and supplier decision actions.
- Check-out action.
- Final-charge preparation.
- Settlement preparation.
- Review eligibility marker.
- Dispute-opening action.
- Customer and supplier booking list endpoints for dashboard refresh.
- Customer/supplier/admin booking read authorization.
- Provider-independent local notification records for booking and lifecycle events.
- Audit-event persistence for every covered lifecycle action.
- Frontend API adapter orchestration behind `rental_core_backend_path`.
- Booking adapter customer and supplier list integration behind `rental_core_backend_path`.

## Frontend Connection

The frontend connection remains guarded by the `rental_core_backend_path` feature flag.

When enabled in API mode, the adapter path can:

1. Create or use a supplier asset.
2. Moderate and publish the listing.
3. Check customer availability.
4. Retrieve deterministic pricing.
5. Submit a customer booking request.
6. Execute supplier decision and operational lifecycle actions.
7. Read the customer booking state.
8. Refresh customer and supplier dashboard booking lists.

When disabled, the legacy localStorage fallback remains available and documented.

## Repository Operations Used

The batch uses the existing canonical repository abstraction:

- `supplier_profiles`
- `assets`
- `bookings`
- `notifications`
- `disputes`
- `audit_logs`

No parallel database, router, auth system, transaction engine, or duplicate application path was introduced.

## State Transitions Covered

Covered local state path:

`pending -> approved -> confirmed -> checked_in -> active -> extension_requested -> active -> completed`

Covered side-effect markers:

- `payment_status: payment_required`
- `contract_status: pending_generation`
- `final_charge`
- `settlement_status: ready`
- `review_eligible: true`
- dispute record creation

## Tests Added

Focused tests cover:

- Full provider-independent lifecycle.
- Customer and supplier dashboard list refresh.
- Supplier profile validation.
- Availability and deterministic pricing.
- Booking request and supplier decision.
- Payment-required, contract, check-in, active rental, extension, check-out, final-charge, settlement, review, and dispute steps.
- Audit-event completeness.
- Local notification creation.
- Cross-tenant customer and supplier list denial.
- Admin list access.
- Simultaneous supplier acceptance serialization and duplicate-action blocking.
- Feature-flagged frontend adapter full lifecycle orchestration.
- Feature-flagged customer/supplier booking adapter list path.
- Legacy localStorage fallback preservation.

## Verification

- Focused ACCEL-P1-007 verification: PASS, 65/65.
- Full frontend production tests: PASS, 630/630.
- Full backend tests: PASS, 134/134.

Additional verification gates are recorded in `docs/verification-log.md`.

## Remaining Blockers

The following are not certified by this batch:

- Real PostgreSQL transaction execution.
- Database-native locking and isolation.
- Real RLS/RBAC enforcement.
- Supabase Auth identity binding.
- Supabase Storage bucket use.
- Payment provider authorization or capture.
- Escrow or protected-funds operation.
- Staging validation.
- Production deployment.
- Production readiness.

## Next Required Evidence

A4-01 Infrastructure Ownership Confirmation remains the next production gate.

ACCEL-P1-002 executable database validation should be rerun only after Supabase CLI, Docker, local PostgreSQL, disposable PostgreSQL, or approved CI-hosted PostgreSQL is available.
