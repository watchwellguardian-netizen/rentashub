# A3-Y Duplication and Technical Debt Register

## Summary

This register records architectural duplication and debt observed during the initial A3-Y bounded audit. Items are not automatically defects; they are consolidation targets requiring tests before removal or migration.

## Severity Key

- P0: correctness, security, or release risk.
- P1: architectural duplication or maintenance risk.
- P2: performance or developer-experience issue.
- P3: cosmetic or deferred cleanup.

## Register

| ID | Severity | Files involved | Current behavior | Debt type | Recommended canonical implementation | Migration risk | Tests affected | Resolution status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A3Y-DEBT-001 | P1 | `src/lib/*Service.js`, `src/lib/adapters/*Adapter.js`, `src/lib/repositories/*Repository.js`, `server/src/repositories/*` | Several domains have a frontend service, frontend adapter/repository, and server repository without proven single-path usage | Parallel persistence paths | Select one canonical frontend adapter per rental capability and one server API/repository target | Medium; UI flows may depend on local fallback | Booking, listing, messaging, review, inspection tests | Open |
| A3Y-DEBT-002 | P1 | `src/lib/bookingService.js`, `src/lib/adapters/bookingAdapter.js`, `src/lib/repositories/bookingsRepository.js`, `server/src/repositories/bookingRepository.js` | Booking is implemented across multiple layers but backend parity is not proven | Duplicate booking model/path | Make booking adapter the sole UI entry point and map it to backend repository where safe | Medium; status transitions can regress | Booking request/detail/supplier flow tests | Open |
| A3Y-DEBT-003 | P1 | `src/lib/assetListing.js`, `src/lib/adapters/assetAdapter.js`, `src/lib/repositories/assetsRepository.js`, `server/src/repositories/assetRepository.js` | Listing/search data appears available locally and server-side | Duplicate listing data path | Canonical listing adapter with explicit `local` or `api` mode | Medium | Search/listing/create listing tests | Open |
| A3Y-DEBT-004 | P1 | `src/lib/messagingService.js`, `src/lib/adapters/messageAdapter.js`, `server/src/routes/messageNotificationRoutes.js` | Messaging has local and server scaffolding | Duplicate messaging path | Route rental messages through one adapter; preserve fallback visibly | Medium | Messaging/notifications tests | Open |
| A3Y-DEBT-005 | P1 | `src/lib/reviewService.js`, `src/lib/adapters/reviewAdapter.js`, `server/src/routes/reviewApiRoutes.js` | Review service and API route both exist | Duplicate review path | Use canonical review adapter and require completed booking state | Medium | Review eligibility tests | Open |
| A3Y-DEBT-006 | P2 | `src/App.jsx` | Many routes are eagerly imported in one router | Bundle/performance debt | Lazy-load infrequently used/admin/heavy route groups | Medium; route loading regressions possible | Route smoke/protected route tests | Open |
| A3Y-DEBT-007 | P2 | `package.json` | Root lint/bundle scripts were not confirmed in Phase 0 excerpt | Quality tooling gap | Add or verify `lint`, `lint:check`, and bundle reporting scripts | Low to medium | New quality tests/CI | Open |
| A3Y-DEBT-008 | P1 | local repositories and service modules | localStorage/local persistence remains central for business workflows | Production-readiness debt | Inventory keys and migrate core rental data to canonical backend-ready adapters | Medium to high | Local compatibility and regression tests | Open |
| A3Y-DEBT-009 | P1 | readiness docs/scripts and UI status labels | Provider-ready tooling can be mistaken for live operational readiness | Truthfulness risk | Keep status vocabulary visible and test no false production/live claims | Low | Security/truthfulness tests | Partially controlled by existing readiness tests |
| A3Y-DEBT-010 | P2 | readiness tooling scripts | Multiple readiness scripts exist by domain | Developer-experience complexity | Keep master orchestrator as summary entry point and document domain scripts | Low | Master readiness tests | Open |

## Immediate Consolidation Rule

No code should be deleted or merged until a focused test proves behavior is preserved for the affected workflow.
