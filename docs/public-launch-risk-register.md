# Public Launch Risk Register

Status: Final Certification Review

This risk register evaluates public launch exposure. It does not certify production readiness.

| Risk ID | Risk | Severity | Probability | Impact | Mitigation | Owner required | Launch decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PUB-001 | Data durability failure | Critical | High | Lost bookings, payments, claims, audit trail. | Activate PostgreSQL, backups, restore drills. | Infrastructure owner | NO-GO |
| PUB-002 | File/evidence loss or exposure | Critical | High | Verification, inspection, claim, dispute evidence compromised. | Activate private object storage and signed URLs. | Storage/security owner | NO-GO |
| PUB-003 | Account/session weakness | Critical | Medium | Unauthorized access or account takeover. | Activate production auth and session controls. | Auth/security owner | NO-GO |
| PUB-004 | Payment failure or mischarge | Critical | High | Financial loss, refunds, chargebacks, reputation damage. | Provider activation, webhooks, reconciliation. | Payment owner | NO-GO |
| PUB-005 | Escrow/deposit legal exposure | Critical | High | Regulatory, legal, and customer funds risk. | Legal escrow review and provider/trust account controls. | Legal/escrow owner | NO-GO |
| PUB-006 | Undetected outage | High | Medium | Public users cannot transact and support misses incidents. | Monitoring, uptime checks, alerting, incident owner. | Monitoring owner | NO-GO |
| PUB-007 | Security vulnerability | Critical | Medium | Breach or fraud exposure. | Pen test, OWASP review, dependency and secrets audits. | Security owner | NO-GO |
| PUB-008 | Compliance violation | Critical | Medium | Legal or regulatory enforcement risk. | Legal/privacy/KYC/payment/insurance review. | Compliance owner | NO-GO |
| PUB-009 | Support overload | High | Medium | Customer trust erosion. | Staff support, SLAs, escalation, moderation. | Operations owner | NO-GO |
| PUB-010 | Marketplace trust failure | High | Medium | Fraud, low-quality suppliers, disputes. | Verification, trust queue, moderation, escalation staffing. | Trust and safety owner | Conditional |

## Overall Public Launch Risk

Risk level: Critical

Public launch remains NO-GO because several critical risks are both high-impact and unresolved.
