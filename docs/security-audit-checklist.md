# Security Audit Checklist

This checklist prepares RentasHub for security audit. It is not a completed audit.

## RBAC Audit

- Verify admin-only routes.
- Verify supplier/vendor aliases.
- Verify customer/user/guest aliases.
- Verify broker-only routes.
- Verify API write routes reject unauthenticated users.
- Verify direct URL and refresh access does not expose protected data.

## Authentication Audit

- Validate backend auth token expiry.
- Validate logout/session revocation limitations.
- Validate Supabase Auth migration plan.
- Validate password reset and email verification requirements.
- Validate dev-header production lock.

## Storage Security Audit

- Confirm KYC/verification files are private.
- Confirm inspection/claim/dispute evidence is private.
- Confirm signed URL design.
- Confirm virus scanning requirement.
- Confirm file retention lifecycle.

## Payment Security Audit

- Confirm no card/bank data storage.
- Confirm simulated mode labels.
- Confirm provider webhook readiness.
- Confirm ledger integrity and audit logging.
- Confirm refund/chargeback/payout controls.

## Escrow Security Audit

- Confirm no live funds processing.
- Confirm state transition authorization.
- Confirm dispute evidence linkage.
- Confirm release/refund policy readiness.
- Confirm legal trust account boundary.

## Monitoring Audit

- Confirm request ID correlation.
- Confirm secret redaction.
- Confirm provider alert routing readiness.
- Confirm security incident event model.
- Confirm log retention and access rules.

## Dependency Audit

- Run dependency scan.
- Triage critical/high vulnerabilities.
- Review licenses.
- Record remediation owner.
- Define remediation SLA.
