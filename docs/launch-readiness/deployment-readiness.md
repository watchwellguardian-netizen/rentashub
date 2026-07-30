# S5-LRW-001 Deployment Readiness

This package defines deployment evidence requirements. It does not deploy RentasHub or activate production infrastructure.

## Deployment Manifest Validation

| Requirement | Status | Evidence |
| --- | --- | --- |
| Application name is RentasHub | Ready | `package.json` |
| Branch is release-approved | Pending | Git evidence |
| Commit hash recorded | Pending | Git evidence |
| Build artifact generated | Pending runtime evidence | CI build artifact |
| Release package manifest generated | Ready | `docs/launch-readiness/launch-dashboard.json` |
| Production target blocked by default | Ready | Workflow guard evidence |

## Environment Inventory

| Environment | Status | Owner | Evidence |
| --- | --- | --- | --- |
| Local | Ready for engineering validation | Engineering | Local command output |
| GitHub Actions | Pending repository remote | Operations / DevOps | Workflow run ID |
| Development Supabase | Pending A4-01/A4-02 evidence | Operations / DevOps | Project ID and environment evidence |
| UAT/Staging | Pending A4-01/A4-02 evidence | Operations / DevOps | Project ID and environment evidence |
| Production | Pending certification | Operations / DevOps | Isolated project evidence |

## Secret Inventory Without Values

| Secret Name | Purpose | Required By | Storage Location | Status |
| --- | --- | --- | --- | --- |
| SUPABASE_URL | Supabase API URL | A4 | Approved secret store | Pending |
| SUPABASE_ANON_KEY | Public Supabase client key | A4/Auth/Storage | Approved secret store | Pending |
| SUPABASE_SERVICE_ROLE_KEY | Backend-only privileged operations | A4/backend only | Approved backend secret store | Pending |
| DATABASE_URL | Disposable or non-production PostgreSQL validation | PG runtime | GitHub Actions secret or local env | Pending |
| REDIS_URL | Queue runtime validation | Redis/BullMQ | GitHub Actions secret or local env | Pending |
| OBJECT_STORAGE_ENDPOINT | Object storage runtime validation | Storage/export | GitHub Actions secret or local env | Pending |
| OIDC_ISSUER_URL | Live identity-provider validation | Auth | Approved secret/config store | Pending |
| OIDC_CLIENT_ID | Live identity-provider validation | Auth | Approved secret/config store | Pending |
| OIDC_AUDIENCE | Live identity-provider validation | Auth | Approved secret/config store | Pending |
| OIDC_JWKS_URL | Live token validation | Auth | Approved secret/config store | Pending |
| SENTRY_DSN | Error monitoring | Observability | Approved secret store | Pending |
| BETTER_STACK_SOURCE_TOKEN | Log drain / uptime | Observability | Approved secret store | Pending |

Do not record secret values in this file.

## Configuration Validation

- Validate required environment variable names exist by environment.
- Validate no production endpoint is selected unless production gate is approved.
- Validate no secret values are printed by scripts or workflow logs.
- Validate live providers remain disabled until owner credentials and gate evidence exist.

## Version Manifest

| Field | Source | Status |
| --- | --- | --- |
| Package name | `package.json` | Ready |
| Package version | `package.json` | Ready |
| Branch | Git | Pending release evidence |
| Commit | Git | Pending release evidence |
| Release tag | Git tag | Pending approval |

## Build Manifest

| Artifact | Command | Status |
| --- | --- | --- |
| Production frontend bundle | `npm run build` | Pending CI evidence |
| Bundle report | `npm run bundle:report` | Pending CI evidence |
| Runtime evidence index | `npm run runtime:evidence:json` | Ready |
| Release dashboard | `npm run launch:s5-lrw-001:json` | Ready |

## SBOM Generation

| Requirement | Status | Evidence |
| --- | --- | --- |
| Dependency inventory | Ready for generation | `package.json` |
| Lockfile inventory | Pending if lockfile unavailable | Dependency audit evidence |
| SBOM output path | Ready | `artifacts/release/sbom.json` |
| License review | Pending S5-LRW-002 | License audit evidence |

## Artifact Manifest

| Artifact | Path | Retention |
| --- | --- | --- |
| PostgreSQL runtime evidence | `artifacts/runtime-evidence/postgres-pg006.json` | 14 days in CI |
| Redis/BullMQ runtime evidence | `artifacts/runtime-evidence/redis-bullmq-s5-s3c.json` | 14 days in CI |
| Object storage/export runtime evidence | `artifacts/runtime-evidence/object-storage-export-s5-s3d.json` | 14 days in CI |
| Browser/accessibility runtime evidence | `artifacts/runtime-evidence/browser-accessibility-s5-s3e.json` | 14 days in CI |
| Auth/authorization runtime evidence | `artifacts/runtime-evidence/auth-authorization-s5-s3f.json` | 14 days in CI |
| Observability/operations runtime evidence | `artifacts/runtime-evidence/observability-operations-s5-s3g.json` | 14 days in CI |

## Release Package Manifest

Release packages must include source, migrations, tests, workflow definitions, evidence indexes, and release documentation. They must exclude `.env` files, service-role keys, database passwords, access tokens, build caches, local logs, and unreviewed generated artifacts.
