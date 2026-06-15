# Phase 3 Production Activation Program

Status: Activation Master Roadmap

This program replaces additional planning modules. RentasHub is no longer in software design mode; it is in activation, validation, and certification mode.

Do not treat this document as public launch approval. Public launch remains blocked until the activation projects below are completed and re-certified.

## Executive Position

Investor Demo: GO

Internal Testing: GO

Supplier Pilot: GO

Closed Beta: Conditional GO

Paid Pilot: NO-GO

Public Launch: NO-GO

## Wave 1 - Core Platform Activation

Objective: remove the largest live-platform blockers first.

### Project A - Supabase Activation

Target:

- Live PostgreSQL.
- Live Supabase Auth.
- Live Supabase Storage.
- Database backup validation.
- Restore testing.

Required assets:

- Supabase account.
- Supabase project.
- PostgreSQL `DATABASE_URL`.
- Supabase URL.
- Supabase anon key.
- Supabase service role key.
- Storage bucket names.
- Backup retention policy.

Exit criteria:

- `DATABASE_PROVIDER=postgres` works against Supabase PostgreSQL.
- Migrations run against staging database.
- Backup and restore test is documented.
- Supabase Auth keys are present and non-placeholder.
- Supabase Storage buckets exist with public/private policies.
- Local/demo fallback remains available for development only.

### Project D - Monitoring Activation

Target:

- Sentry.
- Better Stack.
- Alert routing.
- Incident management.

Exit criteria:

- Frontend/backend error tracking configured.
- Uptime checks active.
- Alert owner and escalation route configured.
- Test incident event delivered.
- Monitoring status appears in readiness output.

### Project E - Infrastructure Deployment

Target:

- Staging environment.
- DNS.
- TLS.
- CDN.
- Backups.
- Disaster recovery.

Exit criteria:

- Staging URL is live.
- DNS and TLS are configured.
- CDN/caching policy is documented.
- Rollback runbook is tested.
- Backup and recovery plan is validated.

Wave 1 exit condition: RentasHub runs as a live operational platform in staging.

## Wave 2 - Commercial Activation

Objective: prepare real commercial transaction capability.

### Project B - Payment Activation

Recommended providers:

- Stripe Connect as primary international provider.
- WiPay for Jamaica.
- Lynk Business for Jamaica.
- NCB Merchant APIs for Jamaica.

Exit criteria:

- Provider account approved.
- Sandbox credentials configured.
- Webhook validation completed.
- Merchant onboarding flow documented.
- Refund, payout, settlement, and reconciliation tests completed.
- No live customer charges until paid pilot approval.

### Project C - Escrow Activation

Target:

- Legal escrow/deposit structure.
- Deposit management.
- Release workflows.
- Dispute workflows.

Exit criteria:

- Escrow/deposit legal review completed.
- Trust account or provider model approved.
- Deposit hold/release policy approved.
- Dispute workflow linked to claims, inspections, and evidence.
- Live funds handling approved only after executive/legal signoff.

Wave 2 exit condition: RentasHub can safely support real commercial transactions.

## Wave 3 - Certification And Launch

Objective: complete formal launch approval package.

### Project F - Security Certification

Target:

- Penetration testing.
- OWASP review.
- Secrets audit.
- Dependency audit.
- RBAC review.
- Remediation.

Exit criteria:

- Security review completed.
- Penetration test completed or formally waived by executive risk owner.
- Secrets and dependency audits completed.
- High/critical findings remediated or formally accepted.
- Final production certification review is updated.

Wave 3 exit condition: formal production approval package.

## Launch Gates

### Gate 1 - Closed Beta GO

Requires:

- Supabase active.
- Monitoring active.
- Staging active.

### Gate 2 - Paid Pilot GO

Requires:

- Payments active.
- Escrow approved.
- Support operations active.
- Security review substantially complete.

### Gate 3 - Public Launch GO

Requires:

- All Phase 3 projects complete.
- Legal/compliance signoff.
- Executive approval.
- Production certification review updated from NO-GO to GO.

## Current Activation Status

Wave 1: Ready to start, blocked on Supabase and monitoring/infrastructure credentials.

Wave 2: Not started, blocked on payment provider, escrow/legal, and Wave 1 completion.

Wave 3: Not started, blocked on live environment and formal security reviewer access.

Overall status: Phase 3 is ready to start, but live activation cannot begin without external accounts, credentials, provider setup, DNS/hosting access, and assigned operational owners.
