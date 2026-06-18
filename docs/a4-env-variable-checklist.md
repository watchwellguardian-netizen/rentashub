# A4 Environment Variable Checklist

Status: Variable-name checklist only.

Use this checklist to verify required variable names by environment and launch stage. Do not include values in this document.

Legend:

- Required now: needed for A4 credential-readiness or local safe mode.
- Required before closed beta: needed before live UAT/closed beta infrastructure approval.
- Required before paid pilot: needed before revenue-generating activity.
- Required before public launch: needed before public production launch.

## Frontend Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `VITE_AUTH_MODE` | Yes | Yes | Yes | Yes |
| `VITE_SUPABASE_URL` | No | Yes | Yes | Yes |
| `VITE_SUPABASE_ANON_KEY` | No | Yes | Yes | Yes |
| `VITE_APP_ENV` | Yes | Yes | Yes | Yes |

## Backend Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `APP_ENV` | Yes | Yes | Yes | Yes |
| `NODE_ENV` | Yes | Yes | Yes | Yes |
| `PORT` | No | Yes | Yes | Yes |
| `CORS_ALLOWED_ORIGINS` | No | Yes | Yes | Yes |
| `AUTH_TOKEN_SECRET` | No | Yes | Yes | Yes |
| `SESSION_SECRET` | No | Yes | Yes | Yes |
| `APP_ENCRYPTION_KEY` | No | Yes | Yes | Yes |

## Supabase Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `DATABASE_PROVIDER` | Yes | Yes | Yes | Yes |
| `DATABASE_POSTGRES_VENDOR` | Yes | Yes | Yes | Yes |
| `DATABASE_URL` | No | Yes | Yes | Yes |
| `AUTH_PROVIDER` | Yes | Yes | Yes | Yes |
| `SUPABASE_URL` | No | Yes | Yes | Yes |
| `SUPABASE_ANON_KEY` | No | Yes | Yes | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Yes | Yes | Yes |
| `SUPABASE_JWT_SECRET` | No | Yes | Yes | Yes |

## Storage Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `FILE_STORAGE_PROVIDER` | Yes | Yes | Yes | Yes |
| `FILE_STORAGE_BUCKET_PUBLIC_ASSETS` | No | Yes | Yes | Yes |
| `FILE_STORAGE_BUCKET_SUPPLIER_LOGOS` | No | Yes | Yes | Yes |
| `FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION` | No | Yes | Yes | Yes |
| `FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS` | No | Yes | Yes | Yes |
| `FILE_STORAGE_BUCKET_PRIVATE_CLAIMS` | No | Yes | Yes | Yes |
| `FILE_STORAGE_BUCKET_PRIVATE_DISPUTES` | No | Yes | Yes | Yes |
| `FILE_STORAGE_SIGNED_URL_TTL_SECONDS` | No | Yes | Yes | Yes |
| `FILE_UPLOAD_MAX_MB` | Yes | Yes | Yes | Yes |
| `FILE_REQUIRE_VIRUS_SCAN` | No | Yes | Yes | Yes |

## Monitoring Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `MONITORING_PROVIDER` | Yes | Yes | Yes | Yes |
| `SENTRY_DSN` | No | Yes | Yes | Yes |
| `SENTRY_ENVIRONMENT` | No | Yes | Yes | Yes |
| `SENTRY_RELEASE` | No | Yes | Yes | Yes |
| `BETTER_STACK_API_KEY` | No | Yes | Yes | Yes |
| `BETTER_STACK_HEARTBEAT_URL` | No | Yes | Yes | Yes |
| `BETTER_STACK_STATUS_PAGE_ID` | No | No | Yes | Yes |
| `LOG_LEVEL` | Yes | Yes | Yes | Yes |
| `LOG_DRAIN_URL` | No | Yes | Yes | Yes |
| `ALERT_EMAIL` | No | Yes | Yes | Yes |
| `ALERT_SMS` | No | No | Yes | Yes |
| `INCIDENT_OWNER_NAME` | No | Yes | Yes | Yes |
| `INCIDENT_OWNER_EMAIL` | No | Yes | Yes | Yes |

## Payment Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `PAYMENT_PROVIDER` | No | No | Yes | Yes |
| `PAYMENT_MODE` | No | No | Yes | Yes |
| `PAYMENT_SANDBOX_ENABLED` | No | No | Yes | Yes |
| `PAYMENT_WEBHOOK_SECRET` | No | No | Yes | Yes |
| `PAYMENT_SECRET_KEY` | No | No | Yes | Yes |
| `PAYMENT_OPERATIONS_OWNER` | No | No | Yes | Yes |
| `PAYMENT_COMPLIANCE_OWNER` | No | No | Yes | Yes |

## Escrow Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `ESCROW_PROVIDER` | No | No | Yes | Yes |
| `ESCROW_MODE` | No | No | Yes | Yes |
| `ESCROW_API_KEY` | No | No | Yes | Yes |
| `ESCROW_OPERATIONS_OWNER` | No | No | Yes | Yes |
| `ESCROW_LEGAL_OWNER` | No | No | Yes | Yes |
| `ESCROW_DISPUTE_OWNER` | No | No | Yes | Yes |
| `ESCROW_RELEASE_POLICY_URL` | No | No | Yes | Yes |
| `ESCROW_DISPUTE_POLICY_URL` | No | No | Yes | Yes |
| `ESCROW_SETTLEMENT_CURRENCY` | No | No | Yes | Yes |

## Security Variables

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | Yes | Yes | Yes | Yes |
| `AUTH_PASSWORD_RESET_ENABLED` | Yes | Yes | Yes | Yes |
| `AUTH_REFRESH_TOKEN_ROTATION` | Yes | Yes | Yes | Yes |
| `AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION` | Yes | Yes | Yes | Yes |
| `SECURITY_MFA_PROVIDER` | No | Yes | Yes | Yes |
| `SECURITY_SESSION_COOKIE_POLICY` | No | Yes | Yes | Yes |
| `SECURITY_SESSION_REVOCATION` | No | Yes | Yes | Yes |
| `SECURITY_CSP_POLICY` | No | Yes | Yes | Yes |
| `SECURITY_RATE_LIMIT_POLICY` | No | Yes | Yes | Yes |
| `SECURITY_ABUSE_PROTECTION_PROVIDER` | No | No | Yes | Yes |
| `SECURITY_DEPENDENCY_AUDIT_TOOL` | No | Yes | Yes | Yes |
| `SECURITY_VULNERABILITY_SCAN_PROVIDER` | No | No | Yes | Yes |

## No-Values Rule

This checklist must contain variable names only. Values belong only in approved secret stores, hosting environment settings, or CI/CD secret stores.
