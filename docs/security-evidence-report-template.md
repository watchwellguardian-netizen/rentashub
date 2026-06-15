# Security Evidence Report Template

Status: Template for future security gate reviews.

Use this template when submitting security evidence. Do not include secrets, keys, passwords, tokens, screenshots containing secrets, or raw production logs.

## Submission Summary

- Gate:
- Environment:
- Reviewer:
- Date:
- Status: PASS / FAIL / CONDITIONAL PASS

## Static Secret Scan

- Tool:
- Command:
- Result:
- Findings:
- Remediation:

## Dependency Audit

- Tool:
- Command:
- Result:
- High findings:
- Critical findings:
- Accepted risks:

## CSP Validation

- Mode: report-only / enforced
- Violations observed:
- Provider domains approved:
- Remaining changes:

## Rate Limiting

- Provider:
- Protected surfaces:
- Block events observed:
- Audit events generated:

## MFA Readiness

- Provider:
- Required roles:
- Enrollment tested:
- Recovery tested:
- Exceptions:

## Session Hardening

- Secure cookie status:
- Refresh token rotation:
- Session revocation:
- Dev-header production lockdown:
- Direct URL protected-route test:

## Evidence Attachments

- Test output:
- Audit report:
- Screenshots redacted:
- Ticket links:

## Decision

- Recommendation:
- Blockers:
- Required remediation:
- Next gate:
