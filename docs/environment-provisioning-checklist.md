# A4-PREP-01 Environment Provisioning Checklist

Status: Final infrastructure-preparation checklist. This document does not provision environments, activate Supabase, run migrations, configure secrets, deploy production, or certify RentasHub as production ready.

## Purpose

Prepare the evidence and execution checklist required to move from `RC-0.6A Infrastructure Activation Hold` toward A4-01 through A4-05 execution once real Supabase access is available.

## Domain Inventory

| Environment | Frontend domain | API domain | Status |
| --- | --- | --- | --- |
| Development | To be assigned | To be assigned | Pending |
| UAT/Staging | To be assigned | To be assigned | Pending |
| Production | To be assigned | To be assigned | Pending |

Required decisions:

- Primary production domain.
- Staging/UAT subdomain.
- API subdomain strategy.
- Redirect URLs for Supabase Auth.
- Status page domain, if used.

## DNS Requirements

- DNS provider identified.
- Domain owner identified.
- DNS administrator identified.
- Frontend hosting records planned.
- Backend/API hosting records planned.
- TLS/SSL certificate approach planned.
- CDN strategy planned, if applicable.
- Rollback DNS TTL strategy defined.
- Production DNS changes blocked until UAT signoff.

## Environment Variable Inventory

Environment variables must be configured through approved secret stores or hosting environment settings only.

| Variable | Development | UAT/Staging | Production | Notes |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Required | Required | Required | `development`, `staging`, `production`. |
| `DATABASE_PROVIDER` | Required | Required | Required | Expected `postgres` after activation. |
| `DATABASE_POSTGRES_VENDOR` | Required | Required | Required | Expected `supabase`. |
| `DATABASE_URL` | Secret | Secret | Secret | Never commit or paste into chat. |
| `AUTH_PROVIDER` | Required | Required | Required | Expected `supabase` after activation. |
| `SUPABASE_URL` | Secret-managed | Secret-managed | Secret-managed | Project URL only through approved config. |
| `SUPABASE_ANON_KEY` | Secret-managed | Secret-managed | Secret-managed | Browser-safe only where approved. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret only | Server secret only | Server secret only | Never frontend, docs, chat, or ZIP. |
| `FILE_STORAGE_PROVIDER` | Required | Required | Required | Expected `supabase`. |
| `CORS_ALLOWED_ORIGINS` | Required | Required | Required | Must be environment-specific. |
| `AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION` | Required | Required | Required | Must be true for production. |

## Secret Inventory

Required secret categories:

- Supabase database connection string.
- Supabase anon key.
- Supabase service role key.
- Supabase JWT/Auth secret if required by validation approach.
- Session/auth token secrets.
- App encryption secret, if enabled.
- Monitoring credentials after B3.
- Payment/escrow credentials only after revenue activation is authorized.

Approved storage only:

- GitHub Actions Secrets.
- Hosting provider encrypted environment variables.
- CI/CD secret store.
- Managed secret vault.

Prohibited locations:

- Chat.
- Source code.
- Documentation.
- ZIP artifacts.
- Screenshots.
- Git commits.
- Frontend `VITE_` variables for service role keys or server-only secrets.

## Supabase Setup Checklist

### A4-01 Ownership

- Supabase account exists.
- Supabase organization exists.
- Infrastructure owner identified.
- Billing owner identified.
- Access owner identified.
- Development project created.
- UAT/Staging project created.
- Production project created.
- Project names and IDs recorded.
- No secrets included in evidence package.

### A4-02 Provisioning

- Separate Supabase URLs confirmed.
- Separate PostgreSQL databases confirmed.
- Separate Auth configurations confirmed.
- Separate storage buckets confirmed.
- Separate anon keys confirmed.
- Separate service role keys confirmed.
- Development credentials stored securely.
- UAT credentials stored securely.
- Production credentials stored securely but not used for migration before signoff.
- Access control reviewed.

## Migration Execution Checklist

Environment order:

1. Development.
2. UAT/Staging.
3. Production only after UAT signoff.

Migrations:

- `004_supabase_activation_architecture.sql`
- `005_supabase_auth_rbac_activation.sql`
- `006_supabase_storage_activation.sql`
- `007_audit_logging_activation.sql`

Evidence required:

- Migration command/result.
- Timestamp.
- Environment.
- Project ID.
- Migration version recorded.
- Tables created.
- Indexes created.
- Constraints valid.
- RLS enabled.
- Audit fields present.
- Production untouched until signoff.

## Rollback Checklist

- Rollback owner identified.
- Last known good migration state recorded.
- Backup exists before migration.
- Destructive migration risk reviewed.
- Rollback script or forward-fix plan documented.
- Data owner approval required for destructive rollback.
- Recovery environment identified.
- Smoke tests defined after rollback.

## UAT Acceptance Checklist

UAT cannot pass until evidence proves:

- Development migrations pass.
- UAT migrations pass.
- Production remains untouched.
- Persistence works for customer, supplier, dealer/broker, inspector, transport provider, financing partner, and admin.
- CRUD works where supported.
- Soft delete/restore works where supported.
- RLS/RBAC denies cross-role and cross-tenant access.
- Admin access works and is audited.
- Supabase Auth registration, login, logout, password reset, email verification, session refresh, and session revocation are validated.
- Storage buckets are created and access policies verified.
- Private buckets reject public access.
- Backup and restore are tested.
- Secrets exposure scan passes.

## Production Promotion Checklist

Production remains blocked until:

- UAT signoff is complete.
- Technical owner approves.
- Security owner approves.
- Compliance owner approves.
- Operations/DevOps owner approves.
- Executive sponsor approves.
- Backup/restore evidence is accepted.
- Secrets exposure certification is accepted.
- Monitoring activation plan is ready.
- Rollback path is approved.
- Production migration window is scheduled.

## Evidence Package Checklist

### A4-01 Evidence

- Development Project Name.
- Development Project ID.
- UAT/Staging Project Name.
- UAT/Staging Project ID.
- Production Project Name.
- Production Project ID.
- Infrastructure Owner.
- Billing Owner.
- Access Owner.
- Blockers, if any.

### A4-02 Evidence

- Project accessibility confirmation.
- Environment mapping.
- Secret storage confirmation.
- Auth/storage/database separation confirmation.
- Production isolation confirmation.

### A4-03 Evidence

- Migration 004 result.
- Migration 005 result.
- Migration 006 result.
- Migration 007 result.
- Development/UAT evidence only.
- Production untouched confirmation.

### A4-04 Evidence

- Persistence validation.
- RLS/RBAC validation.
- Supabase Auth validation.
- Storage validation.
- Backup/restore validation.
- Secrets exposure certification.

### A4-05 Evidence

- Consolidated execution review.
- Pass/fail recommendation.
- Open defects.
- Remediation plan, if needed.
- RC-0.6B recommendation only if all evidence passes.

## Stop Condition

After this checklist is created, no further RentasHub governance, feature, AI, auction, marketplace, analytics, or documentation work should proceed until either:

- A4-01 Infrastructure Ownership Confirmation is submitted, or
- a true blocker/defect is discovered.
