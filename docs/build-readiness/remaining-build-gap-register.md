# S5-ABW-001 Remaining Build Gap Register

Overall remaining build scope: 39.3%

## Escrow: Escrow intake, ledger, release, refund, and dispute readiness

- Priority weight: 5
- Remaining weighted points: 3
- Classification: blocked-externally
- Dependency/blocker: Legal trust/provider blocked
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/escrowRoutes.js, server/tests/escrow.test.mjs, tests/production/escrow-readiness-tooling.test.mjs

## Runtime Evidence: CI workflow orchestration for PostgreSQL, Redis, storage, browser, auth and operations

- Priority weight: 5
- Remaining weighted points: 3
- Classification: blocked-externally
- Dependency/blocker: GitHub/runtime environment blocked
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: scripts/s5-s3h-runtime-evidence-orchestrator.mjs, tests/production/s5-s3h-runtime-evidence-orchestrator.test.mjs

## Database Security: RLS/RBAC policy preparation and cross-tenant evidence harness

- Priority weight: 5
- Remaining weighted points: 2.75
- Classification: blocked-externally
- Dependency/blocker: Runtime PostgreSQL required
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: scripts/check-rls-rbac-sql.mjs, tests/production/s5-s3h-runtime-evidence-orchestrator.test.mjs

## Revenue: Payment intent, wallet, earnings, payout, refund placeholder workflow

- Priority weight: 5
- Remaining weighted points: 2.75
- Classification: blocked-externally
- Dependency/blocker: Payment provider blocked
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/paymentApiRoutes.js, src/pages/PaymentsPage.jsx, src/pages/WalletPage.jsx, tests/production/payment-ledger.test.mjs, tests/production/revenue-readiness-tooling.test.mjs

## Files and Storage: File metadata, upload intent, signed URL and bucket readiness

- Priority weight: 5
- Remaining weighted points: 2.75
- Classification: blocked-externally
- Dependency/blocker: Live object storage blocked
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/fileRoutes.js, server/tests/files.test.mjs, tests/production/storage-readiness-tooling.test.mjs

## Authentication: Local authentication routes and session readiness

- Priority weight: 5
- Remaining weighted points: 2.25
- Classification: blocked-externally
- Dependency/blocker: Live identity provider pending
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/authRoutes.js, server/tests/auth.test.mjs, tests/production/s5-s3f-auth-authorization-readiness.test.mjs

## Auctions: Auction landing, lots, bidding UI, supplier/admin/dealer surfaces

- Priority weight: 5
- Remaining weighted points: 2.25
- Classification: simulated
- Dependency/blocker: Provider independent and simulated
- Required action: advance from simulated to verified runtime or production evidence where applicable.
- Evidence required: src/pages/AuctionPages.jsx, src/lib/auctionService.js, tests/production/auction-module.test.mjs

## Database: PostgreSQL adapter, migrations, and execution harness

- Priority weight: 5
- Remaining weighted points: 2
- Classification: blocked-externally
- Dependency/blocker: Runtime execution blocked
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: server/src/repositories/coreRentalPostgresRepositoryAdapter.js, scripts/accel-micro-pg-005-postgres-harness.mjs, tests/production/accel-micro-pg-005-postgres-harness.test.mjs

## Mobile: Native mobile applications

- Priority weight: 2
- Remaining weighted points: 2
- Classification: not-started
- Dependency/blocker: Blocked by roadmap
- Required action: advance from not-started to verified runtime or production evidence where applicable.
- Evidence required: docs/program-state.md

## External Integrations: Government, customs, court and public-sector integrations

- Priority weight: 2
- Remaining weighted points: 2
- Classification: not-started
- Dependency/blocker: Blocked by governance
- Required action: advance from not-started to verified runtime or production evidence where applicable.
- Evidence required: docs/program-state.md

## Security: Security headers, secret scanning, dependency/security readiness evidence

