# Project B1 - Monitoring Architecture

Status: Provider-ready only.

Project B1 prepares RentasHub for monitoring activation after Supabase credential-level work. It does not activate live Sentry SDK capture, Better Stack uptime checks, log drains, status page publishing, alert delivery, or on-call routing.

## Provider Strategy

Recommended production monitoring stack:

- Sentry: frontend/backend error tracking, release health, performance tracing, and grouped exceptions.
- Better Stack: uptime checks, heartbeat monitoring, log routing, status pages, and alert routing.

Supported configuration:

```text
MONITORING_PROVIDER=none|sentry|better_stack|sentry_better_stack
SENTRY_DSN=
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=
MONITORING_TRACE_SAMPLE_RATE=0.1
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
ERROR_RATE_ALERT_THRESHOLD_PERCENT=1
P95_LATENCY_MS_ALERT_THRESHOLD=750
UPTIME_CHECK_INTERVAL_SECONDS=60
```

Placeholder, empty, `example`, `your-*`, and `<required>` values are treated as missing.

## Sentry-Ready Error Tracking

Target events:

- Unhandled frontend errors.
- Backend controlled errors and 5xx responses.
- Auth/session failures.
- Storage/database/payment provider failures.
- Admin/security sensitive actions.

Rules:

- Do not send secrets, service role keys, payment keys, cookies, bearer tokens, DSNs, or database URLs.
- Link events with request ID/correlation ID.
- Attach release/environment metadata.
- Keep live SDK activation blocked until dependencies, credentials, sampling, and staging verification are complete.

## Structured Logging

Current foundation:

- Request start/end logs.
- Request ID correlation.
- Secret redaction.
- Incident event logging.
- Payment/security/admin/provider event flagging path.

Production activation requires:

- `LOG_DRAIN_URL`.
- Log retention policy.
- Redaction review.
- Operational access controls.
- Audit review cadence.

## Health Checks

Required health checks:

| Target | Route | Expected result |
|---|---|---|
| Frontend | `/` | HTTP 200 from deployed frontend |
| API health | `/api/health` | HTTP 200 and service status |
| API readiness | `/api/health/readiness` | Credential and dependency readiness |
| Observability | `/api/health/observability` | Monitoring provider/readiness status |

Better Stack should monitor all four in staging before closed beta.

## Performance Monitoring

Initial budget targets:

| Metric | Target |
|---|---:|
| API p95 latency | <= 750 ms |
| API p99 latency | <= 1500 ms |
| API error rate | <= 1% |
| Frontend LCP | <= 2500 ms |
| Frontend INP | <= 200 ms |
| Uptime target | >= 99.5% |

These are readiness targets only until real traffic, live monitoring, and load testing validate them.

## Alert Routing Plan

Severity routing:

| Severity | Meaning | Response target | Routing |
|---|---|---|---|
| SEV1 | Critical outage or data/security incident | 15 minutes | SMS, email, on-call owner |
| SEV2 | Major degraded workflow | 1 hour | Email and team channel |
| SEV3 | Limited issue or non-critical regression | 1 business day | Triage queue |
| SEV4 | Informational readiness warning | Release review | Backlog |

`ALERT_EMAIL`, `ALERT_SMS`, `INCIDENT_OWNER_NAME`, `INCIDENT_OWNER_EMAIL`, and `ALERT_ROUTING_POLICY_URL` are required before production monitoring approval.

## Incident Severity Matrix

SEV1 examples:

- Site unavailable.
- Auth outage.
- Private file exposure.
- Payment/security incident.
- Database write failure affecting active users.

SEV2 examples:

- Booking or auction workflow failure spike.
- Storage upload failure spike.
- Provider webhook failure.
- Admin moderation outage.

SEV3 examples:

- Single route failure.
- Slow endpoint.
- Broken non-critical report.

SEV4 examples:

- Missing credential readiness warning.
- Placeholder provider state.
- Non-production smoke warning.

## Environment-Aware Monitoring

Local/demo:

- `MONITORING_PROVIDER=none`.
- No external event delivery.
- Local structured logs only.

Staging:

- `MONITORING_PROVIDER=sentry_better_stack`.
- Sentry staging environment.
- Better Stack staging uptime checks.
- Test events allowed but marked non-production.

Production:

- Separate Sentry environment and release.
- Better Stack production checks.
- Alert routing and incident owner verified.
- Log drain active.
- Security review complete.

## Activation Sequence

1. Create Sentry organization/projects.
2. Create Better Stack uptime checks and status page.
3. Store credentials in backend/server secrets only.
4. Set monitoring environment variables in staging.
5. Verify `/api/health/observability`.
6. Trigger `POST /api/monitoring/test-event` as admin in staging.
7. Confirm no secrets appear in logs/events.
8. Verify alert routing with a controlled test.
9. Approve production monitoring after incident owner and routing are confirmed.

## Completion Criteria

Project B1 credential-ready completion:

- Monitoring architecture is documented.
- Sentry/Better Stack readiness is represented in code.
- Health checks, performance budgets, alert routing, and severity matrix are testable.
- Observability endpoint reports monitoring architecture.
- Tests, build, smoke, and ZIP pass.

Live monitoring activation is complete only after:

- Real Sentry/Better Stack credentials are supplied through secure secrets management.
- SDK/log/heartbeat integrations are installed and tested in staging.
- Alerts are delivered to approved owners.
- Status page and uptime checks are verified.
- No secrets are leaked in event payloads or logs.
