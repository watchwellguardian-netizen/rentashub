# ADR 0003: Release Branch Governance and Backlog Isolation

Status: Accepted

Date: 2026-06-16

Owner: DevOps / Release Management

## Context

RentasHub RC-0.6A is frozen while infrastructure activation is blocked externally. Repository work can continue only if it does not disturb the release baseline or bypass the A4 critical path.

## Decision

RentasHub will use:

- `main` as the stable RC baseline.
- `release` as the release candidate branch.
- `future-release-backlog` for operational readiness and future backlog preparation.

Feature development remains frozen unless a critical defect is found or a gate explicitly authorizes work.

## Options Considered

| Option | Benefits | Tradeoffs | Decision |
| --- | --- | --- | --- |
| Continue all work on main | Simple | High risk to RC baseline | Rejected |
| Pause all repository work | Protects baseline | Blocks low-risk operational readiness improvements | Rejected |
| Isolate backlog work on future-release-backlog | Protects release while allowing safe maturity work | Requires branch discipline | Accepted |

## Consequences

- `main` and `release` must not receive backlog-only changes without approval.
- Operational readiness tooling and governance assets may be prepared on `future-release-backlog`.
- A4 infrastructure evidence remains the critical path to RC-0.6B.

## Validation

- Git status and branch checks confirm work is isolated.
- CODEOWNERS and PR templates require gate and branch context.
- CI includes readiness, security, artifact, and ZIP checks.

## Rollback or Reversal

If backlog work becomes release-impacting, it must be reviewed, cherry-picked intentionally, or discarded without disturbing the RC baseline.

## References

- Related docs: `docs/release-management-policy.md`, `docs/program-state.md`
- Related branch: `future-release-backlog`
