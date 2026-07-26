# Core Rental Legacy State Migration Plan

Status: ACCEL-P1-005 provider-independent readiness.

Release boundary: RC-0.6A unchanged. A4-01 remains open. This plan does not certify PostgreSQL, Supabase Auth, RLS, Storage, payment, escrow, staging, or production readiness.

## Current Authoritative Local State

The core rental user interface still keeps the legacy localStorage path as the default authority for production-safe demo workflows.

| State area | Current local source | Backend/API path | Migration status |
| --- | --- | --- | --- |
| Asset listings | `rentashub_asset_listings` through `assetAdapter` | `/api/assets` and `/api/v1/rentals/assets` | Partial, API pilot exists |
| Rental bookings | `rentashub_bookings` through `bookingAdapter` | `/api/bookings` and opt-in `/api/v1/rentals/bookings` | Partial, v1 path behind `rental_core_backend_path` |
| Booking actions | `bookingAdapter.updateStatus` | `/api/v1/rentals/bookings/:id/:action` | Partial, approve/decline/cancel mapped in API mode |
| Inspections | `rentashub_inspections` through `inspectionAdapter` | `/api/inspections` | Partial, API pilot exists |
| Messages and notifications | local message/notification stores | `/api/messages`, `/api/notifications` | Partial, API pilot exists |
| Reviews and disputes | local review/dispute stores | `/api/reviews`, `/api/disputes` | Partial, API pilot exists |
| Payments and protection | simulated local stores | `/api/payments/*`, `/api/protection/*` | Simulated/provider-ready only |

## Controlled Backend Path

The ACCEL-P1-005 backend path adds:

- repository-contract validation for suppliers, assets, listings, availability, bookings, booking actions, and audit events;
- local snapshot rollback for JSON persistence;
- in-process keyed locks for booking and booking-action mutations;
- v1 rental API persistence metadata;
- opt-in frontend API journey through `rental_core_backend_path`.

These controls are not production substitutes. They exist to make local and future PostgreSQL-backed behavior deterministic.

## Removal Criteria For Authoritative localStorage Rental State

Do not remove the localStorage rental state until all are true:

1. A4-01 Infrastructure Ownership Confirmation passes.
2. A4-03 migration execution evidence passes in Development and UAT.
3. A4-04 persistence, RLS/RBAC, Auth, Storage, and backup/restore evidence passes.
4. `/api/v1/rentals` parity tests pass against the certified database.
5. Frontend API mode passes create, accept, reject, cancel, check-in, activation, extension, checkout, settlement, review, and dispute journeys.
6. Legacy data export/import or reset instructions are approved for demo users.
7. Rollback plan exists for switching `rental_core_backend_path` off.

## Remaining Manual Evidence

- Real Supabase project IDs and ownership evidence.
- Real PostgreSQL execution and RLS enforcement.
- Real Supabase Auth identity binding.
- Real storage buckets and signed URL evidence.
- Production monitoring, security, compliance, payment, and escrow evidence.
