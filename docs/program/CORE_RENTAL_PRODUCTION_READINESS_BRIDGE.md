# ACCEL-P1-008 Core Rental Production-Readiness Bridge

Status: Provider-ready only. Not activated.

## Purpose

ACCEL-P1-008 prepares the completed provider-independent rental lifecycle for later PostgreSQL, Supabase Auth, Supabase Storage, payment sandbox, and staging validation. It does not connect to providers, run migrations, execute RLS, process money, or validate staging.

## Bridge Components

| Component | Status | Evidence |
|---|---|---|
| Database adapter contract | Prepared not connected | `server/src/services/coreRentalProductionBridge.js` |
| PostgreSQL/Supabase migration bridge | Prepared not executed | `server/migrations/008_core_rental_production_readiness_bridge.sql`, `supabase/migrations/008_core_rental_production_readiness_bridge.sql` |
| Auth bridge contract | Prepared, live Auth disabled | `server/src/services/coreRentalProductionBridge.js` |
| RLS policy matrix | Prepared, enforcement not proven | `server/src/services/coreRentalProductionBridge.js`, migration 008 |
| Storage bridge manifest | Prepared, buckets not activated | `server/src/services/coreRentalProductionBridge.js`, migration 008 |
| Payment sandbox bridge | Contract prepared, provider disabled | `server/src/services/coreRentalProductionBridge.js` |
| Staging journey plan | Prepared, not executed | `server/src/services/coreRentalProductionBridge.js` |

## Required Later Evidence

- PostgreSQL migration execution log.
- Repeatable reset and seed log.
- Schema fingerprint before and after reset.
- RLS cross-role and cross-tenant denial proof.
- Supabase Auth registration, login, logout, password reset, email verification, MFA, session refresh, and revocation proof.
- Supabase Storage bucket creation, upload, download, signed URL, expiry, and unauthorized denial proof.
- Payment sandbox authorization, webhook, failure, refund, and ledger proof.
- Staging journey execution evidence.

## Boundary

This bridge remains classified as `PROVIDER_READY_NOT_ACTIVATED`.

It must not be used to claim PostgreSQL persistence, RLS enforcement, live Supabase Auth, live storage, payment activation, staging validation, closed-beta readiness, or production readiness.
