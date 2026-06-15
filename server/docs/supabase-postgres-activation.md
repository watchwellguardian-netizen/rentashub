# Supabase PostgreSQL Activation

Module 44 selects Supabase PostgreSQL as the production database target. This module prepares RentasHub for Supabase activation up to credential readiness. It does not claim a live database is active unless real Supabase credentials are supplied, migrations are executed, and smoke checks pass.

## Current Status

- Selected provider: Supabase PostgreSQL.
- Local/default provider: JSON fallback for demo and restricted environments.
- Production target: `DATABASE_PROVIDER=postgres`.
- Real activation status: credential-ready only until a valid Supabase `DATABASE_URL` and reviewed PostgreSQL driver are supplied.
- Silent fallback rule: if `DATABASE_PROVIDER=postgres` is explicitly selected, RentasHub must fail clearly instead of falling back to JSON.

## Required Supabase Setup

1. Create a Supabase project.
2. Open Project Settings > Database.
3. Copy the pooled PostgreSQL connection string for application traffic.
4. Store the connection string only in the deployment secret manager.
5. Configure staging first.
6. Run migrations against staging.
7. Run seed only in development or staging.
8. Run API smoke checks.
9. Confirm backups, point-in-time recovery plan, and rollback procedure.
10. Promote the same process to production only after staging passes.

## Required Environment

```text
DATABASE_PROVIDER=postgres
DATABASE_POSTGRES_VENDOR=supabase
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Optional tracking values:

```text
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_DB_POOLING_MODE=transaction
```

Do not commit real values. Do not paste real passwords into docs, screenshots, tickets, or chat.

## Validation Rules

The Module 44 provider guard checks:

- `DATABASE_PROVIDER=postgres` is explicit.
- `DATABASE_URL` exists.
- `DATABASE_URL` is not a placeholder.
- `DATABASE_URL` uses `postgres://` or `postgresql://`.
- `DATABASE_URL` includes username, password, and host.
- Supabase mode points to a Supabase database or pooler host.
- A reviewed PostgreSQL driver is installed before connection attempts.

If any requirement fails, the provider returns a controlled error and no JSON fallback is used.

## Migration Commands

```bash
npm run db:check
npm run db:migrate
npm run db:seed
```

Expected behavior before credentials and driver are supplied:

```text
provider=postgres
target=supabase-postgresql
blocked_missing_config_or_driver
No silent fallback was used.
```

Expected behavior after credentials and driver are supplied in a proper environment:

```text
provider=postgres
migrated <n> migration(s)
seeded <n> record(s)
```

## Connection Test

Use:

```bash
npm run db:check
```

API readiness endpoint:

```text
GET /api/health/database
GET /api/health/readiness
```

`/api/health/database` returns `503` while Supabase is selected but credentials or driver are missing. It returns `200` only after the configured provider is available.

## Seed Rules

- Seed demo data only in development or staging.
- Do not seed production without explicit approval.
- Never seed production with demo passwords, demo supplier records, simulated payments, or local-only users.

## Rollback Instructions

Before running a migration:

1. Confirm latest Supabase backup.
2. Export a schema snapshot.
3. Record current migration version.
4. Run migration in staging first.
5. Verify read/write smoke checks.
6. If production migration fails, stop writes, restore from the latest approved backup or run the tested rollback script, and record the incident in audit notes.

Do not run:

```bash
npm run db:reset
```

against staging or production unless a backup has been verified and `RENTASHUB_CONFIRM_DB_RESET=YES` is explicitly approved for that environment.

## Production Database Checklist

- Supabase project created.
- Staging and production separated.
- `DATABASE_URL` stored in secret manager.
- PostgreSQL driver installed and reviewed.
- Migrations pass on disposable database.
- Migrations pass on staging.
- Seed pass limited to staging/demo.
- API health database check passes.
- Readiness API reports `provider=postgres`.
- Backups enabled.
- Restore tested.
- Connection pooling selected.
- SSL required.
- Audit-log retention approved.
- Data migration plan approved.
- Rollback plan tested.

## Remaining Manual Gates

- Real Supabase credentials.
- PostgreSQL driver installation in a proper Node/npm environment.
- Migration execution against Supabase.
- Backup/restore verification.
- Production cutover approval.
