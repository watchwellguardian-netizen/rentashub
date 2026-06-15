# Incident Response Plan

This plan prepares RentasHub for incident response. It must be tested in tabletop exercises before paid pilot or public launch.

## Severity Levels

- Sev 1: active data breach, fund movement incident, admin compromise, authentication bypass, production outage.
- Sev 2: provider outage, elevated API failures, suspicious admin activity, privacy exposure, payment/escrow reconciliation issue.
- Sev 3: degraded workflow, non-sensitive bug, isolated support issue.

## Incident Owners

- Incident response owner.
- Security owner.
- Engineering owner.
- Support owner.
- Payment/escrow owner where relevant.
- Legal/compliance owner where relevant.

## Response Process

1. Detect and classify incident.
2. Assign incident owner.
3. Preserve logs and evidence.
4. Contain affected system.
5. Disable affected credentials or tokens if needed.
6. Notify internal stakeholders.
7. Communicate externally only through approved owner.
8. Eradicate root cause.
9. Recover service.
10. Complete post-incident review.

## Required Playbooks

- Auth compromise.
- Admin account compromise.
- Payment provider failure.
- Escrow dispute/funds incident.
- Object storage exposure.
- Database incident.
- Monitoring outage.
- Vulnerability disclosure.

## Tabletop Requirement

Incident response is not considered launch-ready until tabletop testing is completed, gaps are assigned, and remediation is tracked.
