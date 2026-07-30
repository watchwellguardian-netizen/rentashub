# S5-LRW-001 Operational Readiness

This package defines operations readiness requirements. It does not certify live operations until teams execute and evidence the procedures.

## Operator Handbook

Operators must know how to:

- Identify current release candidate, branch, commit, and deployment target.
- Run health, readiness, liveness, runtime-evidence, and release-dashboard commands.
- Locate runtime evidence artifacts.
- Escalate incidents by severity.
- Trigger maintenance mode and rollback.
- Avoid printing, copying, or storing secrets in logs or tickets.

## Incident Response Runbook

Primary runbook: `docs/incident-response-runbook.md`

Minimum incident flow:

1. Classify severity.
2. Assign incident commander.
3. Preserve logs and evidence.
4. Contain impact.
5. Recover service.
6. Communicate status.
7. Complete postmortem.

## Escalation Matrix

| Area | Primary Owner | Backup Owner | Evidence Required |
| --- | --- | --- | --- |
| Infrastructure | Operations / DevOps | Executive sponsor | A4 owner record |
| Security | Security owner | Executive sponsor | Security evidence package |
| Database | Database owner | Operations / DevOps | Migration and backup evidence |
| Auth | Identity owner | Security owner | OIDC/Auth evidence |
| Payments | Revenue owner | Executive sponsor | Payment provider evidence |
| Escrow | Escrow/legal owner | Compliance owner | Escrow legal evidence |
| Compliance | Compliance/legal owner | Executive sponsor | Legal approval evidence |

## Maintenance Procedures

1. Announce maintenance window.
2. Confirm rollback plan.
3. Enable maintenance mode when approved.
4. Pause or drain queue workers.
5. Execute change.
6. Verify health/readiness/liveness and business smoke checks.
7. Disable maintenance mode.
8. Publish completion notice.

## Scheduled Maintenance Workflow

| Step | Owner | Status |
| --- | --- | --- |
| Change request submitted | Release owner | Pending |
| CAB approval recorded | CAB / Approvers | Pending |
| Customer notice prepared | Operations | Pending |
| Runtime evidence baseline captured | Engineering | Pending |
| Maintenance executed | Operations | Pending |
| Post-maintenance evidence captured | Engineering | Pending |

## Health Verification Checklist

- `/api/health` returns process health.
- `/api/health/liveness` returns process liveness.
- `/api/health/readiness` returns readiness.
- `/api/health/operations` returns dependency readiness.
- `/api/health/database` returns database readiness.
- Observability readiness endpoint returns provider readiness without secrets.

## Operational Acceptance Checklist

| Acceptance Item | Status | Evidence |
| --- | --- | --- |
| Operators assigned | Pending | Owner action register |
| On-call schedule assigned | Pending | Support evidence |
| Monitoring configured | Pending | Observability evidence |
| Runbooks reviewed | Ready for review | Runbook documents |
| Backup/restore tested | Pending | Runtime recovery evidence |
| Rollback tested | Pending | Rollback evidence |
| Maintenance mode tested | Pending | Operations evidence |
