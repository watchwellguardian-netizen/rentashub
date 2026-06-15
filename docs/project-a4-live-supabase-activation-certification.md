# Project A4 - Live Supabase Activation & Certification

Status: Approved activation program. Live activation is pending credentials and environment access.

Project A4 certifies that RentasHub can operate with real persistence, real authentication, real storage, and separated environments before any downstream monitoring, security, compliance, or revenue activation is treated as operational.

## Scope Boundary

This program does not activate production by itself. It does not publish public traffic, process payments, enable escrow, activate KYC, or certify public launch readiness.

Production Supabase migration is blocked until UAT signoff is complete.

## Stage 1 - Environment Provisioning

Goal: Create and verify separate Supabase environments.

Required environments:

- Development Supabase project.
- UAT/Staging Supabase project.
- Production Supabase project.

Required separation:

- Separate Supabase URLs.
- Separate PostgreSQL databases.
- Separate storage buckets.
- Separate Auth configurations.
- Separate anon keys.
- Separate service role keys.
- Separate redirect URLs.
- Separate backup policies.
- Separate access-control assignments.

Verification:

- Environment inventory documented.
- Account owner documented.
- Billing owner documented.
- Technical administrator documented.
- Access controls verified.
- Service role keys stored only in backend/server secrets.
- No service role key in frontend env, source, docs, screenshots, chat, or ZIP artifacts.

Exit criteria:

- Environment inventory approved.
- Secrets storage approved.
- Development and UAT access verified.
- Production access restricted and not migrated before UAT signoff.

## Stage 2 - PostgreSQL Activation

Goal: Execute approved migrations and certify persistence.

Run against Development and UAT first:

- `004_supabase_activation_architecture.sql`
- `005_supabase_auth_rbac_activation.sql`
- `006_supabase_storage_activation.sql`
- `007_audit_logging_activation.sql`

Do not run Production until UAT signoff.

Validation:

- Tables created.
- Indexes created.
- Constraints valid.
- RLS enabled.
- Audit fields present.
- Migration versions recorded.
- Rollback plan reviewed.

Seed testing:

- Customer.
- Supplier.
- Dealer.
- Inspector.
- Transport provider.
- Financing partner.
- Admin.

CRUD and permission validation:

- Customer can access own records only.
- Supplier can access own listings/bookings only.
- Dealer/broker permissions match RBAC matrix.
- Inspector records are scoped to assigned inspections.
- Transport provider records are scoped to assigned transport requests.
- Financing partner records are scoped to assigned referrals.
- Admin access is audited.
- Tenant isolation is verified.

Backup and restore:

- Backup database.
- Restore database.
- Validate restored row counts.
- Validate key relationship integrity.
- Validate audit record integrity.
- Record recovery duration.

Exit criteria:

- Persistence certification passed in Development.
- Persistence certification passed in UAT.
- Backup and restore test passed.
- Production migration remains blocked until UAT signoff.

## Stage 3 - Supabase Auth Activation

Goal: Prove real user authentication, session lifecycle, and RBAC mapping.

Required configuration:

- `AUTH_PROVIDER=supabase`.
- Supabase email/password auth enabled.
- Email verification configured.
- Password reset redirect configured.
- Session validation configured.
- Refresh-token strategy reviewed.
- Role metadata mapping prepared.
- Dev-header production lockdown verified.

Role validation:

- Customer/user/guest.
- Supplier/vendor.
- Broker/dealer.
- Inspector.
- Transport provider.
- Financing partner.
- Admin.

Validation:

- Registration works in Development and UAT.
- Login works in Development and UAT.
- Logout clears session.
- Password reset works.
- Email verification works.
- Expired session is rejected.
- Revoked session is rejected where supported.
- Role aliases normalize correctly.
- Protected frontend routes remain protected.
- Protected API write routes prefer bearer auth.
- Dev headers are disabled in production configuration.

Exit criteria:

- Auth certification passed in Development.
- Auth certification passed in UAT.
- RBAC/RLS alignment approved.
- Production Auth activation remains blocked until UAT signoff.

## Stage 4 - Supabase Storage Activation

Goal: Prove real file/object storage with public and private bucket controls.

Required buckets:

- `public-assets`.
- `supplier-logos`.
- `private-verification`.
- `private-inspections`.
- `private-claims`.
- `private-disputes`.

Bucket policy:

- Public: `public-assets`, optionally `supplier-logos`.
- Private: `private-verification`, `private-inspections`, `private-claims`, `private-disputes`.

Validation:

- Asset photo upload succeeds.
- Supplier logo upload succeeds.
- Verification document upload remains private.
- Inspection evidence upload remains private.
- Claim evidence upload remains private.
- Dispute evidence upload remains private.
- Signed URL generation works for private files.
- Public access is rejected for private buckets.
- Metadata and storage object references match.
- Storage audit events are recorded.

Exit criteria:

- Storage certification passed in Development.
- Storage certification passed in UAT.
- Private bucket policy verified.
- Production Storage activation remains blocked until UAT signoff.

## Stage 5 - Environment and Secrets Certification

Goal: Verify safe secrets management and environment separation.

Required checks:

- `SUPABASE_SERVICE_ROLE_KEY` stored only in backend/server secret locations.
- Frontend bundle does not contain service role key.
- Repository scan has no Supabase secrets.
- ZIP artifacts contain no Supabase secrets.
- CI/CD masks secret values.
- Access to secrets is restricted to authorized administrators.
- Rotation procedure is documented.
- Emergency revoke process is documented.

Exit criteria:

- Secrets certification passed.
- Environment separation passed.
- Production credentials remain restricted.

## Stage 6 - UAT Signoff and Production Hold

Goal: Decide whether Supabase activation can move from UAT to Production.

Required UAT evidence:

- Frontend tests pass.
- Backend tests pass.
- Readiness CLI passes.
- Production build passes.
- HTTP smoke tests pass.
- Operational simulation suite passes.
- PostgreSQL certification passes.
- Auth certification passes.
- Storage certification passes.
- Backup/restore certification passes.
- Secrets certification passes.

Production hold:

Production activation is NO-GO until UAT signoff is approved by the technical administrator, security owner, compliance owner, and executive sponsor.

## Project A4 Exit Decision

GO:

- Development and UAT Supabase activation certified.
- Backup/restore certified.
- Secrets and environment separation certified.
- UAT signoff complete.

NO-GO:

- Any certification stage incomplete.
- Any service role key exposure.
- Any private bucket exposure.
- Any failed backup/restore test.
- Any unresolved critical RBAC/RLS finding.

## Post-A4 Sequence

After Project A4 passes:

1. Monitoring activation.
2. Security hardening validation.
3. Compliance activation.
4. Revenue activation.

Until Project A4 passes, downstream activation remains blocked.
