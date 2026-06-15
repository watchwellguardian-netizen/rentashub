# Project C1 - Security Hardening Program

Status: Provider-ready foundation only.

Project C1 converts the security readiness baseline into an executable hardening program for staging validation. It does not activate live MFA, WAF, SOC/SIEM, penetration-testing vendors, or production security tooling.

## Scope

### Authentication Security

- MFA architecture readiness.
- Session cookie policy review.
- Refresh-token rotation strategy.
- Session revocation controls.
- Dev-header removal path for deployed environments.

### Application Security

- Content Security Policy framework.
- Existing security-header review.
- CORS allowlist review.
- CSRF strategy review for browser-facing mutations.

### API Security

- Rate-limiting policy.
- Abuse-protection provider readiness.
- Request validation review.
- API hardening for protected mutations and admin actions.

### Dependency Security

- Dependency audit tool readiness.
- Vulnerability scanning provider readiness.
- Security update and patch SLA process.

### Security Monitoring

- Security event taxonomy.
- Alert severity classification.
- Incident response preparation.
- Remediation owner routing.

## Architecture

The backend security hardening model lives in `server/src/security/securityHardeningProgram.js`.

It exposes:

- Security hardening domains.
- Required environment controls.
- Security event taxonomy.
- Alert classifications.
- Remediation sequence.
- Readiness score.
- Explicit live-tooling false flags.

The readiness output is included under:

- `/api/health/readiness` as `checks.securityHardening`.
- Security certification readiness as a nested `hardeningProgram`.
- Admin readiness dashboard through the local credential-readiness snapshot.

## Required Environment Inputs

- `SECURITY_MFA_PROVIDER`
- `SECURITY_SESSION_COOKIE_POLICY`
- `SECURITY_REFRESH_TOKEN_ROTATION`
- `SECURITY_SESSION_REVOCATION`
- `SECURITY_CSP_POLICY`
- `SECURITY_CORS_REVIEW_STATUS`
- `SECURITY_CSRF_STRATEGY`
- `SECURITY_RATE_LIMIT_POLICY`
- `SECURITY_ABUSE_PROTECTION_PROVIDER`
- `SECURITY_REQUEST_VALIDATION_STATUS`
- `SECURITY_DEPENDENCY_AUDIT_TOOL`
- `SECURITY_VULNERABILITY_SCAN_PROVIDER`
- `SECURITY_PATCH_SLA_POLICY_URL`
- `SECURITY_EVENT_TAXONOMY_STATUS`
- `SECURITY_ALERT_ROUTING_STATUS`
- `SECURITY_INCIDENT_RUNBOOK_STATUS`
- `SECURITY_REMEDIATION_OWNER`

## Security Event Taxonomy

The C1 taxonomy covers:

- Authentication failures.
- MFA challenge failures.
- Session revocation.
- Permission denials.
- Rate limit events.
- Validation failures.
- Privileged admin mutations.
- Payment provider errors.
- Private file access denials.
- Audit export requests.

## Alert Severity Classes

- SEV1: Critical security incident.
- SEV2: High-risk security event.
- SEV3: Elevated abuse pattern.
- SEV4: Security readiness finding.

## Boundary

The following remain inactive:

- Live MFA provider.
- Real WAF.
- Real SOC/SIEM.
- Real penetration-testing vendor.
- Production security tooling.
- Public security certification.

## Exit Criteria

Project C1 is complete at provider-ready level when:

- Hardening domains are modeled.
- Readiness scoring is implemented.
- Admin readiness displays the hardening program.
- Security gap report exists.
- Security remediation plan exists.
- Tests, build, smoke, and ZIP pass.

Live activation requires separate provider credentials, staging environment, security owner approval, and external review.
