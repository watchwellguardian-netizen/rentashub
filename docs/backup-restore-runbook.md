# Backup & Restore Runbook

Status: Draft operational readiness document. This runbook does not prove that backups or restores have been executed.

## Purpose

Define backup and restore expectations for Supabase PostgreSQL, Supabase Storage, audit logs, generated documents, and operational evidence.

## Recovery Objectives

| Environment | Target RPO | Target RTO | Notes |
| --- | --- | --- | --- |
| Development | 24 hours | 8 hours | Developer data can usually be recreated. |
| UAT/Staging | 24 hours | 4 hours | Certification evidence and UAT data should be recoverable. |
| Production | 24 hours maximum, lower preferred | 4 hours maximum, lower preferred | Must be validated before paid pilot or public launch. |

## Backup Scope

| Data class | Backup source | Required before closed beta | Required before paid pilot |
| --- | --- | --- | --- |
| Marketplace records | Supabase PostgreSQL | Yes | Yes |
| Auth user metadata | Supabase Auth/export process | Yes | Yes |
| Asset photos and public media | Supabase Storage | Yes | Yes |
| Verification/KYC files | Private Supabase Storage buckets | Yes | Yes |
| Inspection, claim, dispute evidence | Private Supabase Storage buckets | Yes | Yes |
| Audit logs | PostgreSQL audit tables and/or log drain | Yes | Yes |
| Generated documents | Storage/document metadata | Yes | Yes |

## Supabase PostgreSQL Backup Procedure

1. Confirm target environment and project ID.
2. Confirm backup retention policy.
3. Confirm migration version and current release commit.
4. Create or identify backup snapshot.
5. Record backup timestamp, environment, project ID, and operator.
6. Verify snapshot availability.
7. Store evidence in the approved operations evidence location.

Do not store database passwords or connection strings in evidence files.

## Supabase Storage Backup Procedure

1. Confirm buckets exist:
   - `public-assets`
   - `supplier-logos`
   - `private-verification`
   - `private-inspections`
   - `private-claims`
   - `private-disputes`
2. Export or replicate objects according to the approved provider method.
3. Preserve bucket privacy classifications.
4. Validate object counts and sample object checksums where available.
5. Confirm private evidence remains private after backup.

## Audit Log Backup Procedure

1. Identify audit log table or log drain source.
2. Confirm audit event retention target.
3. Export audit records for the backup window.
4. Validate event count and timestamp range.
5. Confirm redaction rules prevent secrets from entering backups.

## Restore Test Procedure

Use Development first, then UAT. Production restore tests require explicit approval.

1. Create test records for customer, supplier, dealer/broker, inspector, transport provider, financing partner, and admin.
2. Create linked records where possible: asset, booking, audit log, document metadata, and storage reference.
3. Create backup snapshot.
4. Delete or mutate selected test records.
5. Restore from backup.
6. Validate row counts.
7. Validate relationships.
8. Validate audit trail integrity.
9. Validate storage object access and signed URL behavior.
10. Record recovery duration.

## Restore Acceptance Criteria

- Backup source identified.
- Restore completed without unapproved production impact.
- Row counts match expected state.
- Key relationships are intact.
- Audit records are preserved.
- Private storage objects remain private.
- Recovery duration is recorded.
- Data owner signs off.

## No-Go Conditions

- Backup cannot be located.
- Restore fails or produces inconsistent data.
- Private files become public.
- Audit records are lost.
- Secrets appear in backup evidence.
- Recovery exceeds approved RTO without mitigation.

## Evidence Template

```text
Environment:
Project ID:
Backup timestamp:
Restore timestamp:
Migration version:
Records tested:
Storage buckets tested:
Audit logs tested:
RPO result:
RTO result:
Integrity result:
Owner:
Decision: PASS / FAIL
```
