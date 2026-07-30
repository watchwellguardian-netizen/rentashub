# S5-LRW-002 Security Readiness

This package is repository-controlled security readiness. It does not certify production security, activate live security providers, or replace independent assessment.

## Security Automation Coverage

| Control | Repository-Controlled Evidence | Status |
| --- | --- | --- |
| Dependency vulnerability scanning | `scripts/dependency-audit-wrapper.mjs` and `npm run security:audit` | Ready to run |
| Secret scanning | `scripts/secret-scan.mjs`, `scripts/secret-safety-tooling.mjs` | Ready |
| Static application-security testing | Security checklist and source validation tests | Assessor-ready |
| Software composition analysis | SBOM and license register | Ready |
| Container/workflow scanning | Workflow guard review and CI configuration checks | Assessor-ready |
| Production configuration checks | Launch dashboard and owner-action register | Pending runtime evidence |
| Security-header verification | CSP/CORS/CSRF readiness checks | Assessor-ready |
| CORS and CSRF checks | `docs/csp-policy-draft.md`, security checklist templates | Assessor-ready |
| Cookie/session security checks | Auth/OIDC readiness and session evidence package | Assessor-ready |
| Input and file-validation checks | Existing validation, file-validator, and storage readiness tests | Ready |
| Authorization-negative tests | Auth/RBAC and OIDC focused tests | Ready |
| Tenant-isolation security matrix | RLS/RBAC and PG-006 evidence path | Pending runtime execution |
| Rate-limit and abuse-control tests | Rate-limit readiness checklist | Assessor-ready |
| Sensitive-data redaction checks | Logger redaction and secret-safety tests | Ready |
| Audit-log integrity checks | Audit logging readiness and runtime evidence index | Pending runtime execution |

## Production Configuration Checks

- Production targets are blocked unless explicit gate evidence exists.
- Live Supabase, payment, escrow, monitoring, KYC, and telemetry providers remain pending.
- Service-role keys, database passwords, API tokens, JWT secrets, and webhook secrets must remain outside source control.
- Any production-like endpoint in CI must require explicit owner approval and separate production gate authorization.

## Tenant-Isolation Security Matrix

| Control | Expected Runtime Evidence | Status |
| --- | --- | --- |
| Same-tenant owner access | PG-006 artifact | Pending |
| Cross-tenant denial | PG-006 artifact | Pending |
| Anonymous access denial | PG-006 artifact | Pending |
| Admin/privileged exception | PG-006 artifact | Pending |
| Route-to-role enforcement | Auth/RBAC evidence | Pending live execution |
| API guard coverage | Auth/RBAC matrix | Assessor-ready |

## Audit-Log Integrity Checks

| Check | Evidence Required | Status |
| --- | --- | --- |
| Auth event recorded | Runtime auth evidence | Pending |
| Authorization denial recorded | Runtime auth evidence | Pending |
| Core rental action recorded | PostgreSQL/runtime evidence | Pending |
| Incident/monitoring event recorded | Observability evidence | Pending |
| Secret redaction preserved | Secret-safety evidence | Ready |

## Manual Certification Boundary

Security certification remains pending until independent or authorized reviewers execute vulnerability assessment, OWASP review, penetration testing, dependency audit, and remediation verification.
