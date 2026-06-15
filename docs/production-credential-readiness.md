# Production Credential Readiness

This pass moves the remaining open workstreams to a credential-level readiness stage where possible. It does not activate real providers, deployment, escrow, payments, KYC, insurance, or production security.

## Current Auth Stage

Frontend login can use backend auth in explicit API mode:

```text
VITE_AUTH_MODE=api
VITE_DATA_MODE=api
VITE_API_BASE_URL=<backend origin>
```

This remains a development foundation. Production security hardening, secure token strategy, real deployment, and full domain migration remain pending.

## Credential Readiness Endpoint

Backend readiness is available at:

```text
GET /api/health/readiness
```

The route reports:

- active provider selections
- missing credential variables
- workstream stage
- manual setup requirements

It verifies configuration presence only. It does not prove provider connectivity, payment settlement, file upload safety, KYC review, insurance coverage, escrow, compliance, deployment reliability, or production security.

Credential readiness can also be generated from the command line:

```bash
npm run readiness
```

CI now runs this report after frontend/backend tests and before build. To intentionally fail when real provider credentials are missing, run:

```bash
RENTASHUB_REQUIRE_CREDENTIALS=1 npm run readiness
```

The admin dashboard also exposes a credential-level readiness section so remaining manual gates are visible to operators during review.

## Manual Credential Gates

The Phase 2 activation sequence is tracked in `docs/phase-2-production-activation-roadmap.md`. It records the remaining infrastructure blockers, recommended providers, required credentials, and Module 44-50 activation order.

### Supabase Authentication

Current state: local/demo auth remains default, backend API auth foundation exists, and Supabase auth is selected for production activation readiness.

Credential stage:

```text
AUTH_PROVIDER=supabase
VITE_AUTH_MODE=supabase
SUPABASE_URL=<project URL>
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
SUPABASE_JWT_SECRET=<placeholder if required>
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_PASSWORD_RESET_ENABLED=true
AUTH_REFRESH_TOKEN_ROTATION=true
AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true
```

Real activation still needs Supabase SDK/session integration, JWT validation, email verification, password reset redirects, refresh token behavior, session revocation, and production dev-header lockdown testing. See `docs/supabase-auth-activation.md`.

### Payments

Current state: simulated ledger and credential-level provider gates exist, but no real processor is active.

Recommended Jamaica providers: WiPay, Lynk Business, and NCB payment APIs. Recommended international provider: Stripe Connect.

Credential stage requires one selected provider:

```text
PAYMENT_PROVIDER=stripe|paypal|wipay|lynk|ncb|jn
PAYMENT_MODE=simulated|provider
PAYMENT_PUBLIC_KEY=<provider public key>
PAYMENT_SECRET_KEY=<provider secret key>
PLATFORM_FEE_PERCENTAGE=10
PAYOUT_MODE=simulated|provider
```

Required credentials are listed in `server/.env.example`. Real activation still needs provider SDK/client implementation, webhook verification, idempotency keys, reconciliation jobs, refund/chargeback flows, and payout controls.

### Disputes

Current state: dispute API pilot exists.

Dispute handling remains simulated. No legal mediation, arbitration, payout, refund, escrow, or binding resolution is active. Production activation still needs policy design, evidence workflow, admin permissions, legal review, and provider/payment integration where financial outcomes are involved.

### Broader Admin Moderation

Current state: admin foundations and credential-readiness summaries exist for listings, bookings, verifications, reviews, claims, risk, disputes, and remaining provider gates.

Production readiness still needs moderation policy, queue ownership, audit exports, escalation permissions, retention rules, and operational runbooks.

### Real Database Activation

Current state: JSON provider remains the fallback. SQLite/PostgreSQL are configured as future providers. Explicit SQLite/PostgreSQL selection fails clearly if the required driver or configuration is missing; no silent fallback to JSON is used.

Recommended production database providers: Supabase PostgreSQL, Neon, or Amazon RDS.

Credential stage:

```text
DATABASE_PROVIDER=sqlite|postgres
DATABASE_URL=<database connection string>
```

