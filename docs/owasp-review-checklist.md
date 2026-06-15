# OWASP Review Checklist

This checklist prepares RentasHub for OWASP review. It does not mean OWASP review or penetration testing has been completed.

## OWASP Web Top 10

- Broken access control: review route guards, API RBAC, object ownership, direct URL access, admin routes, supplier/customer/broker boundaries.
- Cryptographic failures: review token signing, secret storage, password hashing, TLS enforcement, database/object storage encryption expectations.
- Injection: review validation, query construction, repository boundaries, user-generated text, search filters, admin inputs.
- Insecure design: review marketplace abuse cases, escrow state changes, payment simulation boundaries, claims/dispute flows, moderation paths.
- Security misconfiguration: review CORS, headers, dev headers, environment templates, staging/production separation.
- Vulnerable components: run dependency audit and triage.
- Identification/auth failures: review login, registration, password reset, session expiry, refresh strategy, Supabase Auth migration plan.
- Software/data integrity failures: review CI gates, artifact integrity, ZIP generation, migration scripts, seed data controls.
- Logging/monitoring failures: review request IDs, secret redaction, error tracking, alerting, incident events.
- SSRF: review future provider integrations, webhook handlers, URL inputs, file upload targets.

## OWASP API Top 10

- Broken object property level authorization.
- Broken authentication.
- Broken object level authorization.
- Unrestricted resource consumption.
- Broken function level authorization.
- Unrestricted access to sensitive business flows.
- Server-side request forgery.
- Security misconfiguration.
- Improper inventory management.
- Unsafe consumption of APIs.

## Evidence Needed

- Route/RBAC matrix.
- API endpoint inventory.
- Sensitive workflow inventory.
- Dependency audit output.
- Manual review notes.
- External review signoff.
