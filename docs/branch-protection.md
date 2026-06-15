# Branch Protection Standards

Status: Draft for repository operations.

These standards define the expected protections once RentasHub is connected to an approved remote repository. They do not authorize deployment, provider activation, production launch, or live credential use.

## Protected Branches

| Branch | Required protection |
| --- | --- |
| `main` | Pull request required, direct pushes blocked, required checks passing, signed-off release evidence for changes. |
| `release` | Pull request required, build/test/readiness/artifact checks passing, release owner approval required. |
| `future-release-backlog` | Pull request preferred, limited to operational maturity work while RC-0.6A remains blocked. |

## Required Status Checks

The following checks should be required before merging into `main` or `release`:

- Frontend tests.
- Backend tests.
- Readiness CLI.
- A4 Supabase credential-readiness report.
- Secret scan.
- Production build.
- Artifact validation.

## Review Rules

- Require at least one approving reviewer for `future-release-backlog`.
- Require product, technical, and release approval before merging into `main` or `release`.
- Require security approval for authentication, authorization, storage, payment, escrow, monitoring, secrets, workflow, or deployment changes.
- Require DevOps approval for workflow, environment, deployment, branch-protection, or artifact changes.

## Merge Restrictions

Blocked from every protected branch:

- Real `.env` files.
- Service role keys.
- Database passwords or connection strings.
- JWT/session secrets.
- Payment provider secrets.
- Runtime database files.
- `node_modules`.
- Build artifacts unless explicitly approved for release packaging.

## Emergency Exception

Emergency changes are allowed only for critical security, data-integrity, build, or deployment defects. Emergency merges still require:

1. Ticket or incident reference.
2. Rollback plan.
3. Post-merge verification.
4. Follow-up review within one business day.

## RC-0.6A Boundary

While RC-0.6A remains in Infrastructure Activation Hold, branch protection must prevent new product features from entering `main` or `release`. A4 infrastructure evidence remains the only critical-path advancement.
