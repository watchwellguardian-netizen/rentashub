# ADR 0002: Supabase Selected for Project A Infrastructure Activation

Status: Accepted

Date: 2026-06-16

Owner: Architecture / DevOps

## Context

Project A requires real persistence, authentication, file storage, and environment separation. The selected provider needs PostgreSQL, Auth, Storage, backups, and enough operational maturity for staged activation.

## Decision

RentasHub will use Supabase for Project A activation:

- Supabase PostgreSQL for persistent data.
- Supabase Auth for authentication and sessions.
- Supabase Storage for public assets and private evidence buckets.

## Options Considered

| Option | Benefits | Tradeoffs | Decision |
| --- | --- | --- | --- |
| Supabase | Integrated Postgres/Auth/Storage, fast staging setup | Requires careful service-role key controls and RLS verification | Accepted |
| Neon plus separate auth/storage | Strong Postgres option | More provider integration overhead | Rejected for Project A |
| AWS RDS plus custom auth/storage | Enterprise control | Slower operational setup for current stage | Deferred |

## Consequences

- A4 evidence must prove separate Development, UAT, and Production projects.
- Migrations 004 through 007 must execute against Development and UAT before Production.
- Service-role keys must never appear in frontend bundles, docs, ZIP artifacts, commits, chat, or screenshots.

## Validation

- Project IDs are provided without secrets.
- Secrets are stored only in approved secret stores.
- RLS/RBAC, Auth, Storage, backup, and restore evidence packages pass.

## Rollback or Reversal

If Supabase fails certification, the provider decision must return to architecture review and a replacement Postgres/Auth/Storage path must be documented in a new ADR.

## References

- Related docs: `docs/supabase-environment-inventory.md`, `docs/supabase-persistence-certification-checklist.md`
- Related gate: A4-01 through A4-05
