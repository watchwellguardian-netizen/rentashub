# S5-ABW-001 Module Completion Matrix

Current release: RC-0.6A
A4 status: A4-01 open
Production ready: No

Completion formula: sum(weight * completion) / sum(weight)
Verified build completion: 62.1%
Remaining build scope: 37.9%

| Module | Feature | Classification | Weight | Completion | Verified points | Test status |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Marketplace | Public landing, search, categories, and asset discovery | locally-functional | 5 | 0.9 | 4.5 | Verified by production frontend tests |
| Authentication | Local authentication routes and session readiness | blocked-externally | 5 | 0.55 | 2.75 | Backend and readiness tests pass |
| Authorization | Protected routes, API role guards, and role-aware access controls | backend-implemented | 5 | 0.75 | 3.75 | Auth/RBAC and core rental authorization tests pass |
| Supplier | Supplier profile, verification workflow, and status evidence | locally-functional | 3 | 0.75 | 2.25 | Supplier profile tests pass |
| Listings | Asset and listing create, edit, publish, moderate, and browse | locally-functional | 5 | 0.85 | 4.25 | Listing and core rental API tests pass |
| Core Rental | Booking request through review eligibility provider-independent lifecycle | locally-functional | 5 | 0.85 | 4.25 | Core rental service/API/adapter tests pass |
| Core Rental | Availability checks, deterministic pricing, and booking quote | backend-implemented | 5 | 0.8 | 4 | Core rental API tests pass |
| Core Rental | Idempotency, optimistic versioning, overlap prevention, and audit participation | backend-implemented | 5 | 0.75 | 3.75 | Static adapter and local API tests pass |
| Database | PostgreSQL adapter, migrations, and execution harness | blocked-externally | 5 | 0.6 | 3 | Focused static harness tests pass |
| Database Security | RLS/RBAC policy preparation and cross-tenant evidence harness | blocked-externally | 5 | 0.45 | 2.25 | Static readiness tests pass |
| Trust | Reviews, ratings, eligibility, and moderation | locally-functional | 3 | 0.75 | 2.25 | Review tests pass |
| Communications | Messages, notifications, local support delivery, and audit framework | backend-implemented | 3 | 0.8 | 2.4 | Messaging, notification, and support operations tests pass |
| Claims and Disputes | Claims, disputes, admin queues, and local workflow transitions | backend-implemented | 3 | 0.65 | 1.95 | Protection/dispute tests pass |
| Revenue | Payment intent, wallet, earnings, payout, refund placeholder workflow | blocked-externally | 5 | 0.45 | 2.25 | Payment ledger and revenue readiness tests pass |
| Escrow | Escrow intake, ledger, release, refund, and dispute readiness | blocked-externally | 5 | 0.4 | 2 | Escrow readiness tests pass |
| Auctions | Auction landing, lots, bidding UI, local contract layer, supplier/admin/dealer surfaces | locally-functional | 5 | 0.7 | 3.5 | Auction local contract and workflow tests pass |
| Inspections | Inspector directory, registration, quote, booking, report workflow | locally-functional | 3 | 0.65 | 1.95 | Inspection tests pass |
| Transport | Transport directory, provider registration, quote and booking readiness | locally-functional | 3 | 0.65 | 1.95 | Transport tests pass |
| Financing | Financing directory, partner registration, referral readiness | locally-functional | 3 | 0.6 | 1.8 | Financing tests pass |
| AI Studio Consolidation | Role-aware AI assistant, documentation, workflow guides, and admin system status | locally-functional | 3 | 0.65 | 1.95 | AI Studio consolidation tests pass |
| AI | AI listing assistant, valuation engine, rental advisor, market insights | simulated | 3 | 0.55 | 1.65 | AI foundation tests pass |
| Files and Storage | File metadata, upload intent, signed URL and bucket readiness | blocked-externally | 5 | 0.45 | 2.25 | File and storage readiness tests pass |
| Security | Security headers, secret scanning, dependency/security readiness evidence | backend-implemented | 5 | 0.65 | 3.25 | Security tests and scan pass |
| Compliance | Privacy, DSAR, retention, KYC, DPA/GDPR evidence readiness | documented-only | 3 | 0.55 | 1.65 | Compliance tests pass |
| Operations | Health, readiness, liveness, observability, support operations, and operator evidence | backend-implemented | 3 | 0.8 | 2.4 | Operations readiness and support operations tests pass |
| Queues | Redis and BullMQ queue readiness, retries, DLQ and metrics contracts | blocked-externally | 3 | 0.45 | 1.35 | Focused readiness tests pass |
| Release | Release governance, launch dashboard, evidence indexes and owner action register | documented-only | 2 | 0.85 | 1.7 | Release readiness tests pass |
| Browser and Accessibility | Playwright browser journey and accessibility runtime suite | blocked-externally | 3 | 0.5 | 1.5 | Focused readiness tests pass |
| Runtime Evidence | CI workflow orchestration for PostgreSQL, Redis, storage, browser, auth and operations | blocked-externally | 5 | 0.4 | 2 | Orchestrator tests pass |
| Mobile | Native mobile applications | not-started | 2 | 0 | 0 | No tests |
| External Integrations | Government, customs, court and public-sector integrations | not-started | 2 | 0 | 0 | No tests |
