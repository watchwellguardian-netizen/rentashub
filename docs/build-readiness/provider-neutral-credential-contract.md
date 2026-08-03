# S5-ABW-004 Provider-Neutral Credential Contract

Credential values must be stored only in approved secret stores. This file lists names only.

| Component | Selected by | Required credential names | Validation commands | Manual action |
| --- | --- | --- | --- | --- |
| database | `DATABASE_PROVIDER` | `DATABASE_PROVIDER`, `DATABASE_URL`, `DATABASE_SSL_MODE`, `MIGRATION_TARGET_ENV` | `npm run database:readiness`<br>`npm run accel:p1:db-validation` | Provide disposable PostgreSQL/UAT database credentials and execute migrations. |
| authorization | `AUTHZ_POLICY_PROVIDER` | `AUTHZ_POLICY_PROVIDER`, `RLS_VALIDATION_MODE`, `AUTH_TEST_TENANT_IDS` | `npm run a4:governance:rls-rbac`<br>`npm run auth-rbac:api-auth-guard-matrix` | Run RLS policies against executable PostgreSQL/Supabase-compatible runtime. |
| authentication | `AUTH_PROVIDER` | `AUTH_PROVIDER`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `OIDC_CLIENT_SECRET` | `npm run auth-rbac:readiness`<br>`npm run auth-rbac:auth-evidence-report` | Configure live OIDC/Supabase Auth provider, MFA, email verification, and session lifecycle evidence. |
| object-storage | `FILE_STORAGE_PROVIDER` | `FILE_STORAGE_PROVIDER`, `FILE_STORAGE_BUCKET`, `FILE_STORAGE_REGION`, `FILE_STORAGE_ACCESS_KEY`, `FILE_STORAGE_SECRET_KEY` | `npm run storage:readiness`<br>`npm run storage:access-evidence-package` | Provision S3-compatible buckets or Supabase Storage buckets and execute access-denial tests. |
| realtime-events | `EVENT_BUS_PROVIDER` | `EVENT_BUS_PROVIDER`, `REDIS_URL`, `WEBSOCKET_GATEWAY_URL`, `EVENT_CHANNEL_NAMESPACE` | `npm run runtime:evidence`<br>`npm run operations:readiness` | Provide Redis/WebSocket runtime and execute cross-tenant subscription tests. |
| edge-functions | `BACKGROUND_WORKER_PROVIDER` | `BACKGROUND_WORKER_PROVIDER`, `REDIS_URL`, `QUEUE_NAMESPACE`, `JOB_TIMEOUT_SECONDS` | `npm run runtime:evidence`<br>`npm run operations:s5-s3g` | Provide Redis/BullMQ runtime and execute queue processing evidence. |
| observability | `MONITORING_PROVIDER` | `MONITORING_PROVIDER`, `SENTRY_DSN`, `BETTER_STACK_SOURCE_TOKEN`, `ALERT_WEBHOOK_URL` | `npm run monitoring:readiness`<br>`npm run operations:s5-s3g` | Provision telemetry destinations and execute alert notification tests. |

