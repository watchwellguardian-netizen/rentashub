# Pilot SLA Framework

Status: Commercial Readiness Review

This framework defines expected service levels for a paid pilot. It is not a binding customer SLA until legal approval.

## Pilot SLA Framework

| Workflow | Target | Owner | Escalation |
| --- | --- | --- | --- |
| Account access support | First response within 4 business hours | Support owner | Operations lead |
| Booking/payment issue | First response within 2 business hours | Payment support owner | Payments lead |
| Supplier payout issue | First response within 1 business day | Revenue operations owner | Finance lead |
| Deposit/escrow question | First response within 2 business hours | Escrow support owner | Legal/escrow owner |
| Safety issue | Immediate triage | Incident owner | Executive owner |
| Claim/dispute | First response within 1 business day | Dispute owner | Moderation/legal owner |
| Security concern | Immediate triage | Security owner | Incident commander |
| Platform outage | Acknowledge within 30 minutes | Infrastructure owner | Incident commander |

## Availability Target

Pilot target: 99.0% during defined operating hours.

This target requires live monitoring, incident ownership, rollback process, and hosting readiness before paid customers are admitted.

## Support Hours

Support hours must be configured before paid pilot:

- Business hours support for account, listing, booking, payment, and payout issues.
- Escalation contact for safety/security issues.
- After-hours incident process for outages and payment-impacting failures.

## Escalation Severity

- Severity 1: Safety, security, payment loss, data loss, outage.
- Severity 2: Booking/payment blocked, supplier payout blocked, active dispute.
- Severity 3: Listing issue, review moderation, support question.
- Severity 4: General feedback or non-blocking feature issue.

## SLA Preconditions

- Monitoring active.
- Support owner assigned.
- Incident owner assigned.
- Payment provider sandbox validated.
- Escrow/deposit policy approved.
- Security review completed for paid workflows.
- Backup and rollback procedure tested.
