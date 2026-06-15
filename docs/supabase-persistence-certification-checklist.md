# Supabase Persistence Certification Checklist

Status: Required before UAT signoff.

## Migration Execution

- [ ] Development migrations executed.
- [ ] UAT migrations executed.
- [ ] Production migrations held until UAT signoff.
- [ ] `004_supabase_activation_architecture.sql` executed.
- [ ] `005_supabase_auth_rbac_activation.sql` executed.
- [ ] `006_supabase_storage_activation.sql` executed.
- [ ] `007_audit_logging_activation.sql` executed.
- [ ] Migration version recorded.
- [ ] Rollback process rehearsed.

## Schema Validation

- [ ] Tables created.
- [ ] Indexes created.
- [ ] Constraints valid.
- [ ] RLS enabled.
- [ ] Audit fields present.
- [ ] Tenant isolation fields present.
- [ ] Storage metadata references validated.

## Seed Validation

- [ ] Customer created.
- [ ] Supplier created.
- [ ] Dealer/broker created.
- [ ] Inspector created.
- [ ] Transport provider created.
- [ ] Financing partner created.
- [ ] Admin created.

## Permission Validation

- [ ] Customer own-record access passed.
- [ ] Supplier own-listing access passed.
- [ ] Dealer/broker access passed.
- [ ] Inspector assignment scoping passed.
- [ ] Transport provider assignment scoping passed.
- [ ] Financing partner assignment scoping passed.
- [ ] Admin access audited.
- [ ] Cross-tenant access rejected.

## Backup and Restore

- [ ] Backup created.
- [ ] Restore executed.
- [ ] Restored row counts validated.
- [ ] Relationship integrity validated.
- [ ] Audit integrity validated.
- [ ] Recovery duration documented.

## Certification Decision

- Development persistence certification: Pending.
- UAT persistence certification: Pending.
- Production migration authorization: NO-GO until UAT certification passes.
