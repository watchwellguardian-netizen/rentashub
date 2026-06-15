# Business Continuity Plan

Status: R3-02 operational readiness draft. This plan does not certify live operations, production launch, or provider activation.

## Purpose

Define how RentasHub should continue essential marketplace, support, compliance, and administrative operations during infrastructure, staffing, provider, security, or business disruptions.

## Scope

This plan covers:

- Marketplace browsing and inquiry continuity.
- Bookings, auctions, inspections, transport, financing, claims, and dispute operations.
- Customer, supplier, broker/dealer, inspector, transport provider, financing partner, and admin support.
- Operational communications.
- Vendor/provider failures.
- Cloud provider failures.
- Regulatory and legal notification readiness.
- Evidence preservation.

This plan does not activate production infrastructure, live payments, escrow, monitoring, KYC, insurance, or legal auction operations.

## Business Impact Analysis

| Business function | Impact if unavailable | Maximum tolerable downtime | Priority |
| --- | --- | --- | --- |
| Authentication and user access | Users cannot access dashboards, bookings, messages, or admin actions. | 4 hours after production activation. | Critical |
| Marketplace search and asset detail access | Customer discovery and supplier lead flow stops. | 8 hours. | High |
| Booking and auction records | Transaction state, claims, disputes, and trust signals become unreliable. | 4 hours. | Critical |
| Messaging and notifications | Coordination between customers, suppliers, and operators is degraded. | 12 hours. | High |
| Admin moderation and support | Safety, fraud, dispute, and claim controls are delayed. | 4 hours for critical queues. | Critical |
| Payment and escrow workflows | Revenue and settlement operations pause; financial trust risk rises. | Not live until activation; 2 hours after paid pilot. | Critical |
| Storage and evidence access | Inspection, claim, dispute, verification, and listing media may be inaccessible. | 4 hours for private evidence. | Critical |
| Audit logs | Compliance, investigation, and incident response evidence may be impaired. | 4 hours. | Critical |

## Critical Business Functions

1. Protect user data and private evidence.
2. Preserve booking, auction, claim, dispute, payment, escrow, and audit integrity.
3. Maintain user communication through approved support channels.
4. Keep admins able to review safety, claims, disputes, and suspicious activity.
5. Maintain accurate status communication during outages.
6. Restore marketplace access and operational records within approved RTO/RPO targets.

## Recovery Priorities

| Priority | Function | Restoration target |
| --- | --- | --- |
| 1 | Security containment and secrets protection. | Immediate. |
| 2 | Authentication, admin access, and audit logging. | Restore first. |
| 3 | Database persistence and marketplace records. | Restore after containment. |
| 4 | Private storage evidence and critical documents. | Restore with access controls verified. |
| 5 | Customer/supplier communication channels. | Restore or provide manual workaround. |
| 6 | Search, listings, dashboards, and analytics. | Restore after transaction integrity. |
| 7 | Payments, escrow, and revenue operations. | Remain paused until financial integrity is verified. |

## Manual Operating Procedures

If digital workflows are unavailable:

1. Open an incident record with timestamp, affected systems, and owner.
2. Freeze sensitive workflows if data integrity is uncertain.
3. Use approved support mailbox or helpdesk channel for customer/supplier updates.
4. Record manual booking, inspection, claim, dispute, and support actions in a controlled spreadsheet or ticketing system approved by Operations.
5. Do not collect payment, escrow, KYC, or sensitive identity data manually unless legal/compliance approval exists.
6. Reconcile all manual records back into the system after restoration.
7. Preserve evidence and approvals for audit review.

## Vendor Failure Procedures

