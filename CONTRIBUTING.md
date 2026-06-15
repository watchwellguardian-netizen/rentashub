# Contributing to RentasHub

Status: R3-07 operational readiness draft.

This guide defines how contributors should work in the RentasHub repository after remote ownership is confirmed. It does not authorize feature development, production deployment, live provider activation, or public launch.

## Current Governance

Before starting work, read:

- `docs/program-state.md`
- `docs/repository-standards.md`
- `docs/release-management-policy.md`
- `docs/change-management-policy.md`

The current program state controls what work is authorized. Do not bypass the active gate.

## Repository Setup

Recommended local setup:

```powershell
git clone <approved-remote-url>
cd <repo>
npm ci
npm run verify
```

Server tests are run from the root with:

```powershell
npm run test:server
```

Do not commit `node_modules`, `dist`, ZIP artifacts, runtime data, logs, generated local databases, or real `.env` files.

## Branching Strategy

| Branch | Use |
| --- | --- |
| `main` | Stable governance-approved baseline. |
| `release` | Release candidate packaging and verification. |
| `future-release-backlog` | Operational readiness and approved backlog work while critical path is blocked. |
| `hotfix/*` | Critical security, data integrity, build, or deployment fixes. |

Use feature branches only after remote policy is defined, for example:

```text
docs/r3-adr-framework
ops/a4-evidence-review
fix/release-build-defect
```

## Commit Standards

Use concise conventional commits:

```text
docs: add security disclosure policy
chore: add repository readiness scaffolding
fix: resolve release build defect
security: tighten auth guard validation
```

Avoid vague messages such as:

```text
updates
changes
final
misc
```

## Pull Request Requirements

Each PR should include:

- Summary.
- Files changed.
- Tests run.
- Security impact.
- Database impact.
- Rollback plan.
- Screenshots where UI changes are included.
- Approval checklist.

Use `.github/pull_request_template.md`.

## Testing Requirements

Run the narrowest useful test set first, then broader checks for release-impacting changes.

Common commands:

```powershell
npm test
npm run test:server
npm run readiness
npm run build
npm run verify
```

Docs-only operational changes may not require full tests, but they should be reviewed for:

- Correct branch.
- No secrets.
- No false production claims.
- No conflict with `docs/program-state.md`.

## Security Rules

Never commit:

- Supabase service role keys.
- Database URLs with passwords.
- JWT/session secrets.
- Payment provider secrets.
- Monitoring credentials.
- Real `.env` files.
- Private user files.
- Screenshots containing secrets.

If a secret is exposed:

1. Stop work.
2. Notify the security owner.
3. Rotate/revoke the secret.
4. Search repository, logs, artifacts, and documentation.
5. Record remediation evidence.

## Database and Migration Rules

- Database migrations require review by backend and DevOps owners.
- Production migrations are blocked until UAT signoff.
- Migration rollback must be reviewed before release.
- Destructive changes require explicit data-owner approval.

## Documentation Rules

- Keep governance documents factual and status-safe.
- Do not claim production readiness unless formally certified.
- Do not document real credentials.
- Prefer updating existing docs over creating duplicates.
- Use ADRs for major architectural decisions.

## ADR Process

Use `docs/adr/0000-template.md` for decisions that affect:

- Architecture.
- Data model.
- Provider selection.
- Authentication/RBAC.
- Security/compliance posture.
- Payments/escrow/revenue.
- Deployment/infrastructure.

Number ADRs sequentially:

```text
0001-use-supabase-postgresql.md
0002-auth-provider-strategy.md
```

## Review Expectations

- Protect `main` and `release`.
- Keep backlog work on `future-release-backlog`.
- Do not build marketplace features while feature development is frozen.
- Do not introduce live integrations without explicit authorization.
- Confirm all work aligns with the current gate.

## Release Notes

Release-impacting changes must update release evidence or verification logs when required by the release management policy.

## Contributor Conduct

Contributors are expected to:

- Respect data privacy.
- Avoid unnecessary access to sensitive files.
- Preserve auditability.
- Communicate blockers clearly.
- Keep reviews evidence-based and concise.

## Current Critical Path Reminder

The current critical path remains infrastructure ownership and activation evidence. Backlog work must not supersede A4 gate progression.
