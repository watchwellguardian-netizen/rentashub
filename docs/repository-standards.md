# Repository Standards

Status: Draft for future repository operations.

This document defines the intended source-control practices for RentasHub after the local repository is connected to an approved remote. It does not authorize feature work, deployment, provider activation, or production launch.

## Branch Strategy

| Branch | Purpose | Protection expectation |
| --- | --- | --- |
| `main` | Governance-approved RC baseline and stable integration history. | Require pull request review, passing checks, and no direct commits after remote setup. |
| `release` | Release candidate packaging, verification, and artifact preparation. | Require build, test, readiness, smoke, and ZIP validation before promotion. |
| `future-release-backlog` | Non-blocking repository readiness and backlog preparation while infrastructure activation is blocked. | Must not alter live activation status or production claims. |
| `hotfix/*` | Critical security, data integrity, build, or deployment remediation only. | Must merge back to `main` and `release` after verification. |

## Merge Policy

- Use pull requests for all remote merges.
- Require at least one technical review before merging into `main` or `release`.
- Require frontend tests, backend tests, readiness checks, and production build before merging release-impacting changes.
- Do not merge provider credentials, real `.env` files, local runtime data, generated database files, or ZIP artifacts.
- Do not merge product features while the program state freezes feature development unless the change directly resolves an authorized blocker.

## Release Policy

- `main` carries the latest approved stable baseline.
- `release` is used for release candidate validation and artifact packaging.
- A release candidate can be promoted only after build, tests, readiness, HTTP smoke, ZIP refresh, and ZIP sanity checks pass.
- Production readiness cannot be claimed from repository status alone.

## Tag Policy

Use annotated tags after a release candidate is verified.

Recommended format:

```text
rc-0.6a
rc-0.6b
```

Recommended annotation format:

```text
RentasHub Marketplace RC-0.6A - Infrastructure Activation Hold
```

Do not tag `production` or `public-launch` until formal production certification is complete.

## Rollback Policy

- For unpushed local work, use branch resets only after explicit approval.
- For pushed work, revert with a new commit rather than rewriting shared history.
- Preserve release evidence and verification logs when rolling back release candidates.
- Emergency rollback branches should use `hotfix/` or `rollback/` prefixes and include the incident or gate identifier.

## Commit Message Policy

Use concise conventional messages:

```text
chore: update repository readiness workflows
docs: add environment matrix
fix: resolve release build defect
security: tighten secret scanning
```

## Secret Handling

Never commit:

- Supabase service role keys.
- Database passwords or connection strings.
- JWT/session secrets.
- Payment provider secrets.
- Monitoring DSNs where treated as private by policy.
- Real `.env` files.

Secrets must live only in approved secret stores such as GitHub Actions secrets, hosting provider environment variables, CI/CD secret stores, or managed vaults.
