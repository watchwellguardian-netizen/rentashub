# S5-LRW-002 Privacy Readiness

This package is repository-controlled privacy and data-governance readiness. It does not provide legal approval and does not activate live KYC, retention, deletion, or DSAR execution.

## Personal-Data Inventory

| Data Category | Examples | Classification | Status |
| --- | --- | --- | --- |
| Account profile | Name, role, organization, contact metadata | Personal data | Pending legal review |
| Marketplace records | Listings, bookings, supplier/customer relationships | Business and personal data | Pending runtime evidence |
| Verification data | KYC/KYB placeholders, identity evidence metadata | Highly restricted | Provider pending |
| File uploads | Listing photos, inspection files, claims/disputes evidence | Public/private by class | Storage evidence pending |
| Payment and escrow records | Payment placeholders, ledger metadata | Financial data | Provider pending |
| Audit logs | Actor, role, tenant, event metadata | Security/audit data | Runtime evidence pending |
| Support and incident records | Communications, tickets, incident notes | Personal/support data | Operational evidence pending |

## Data Classification

| Class | Handling Requirement | Public Allowed |
| --- | --- | --- |
| Public marketplace content | Approved listing assets and public marketing content | Yes |
| Tenant business records | Tenant-scoped marketplace operations | No |
| Private verification | KYC/KYB and identity-review artifacts | No |
| Financial records | Payment, escrow, payout, refund, tax evidence | No |
| Security/audit logs | Immutable-style operational evidence | No |
| Legal/compliance records | DSAR, retention, legal hold, breach evidence | No |

## Purpose and Lawful-Processing Register

| Purpose | Data Classes | Legal/Compliance Status |
| --- | --- | --- |
| Account and marketplace operation | Account profile, marketplace records | Pending legal review |
| Rental transaction fulfillment | Bookings, assets, audit events | Pending A4/runtime evidence |
| Supplier/customer verification | Verification data | Pending KYC vendor/legal approval |
| Payment/escrow operations | Financial records | Pending revenue and escrow certification |
| Safety, fraud, and abuse prevention | Audit logs, security events | Pending security/compliance review |
| Support and dispute resolution | Support records, claims evidence | Pending policy approval |

## Retention and Deletion Matrix

| Data Class | Default Rule | Deletion Status |
| --- | --- | --- |
| Account profile | Account life plus approved retention period | Pending legal approval |
| Booking and transaction records | Retained for business/legal requirements | Deletion restricted |
| KYC/verification documents | Legal review required | Restricted |
| Claims/disputes evidence | Case close plus policy retention | Restricted |
| Audit logs | Category-specific retention | Not user-deleteable |
| Notification preferences | Account life plus short retention | Deletion eligible |

## Tenant Data-Isolation Controls

- Tenant IDs must be present on tenant-scoped records.
- RBAC and RLS evidence must prove cross-tenant denial.
- Admin access must be audited and exception-based.
- Private files must use tenant-isolated paths and signed/private access.

## Data-Subject Request Procedure

1. Receive request and assign DSAR ID.
2. Verify requester identity.
3. Classify request as access, export, correction, deletion, or consent withdrawal.
4. Check legal hold and deletion exceptions.
5. Fulfill through approved tools only.
6. Record audit event and response evidence.

## Consent and Preference Controls

- Terms and privacy notice acceptance must record version, actor, timestamp, and audit event.
- Optional marketing preferences must support opt-in and withdrawal.
- KYC data sharing requires separate evidence before provider activation.

## Breach-Response Procedure

1. Open security/privacy incident.
2. Preserve evidence and impacted data classes.
3. Contain exposure.
4. Notify legal/compliance owner.
5. Determine regulatory and user-notification obligations.
6. Record remediation and post-incident actions.

## Cross-Border Data-Transfer Checklist

| Check | Status |
| --- | --- |
| Hosting regions identified | Pending provider evidence |
| Supabase region identified | Pending A4 evidence |
| Monitoring/logging destinations identified | Pending telemetry evidence |
| Payment/KYC processor regions identified | Pending provider selection |
| Transfer safeguards reviewed | Pending legal approval |

## Production Log and Telemetry Privacy Checks

- Logs must not contain secret values, raw credentials, KYC files, full payment details, or unnecessary personal data.
- Tenant, role, request, correlation, and trace IDs may be recorded when privacy reviewed.
- Telemetry destinations remain pending until owner credentials and privacy review are complete.
