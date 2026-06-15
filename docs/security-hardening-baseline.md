# Security Hardening Baseline

Module 41 adds baseline security controls and readiness checks for RentasHub. This is not a production security certification, penetration test, compliance review, or deployment approval.

## Threat Model Summary

Primary assets to protect:

- user accounts and sessions
- supplier verification and KYC metadata
- asset, booking, inspection, claim, dispute, and review records
- simulated payment ledger and future payment references
- file metadata and future object storage paths
- admin moderation and risk controls
- audit logs

Primary threat categories:

- account takeover
- broken access control
- injection or malformed JSON requests
- abusive login, reset, upload-intent, payment-intent, and admin mutation traffic
- file upload abuse
- payment/escrow fraud
- data leakage through errors, logs, CORS, or public file links
- destructive admin actions or unreviewed provider activation

## Baseline Controls Added

- Security headers include content type protection, frame denial, referrer policy, basic content security policy, and permissions policy.
- CORS supports an environment allowlist through `CORS_ALLOWED_ORIGINS` or `CORS_ORIGIN`.
- Request IDs are attached to API responses through `X-Request-ID`.
- JSON parse errors are controlled.
- Request body size limits are enforced by the router.
- Production-mode errors do not include stack traces.
- In-memory development rate limits are applied to auth login/register, password reset placeholders, file upload intent, payment intent, and admin mutation routes.
- Protected mutations continue writing audit-log records through the repository layer where domain services are implemented.
- Credential readiness flags placeholder or missing secrets.

## Auth And Session Risks

Current backend auth uses development-safe signed tokens and local session persistence. Production still needs:

- strong `AUTH_TOKEN_SECRET`
- secure cookie/session strategy
- token rotation
- refresh token revocation policy
- MFA/passkey evaluation
- brute-force protection backed by shared infrastructure
- account lockout and recovery policy
- audit review for login, logout, and failed login events

## API Authorization Risks

RBAC foundations exist, but production still needs:

- backend-only authorization checks on every resource action
- object-level ownership checks
- no reliance on development `x-user-role` or `x-user-id` headers
- automated tests for direct URL/API access
- audit events for all protected mutations
- admin permission separation by action

## Data Privacy Risks

Sensitive records should be minimized and encrypted where appropriate. Production still needs:

- privacy classification by table/entity
- retention policy
- deletion/anonymization workflow
- access log review
- secure backup handling
- stale localStorage migration cleanup

## Payment And Escrow Risk

Payments remain simulated. Before real provider activation:

- never store card or bank data
- use provider-hosted/payment-token flows
- verify webhooks
- add idempotency keys
- reconcile ledger records
- implement refund, chargeback, payout, and escrow release controls
- complete legal and financial review

## File Upload Risk

File metadata exists and object storage is provider-ready only. Before binary uploads:

- use private buckets by default
- generate short-lived signed URLs
- validate MIME type, extension, checksum, size, and owner
- scan files for malware
- quarantine rejected files
- restrict KYC, verification, dispute, claim, and inspection evidence
- add retention lifecycle and deletion workflow

## KYC And Insurance Risk

Verification, KYC, insurance, and protection remain simulated/readiness-only. Production still needs:

- provider contracts
- secure document storage
- webhook verification
- privacy review
- underwriting/claims rules
- manual review and escalation procedures

## Logging And Audit Requirements

Audit logs should capture:

- actor ID and role
- request ID
- action
- entity type and ID
- timestamp
- status/result
- non-sensitive metadata

Logs must not include passwords, tokens, card data, bank data, KYC document contents, or provider secrets.

## Incident Response Checklist

- Assign incident owner and escalation contacts.
- Freeze affected accounts or providers.
- Preserve audit logs and request IDs.
- Rotate affected secrets.
- Notify users/providers where required.
- Patch root cause and verify regression tests.
- Document timeline and remediation.

## Backup And Recovery Checklist

- Test database backups and restore process.
- Verify object storage lifecycle and recovery.
- Keep migration rollback plans.
- Protect backup credentials.
- Monitor backup failures.
- Define recovery time and recovery point objectives.

## OWASP Checklist Placeholder

Before production launch, complete reviews for:

- OWASP Top 10 broken access control
- cryptographic failures
- injection
- insecure design
- security misconfiguration
- vulnerable dependencies
- authentication failures
- software/data integrity failures
- logging and monitoring failures
- server-side request forgery

## Remaining Security Work

This baseline does not implement distributed production rate limiting, WAF, real secrets management, external monitoring, penetration testing, deployment hardening, real payment security, real object storage controls, real database server controls, real KYC/insurance review, or compliance certification.
