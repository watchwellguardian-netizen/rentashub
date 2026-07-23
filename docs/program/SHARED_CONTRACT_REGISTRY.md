# Shared Contract Registry

| Contract | Canonical location | Owner | Consumers | Current status | Required before completion |
| --- | --- | --- | --- | --- | --- |
| Identity user | `server/src/auth`, `src/lib/adapters/authAdapter.js` | WS1 | All workstreams | Scaffolded/local | Live Supabase Auth evidence |
| Role and permission | `src/lib/rbac.js`, `server/src/auth/rbacPolicy.js` | WS1 | All workstreams | Local/API scaffold | RLS/RBAC evidence |
| Asset/listing | `src/lib/adapters/assetAdapter.js`, `server/src/repositories/assetRepository.js` | WS2 | WS2, WS4, WS5, WS6 | Local/API-not-connected | Backend canonical path |
| Booking | `src/lib/adapters/bookingAdapter.js`, `server/src/repositories/bookingRepository.js` | WS2 | WS2, WS3, WS6 | Local/API-not-connected | Backend canonical path |
| File metadata | `server/src/files`, `server/src/repositories/fileMetadataRepository.js` | WS1 | All workstreams | Provider-ready | Storage certification |
| Payment intent | `server/src/payments`, `src/lib/paymentLedger.js` | WS3 | WS2, WS4, WS5, WS6 | Simulated | Sandbox provider evidence |
| Ledger entry | `server/src/payments`, revenue readiness tooling | WS3 | WS3, WS5, WS6 | Simulated/provider-ready | Double-entry ledger tests |
| Escrow state | `server/src/escrow`, escrow readiness tooling | WS3 | WS2, WS5, WS6 | Simulated/provider-ready | Legal/provider evidence |
| Audit event | `server/src/audit/auditEventModel.js` | WS1 | All workstreams | Scaffolded | Persistent audit evidence |
| Notification event | `src/lib/notificationFramework.js` | WS6 | All workstreams | Simulated/provider-ready | Provider delivery evidence |
| Feature flag | `src/lib/featureFlags.js` | WS1 | All workstreams | Implemented locally | Environment validation and removal reviews |
