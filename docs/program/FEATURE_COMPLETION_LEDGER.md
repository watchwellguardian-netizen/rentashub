# Feature Completion Ledger

Status vocabulary:

- Implemented locally
- Integrated with sandbox
- Validated in staging
- Activated in production
- Blocked by external dependency
- Not certified

| Domain | Feature | Current status | Completion layer gaps | Next action | Gate |
| --- | --- | --- | --- | --- | --- |
| Core platform | Program controls | Implemented locally | None for Phase 0 | Keep dashboard generated from status data | ACCEL-P0 |
| Core platform | Feature flags | Implemented locally | Environment-backed persistence not active | Use central registry in new incomplete/provider-dependent work | ACCEL-P0 |
| Core platform | Local migration reset evidence | Implemented locally | Live Supabase migration execution missing | Use A4-03 for Development/UAT execution evidence | ACCEL-P0-002 |
| Core platform | Local Supabase execution scaffold | Implemented locally | Supabase CLI/Docker execution and live project execution missing | Run local-only Supabase reset when operator environment supports CLI/Docker; use A4-03 for Development/UAT execution evidence | ACCEL-P1-001 |
| Core platform | Executable local database and RLS validation | Blocked by external dependency | Supabase CLI, Docker, or psql unavailable in current environment; RLS remains static only | Install/enable local Supabase CLI or disposable PostgreSQL engine, then rerun `npm run accel:p1:db-validation` and execute local reset/RLS tests | ACCEL-P1-002 |
| Rental marketplace | Core rental backend contracts and state guards | Implemented locally | Real PostgreSQL persistence, live RLS enforcement, Supabase Auth identity, and storage-backed documents missing | Execute against disposable PostgreSQL/Supabase when tooling is available; then promote evidence through A4-03/A4-04 | ACCEL-P1-003 |
| Rental marketplace | Core rental versioned API and lifecycle state machine | Implemented locally | Executable PostgreSQL/RLS validation, live Supabase Auth identity, live storage-backed contracts, and provider payment/escrow evidence missing | Keep backend adapter behind feature flag until A4 persistence/Auth/Storage evidence passes | ACCEL-P1-004 |
| Rental marketplace | Frontend core rental API adapter | Implemented locally | Backend path is disabled by default and legacy localStorage fallback remains for production safety | Remove authoritative localStorage transaction state only after A4-04 and backend parity evidence | ACCEL-P1-004 |
| Rental marketplace | Core rental repository persistence and API-mode migration path | Implemented locally | PostgreSQL transactions, RLS enforcement, live Auth identity, live Storage, and production-grade distributed locking missing | Keep `rental_core_backend_path` opt-in until A4-03/A4-04 evidence proves certified persistence and remove localStorage only after parity/rollback evidence | ACCEL-P1-005 |
| Rental marketplace | Core rental transaction integrity and bounded vertical slice | Implemented locally | PostgreSQL transactions, distributed locks, real RLS/RBAC, live Auth, live Storage, and production rollout evidence missing | Execute ACCEL-P1-002 when local database tooling exists; keep frontend vertical slice behind `rental_core_backend_path` until A4 evidence passes | ACCEL-P1-006 |
| Core platform | Storage bucket definitions | Implemented locally | Real buckets and signed URL tests missing | Use A4-04 for storage certification | ACCEL-P0-002 |
| Rental marketplace | Core rental API contracts | Implemented locally | Frontend adapter coverage and executable database validation missing | Continue provider-independent adapters behind feature flags; certify persistence only after executable database validation | ACCEL-P0-002 |
| Core platform | Supabase ownership | Blocked by external dependency | Staging/Production project IDs missing | Submit A4-01 evidence | A4-01 |
| Core platform | Migrations 001-007 | Implemented locally | Live reset/migration evidence missing | Run local reset once tooling/environment permits | A4-03 |
| Rental marketplace | Search/list/book journey | Implemented locally | Backend canonical persistence/Auth/Storage missing | Build backend vertical slice after A4 local foundation | Phase 3 |
| Financial platform | Payment ledger | Simulated | Provider sandbox, double-entry invariants, reconciliation missing | Build sandbox-safe ledger backbone | Phase 4 |
| Auctions | Auction workflows | Simulated | Concurrency-safe bid engine and legal/payment dependencies missing | Build after financial backbone | Phase 6 |
| Recovery | Repossessions/private treaty | Not certified | Legal authority, notices, proceeds waterfall missing | Defer until legal workflow and auction backbone | Phase 7 |
| Trust/ops | Claims/disputes | Implemented locally | Backend/audit/ledger integration missing | Connect after persistence and ledger | Phase 8 |
| Ecosystem | Inspection/transport/financing | Simulated | Provider onboarding, settlement, credentials missing | Build provider-independent backend contracts | Phase 9 |
| AI | Local AI assistance | Implemented locally | AI gateway/provider/safety evidence missing | Build governed AI gateway later | Phase 10 |
