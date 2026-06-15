# Phase 2 Production Activation Roadmap

This roadmap completes the remaining blockers to the credential-level stage where coding can responsibly stop without real provider accounts, secrets, contracts, hosting, or production operations access. It does not activate live infrastructure, payments, escrow, KYC, insurance, object storage, deployment, or a production security certification.

## Current Position

RentasHub has the core marketplace architecture, backend/API foundation, adapter pilots, credential readiness reporting, deployment documentation, and final certification audit. The remaining blockers are now infrastructure and operations workstreams rather than ordinary product features.

At this stage, each critical blocker needs provider selection, real credentials, environment configuration, smoke testing, policy approval, and operational ownership before live use.

## Credential-Level Blockers

| Blocker | Severity | Current state | Target state | Recommended providers | Coding complete to credential level | Manual/external intervention still required |
|---|---|---|---|---|---|---|
| Real database | Critical | JSON fallback is active locally | PostgreSQL-backed persistence | Supabase PostgreSQL, Neon, Amazon RDS | Provider guardrails, repositories, migrations, seed/reset commands, readiness reporting | Provision database, set `DATABASE_PROVIDER=postgres`, set `DATABASE_URL`, run migrations, run backup/restore test, approve data migration |
| Object storage | Critical | File metadata only | Private/public object storage for asset photos, verification documents, inspection photos, claims evidence, dispute evidence, supplier logos | Supabase Storage, Amazon S3-compatible storage | Storage provider factory, upload-intent contract, metadata model, readiness reporting | Create buckets, configure policies, provide access keys, implement signed URLs, configure virus scanning, approve retention policy |
| Authentication | Critical | Backend auth exists; frontend can use API auth mode; local demo remains default | Live login, registration, JWT or approved session tokens, refresh tokens, password reset, email verification, session revocation | Backend auth service plus transactional email provider | Auth service, password hashing, expiring development token, frontend API-auth bridge, token boundary | Provide strong secrets, decide token/cookie strategy, configure email provider, implement reset/email verification delivery, remove dev-header fallback from live environments |
| Payment infrastructure | Critical | Simulated ledger, wallet, earnings, payout placeholders | Provider-backed payments, refunds, chargebacks, payouts, reconciliation | Jamaica: WiPay, Lynk Business, NCB payment APIs. International: Stripe Connect | Payment provider abstraction, simulated provider, readiness gates, payment API endpoints | Open merchant/provider accounts, provide keys/webhooks, implement provider SDK calls, certify reconciliation, approve finance operations |
| Escrow | High | Escrow credential gates and placeholders exist | Escrow-backed hold/release/refund workflow tied to inspections, claims, disputes, and trust | Stripe Connect escrow-like flows where compliant, or a dedicated escrow provider | Escrow readiness checks and payment architecture hooks | Select provider, approve legal terms, implement release/refund rules, integrate dispute outcomes, certify ledger reconciliation |
| Monitoring | High | Readiness/checklist only | Uptime, error, performance, API failure, and alerting coverage | Sentry, Better Stack | Deployment readiness docs and health/readiness endpoints | Create monitoring accounts, set DSN/API keys, define alert owners, configure dashboards, run incident drills |

## Required Credential Gates

### Database

Required environment values:

```text
DATABASE_PROVIDER=postgres
DATABASE_URL=<provider connection string>
```

Activation checklist:

- Provision Supabase PostgreSQL, Neon, Amazon RDS, or an approved PostgreSQL service.
- Run migrations against the target database.
- Load seed data only in staging or approved demo environments.
- Confirm connection pooling, SSL mode, backup schedule, and restore process.
- Document rollback and data migration plan.

### Object Storage

Required environment values:

```text
FILE_STORAGE_PROVIDER=s3|supabase
FILE_STORAGE_BUCKET=<bucket>
FILE_STORAGE_REGION=<region or provider region>
FILE_STORAGE_ACCESS_KEY=<access key>
FILE_STORAGE_SECRET_KEY=<secret key>
FILE_STORAGE_PUBLIC_BASE_URL=<optional CDN/base URL>
FILE_STORAGE_SIGNED_URL_TTL_SECONDS=900
FILE_REQUIRE_VIRUS_SCAN=true
```

Activation checklist:

- Create separate buckets or prefixes for public asset images and private documents.
- Keep verification, KYC, claims, dispute, and inspection evidence private.
- Add signed URL generation.
- Add virus/malware scanning before files are trusted.
- Approve retention and deletion lifecycle.

### Authentication

Required environment values:

