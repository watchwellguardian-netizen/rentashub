# Disaster Recovery Plan

Status: R3-01 operational readiness draft. This plan does not prove disaster recovery is active, tested, or production certified.

## Purpose

Define how RentasHub should recover from infrastructure, database, storage, authentication, deployment, monitoring, and provider failures once real environments are active.

## Scope

This plan covers:

- Frontend hosting.
- Backend/API hosting.
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Audit logs.
- Generated documents.
- Monitoring and alerting.
- DNS, TLS, and CDN.
- Payment and escrow provider dependencies once activated.

This plan does not authorize live deployment, production failover, real payment processing, escrow movement, or public launch.

## Recovery Objectives

| Environment | Target RTO | Target RPO | Recovery expectation |
| --- | --- | --- | --- |
| Development | 8 hours | 24 hours | Restore developer workflow and non-production test data. |
| UAT/Staging | 4 hours | 24 hours | Restore certification testing, UAT evidence, and pilot validation workflows. |
| Production | 4 hours maximum | 24 hours maximum | Restore live marketplace operations after production certification. Lower targets may be required before paid pilot. |

RTO and RPO must be reviewed after real hosting, Supabase, storage, monitoring, payment, and escrow providers are selected.

## Critical System Inventory

| System | Recovery owner | Recovery dependency | Evidence required |
| --- | --- | --- | --- |
| Frontend hosting | DevOps Owner | Hosting provider artifact rollback. | Deployment logs and smoke tests. |
| Backend/API hosting | DevOps Owner | API artifact rollback and environment secrets. | Health/readiness endpoint results. |
| Database | Database Owner | Supabase PostgreSQL backup/restore. | Backup timestamp, restore result, row integrity. |
| Authentication | Security Owner | Supabase Auth project and session controls. | Login/session/password reset verification. |
| Storage | Storage Owner | Supabase Storage buckets and object backup/replication. | Object counts, signed URL tests, private access denial. |
| Audit logs | Security/Data Owner | Audit table backup or log drain. | Event count, timestamp range, redaction verification. |
| Monitoring | DevOps/Security Owner | Sentry/Better Stack or selected provider. | Alert routing and status page verification. |
| DNS/TLS/CDN | DevOps Owner | DNS registrar, TLS issuer, CDN provider. | DNS lookup, certificate, cache validation. |

## Disaster Scenarios

### Hosting Outage

1. Confirm provider status.
2. Verify frontend and backend health endpoints.
3. Route users to status page if available.
4. Roll back to last known good artifact if outage follows deployment.
5. Escalate to hosting provider if platform-wide.
6. Validate recovery through smoke tests.

### Database Outage or Data Corruption

1. Freeze writes if corruption is active.
2. Confirm affected environment and project ID.
3. Identify latest valid backup.
4. Preserve audit logs and incident timeline.
5. Restore into a recovery or staging environment first where possible.
6. Validate row counts, relationships, tenant boundaries, and audit integrity.
7. Promote restore only after data owner approval.

### Storage Outage or Private File Exposure

1. Disable affected upload/download flows if needed.
2. Confirm bucket policy and access logs.
3. Rotate signed URL keys or relevant credentials if exposure is suspected.
4. Restore missing objects from backup or provider replication.
5. Verify private buckets reject public access.
6. Notify compliance owner if verification, claim, dispute, or KYC-style files were exposed.

### Authentication Outage

1. Confirm Supabase Auth provider status.
2. Verify login, logout, password reset, email verification, session refresh, and session revocation.
3. Disable sensitive write flows if session validation is unreliable.
4. Review recent auth audit events for suspicious activity.
5. Escalate to security owner for credential/session incidents.

### Regional Outage

1. Confirm affected provider region.
2. Activate incident bridge.
3. Assess DNS/CDN failover readiness.
4. Determine whether failover is tested and approved.
5. If failover is not certified, maintain service status communications and avoid improvised production migration.
6. Record provider ETA and stakeholder updates.

### Bad Release or Migration

1. Stop deployment pipeline.
2. Identify release tag and migration version.
3. Roll back application artifact first if safe.
4. Roll back database only if migration rollback has been reviewed and approved.
5. Run readiness checks and critical workflow smoke tests.
6. Record regression test scope after recovery.

## Incident Escalation

| Severity | Escalation trigger | Required participants |
| --- | --- | --- |
| SEV-1 | Data exposure, credential leak, total outage, cross-tenant access, financial integrity risk. | Incident Commander, DevOps, Security, Data Owner, Support, Executive Sponsor. |
| SEV-2 | Major workflow outage, auth unavailable, storage unavailable, failed recovery test. | Incident Commander, DevOps, Engineering, Support. |
| SEV-3 | Degraded workflow, partial provider outage, delayed non-critical jobs. | Engineering owner and support owner. |
| SEV-4 | Minor operational defect or documentation mismatch. | Backlog owner. |

## Communications

- Use incident channel for SEV-1 and SEV-2.
- Do not post secrets, tokens, database URLs, private user data, or unredacted logs.
- Provide updates with status, impact, action owner, and next update time.
- Customer-facing messages require Support and Compliance review when privacy, payment, escrow, claims, or verification data is involved.

## Backup Validation Schedule

| Test | Development | UAT/Staging | Production |
| --- | --- | --- | --- |
| Database backup existence | Monthly after activation. | Before every certification cycle. | Daily or provider-configured after production activation. |
| Database restore test | Quarterly or before major release. | Before closed beta and paid pilot gates. | Scheduled non-destructive restore test before paid pilot. |
| Storage object restore | Quarterly. | Before UAT signoff. | Before paid pilot and after storage policy changes. |
| Audit log restore/export | Quarterly. | Before security certification. | Before paid pilot and after audit schema changes. |
| DR tabletop exercise | Twice yearly. | Before closed beta. | Before public launch. |

## Recovery Testing Schedule

- Run Development restore test before A4-04 certification.
- Run UAT restore test before A4-05 review.
- Run production-style restore rehearsal before paid pilot.
- Run regional outage tabletop before public launch.
- Re-run DR tests after provider migration, major schema changes, storage policy changes, or auth provider changes.

## Business Continuity Procedures

During a major outage:

1. Preserve user trust with timely status updates.
2. Pause new bookings, auctions, payment simulation, or provider workflows if data integrity is uncertain.
3. Keep support channels open with approved scripts.
4. Preserve audit evidence for claims, disputes, and compliance review.
5. Prioritize restoration of auth, marketplace browsing, booking records, messaging, claims/protection records, and admin oversight.

## Recovery Evidence Template

```text
Incident ID:
Environment:
Affected systems:
Severity:
Start time:
Detection source:
RTO target:
RPO target:
Backup used:
Restore target:
Validation checks:
Data integrity result:
Storage access result:
Auth result:
Audit log result:
Recovery time:
Decision: PASS / FAIL
Owners:
Postmortem required: Yes / No
```

## No-Go Conditions

- No recent backup exists.
- Restore cannot be validated.
- Private storage access becomes public.
- Service role or database credentials appear in logs, docs, artifacts, or chat.
- Audit records are lost or corrupted.
- Cross-tenant access is detected.
- Recovery exceeds approved RTO/RPO without executive acceptance.

## Certification Note

This plan is a readiness asset only. Disaster recovery is not certified until backups, restores, alerting, escalation, access controls, and recovery procedures are executed against real Development and UAT infrastructure, then approved for production use.
