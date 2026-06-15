# Monitoring & Observability Readiness

Module 47 prepared RentasHub for production monitoring and incident response. Project B1 adds the monitoring architecture contract for Sentry-ready error tracking, structured logging, health checks, performance monitoring, alert routing, environment-aware configuration, and incident severity. It does not activate live monitoring, does not install a browser or server SDK, and does not send real alerts until valid provider credentials and staging checks are supplied.

Current Project B1 implementation files:

- `server/src/monitoring/monitoringArchitecture.js`
- `docs/project-b-monitoring-architecture.md`
- `server/tests/monitoring-architecture.test.mjs`
- `tests/production/monitoring-architecture.test.mjs`

## Selected Providers

- Sentry: recommended for frontend/backend error tracking, release health, and performance tracing.
- Better Stack: recommended for uptime checks, heartbeat monitoring, logs, status page, and alert routing.

Supported provider values:

```env
MONITORING_PROVIDER=none
MONITORING_PROVIDER=sentry
MONITORING_PROVIDER=better_stack
MONITORING_PROVIDER=sentry_better_stack
```

`none` remains the safe default for local/demo mode.

## Required Environment Variables

```env
MONITORING_PROVIDER=none|sentry|better_stack|sentry_better_stack
SENTRY_DSN=
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=
BETTER_STACK_API_KEY=
BETTER_STACK_HEARTBEAT_URL=
BETTER_STACK_STATUS_PAGE_ID=
LOG_LEVEL=info
LOG_DRAIN_URL=
ALERT_EMAIL=
ALERT_SMS=
ALERT_ROUTING_POLICY_URL=
INCIDENT_OWNER_NAME=
INCIDENT_OWNER_EMAIL=
MONITORING_TRACE_SAMPLE_RATE=0.1
ERROR_RATE_ALERT_THRESHOLD_PERCENT=1
P95_LATENCY_MS_ALERT_THRESHOLD=750
UPTIME_CHECK_INTERVAL_SECONDS=60
```

Placeholder, example, empty, and `your-*` values are treated as missing. Credential presence is not enough for production approval; staging delivery, alert routing, and incident drills must be verified.

## Sentry Setup Guide

1. Create a Sentry organization and project for the frontend.
2. Create a second Sentry project for the backend API, or use a clear project naming convention.
3. Copy the DSN into `SENTRY_DSN`.
4. Set `SENTRY_ENVIRONMENT=staging` or `production`.
5. Set `SENTRY_RELEASE` from the CI build version or git SHA.
6. Verify errors are grouped without exposing secrets, passwords, tokens, payment keys, or private file metadata.
7. Add browser/server SDKs only after dependencies are installed and tested in CI.

## Better Stack Setup Guide

1. Create a Better Stack team and status page.
2. Create uptime checks for:
   - Frontend app URL.
   - Backend `/api/health`.
   - Backend `/api/health/readiness`.
   - Backend `/api/health/observability`.
3. Create a heartbeat monitor for scheduled jobs and deployment checks.
4. Copy the API key into `BETTER_STACK_API_KEY`.
5. Copy the heartbeat URL into `BETTER_STACK_HEARTBEAT_URL`.
6. Set `BETTER_STACK_STATUS_PAGE_ID` if a public/private status page is used.
7. Configure alert routing to email/SMS/on-call channels.

## Uptime Checklist

- Frontend health URL is reachable over HTTPS.
- API health URL is reachable over HTTPS.
- Readiness endpoint reports provider status without leaking secrets.
- Observability endpoint reports monitoring readiness.
- Database, storage, payment, auth, and deployment readiness are checked separately.
- Failed checks notify the incident owner before any external pilot.

## Logging Guidance

- Logs must include request ID/correlation ID.
- Logs must not print secret values, bearer tokens, service role keys, payment keys, database URLs, cookies, passwords, or DSNs.
- Payment, security, admin, provider webhook, database, and storage events should be flagged as high-signal operational events.
- `LOG_DRAIN_URL` is required before production deployment.
- Define log retention by environment:
  - Local/demo: developer-only short retention.
  - Staging: enough retention for debugging release candidates.
  - Production: retention aligned with privacy, legal, audit, and incident response policies.

## Alert Routing

At least one of `ALERT_EMAIL` or `ALERT_SMS` must be configured for monitoring readiness. `INCIDENT_OWNER_NAME` and `INCIDENT_OWNER_EMAIL` must identify the accountable owner.

Recommended routing:

- Severity 1: immediate SMS/email/on-call page.
- Severity 2: email plus team channel.
- Severity 3: daily triage queue.
- Severity 4: backlog and release review.

## Incident Event Types

The backend monitoring scaffold recognizes:

- `auth_failure_spike`
- `payment_failure_spike`
- `storage_failure`
- `database_failure`
- `api_5xx_spike`
- `provider_webhook_failure`
- `suspicious_admin_activity`

`POST /api/monitoring/test-event` creates a dev-safe incident event for admin/protected testing. It does not send real alerts until provider clients and credentials are implemented and verified.
No real alert is sent by this placeholder endpoint in the credential-ready state.

## Incident Response Process

1. Confirm incident severity and owner.
2. Preserve request IDs, timestamps, affected user IDs, and provider event IDs.
3. Check auth, database, storage, payment, and deployment readiness status.
4. Decide whether to rollback, disable provider integration, pause writes, or put the app into maintenance mode.
5. Communicate status through the approved status page or manual stakeholder channel.
6. Document root cause, timeline, customer impact, remediation, and follow-up controls.

## Production Monitoring Checklist

- Sentry DSN configured and verified in staging.
- Better Stack API key and heartbeat configured and verified in staging.
- Uptime checks cover frontend, backend health, readiness, and observability.
- Log drain configured with secret redaction reviewed.
- Incident owner and alert route configured.
- Payment/security/admin events reviewed for high-signal logging.
- No secrets appear in logs or error payloads.
- On-call process and severity definitions are approved.
- Incident drill completed.

## Project B1 Architecture Additions

Project B1 adds a testable provider matrix, health check target list, performance budgets, alert routing channels, and incident severity matrix to the backend readiness model. `/api/health/observability` reports this architecture metadata through `monitoring.architecture`.

The current architecture is provider-ready only. Real SDK capture, heartbeat pings, log drains, status page updates, and alert delivery remain blocked until credentials and staging verification are supplied.

## Current Module 47 Status

Monitoring is credential-ready only. Live Sentry SDK capture, Better Stack log drains, heartbeat pings, status page updates, and real alert delivery remain pending until credentials, provider accounts, dependencies, staging verification, and explicit approval are supplied.
