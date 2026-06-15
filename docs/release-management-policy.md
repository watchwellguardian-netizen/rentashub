# Release Management Policy

Status: R3-03 operational readiness draft. This policy does not authorize production deployment, live provider activation, paid pilot, or public launch.

## Purpose

Define how RentasHub release candidates, production changes, emergency fixes, evidence packages, approvals, rollback decisions, and post-release reviews should be governed.

## Scope

This policy applies to:

- Frontend application changes.
- Backend/API changes.
- Database migrations.
- Authentication, RBAC, and security changes.
- Storage, document, and file workflows.
- Payment, escrow, and revenue workflows once activated.
- CI/CD, infrastructure, monitoring, and operational runbook changes.
- Governance documentation that affects launch or certification decisions.

## Release Types

| Type | Definition | Examples | Approval level |
| --- | --- | --- | --- |
| Patch | Low-risk fix that does not change user-facing scope or data contracts. | Copy fix, small navigation bug, test-only correction. | Technical reviewer. |
| Minor | Backward-compatible workflow, UI, API, or operational enhancement. | New readiness panel, dashboard refinement, adapter improvement. | Product/technical reviewer and release approver. |
| Major | Significant workflow, persistence, auth, payment, escrow, compliance, or operational behavior change. | Supabase activation, payment provider activation, RBAC migration. | Executive, technical, security, and compliance approval as applicable. |
| Emergency | Critical fix for security, data integrity, build, deployment, outage, or production-blocking issue. | Credential exposure remediation, broken auth guard, failed release rollback. | Incident commander and emergency release approver. |

## Branch Usage

| Branch | Purpose | Allowed changes |
| --- | --- | --- |
| `main` | Stable governance-approved baseline. | Approved release baseline and verified hotfix merges only. |
| `release` | Release candidate verification and packaging. | Release hardening, build fixes, packaging fixes, smoke-test fixes, verification updates. |
| `future-release-backlog` | Operational readiness and future backlog preparation while critical path is blocked. | Repository governance, CI/CD scaffolding, runbooks, non-production operational docs. |
| `hotfix/*` | Emergency critical fixes. | Security, data integrity, build, deployment, or outage remediation only. |

Feature work must not bypass the current gate in `docs/program-state.md`.

## Release Approval Workflow

1. Confirm authorized gate or backlog item.
2. Create change on the correct branch.
3. Complete implementation or documentation update.
4. Run applicable checks.
5. Prepare evidence package.
6. Open pull request after remote setup.
7. Obtain required review.
8. Merge only after gate requirements pass.
9. Tag release candidate if release-impacting.
10. Record release decision and evidence.

## Testing Requirements

| Change class | Required checks |
| --- | --- |
| Docs-only operational change | Review diff, check for secrets, validate branch scope. |
| Frontend code | Frontend tests, production build, smoke tests where route-impacting. |
| Backend/API code | Backend tests, API tests, readiness checks, auth/RBAC checks where relevant. |
| Database migration | Migration dry run, rollback review, seed validation, backup plan. |
| Auth/RBAC/security | Backend tests, frontend protected-route tests, security review, secret scan. |
| Payment/escrow/revenue | Simulation tests, ledger integrity tests, provider sandbox tests when authorized, finance approval. |
| Release candidate | Frontend tests, backend tests, readiness CLI, production build, HTTP smoke, ZIP/artifact sanity check. |

## Rollback Requirements

Every release-impacting change must define:

- Last known good commit or tag.
- Artifact rollback path.
- Database rollback decision.
- Data repair owner if rollback is unsafe.
- Monitoring checks after rollback.
- User/support communication owner.

Database rollback must not be improvised. If migration rollback is unsafe, prefer forward-fix with data-owner approval.

## Production Deployment Controls

Production deployment requires:

- Approved release candidate tag.
- Passing CI checks.
- Passing frontend and backend test suites.
- Passing readiness CLI.
- Passing production build.
- Passing smoke tests.
- Active monitoring and alert routing.
- Backup and restore evidence.
- Security approval.
- Compliance approval where required.
- Confirmed rollback artifact.
- Incident owner assigned.

Production deployment remains blocked while RentasHub is classified as not production certified.

## Release Signoff Requirements

| Release stage | Required signoff |
| --- | --- |
| Internal demo | Technical owner. |
| Supplier demo | Product and technical owner. |
| Technical UAT | Technical owner, operations owner. |
| Closed beta | Executive sponsor, technical owner, operations owner, security owner. |
| Paid pilot | Executive sponsor, security, compliance, revenue/finance, operations, technical owner. |
| Public launch | Executive sponsor, security certification owner, compliance/legal, revenue/finance, operations, technical owner. |

## Evidence Package Requirements

Release evidence should include:

- Branch and commit.
- Release candidate tag, if applicable.
- Files changed summary.
- Test results.
- Build result.
- Readiness result.
- Smoke test result.
- ZIP/artifact result, if applicable.
- Security/secret scan result where applicable.
- Migration result where applicable.
- Rollback plan.
- Known risks.
- Final recommendation: PASS, CONDITIONAL PASS, or FAIL.

Do not include secrets, private keys, database passwords, service role keys, JWT secrets, payment secrets, private user documents, or screenshots containing credentials.

## RC Classification Rules

| Classification | Meaning |
| --- | --- |
| RC-0.x | Release candidate or readiness milestone; not production certified. |
| RC-0.6A | Infrastructure Activation Hold; real Supabase ownership/provisioning pending. |
| RC-0.6B | Infrastructure Certified after A4 execution passes. |
| Conditional GO | May proceed only within listed constraints and unresolved blockers. |
| NO-GO | Must not proceed to the target launch or activation stage. |
| Production Ready | Reserved for formally certified live production readiness after all required gates pass. |

Release candidate verification does not equal production readiness.

## Emergency Release Process

Emergency changes are allowed only for:

- Critical security defect.
- Critical data integrity defect.
- Critical build defect.
- Critical deployment defect.
- Critical outage remediation.

Emergency process:

1. Declare severity and owner.
2. Create `hotfix/*` branch.
3. Apply minimal fix.
4. Run targeted tests and safety checks.
5. Obtain emergency approval.
6. Deploy only if deployment is authorized for the affected environment.
7. Merge back to `main` and `release` after verification.
8. Complete post-incident review.

## Post-Release Review Requirements

After each release candidate promotion or significant deployment:

- Confirm expected outcomes.
- Review incidents and defects.
- Review support tickets.
- Review monitoring and readiness signals.
- Confirm rollback was not required or document why it was.
- Capture lessons learned.
- Update defect register and roadmap only if material.
- Archive evidence package.

## Policy Review Cadence

Review this policy:

- Before closed beta.
- Before paid pilot.
- Before public launch.
- After any SEV-1/SEV-2 incident.
- After provider activation for database, auth, storage, monitoring, payment, or escrow.

## Certification Note

This policy improves release governance readiness only. It does not activate CI/CD, configure branch protections on a remote, approve production deployment, or certify RentasHub as production ready.
