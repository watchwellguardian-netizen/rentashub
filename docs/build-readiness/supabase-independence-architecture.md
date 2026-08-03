# S5-ABW-004 Supabase Independence Foundation

Status: SUPABASE_REPLACEMENT_FOUNDATION_READY
Production ready: NO
Live Supabase required: NO

## Executive Architecture Decision

RentasHub should depend on open standards and replaceable providers, while retaining Supabase compatibility as one possible PostgreSQL/Auth/Storage implementation.

RentasHub should treat Supabase as an optional provider implementation, not the platform boundary. The platform boundary is defined by open, replaceable contracts:

- PostgreSQL-compatible persistence and migration contracts.
- OIDC/JWKS-compatible authentication and session contracts.
- S3-compatible object storage and signed URL contracts.
- Redis/BullMQ-compatible queue and worker contracts.
- Internal domain events, audit logs, and tenant-scoped event fanout contracts.
- Structured observability, health, readiness, and incident-evidence contracts.

## Replacement Component Matrix

| Component | Replaces | Default mode | Production mode | Status | Credential env names |
| --- | --- | --- | --- | --- | --- |
| database | Supabase Postgres, Supabase Data API | json | postgres | READY_LOCAL | `DATABASE_PROVIDER`, `DATABASE_URL`, `DATABASE_SSL_MODE`, `MIGRATION_TARGET_ENV` |
| authorization | Supabase RLS, Supabase PostgREST role grants | application_policy | postgres_rls_plus_application_policy | READY_LOCAL | `AUTHZ_POLICY_PROVIDER`, `RLS_VALIDATION_MODE`, `AUTH_TEST_TENANT_IDS` |
| authentication | Supabase Auth | local | oidc | READY_LOCAL | `AUTH_PROVIDER`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `OIDC_CLIENT_SECRET` |
| object-storage | Supabase Storage | local_placeholder | s3 | READY_LOCAL | `FILE_STORAGE_PROVIDER`, `FILE_STORAGE_BUCKET`, `FILE_STORAGE_REGION`, `FILE_STORAGE_ACCESS_KEY`, `FILE_STORAGE_SECRET_KEY` |
| realtime-events | Supabase Realtime | local_event_log | redis_streams_or_websocket_gateway | READY_LOCAL | `EVENT_BUS_PROVIDER`, `REDIS_URL`, `WEBSOCKET_GATEWAY_URL`, `EVENT_CHANNEL_NAMESPACE` |
| edge-functions | Supabase Edge Functions | local_worker | bullmq | READY_LOCAL | `BACKGROUND_WORKER_PROVIDER`, `REDIS_URL`, `QUEUE_NAMESPACE`, `JOB_TIMEOUT_SECONDS` |
| observability | Supabase Logs, Supabase dashboard evidence | local_logs | sentry_better_stack | READY_LOCAL | `MONITORING_PROVIDER`, `SENTRY_DSN`, `BETTER_STACK_SOURCE_TOKEN`, `ALERT_WEBHOOK_URL` |

## Fail-Closed Rules

- database: DATABASE_PROVIDER=postgres must fail when DATABASE_URL or reviewed driver/runtime execution is absent.
- authorization: Production authorization must not rely on role-only checks; tenant and ownership predicates are mandatory.
- authentication: AUTH_PROVIDER=oidc must fail when issuer, audience, JWKS URL, or client ID is missing.
- object-storage: Private evidence files must never be routed to public buckets; signed URL TTL must be bounded.
- realtime-events: Tenant event channels must include tenant-scoped names and deny cross-tenant subscriptions.
- edge-functions: Production jobs must be idempotent and tenant-scoped, with retry, timeout, DLQ, and poison-message handling.
- observability: Production readiness must fail without live alert routing and incident notification evidence.

## Manual Intervention Still Required

- Executable PostgreSQL runtime for migration/RLS evidence.
- OIDC/Auth provider credentials for live authentication evidence.
- S3-compatible or Supabase Storage credentials for object access evidence.
- Redis/BullMQ runtime for realtime/events/background execution evidence.
- Telemetry destination credentials for alerting evidence.
- Legal/security/operations approval before production launch.

## Boundaries

- This foundation does not connect to Supabase.
- This foundation does not install provider SDKs or load credentials.
- This foundation does not run migrations against a live database.
- This foundation does not certify production readiness.
