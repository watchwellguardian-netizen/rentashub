# Disaster Recovery Plan

This plan defines credential-ready disaster recovery expectations for RentasHub. Disaster recovery is not active until a real hosting provider, database provider, object storage provider, monitoring provider, and backup process are configured and tested.

## Recovery Objectives

- RTO: define with `DISASTER_RECOVERY_RTO_MINUTES`.
- RPO: define with `DISASTER_RECOVERY_RPO_MINUTES`.
- DR region: define with `DISASTER_RECOVERY_REGION`.
- DR owner: deployment runbook owner or assigned incident owner.

## Critical Services

- Frontend hosting.
- Backend API hosting.
- Supabase PostgreSQL or selected database provider.
- Supabase Storage or selected object storage provider.
- Authentication provider.
- Payment provider.
- Escrow provider.
- Monitoring and alerting.

## Failure Scenarios

- Hosting outage.
- Database outage.
- Object storage outage.
- DNS provider outage.
- TLS certificate failure.
- Payment provider outage.
- Monitoring/alert routing failure.
- Bad release or data migration issue.

## Recovery Steps

1. Confirm incident severity and affected services.
2. Freeze production deployments.
3. Notify incident owner and support owner.
4. Confirm latest healthy backup.
5. Decide rollback, failover, or provider escalation.
6. Restore service in staging or recovery environment first when possible.
7. Promote recovery only after smoke checks pass.
8. Record incident timeline and audit notes.
9. Run post-incident review.

## Manual Gates

- Real backup restore must be tested before paid pilot.
- DNS failover must be tested before public launch.
- Provider status page and escalation contacts must be documented.
- Security review must approve recovery secrets handling.