```text
AUTH_TOKEN_SECRET=<strong rotated secret>
SESSION_SECRET=<strong rotated secret>
SESSION_COOKIE_SECRET=<strong rotated secret>
APP_ENCRYPTION_KEY=<strong key>
VITE_AUTH_MODE=api
VITE_API_BASE_URL=<backend origin>
```

Activation checklist:

- Decide whether live sessions use bearer tokens, secure HTTP-only cookies, or a hybrid strategy.
- Implement refresh-token rotation and session revocation.
- Configure password reset delivery through an approved email provider.
- Add email verification before trusted marketplace activity.
- Disable development role headers in live environments.

### Payments

Required environment values:

```text
PAYMENT_PROVIDER=stripe|wipay|lynk|ncb
PAYMENT_MODE=provider
PAYMENT_PUBLIC_KEY=<provider public key>
PAYMENT_SECRET_KEY=<provider secret key>
PLATFORM_FEE_PERCENTAGE=10
PAYOUT_MODE=provider
```

Activation checklist:

- Open provider accounts and complete business verification.
- Implement provider SDK/client calls.
- Add webhook signature verification.
- Add idempotency keys for payment intents and payout requests.
- Add reconciliation reports for ledger, processor, and bank settlement.
- Add refund, chargeback, and failed-payment handling.

### Escrow

Required environment values:

```text
ESCROW_PROVIDER=<approved escrow or compliant payment flow>
ESCROW_API_KEY=<provider key>
```

Activation checklist:

- Confirm escrow legality and terms in each launch jurisdiction.
- Define hold, release, refund, dispute, inspection, and claim triggers.
- Connect escrow events to audit logs and payment ledger.
- Confirm payout timing and supplier communication.

### Monitoring

Required environment values:

```text
MONITORING_PROVIDER=sentry|better_stack
SENTRY_DSN=<dsn if selected>
BETTER_STACK_API_KEY=<api key if selected>
```

Activation checklist:

- Configure uptime checks for frontend, backend health, and backend readiness.
- Add error tracking for frontend and backend.
- Add alert routing and on-call owner.
- Add dashboard for API failures, payment failures, auth failures, file failures, and database failures.

## Phase 2 Module Sequence

### Module 44 - Production Database Activation

Goal: activate Supabase PostgreSQL in staging first, then production only after migration and restore tests pass.

Required result: backend repositories use PostgreSQL through the provider layer, JSON remains a local-only fallback, and readiness reports the live database provider. Without Supabase credentials, this module stops at credential-readiness with clear failure for missing or placeholder `DATABASE_URL`.

### Module 45 - Object Storage Activation

Goal: activate Supabase Storage for real file objects.

Required result: asset photos, verification documents, inspection evidence, claims evidence, dispute evidence, and supplier logos use provider-backed storage with private/public access rules. Without Supabase credentials and bucket names, this module stops at credential-readiness with clear failure for missing credentials or private-bucket policy gaps.

### Module 46 - Frontend Authentication Migration

Goal: make Supabase Auth the normal staging/live path.

Required result: login, registration, session restore, logout, refresh, password reset, email verification, JWT validation, refresh token rotation, and session revocation are Supabase-backed. Local demo auth remains development-only.

### Module 47 - Payment Provider Activation

Goal: activate one payment provider in a controlled sandbox first.

Required result: provider-backed payment intents, webhooks, ledger reconciliation, refund placeholders converted to provider-aware flows, and clear separation between sandbox and live modes.

### Module 48 - Monitoring & Observability

Goal: activate provider-backed monitoring and alerting.

Required result: uptime checks, error tracking, API failure dashboards, alert owners, incident runbook, and readiness visibility.

### Module 49 - Production Security Certification

Goal: complete an external or owner-approved production security certification process.

Required result: OWASP review, penetration test, secret rotation, dependency review, audit-log review, data privacy review, and documented remediation.

### Module 50 - Pilot Launch Readiness

Goal: prepare a controlled first market launch.

Required result: first 20 suppliers, first 100 customers, support SOPs, dispute SOPs, payment/escrow SOPs, incident response owner, and go/no-go review.

## Launch Position After This Pass

- Demo release: still eligible.
- Private/internal testing: still eligible with conditions.
- Paid pilot: remains blocked until database, auth, payments, monitoring, backups, object storage, and legal/security reviews are complete.
- Public launch: remains blocked until all critical gaps in `docs/final-gap-register.md` are closed and verified.

This roadmap is the handoff from product-feature building to production activation. It should be updated as each Phase 2 module closes.