- Priority weight: 5
- Remaining weighted points: 1.75
- Classification: backend-implemented
- Dependency/blocker: WAF/MFA/live cert pending
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: server/src/main/app.js, server/src/middleware/securityHeaders.js, scripts/secret-scan.mjs, tests/production/security-hardening-program.test.mjs

## Queues: Redis and BullMQ queue readiness, retries, DLQ and metrics contracts

- Priority weight: 3
- Remaining weighted points: 1.65
- Classification: blocked-externally
- Dependency/blocker: CI/live execution pending
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: tests/production/s5-s3c-redis-bullmq-readiness.test.mjs

## Browser and Accessibility: Playwright browser journey and accessibility runtime suite

- Priority weight: 3
- Remaining weighted points: 1.5
- Classification: blocked-externally
- Dependency/blocker: CI runtime pending
- Required action: advance from blocked-externally to verified runtime or production evidence where applicable.
- Evidence required: tests/browser/s5-s3e-browser-accessibility.spec.mjs, tests/production/s5-s3e-browser-accessibility-readiness.test.mjs

## AI: AI listing assistant, valuation engine, rental advisor, market insights

- Priority weight: 3
- Remaining weighted points: 1.35
- Classification: simulated
- Dependency/blocker: Simulated/readiness
- Required action: advance from simulated to verified runtime or production evidence where applicable.
- Evidence required: src/pages/AiAssistant.jsx, tests/production/ai-listing-assistant-foundation.test.mjs, tests/production/ai-valuation-engine-foundation.test.mjs

## Compliance: Privacy, DSAR, retention, KYC, DPA/GDPR evidence readiness

- Priority weight: 3
- Remaining weighted points: 1.35
- Classification: documented-only
- Dependency/blocker: Legal and KYC provider blocked
- Required action: advance from documented-only to verified runtime or production evidence where applicable.
- Evidence required: scripts/compliance-readiness-tooling.mjs, tests/production/compliance-readiness-tooling.test.mjs, tests/production/compliance-activation.test.mjs

## Authorization: Protected routes, API role guards, and role-aware access controls

- Priority weight: 5
- Remaining weighted points: 1.25
- Classification: backend-implemented
- Dependency/blocker: Provider independent
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: src/components/ProtectedRoute.jsx, server/src/middleware/authMiddleware.js, server/tests/core-rental-api.test.mjs, tests/production/auth-rbac.test.mjs

## Core Rental: Idempotency, optimistic versioning, overlap prevention, and audit participation

- Priority weight: 5
- Remaining weighted points: 1.25
- Classification: backend-implemented
- Dependency/blocker: Provider independent local
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: server/src/repositories/coreRentalPostgresRepositoryAdapter.js, server/tests/core-rental-postgres-repository-adapter.test.mjs, server/tests/core-rental-api.test.mjs

## Financing: Financing directory, partner registration, referral readiness

- Priority weight: 3
- Remaining weighted points: 1.2
- Classification: locally-functional
- Dependency/blocker: Lender/provider blocked
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/pages/FinancingMarketplacePages.jsx, src/lib/financingMarketplaceService.js, tests/production/financing-marketplace.test.mjs

## Operations: Health, readiness, liveness, observability and operator evidence

- Priority weight: 3
- Remaining weighted points: 1.2
- Classification: backend-implemented
- Dependency/blocker: Telemetry destination blocked
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/healthRoutes.js, server/src/routes/monitoringRoutes.js, tests/production/s5-s3g-observability-operations-readiness.test.mjs

## Claims and Disputes: Claims, disputes, admin queues, and local workflow transitions

- Priority weight: 3
- Remaining weighted points: 1.05
- Classification: backend-implemented
- Dependency/blocker: Legal/provider evidence pending
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/protectionClaimsApiRoutes.js, server/src/routes/disputeApiRoutes.js, tests/production/protection-framework.test.mjs

## Inspections: Inspector directory, registration, quote, booking, report workflow

