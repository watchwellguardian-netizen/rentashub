# LocalStorage To Backend Migration

RentasHub is still using localStorage for the prototype data layer. Module 18 adds repository boundaries so a backend adapter can replace localStorage later without rewriting the whole frontend at once.

## Migration Order

1. Authentication and sessions.
2. Users and role aliases.
3. Supplier profiles and verification metadata.
4. Assets and asset category fields.
5. Bookings and booking status workflow.
6. Payments ledger, deposits, payouts, and reconciliation.
7. Files/documents for assets, verification, inspections, and claims.
8. Messages and notifications.
9. Reviews, disputes, protection claims, and admin moderation.
10. Trust/risk score persistence and audit inputs.

## What Must Move First

- Authentication: replace demo/local users with real accounts, sessions, and server-side RBAC.
- Users: centralize user IDs so every module references stable backend identities.
- Assets: move listings before search, booking, offers, trust, and protection depend on real records.
- Bookings: move status transitions and ownership checks server-side.
- Payments ledger: migrate before real payment/escrow integration so records reconcile cleanly.
- Files/documents: upload real photos, verification files, inspection evidence, and claim evidence to object storage.
- Notifications: store notification records server-side before adding email/SMS/push providers.

## Migration Risks

- ID collisions between local timestamp IDs and backend UUIDs.
- Duplicated local records if browser storage is replayed after backend migration.
- Stale browser storage showing old listings, bookings, or payment status.
- Missing auth sessions when demo users are removed.
- File metadata without real files, especially photos, verification documents, inspection photos, and claim evidence.
- Ownership mismatches if supplier/customer IDs change during migration.
- Ledger inconsistencies if simulated transactions are mixed with real provider events.
- Trust score drift if local-only records are not migrated or explicitly discarded.

## Recommended Migration Controls

- Add a one-time migration banner or storage reset when backend mode is enabled.
- Use backend UUIDs for all new records.
- Keep idempotency keys for payments, claims, bookings, and file uploads.
- Add server-side audit events before enabling admin or financial workflows.
- Keep localStorage mode available only for development/testing.
- Disable localStorage writes in production backend mode.

## Current Status

- Repository layer exists under `src/lib/repositories/`.
- Default adapter is still localStorage.
- `.env.example` defines `VITE_ENABLE_LOCAL_STORAGE_MODE=true` for development.
- No backend server is implemented in Module 18.
- Clean `npm install` remains pending until tested in a proper Node/npm environment or CI.