Real activation still needs driver installation, migrations against the target database, seed validation, backup policy, connection pooling, migration rollback strategy, deployment database access rules, and data migration from local/browser state. JSON is not a production database.

### Object Storage

Current state: file metadata exists; binary upload is not active.

Recommended object storage providers: Supabase Storage or Amazon S3-compatible storage.

Credential stage:

```text
FILE_STORAGE_PROVIDER=local_placeholder|s3|cloudinary|supabase
FILE_STORAGE_BUCKET=<bucket>
FILE_STORAGE_REGION=<region>
FILE_STORAGE_ACCESS_KEY=<access key>
FILE_STORAGE_SECRET_KEY=<secret key>
FILE_STORAGE_PUBLIC_BASE_URL=<optional CDN/base URL>
FILE_STORAGE_SIGNED_URL_TTL_SECONDS=900
FILE_UPLOAD_MAX_MB=10
FILE_REQUIRE_VIRUS_SCAN=true
SUPABASE_URL=<project URL>
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
FILE_STORAGE_BUCKET_PUBLIC_ASSETS=public-assets
FILE_STORAGE_BUCKET_SUPPLIER_LOGOS=supplier-logos
FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION=private-verification
FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS=private-inspections
FILE_STORAGE_BUCKET_PRIVATE_CLAIMS=private-claims
FILE_STORAGE_BUCKET_PRIVATE_DISPUTES=private-disputes
```

Supabase Storage is selected for Module 45. Real activation still needs provider SDK/client implementation, binary upload handling, signed URLs, private bucket policy, virus scanning, retention lifecycle, encryption settings, CDN/public asset policy, and document access review. See `server/docs/supabase-storage-activation.md` and `server/docs/object-storage-readiness.md`.

### Payment Processor / Escrow

Current state: no real payment processor or escrow provider is active.

Credential stage:

```text
ESCROW_PROVIDER=stripe_connect|escrow_provider
ESCROW_API_KEY=<escrow key>
```

Real activation still needs escrow workflow design, release/refund rules, dispute integration, ledger reconciliation, payout verification, and legal review.

Escrow should connect to inspections, claims, disputes, protection selections, trust scores, and payment ledger reconciliation before any protected transaction is offered live.

### KYC / Insurance

Current state: verification and protection/claims workflows are simulated.

Credential stage:

```text
KYC_PROVIDER=persona|onfido|alloy
INSURANCE_PROVIDER=insurance_api
```

Real activation still needs provider contracts, document handling, secure object storage, webhook verification, underwriting rules, claims rules, and privacy/compliance review.

### Deployment

Current state: local/CI/ZIP only.

Credential stage:

```text
DEPLOYMENT_PROVIDER=vercel|render|railway|aws
APP_BASE_URL=<public app URL>
CORS_ORIGIN=<allowed frontend origin>
```

Real activation still needs hosting account access, DNS, TLS/SSL, environment secrets, monitoring, logging, alerting, backups, rollback strategy, and uptime checks.

Recommended monitoring providers for activation: Sentry or Better Stack.

### Production Security Review

Credential stage requires:

```text
AUTH_TOKEN_SECRET=<strong secret>
SESSION_SECRET=<strong secret>
SESSION_COOKIE_SECRET=<strong secret>
APP_ENCRYPTION_KEY=<strong key>
PAYMENT_SECRET_KEY=<provider secret key>
ESCROW_API_KEY=<escrow key>
FILE_STORAGE_SECRET_KEY=<storage secret key>
DATABASE_URL=<database connection string>
CORS_ALLOWED_ORIGINS=<comma-separated allowed origins>
```

Real hardening still needs secure cookie/session strategy, CSRF/XSS review, distributed rate limiting, WAF rules, secrets rotation, audit review, penetration testing, dependency scanning, data retention policy, and incident response planning. Module 41 adds an in-memory development rate limiter and baseline checks only.

### Clean Install Confirmation

Current state: CI workflow exists. Clean install remains pending until GitHub Actions or another proper Node/npm environment confirms it.

Required command set:

```bash
npm install
npm run test
npm run test:server
npm run build
```

Do not approve production release until clean install passes outside the current local sandbox.