| Vendor category | Immediate action | Fallback |
| --- | --- | --- |
| Supabase PostgreSQL | Confirm provider status, freeze writes if needed, identify backup. | Restore to approved recovery environment when available. |
| Supabase Auth | Disable sensitive write flows if session validation is unreliable. | Use status messaging and support-assisted account guidance. |
| Supabase Storage | Disable affected upload/download flows and verify bucket policies. | Restore objects from backup or provider replication. |
| Monitoring provider | Assign manual health checks and status updates. | Use hosting/provider dashboards until monitoring returns. |
| Payment provider | Pause payment/settlement flows. | Do not process manual payments unless revenue operations approves. |
| Escrow provider | Freeze release/refund actions. | Escalate to legal/compliance and preserve all evidence. |
| Email/SMS/push provider | Switch to in-app/status/support communications. | Provider-ready fallback only after approval. |

## Cloud Provider Failure Procedures

1. Confirm whether failure affects frontend, backend, database, storage, DNS, CDN, or all services.
2. Activate incident bridge for SEV-1/SEV-2.
3. Review provider status page and support escalation path.
4. Determine whether failover path is tested and approved.
5. Avoid improvised production migration if failover is not certified.
6. Communicate service status and expected update cadence.
7. Preserve logs and evidence for post-incident review.

## Communications Plan

### Internal Communications

- Incident Commander owns update cadence.
- DevOps provides infrastructure status.
- Engineering provides application status.
- Support provides customer impact and ticket volume.
- Security/Compliance reviews privacy, credential, payment, escrow, or evidence exposure language.

### Customer Communications

Customer updates should include:

- What is affected.
- What is not affected.
- Whether user action is required.
- Next update time.
- Support contact route.

Do not speculate about root cause before confirmation. Do not expose internal architecture, secrets, or security details.

### Supplier and Partner Communications

Supplier/partner updates should include:

- Booking, auction, listing, inspection, transport, financing, claim, or dispute impact.
- Whether response deadlines are paused.
- How evidence should be preserved.
- When normal workflows are expected to resume.

## Staff Continuity Plan

| Role | Backup coverage |
| --- | --- |
| Incident Commander | Secondary operations owner. |
| DevOps Owner | Backup technical administrator. |
| Security Owner | Backup security reviewer. |
| Support Owner | Backup support lead. |
| Data Owner | Backup database/migration owner. |
| Compliance Owner | Legal/compliance backup. |

Each critical role must have:

- Contact method.
- Backup owner.
- Access prerequisites.
- Escalation authority.
- Known limits on authority.

## Regulatory Notification Procedures

Regulatory notification may be required for:

- Personal data exposure.
- Verification/KYC document exposure.
- Unauthorized access.
- Payment/escrow data integrity incident.
- Material outage affecting contractual obligations.

Procedure:

1. Preserve evidence.
2. Notify legal/compliance owner.
3. Determine applicable law and notification deadline.
4. Prepare facts-only incident summary.
5. Review communications before external notification.
6. Track notification timestamp and recipient.

No regulatory notification should be made without legal/compliance review unless law or regulator instruction requires immediate action.

## Evidence Collection Requirements

Collect and preserve:

- Incident timeline.
- Affected systems.
- User roles impacted.
- Routes/workflows impacted.
- Logs with secrets redacted.
- Health/readiness results.
- Deployment commit/tag.
- Database migration version.
- Backup and restore evidence.
- Storage bucket policy evidence.
- Support tickets and customer impact.
- Decisions, approvals, and communications.

Do not store secrets, tokens, passwords, private keys, unredacted database URLs, or sensitive user documents in incident summaries.

## Annual Testing Requirements

At least annually, and before public launch:

- Conduct business continuity tabletop exercise.
- Conduct disaster recovery restore exercise.
- Validate staff escalation contacts.
- Validate backup owner coverage.
- Validate support communication templates.
- Validate regulatory notification workflow.
- Validate manual operating procedures.
- Update lessons learned and remediation plan.

## Activation Dependencies

This plan becomes operational only after:

- Supabase Development and UAT environments exist.
- Backup and restore procedures are tested.
- Monitoring and alert routing are active.
- Incident owners are assigned.
- Support channels are active.
- Security and compliance owners approve procedures.

## Certification Note

Business continuity is not certified until continuity procedures are exercised against real operational environments and evidence is reviewed by Operations, Security, Compliance, and executive ownership.
