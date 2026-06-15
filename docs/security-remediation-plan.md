# Security Remediation Plan

Status: Provider-ready remediation sequence.

This plan defines the order for converting Project C1 readiness into validated security controls. It is not a claim that the controls are live.

## Remediation Sequence

1. Assign `SECURITY_REMEDIATION_OWNER` and incident response owners.
2. Move all live secrets into approved secret storage.
3. Validate Supabase Auth session lifecycle in staging.
4. Configure MFA, password reset, email verification, refresh rotation, and session revocation.
5. Lock dev headers out of production write paths.
6. Review and approve CSP, CORS, CSRF, and security headers against deployed domains.
7. Activate distributed rate limiting or WAF-compatible abuse protection.
8. Add dependency audit and vulnerability scanning to CI.
9. Define patch SLA and emergency patch process.
10. Route security event taxonomy into monitoring/SIEM once provider credentials exist.
11. Run incident response tabletop.
12. Complete OWASP/API Security review.
13. Complete external penetration test.
14. Remediate critical/high findings.
15. Re-run regression, build, smoke, ZIP, and operational simulations.

## Owners Required

- Security remediation owner.
- Auth/security owner.
- Dependency audit owner.
- Incident response owner.
- Monitoring/security owner.
- Infrastructure owner.
- Compliance/legal owner.

## Validation Evidence Required

- MFA enrollment and recovery screenshots or test logs.
- Session expiry and revocation test results.
- CORS/CSP/CSRF review output.
- Rate limit and abuse protection test output.
- Dependency audit report.
- Vulnerability scan report.
- Security event routing proof.
- Incident tabletop notes.
- Penetration test report.
- Remediation signoff.

## Rollback

If a security control blocks critical UAT flows:

1. Roll back to previous staging configuration.
2. Preserve logs and audit records.
3. Document the failed control and affected workflow.
4. Patch the control in a non-production environment.
5. Re-run focused security and workflow tests.

## Production Boundary

No live security tooling should be treated as active until credentials, providers, staging validation, owners, alert routing, and external review are complete.
