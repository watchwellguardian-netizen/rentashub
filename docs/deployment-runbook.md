# Deployment Runbook

Status: Draft operational readiness document. This runbook does not deploy RentasHub, point production traffic, or certify production launch.

## Purpose

Define controlled deployment expectations for Development, UAT/Staging, and Production once infrastructure activation is authorized.

## Deployment Roles

| Role | Responsibility |
| --- | --- |
| Deployment Owner | Coordinates deployment and confirms gate approval. |
| Release Approver | Confirms release candidate eligibility. |
| DevOps Owner | Manages hosting, DNS, TLS, secrets, CI/CD, and rollback. |
| Database Migration Owner | Executes and validates migrations. |
| Security Reviewer | Reviews auth, secrets, headers, and exposure risks. |
| Support Owner | Prepares stakeholder communications and support coverage. |
| Incident Owner | Stands by for deployment-related incident response. |

## Environment Rules

| Environment | Purpose | Deployment source | Approval |
| --- | --- | --- | --- |
| Development | Integration testing and engineering validation. | Backlog or feature branch. | Engineering owner. |
| UAT/Staging | Certification, smoke testing, operational simulation, and closed beta preparation. | `release` branch or release candidate tag. | Release approver and technical owner. |
| Production | Paid pilot or public launch after certification. | Approved release tag only. | Executive, security, compliance, and technical approval. |

Production must not reuse Development or UAT secrets, databases, storage buckets, auth redirects, or service role keys.

## Pre-Deployment Checklist

- CI clean install passed.
- Frontend tests passed.
- Backend tests passed.
- Readiness CLI passed.
- Production build passed.
- ZIP/artifact sanity check passed where release packaging is required.
- Environment variables loaded from approved secret manager.
- Database provider active and backed up.
- Database migration plan reviewed.
- Object storage active and private buckets verified.
- Monitoring and alerts active for UAT/Production.
- Rollback artifact identified.
- Incident owner assigned.
- Support owner prepared for user-facing changes.

## Development Deployment

1. Confirm branch and commit.
2. Confirm no real production secrets are present.
3. Deploy frontend and backend to development targets.
4. Run health and readiness checks.
5. Run role smoke tests.
6. Record defects and do not promote unresolved critical issues.

## UAT Deployment

1. Freeze release candidate scope.
2. Confirm release branch or tag.
3. Run frontend tests, backend tests, readiness CLI, and production build.
4. Deploy backend/API to UAT.
5. Deploy frontend to UAT.
6. Run HTTP smoke tests.
7. Validate Supabase environment separation.
8. Validate auth, storage, and critical workflows.
9. Review monitoring dashboard.
10. Record UAT evidence and signoff.

## Production Deployment

Production deployment is blocked until formal approval.

1. Confirm production deployment authorization.
2. Confirm production secrets are loaded from approved secret storage.
3. Confirm backup and restore test status.
4. Confirm monitoring and alert routing.
5. Confirm DNS/TLS/CDN readiness.
6. Deploy backend/API.
7. Deploy frontend.
8. Verify health/readiness endpoints.
9. Run production smoke tests.
10. Monitor errors and performance.
11. Announce deployment result.

## Rollback Steps

1. Stop promotion or freeze current deployment.
2. Identify last known good release artifact or tag.
3. Restore previous backend/API artifact.
4. Restore previous frontend artifact.
5. Roll back database only if the migration rollback plan explicitly approves it.
6. Clear CDN cache if needed.
7. Verify health/readiness endpoints.
8. Verify critical auth and marketplace workflows.
9. Notify support, incident, and release owners.

## Emergency Rollback

Emergency rollback is authorized for:

- Active security exposure.
- Cross-tenant data leak.
- Severe auth/RBAC failure.
- Payment/escrow integrity risk.
- Total outage.
- Critical deployment defect.

Emergency rollback must still preserve evidence for postmortem review.

## Release Approval

Production release requires:

- Release candidate tag.
- Test evidence.
- Build evidence.
- Smoke evidence.
- Readiness evidence.
- Security approval.
- Compliance approval where required.
- Rollback plan.
- Incident coverage.

## No-Go Conditions

- Failed tests or build.
- Missing or placeholder secrets.
- Database migrations untested.
- Monitoring inactive.
- Backup restore untested.
- TLS not active.
- Security review not approved.
- Unresolved critical or high-severity defects.
- Any service role key exposure.
