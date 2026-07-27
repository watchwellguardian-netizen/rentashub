# Core Rental Transaction Integrity Report

Status: ACCEL-P1-006 provider-independent readiness.

Release boundary: RC-0.6A unchanged. A4-01 remains open. This report does not certify PostgreSQL transactions, Supabase RLS, Supabase Auth, Supabase Storage, payment, escrow, staging, or production readiness.

## Transaction Strategy

The local JSON provider uses snapshot rollback around core rental mutations. When a mutation fails after a partial local write, the persistence adapter restores the prior snapshot and returns a controlled failure through the API error handler.

This is suitable for deterministic local validation only. PostgreSQL transaction evidence remains required under A4-03/A4-04.

## Locking And Concurrency Strategy

Core rental booking mutations use an in-process keyed mutex. The lock key is derived from the asset when available, or from the booking when the asset must be resolved from the current booking record.

This serializes provider-independent local booking creation, supplier acceptance, lifecycle transitions, settlement preparation, dispute opening, and related booking actions. It is not a distributed production lock.

## Idempotency Implementation

Booking creation persists the idempotency key both in the booking record and in booking metadata. Repeated booking submissions with the same customer-scoped idempotency key return the original booking instead of creating a duplicate.

## Overlap Prevention

Availability checks reject blocking overlaps for pending, approved, confirmed, checked-in, active, and extension-requested bookings. Repository invariant checks also scan persisted bookings after mutation to ensure blocking bookings do not overlap for the same asset.

## Optimistic Version Checks

Flagged API-mode booking actions may submit `expected_version`. If the expected version does not match the stored booking version, the action is rejected with `rental_conflict` before mutation.

## Repository Invariants

Post-mutation invariant checks verify:

- booking asset references exist;
- booking customer and supplier references are present;
- booking end is after booking start;
- customer-scoped idempotency keys are unique;
- blocking bookings do not overlap for the same asset.

## Frontend Vertical Slice

The bounded feature-flagged journey covers:

1. Supplier creates an asset through `/api/v1/rentals/assets`.
2. Supplier moderates/publishes the listing.
3. Customer checks availability.
4. Customer submits a booking request.
5. Supplier accepts the booking with an expected version.
6. Customer reads the updated booking state.
7. Audit and domain events are recorded.

The path remains behind `rental_core_backend_path`. Legacy localStorage fallback remains the default path.

## Remaining Authoritative localStorage Paths

- Asset listing UI remains localStorage-authoritative by default.
- Booking create/update UI remains localStorage-authoritative by default.
- Messages, notifications, reviews, disputes, protection, payment previews, and related transaction surfaces remain local/simulated unless explicitly switched to guarded API pilots.

## Blockers

- A4-01 ownership evidence remains open.
- Executable PostgreSQL/Supabase validation remains unavailable in the current environment.
- PostgreSQL transaction evidence, real RLS enforcement, real Supabase Auth identity binding, real storage bucket evidence, and production distributed locking remain not certified.
