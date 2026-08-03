# RentasHub Standalone

RentasHub is a standalone marketplace foundation for renting, buying, selling, trading, booking, inspecting, reviewing, messaging, and managing assets. This repository is still a pre-production foundation: data is localStorage-based and backend/API migration is prepared but not implemented.

## Requirements

- Node.js 22 LTS.
- npm available in the target environment.

Use `.nvmrc` if your environment supports nvm-compatible version switching.

## Install

```bash
npm install
```

The current CI workflow uses `npm install` so the standalone scaffold can validate cleanly without relying on a local lockfile.

## Test

```bash
npm run test
npm run test:server
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview -- --host 127.0.0.1 --port 4174
```

## Verify

```bash
npm run verify
```

The verification script checks required files, confirms npm is available, runs the production test suite, runs the backend suite, generates the credential readiness report, and runs the production build. Optional route smoke checks are manual for now.

Credential readiness report:

```bash
npm run readiness
```

## Export ZIP

From the parent workspace, compress the standalone folder into:

```text
RentasHub-Standalone-Web-App.zip
```

The ZIP should contain only the standalone RentasHub app, including `package.json`, `.env.example`, `src/`, `docs/`, `tests/`, CI workflow, and verification scripts.

## CI

GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

CI runs:

- `npm install`
- `npm run test`
- `npm run test:server`
- `npm run readiness`
- `npm run build`
- `npm run zip:check`

CI is required before production approval because the current local sandbox does not provide a working normal npm clean-install path.

## Styling Note

RentasHub Standalone uses plain CSS in `src/styles.css`. A local `postcss.config.js` is included to prevent inherited parent Tailwind configuration from processing this standalone app and emitting unrelated Tailwind content warnings.

Brand governance lives in `docs/brand-governance.md`. The active app uses the RentasHub master logo treatment, `Rent. Buy. Sell. Trade. Auction.` tagline, Sora-first typography, and the approved blue/orange/white/navy palette. Legacy or parent-product branding must not be added to user-facing screens.

## Backend Scaffold

The backend scaffold lives in `server/`. It provides a dependency-free Node.js HTTP API scaffold for Module 20:

- `GET /api/health` is implemented.
- Contract skeletons exist for auth, users, assets, bookings, inspections, payments, messages, notifications, suppliers, verifications, reviews, disputes, marketplace, trust, protection, claims, and admin.
- Middleware skeletons exist for RBAC, request validation, security headers, audit logging, 404 responses, and error handling.
- No real database, auth provider, payment processor, KYC provider, insurance provider, escrow provider, deployment, or production security controls are implemented.

Backend tests:

```bash
npm run test:server
```

Database scaffold commands:

```bash
npm run db:check
npm run db:migrate
npm run db:seed
npm run db:reset
```

The persistence layer lives under `server/src/db`, `server/src/repositories`, `server/migrations`, and `server/seeds`. Module 39 adds explicit real-database provider guardrails: JSON remains the default development fallback, SQLite fails clearly until a reviewed driver is installed, and PostgreSQL fails clearly until both `DATABASE_URL` and a reviewed driver are configured. Module 44 selects Supabase PostgreSQL as the production database target and adds Supabase-specific readiness validation plus `GET /api/health/database`. Asset, booking, inspection, message, notification, review, trust, protection, claims, disputes, and payment domains have API pilots, but the full frontend is not fully migrated away from local/demo workflows.

Backend credential readiness:

```text
GET /api/health/readiness
```

This endpoint reports selected providers, missing credential variables, and manual setup gates for database, object storage, payments, escrow, KYC, insurance, notification providers, deployment, and security secrets. It is a configuration readiness report only; it does not prove provider connectivity or production hardening.

Security baseline documentation:

```text
docs/security-hardening-baseline.md
```

Module 41 adds dependency-free baseline controls such as security headers, CORS allowlist support, request IDs, request size limits, controlled JSON parse errors, production-safe error bodies, and in-memory development rate limiting for sensitive routes. Distributed rate limiting, WAF, secrets management, penetration testing, deployment hardening, and provider security reviews remain pending.

Deployment readiness documentation:

```text
docs/deployment-readiness.md
docs/production-launch-checklist.md
```

