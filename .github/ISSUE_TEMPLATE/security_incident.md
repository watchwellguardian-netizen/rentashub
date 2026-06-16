---
name: Security Incident
about: Report a suspected security issue or credential exposure.
title: "[SECURITY] "
labels: security
assignees: ""
---

## Confidentiality Warning

Do not paste secrets, tokens, passwords, keys, customer private data, or exploit details that should be handled privately.

## Summary

Describe the suspected issue at a high level.

## Severity

- SEV-1 Critical
- SEV-2 High
- SEV-3 Medium
- SEV-4 Low

## Affected Area

- Authentication
- RBAC/RLS
- Data exposure
- Storage/files
- Payments/escrow
- CI/CD secrets
- Dependency vulnerability
- Infrastructure

## Evidence Available

Describe evidence without exposing secrets.

## Immediate Containment Needed

- [ ] Rotate secrets.
- [ ] Disable route or feature.
- [ ] Revoke sessions.
- [ ] Block deployment.
- [ ] Notify security owner.
- [ ] Preserve audit evidence.
- [ ] Open incident response runbook.

## Release Control

- Affected branch/tag:
- Release freeze required: Yes / No
- Public advisory likely: Yes / No
- External legal/compliance review required: Yes / No

## Contact

Provide a secure contact path, not secrets.