- Priority weight: 3
- Remaining weighted points: 1.05
- Classification: locally-functional
- Dependency/blocker: Provider independent
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/pages/InspectionMarketplacePages.jsx, server/src/routes/resourceRoutes.js, tests/production/inspection-marketplace.test.mjs, tests/production/inspection-engine.test.mjs

## Transport: Transport directory, provider registration, quote and booking readiness

- Priority weight: 3
- Remaining weighted points: 1.05
- Classification: locally-functional
- Dependency/blocker: Provider blocked
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/pages/TransportMarketplacePages.jsx, src/lib/transportMarketplaceService.js, tests/production/transport-marketplace.test.mjs

## AI Studio Consolidation: Role-aware AI assistant, documentation, workflow guides, and admin system status

- Priority weight: 3
- Remaining weighted points: 1.05
- Classification: locally-functional
- Dependency/blocker: Provider independent
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/pages/AiStudioConsolidationPages.jsx, tests/production/ai-studio-consolidation.test.mjs

## Core Rental: Availability checks, deterministic pricing, and booking quote

- Priority weight: 5
- Remaining weighted points: 1
- Classification: backend-implemented
- Dependency/blocker: Provider independent
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: server/src/services/coreRentalService.js, server/tests/core-rental-api.test.mjs

## Communications: Messages, notifications, local delivery/audit framework

- Priority weight: 3
- Remaining weighted points: 0.9
- Classification: backend-implemented
- Dependency/blocker: Live delivery provider pending
- Required action: advance from backend-implemented to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/messageNotificationRoutes.js, src/pages/MessagesPage.jsx, src/pages/NotificationsPage.jsx, tests/production/messaging-notifications.test.mjs

## Supplier: Supplier profile, verification workflow, and status evidence

- Priority weight: 3
- Remaining weighted points: 0.75
- Classification: locally-functional
- Dependency/blocker: KYC provider pending
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/pages/SupplierProfile.jsx, server/src/routes/coreRentalRoutes.js, tests/production/supplier-profile-verification.test.mjs

## Listings: Asset and listing create, edit, publish, moderate, and browse

- Priority weight: 5
- Remaining weighted points: 0.75
- Classification: locally-functional
- Dependency/blocker: Provider independent
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/pages/ListAsset.jsx, src/pages/MyListings.jsx, server/src/routes/resourceRoutes.js, server/src/routes/coreRentalRoutes.js, tests/production/asset-listing.test.mjs

## Core Rental: Booking request through review eligibility provider-independent lifecycle

- Priority weight: 5
- Remaining weighted points: 0.75
- Classification: locally-functional
- Dependency/blocker: Provider independent
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: server/src/services/coreRentalService.js, server/src/controllers/coreRentalController.js, server/tests/core-rental-api.test.mjs, tests/production/core-rental-api-adapter.test.mjs

## Trust: Reviews, ratings, eligibility, and moderation

- Priority weight: 3
- Remaining weighted points: 0.75
- Classification: locally-functional
- Dependency/blocker: Provider independent
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: server/src/routes/reviewApiRoutes.js, src/pages/ReviewsPage.jsx, tests/production/reviews-ratings.test.mjs

## Marketplace: Public landing, search, categories, and asset discovery

- Priority weight: 5
- Remaining weighted points: 0.5
- Classification: locally-functional
- Dependency/blocker: Provider independent
- Required action: advance from locally-functional to verified runtime or production evidence where applicable.
- Evidence required: src/App.jsx, src/pages/LandingPage.jsx, tests/production/search-discovery.test.mjs, tests/production/asset-listing.test.mjs

## Release: Release governance, launch dashboard, evidence indexes and owner action register

- Priority weight: 2
- Remaining weighted points: 0.3
- Classification: documented-only
- Dependency/blocker: Runtime evidence pending
- Required action: advance from documented-only to verified runtime or production evidence where applicable.
- Evidence required: scripts/s5-lrw-001-release-readiness.mjs, scripts/s5-lrw-002-security-compliance.mjs, tests/production/s5-lrw-001-release-readiness.test.mjs, tests/production/s5-lrw-002-security-compliance.test.mjs