Module 42 adds staging/production environment templates, Docker readiness files, CI artifact checks, and operations checklists for DNS/TLS, rollback, backup/restore, monitoring, audit review, and release approval. It does not deploy the app or activate real providers.

Supabase Storage activation readiness:

```text
server/docs/supabase-storage-activation.md
```

Module 45 selects Supabase Storage as the recommended object storage provider and documents required public/private buckets. Local placeholder storage remains the default until real Supabase credentials and bucket policies are supplied and tested.

Production certification audit:

```text
docs/production-certification-report.md
docs/final-gap-register.md
docs/release-decision-matrix.md
docs/phase-2-production-activation-roadmap.md
```

Module 43 classifies RentasHub as suitable for demo release and conditional private/internal testing, but not public production launch.
The Phase 2 activation roadmap moves the remaining blockers to credential-level handoff: real PostgreSQL, object storage, API auth migration, payment provider activation, monitoring, security certification, and pilot launch operations.

## Frontend Adapter Layer

Module 23 adds `src/lib/adapters/` as a controlled frontend migration boundary. Module 27 routes asset/listing UI flows through `assetAdapter` while keeping local mode behavior unchanged.

Default frontend data mode:

```text
VITE_DATA_MODE=local
```

`VITE_DATA_MODE=api` is a domain-by-domain API pilot. Assets, bookings, inspections, messages, notifications, reviews, trust, protection, and claims have controlled API-capable adapters. Protected writes now prefer stored backend bearer auth from the frontend auth migration and use development role headers only as a local/demo fallback.

Module 29 adds an asset-only API pilot. When `VITE_DATA_MODE=api` and `VITE_API_BASE_URL` are explicitly set, `assetAdapter` can call backend `/api/assets` endpoints for asset list, detail, create, update, and soft delete. Protected asset writes prefer bearer auth when `VITE_AUTH_MODE=api` has an active backend token.

Module 30 adds a booking-only API pilot. With the same explicit API data mode, `bookingAdapter` can call backend `/api/bookings` endpoints for booking list, detail, create, and status update. Protected booking writes also prefer bearer auth when available.

## Frontend Auth Bridge

Module 36 migrates the frontend auth bridge so `src/lib/adapters/authAdapter.js` can use backend auth endpoints when explicitly enabled.

Default auth mode:

```text
VITE_AUTH_MODE=local
```

Local demo review users remain enabled in local mode. API auth mode is available only when explicitly configured and does not silently authenticate users without a backend session.

API auth pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_AUTH_MODE=api
```

In API auth mode, the login screen can call backend register, login, logout, me, and refresh endpoints. Local demo review users are disabled in API auth mode. Token storage remains a development-stage browser boundary and is not a production security implementation.

Supabase auth activation readiness:

```text
docs/supabase-auth-activation.md
```

Module 46 selects Supabase Auth as the production authentication target. `VITE_AUTH_MODE=supabase` is guarded and does not silently fall back to demo users. Live Supabase Auth still requires real credentials, email verification, password reset, JWT/session validation, refresh token behavior, session revocation, and dev-header lockdown testing.

## Current Known Risks

- Backend is partially implemented as an API scaffold and pilot layer, but it is not a production backend.
- Many current frontend workflows remain localStorage-based.
- Frontend auth can use backend auth in explicit API mode, but production security hardening is incomplete and development role headers remain as a local/demo fallback.
- Credential-level readiness checks exist in `server/src/config/integrationReadiness.js`, `GET /api/health/readiness`, and `docs/production-credential-readiness.md`.
- Disputes are API-pilot capable, but dispute handling is simulated and does not perform legal mediation, refunds, payout, arbitration, or escrow.
- File metadata foundation exists, but real upload/storage providers are not integrated.
- Database provider abstraction exists, but active local persistence still defaults to JSON fallback. Explicit SQLite/PostgreSQL modes do not silently fall back and require reviewed drivers/configuration.
- No real database server is active.
- No binary object storage is active.
- No real payment processor is active.
- No escrow provider is active.
- No insurance/KYC integrations are active.
- No production deployment.
- No production security review.
- Clean `npm install`/`npm ci` remains pending locally if npm is unavailable, and must pass in CI or a proper Node/npm environment.

See `docs/production-credential-readiness.md` for the credential-level handoff checklist.
See `docs/phase-2-production-activation-roadmap.md` for the recommended Module 44-50 production activation sequence.