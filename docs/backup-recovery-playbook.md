# Backup & Recovery Playbook

This playbook prepares RentasHub for backup and recovery operations. No production backup system is active until real providers and credentials are supplied and restore tests pass.

## Backup Scope

- PostgreSQL database.
- Object storage files and metadata.
- Verification and KYC document metadata.
- Inspection and claim evidence metadata.
- Payment, escrow, audit, and ledger records.
- Environment variable inventories without secret values.
- Deployment artifacts and release tags.

## Backup Requirements

- Backup provider selected.
- Backup retention days configured.
- Restore test schedule defined.
- Backup encryption policy reviewed.
- Access limited to authorized operators.
- Audit logs retained according to legal/compliance policy.

## Restore Test Procedure

1. Select a non-production restore target.
2. Restore the latest database backup.
3. Restore object storage sample files.
4. Run migrations/readiness checks.
5. Run smoke tests for login, listings, bookings, payments, claims, and admin readiness.
6. Verify audit logs and transaction records.
7. Document restore time and issues.

## Recovery Risks

- Local JSON fallback is not a production backup model.
- Metadata without real object storage files is incomplete.
- Payment and escrow records require provider reconciliation.
- KYC/verification files require stricter privacy controls.

## Required Before Paid Pilot

- Automated database backups.
- Object storage retention policy.
- Restore test evidence.
- Backup owner assigned.
- Recovery runbook approved.
