# Rate Limit Configuration Matrix

Status: Draft security readiness artifact.

This matrix defines target rate-limit controls for staging validation. Distributed production rate limiting remains inactive until a provider is selected and configured.

| Surface | Suggested window | Suggested limit | Key | Action |
| --- | ---: | ---: | --- | --- |
| Auth login | 15 minutes | 10 attempts | IP + email | Block and audit `auth_failure_spike`. |
| Auth register | 60 minutes | 5 attempts | IP | Block and audit suspicious signup velocity. |
| Password reset | 60 minutes | 5 attempts | IP + email | Return generic response. |
| File upload intent | 10 minutes | 30 attempts | user ID | Block and audit storage abuse. |
| Payment intent | 10 minutes | 20 attempts | user ID | Block and audit payment abuse. |
| Auction bid simulation | 1 minute | 60 attempts | user ID + auction ID | Throttle and audit bid velocity. |
| Admin mutations | 10 minutes | 100 attempts | admin user ID | Alert on suspicious admin activity. |
| Search | 1 minute | 120 attempts | IP/session | Throttle with friendly response. |
| Messaging | 1 minute | 30 attempts | user ID | Throttle and audit spam risk. |

## Provider-Ready Requirements

- Use in-memory limits only for local development.
- Use distributed rate limiting for staging and production.
- Store rate-limit events in audit logs.
- Alert on repeated block events.
- Never leak whether an email address exists in auth or reset responses.

## Boundary

This matrix does not activate WAF, CDN rate limiting, Redis, edge middleware, or external abuse-protection providers.
