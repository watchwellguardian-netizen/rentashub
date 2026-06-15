# Change Management Policy

Status: R3-04 operational readiness draft. This policy does not authorize production deployment, live provider activation, or public launch.

## Purpose

Define how RentasHub changes are requested, assessed, approved, implemented, verified, rolled back, and reviewed so that product, infrastructure, security, compliance, and revenue risks remain controlled.

## Scope

This policy applies to:

- Application code.
- Backend/API code.
- Database migrations and seed/reset behavior.
- Auth, RBAC, session, and security controls.
- Storage, documents, and evidence workflows.
- Payment, escrow, revenue, tax, and settlement workflows once activated.
- CI/CD, hosting, DNS, TLS, monitoring, and backup configuration.
- Governance, compliance, security, release, and operational documentation.

## Change Categories

| Category | Description | Examples | Approval path |
| --- | --- | --- | --- |
| Standard | Low-risk, repeatable, pre-approved operational change. | Docs update, test-only improvement, CI label/template change. | Technical owner review. |
| Normal | Planned change with moderate impact or user-visible behavior. | UI workflow update, API adapter change, readiness logic change. | Product and technical approval. |
| Major | High-impact change affecting data, auth, security, compliance, revenue, or infrastructure. | Supabase migration, RBAC change, payment provider activation, storage policy change. | CAB-lite review and executive/security/compliance signoff as applicable. |
| Emergency | Immediate fix for critical security, data integrity, outage, build, or deployment failure. | Credential exposure, cross-tenant access, failed release rollback, outage remediation. | Incident commander and emergency approver. |

## Approval Workflow

1. Identify change category.
2. Confirm the change is authorized by `docs/program-state.md`.
3. Document business reason, scope, affected systems, and risk.
4. Identify test requirements and rollback plan.
5. Obtain required approvals.
6. Implement on the correct branch.
7. Run verification checks.
8. Record evidence.
9. Merge or deploy only after approval criteria are met.
10. Complete post-change review if required.

## CAB-Lite Process

Major changes require a lightweight Change Advisory Board review.

Required reviewers:

- Technical owner.
- Operations/DevOps owner.
- Security owner when auth, RBAC, secrets, storage, or exposure risk is involved.
- Compliance/legal owner when privacy, KYC, claims, disputes, or regulated data is involved.
- Revenue/finance owner when payments, escrow, tax, payouts, or settlement are involved.
- Executive sponsor for closed beta, paid pilot, public launch, or production activation.

CAB-lite review must answer:

- Is the change authorized?
- What systems are affected?
- What is the user/business impact?
- What is the security/compliance impact?
- What evidence proves the change is safe?
- What is the rollback plan?
- Who approves the go/no-go decision?

## Change Windows

| Environment | Recommended window | Notes |
| --- | --- | --- |
| Development | Business hours or engineering-approved times. | Low risk, but avoid disrupting active testing. |
| UAT/Staging | Scheduled UAT windows. | Coordinate with testers, suppliers, and reviewers. |
| Production | Low-traffic window after production certification. | Requires release approval, monitoring, rollback, and support coverage. |

Emergency changes may occur outside change windows, but must preserve evidence and complete post-change review.

## Required Change Record

Each normal, major, or emergency change should record:

- Change ID.
- Change owner.
- Request date.
- Change category.
- Affected branch/commit.
- Affected environment.
- Affected systems.
- Business reason.
- Risk assessment.
- Security/compliance impact.
- Database impact.
- Test plan.
- Rollback plan.
- Approval owner.
- Verification evidence.
- Final decision.

## Testing Requirements

| Change type | Minimum verification |
| --- | --- |
| Docs-only | Diff review and secret scan where applicable. |
| Frontend | Frontend tests and build when route/UI behavior changes. |
| Backend/API | Backend tests and API smoke checks. |
| Database | Migration validation, rollback review, seed validation, backup consideration. |
| Auth/RBAC | Protected route tests, API auth tests, role isolation checks, security review. |
| Storage | Bucket policy checks, signed URL checks, private access denial. |
| Payment/Escrow | Simulation tests, ledger checks, no live money movement unless explicitly authorized. |
| Infrastructure | Health/readiness checks, deployment smoke, rollback plan. |

## Rollback Requirements

Rollback plan must define:

- Last known good commit or artifact.
- Whether rollback is code-only, config-only, database, storage, or provider-level.
- Database rollback risk.
- Data repair owner if rollback is unsafe.
- User/support communications.
- Verification after rollback.

Do not execute destructive database rollback without explicit data-owner approval.

## Emergency Changes

Emergency changes are allowed only for:

- Critical security defect.
- Critical data integrity defect.
- Critical build defect.
- Critical deployment defect.
- Critical operational outage.

Emergency process:

1. Declare incident severity.
2. Assign incident commander.
3. Create minimal `hotfix/*` branch where possible.
4. Apply the smallest safe fix.
5. Run targeted tests.
6. Obtain emergency approval.
7. Deploy only to authorized environment.
8. Monitor recovery.
9. Complete post-incident and post-change review.

## Production Change Controls

Production changes require:

- Approved release candidate or emergency authorization.
- Passing CI/CD checks.
- Active monitoring and alert routing.
- Backup and restore status reviewed.
- Rollback path confirmed.
- Security approval for auth, RBAC, storage, payment, escrow, and data exposure changes.
- Compliance approval for privacy, KYC, claims, disputes, legal, or regulated data changes.
- Support coverage for user-facing changes.

Production remains blocked while RentasHub is not production certified.

## Post-Change Review

Post-change review is required for:

- Major changes.
- Emergency changes.
- Failed changes.
- Rollbacks.
- Changes causing user-visible incidents.
- Security/compliance/revenue-impacting changes.

Review must document:

- What changed.
- What went well.
- What failed.
- User/business impact.
- Verification evidence.
- Remediation items.
- Owner and due date for follow-up actions.

## No-Go Conditions

- Change is outside authorized program state.
- Required approval missing.
- Rollback plan missing.
- Tests fail.
- Secrets are exposed.
- Security or compliance owner rejects the change.
- Database migration has no reviewed recovery path.
- Monitoring unavailable for production-impacting change.

## Certification Note

This policy establishes change governance readiness only. It does not activate production change control, remote branch protection, provider access, or live deployment until repository hosting, CI/CD, environments, and operational owners are formally configured.
