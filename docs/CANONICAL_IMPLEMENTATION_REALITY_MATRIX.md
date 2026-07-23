# RentasHub Canonical Implementation Reality Matrix

## Classification Vocabulary

- `LIVE_PRODUCTION`: deployed and verified with production provider evidence.
- `LIVE_SANDBOX`: connected to an external sandbox provider with evidence.
- `API_IMPLEMENTED_CONNECTED`: frontend and backend path is implemented and connected in the current app.
- `API_IMPLEMENTED_NOT_CONNECTED`: backend/API exists but the primary UI path is not proven connected.
- `LOCAL_FUNCTIONAL`: works through local/client-side or local JSON persistence.
- `SIMULATED`: intentionally simulated and labelled as such.
- `PLACEHOLDER`: visible placeholder or controlled coming-soon behavior.
- `DOCUMENTED_ONLY`: described in docs/evidence but not implemented.
- `NOT_IMPLEMENTED`: no meaningful implementation found.
- `BLOCKED_EXTERNAL`: blocked by credentials, provider access, legal approval, or manual infrastructure.

No domain may be marked `LIVE_PRODUCTION` without deployment and provider evidence.

## Matrix

| Domain | Current classification | Owning files | Owning service | Persistence source | Existing tests/evidence | Remaining work | Launch impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Authentication | API_IMPLEMENTED_NOT_CONNECTED | `server/src/auth/*`, `src/lib/adapters/authAdapter.js` | Server auth services / auth adapter | Local/server scaffold; Supabase readiness only | Backend auth tests; A4/A2 readiness tooling | Live Supabase Auth evidence | Blocks closed beta |
| Registration | API_IMPLEMENTED_NOT_CONNECTED | `server/src/controllers/authController.js`, `src/pages/Login.jsx` | Auth controller | Local/server scaffold | Backend auth tests | Real Supabase registration evidence | Blocks closed beta |
| Email verification | BLOCKED_EXTERNAL | `server/src/auth/supabaseAuthReadiness.js` | Supabase readiness | None live | Auth readiness evidence templates | Supabase email verification test | Blocks production auth readiness |
| Password recovery | BLOCKED_EXTERNAL | `server/src/auth/supabaseAuthReadiness.js` | Supabase readiness | None live | Auth readiness evidence templates | Supabase reset evidence | Blocks production auth readiness |
| RBAC | API_IMPLEMENTED_NOT_CONNECTED | `src/lib/rbac.js`, `server/src/auth/rbacPolicy.js`, `ProtectedRoute` usage | RBAC policy | Local role/session model | Route/action tests; auth/RBAC readiness tests | RLS/RBAC live enforcement evidence | Blocks production certification |
| Supplier onboarding | LOCAL_FUNCTIONAL | `src/lib/supplierProfile.js`, `src/pages/SupplierDashboard.jsx` | Supplier profile/adapters | Local repositories / local state | Frontend production tests | Backend-connected supplier lifecycle | Blocks paid pilot |
| Customer profile | LOCAL_FUNCTIONAL | `src/lib/customerDashboard.js`, dashboard pages | Dashboard services | Local/client state | Frontend tests | Backend-connected profile persistence | Blocks closed beta |
| Broker profile | LOCAL_FUNCTIONAL | Broker/dashboard routes and marketplace services | Marketplace/dashboard services | Local/client state | Frontend tests | Backend-connected broker persistence | Blocks closed beta |
| Admin access | LOCAL_FUNCTIONAL | `src/lib/adminCenter.js`, admin routes | Admin center | Local/readiness data | Frontend admin tests | Backend/admin audit persistence | Blocks production certification |
| Listings | LOCAL_FUNCTIONAL | `src/lib/assetListing.js`, `src/lib/adapters/assetAdapter.js`, `src/lib/repositories/assetsRepository.js` | Asset/listing adapter | Local repository / local storage risk | Frontend tests | Canonical backend path and migration evidence | Blocks core rental slice |
| Listing media | BLOCKED_EXTERNAL | `server/src/files/*`, storage readiness docs | File service / storage adapter | Placeholder/Supabase-ready | Storage readiness tests | Live bucket/signed URL evidence | Blocks public launch |
| Search | LOCAL_FUNCTIONAL | `src/pages/MarketplaceSearch.jsx`, `src/lib/assetListing.js` | Listing/search data | Local listing dataset | Frontend tests | Canonical listing source | Blocks core rental parity |
| Availability | LOCAL_FUNCTIONAL | Booking/listing services | Booking/listing services | Local/client state | Frontend tests | Backend availability rules | Blocks paid pilot |
| Pricing | SIMULATED | `src/lib/bookingService.js`, payment/readiness services | Booking/payment simulation | Local/client state | Frontend tests | Provider/fee/tax approval | Blocks revenue |
| Booking | LOCAL_FUNCTIONAL | `src/lib/bookingService.js`, `src/lib/adapters/bookingAdapter.js`, `src/lib/repositories/bookingsRepository.js` | Booking adapter/repository | Local repository / server booking repository exists | Frontend and backend booking-related tests | One canonical API path | Blocks core rental slice |
| Booking acceptance | LOCAL_FUNCTIONAL | Booking pages/services | Booking service | Local state | Frontend tests | Backend-connected status transitions | Blocks core rental slice |
| Messaging | API_IMPLEMENTED_NOT_CONNECTED | `src/lib/messagingService.js`, `src/lib/adapters/messageAdapter.js`, `server/src/routes/messageNotificationRoutes.js` | Message adapter / server message notification service | Local + backend scaffold | Frontend/backend tests | Prove canonical connection | Blocks closed beta |
| Notifications | SIMULATED | `src/lib/notificationFramework.js`, server message notification routes | Notification framework | Local/provider-ready | Notification/readiness tests | Real provider activation later | Blocks production notification readiness |
| Inspection | LOCAL_FUNCTIONAL | `src/lib/inspectionService.js`, inspection marketplace files | Inspection services | Local/client state | Frontend tests | Backend-connected inspection metadata and storage evidence | Blocks paid pilot |
| Reviews | API_IMPLEMENTED_NOT_CONNECTED | `src/lib/reviewService.js`, `server/src/routes/reviewApiRoutes.js` | Review service/API | Local + backend scaffold | Frontend/backend review tests | Prove completed-booking review path | Blocks core rental completion |
| Trust | LOCAL_FUNCTIONAL | `src/lib/trustEngine.js` | Trust engine | Local/readiness data | Frontend tests | Backend audit/risk queue persistence | Blocks public launch |
| Verification | PLACEHOLDER | Verification/readiness docs and admin surfaces | Verification readiness | None live | Compliance/security readiness docs | KYC/provider/legal evidence | Blocks paid pilot |
| Wallet | SIMULATED | Payment/wallet pages and services | Payment ledger | Local/simulated | Frontend tests | Real provider and ledger evidence | Blocks revenue |
| Payments | SIMULATED | `src/lib/paymentLedger.js`, `server/src/payments/*` | Payment provider abstraction | Simulated/provider-ready | Revenue readiness tests | Sandbox provider activation | Blocks paid pilot |
| Refunds | SIMULATED | Payment/refund readiness tooling | Revenue readiness | Simulated | Revenue readiness tests | Provider refund evidence | Blocks paid pilot |
| Payouts | SIMULATED | Revenue/payout readiness tooling | Revenue readiness | Simulated | Revenue readiness tests | Provider payout evidence | Blocks paid pilot |
| Escrow | SIMULATED | `server/src/escrow/*`, escrow readiness tooling | Escrow readiness | Simulated/provider-ready | Escrow readiness tests | Legal trust structure/provider evidence | Blocks paid pilot |
| Claims | LOCAL_FUNCTIONAL | Protection/claims API/controller/readiness | Protection claims services | Local + backend scaffold | Frontend/backend tests | Backend-connected case lifecycle | Blocks public launch |
| Disputes | LOCAL_FUNCTIONAL | `src/lib/disputeService.js`, server dispute routes | Dispute service/API | Local + backend scaffold | Frontend/backend tests | Canonical case/audit path | Blocks paid pilot |
| Buying | LOCAL_FUNCTIONAL | `src/lib/marketplaceExchange.js`, marketplace routes | Marketplace exchange | Local/client state | Frontend tests | Backend exchange persistence | Blocks paid pilot |
| Selling | LOCAL_FUNCTIONAL | Marketplace exchange/listing services | Marketplace exchange | Local/client state | Frontend tests | Backend transaction path | Blocks paid pilot |
| Trading | LOCAL_FUNCTIONAL | Marketplace exchange routes/services | Marketplace exchange | Local/client state | Frontend tests | Backend transaction path | Blocks paid pilot |
| Swapping | LOCAL_FUNCTIONAL | Marketplace exchange routes/services | Marketplace exchange | Local/client state | Frontend tests | Backend transaction path | Blocks paid pilot |
| Wanted requests | LOCAL_FUNCTIONAL | `wantedRequestsRepository.js`, wanted routes | Wanted requests repository | Local repository | Frontend tests | Backend persistence | Blocks paid pilot |
| Brokerage | LOCAL_FUNCTIONAL | Marketplace/brokerage routes/services | Marketplace exchange | Local/client state | Frontend tests | Backend broker authorization/persistence | Blocks paid pilot |
| Auctions | SIMULATED | `src/lib/auctionService.js`, auction pages | Auction service | Local/simulated | Auction tests/evidence | Live bidding/legal/payment stack | Blocks production auction launch |
| Repossessed assets | PLACEHOLDER | Repossession/private treaty routes and services | Auction/asset services | Local/simulated | Frontend tests | Legal/government/provider approval | Blocks enterprise launch |
| Private treaty | PLACEHOLDER | Private treaty routes/services | Marketplace/auction services | Local/simulated | Frontend tests | Legal and backend transaction path | Blocks enterprise launch |
| Auction documents | SIMULATED | `src/lib/auctionDocumentEngine.js` | Document engine | Local/generated placeholders | Document engine tests | Legal/e-sign/document provider evidence | Blocks paid pilot |
| Transport | SIMULATED | `src/lib/transportMarketplaceService.js` | Transport marketplace service | Local/provider-ready | Frontend tests | Provider onboarding/dispatch evidence | Blocks operational launch |
| Financing referrals | SIMULATED | `src/lib/financingMarketplaceService.js` | Financing marketplace service | Local/provider-ready | Frontend tests | Consent/KYC/lender provider evidence | Blocks revenue activation |
| Protection | SIMULATED | `src/lib/protectionService.js` | Protection service | Local/simulated | Frontend tests | Legal/insurance/provider activation | Blocks paid pilot |
| File storage | BLOCKED_EXTERNAL | `server/src/files/*`, storage tooling | Storage provider factory | Local placeholder/Supabase-ready | Storage readiness tests | Real bucket/signed URL evidence | Blocks closed beta file workflows |
| Database persistence | API_IMPLEMENTED_NOT_CONNECTED | `server/src/db/*`, migrations `001`-`007` | Database provider/migrator | JSON/local; Postgres-ready | Backend database/readiness tests | Real Supabase migrations A4-03 | Blocks RC-0.6B |
| AI Assistant | LOCAL_FUNCTIONAL | `src/lib/aiAssistant.js`, `src/lib/aiStudioConsolidation.js` | Local deterministic AI assistant | Local deterministic responses | A3-X tests | External AI provider activation not authorized | Does not block closed beta |
| AI provider runtime | BLOCKED_EXTERNAL | AI readiness/provider notes | None live | None | AI readiness tests | Provider keys, governance, safety evidence | Blocks production AI claims |
| Monitoring | BLOCKED_EXTERNAL | `server/src/monitoring/*`, monitoring tooling | Monitoring provider abstraction | Provider-ready only | Monitoring readiness tests | Live Sentry/Better Stack evidence | Blocks production operations |
| Logging | API_IMPLEMENTED_NOT_CONNECTED | `server/src/monitoring/logger.js`, audit logs | Logger/audit services | Local/server scaffold | Backend tests | Log drain/SIEM activation | Blocks production operations |
| Backups | BLOCKED_EXTERNAL | Backup/restore runbooks and DB readiness tooling | Ops readiness | Template only | Database/infrastructure readiness tests | Real backup/restore evidence | Blocks RC-0.6B |
| Security | API_IMPLEMENTED_NOT_CONNECTED | Security middleware/readiness tooling | Security hardening services | Local/server config | Security/readiness tests | OWASP/pen test/live controls | Blocks production certification |
| Compliance | DOCUMENTED_ONLY | Compliance docs/tooling | Compliance readiness | Template/evidence only | Compliance readiness tests | Legal approval and live workflows | Blocks paid pilot |
| Infrastructure | BLOCKED_EXTERNAL | A4 docs/tooling, `docs/program-state.md` | A4 governance | Credential-ready only | A4 tooling tests | Real Supabase project IDs and evidence | Blocks RC-0.6B |
| Support operations | DOCUMENTED_ONLY | Runbooks, support docs, admin pages | Operational readiness | Documentation/local pages | Readiness docs/tests | Real staffed operations evidence | Blocks paid pilot |
| Release certification | BLOCKED_EXTERNAL | `docs/program-state.md`, release readiness tooling | Governance/readiness | Evidence tooling only | Release readiness tests | A4-A5 and downstream activation evidence | Blocks production launch |

## A3-Y Priority

The highest implementation priority is not additional feature breadth. It is proving one core rental journey through one canonical data path while preserving local fallback until backend parity is verified.
