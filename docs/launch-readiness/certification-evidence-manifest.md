# S5-LRW-001 Certification Evidence Manifest

This manifest indexes evidence required for release and certification decisions. It does not certify production readiness until each evidence item is produced by a real runtime, provider, legal, security, or operations process.

## Runtime Evidence Index

| Evidence Area | Expected Artifact | Status |
| --- | --- | --- |
| PostgreSQL and RLS | `artifacts/runtime-evidence/postgres-pg006.json` | Pending runtime execution |
| Redis and BullMQ | `artifacts/runtime-evidence/redis-bullmq-s5-s3c.json` | Pending runtime execution |
| Object storage and exports | `artifacts/runtime-evidence/object-storage-export-s5-s3d.json` | Pending runtime execution |
| Browser journeys and accessibility | `artifacts/runtime-evidence/browser-accessibility-s5-s3e.json` | Pending runtime execution |
| Authentication and authorization | `artifacts/runtime-evidence/auth-authorization-s5-s3f.json` | Pending runtime execution |
| Observability and operations | `artifacts/runtime-evidence/observability-operations-s5-s3g.json` | Pending runtime execution |

## Security Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Secrets audit | Security scan output | Pending execution |
| SBOM verification | SBOM artifact | Pending S5-LRW-002 |
| License audit | License report | Pending S5-LRW-002 |
| Dependency audit | Dependency audit output | Pending execution |
| Vulnerability remediation | Remediation tracker | Pending S5-LRW-002 |
| Penetration-test execution plan | Approved plan | Pending S5-LRW-002 |

## Accessibility Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Chromium journey | Playwright trace/report | Pending runtime execution |
| Firefox journey | Playwright trace/report | Pending runtime execution |
| WebKit journey | Playwright trace/report | Pending runtime execution |
| Keyboard navigation | Accessibility test report | Pending runtime execution |
| ARIA/name checks | Accessibility test report | Pending runtime execution |
| Responsive coverage | Screenshot/report artifacts | Pending runtime execution |

## PostgreSQL Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Migrations 001-009 | PG-006 artifact | Pending runtime execution |
| Catalog objects | PG-006 artifact | Pending runtime execution |
| Constraints | PG-006 artifact | Pending runtime execution |
| Transaction commit/rollback | PG-006 artifact | Pending runtime execution |
| RLS same-tenant access | PG-006 artifact | Pending runtime execution |
| RLS cross-tenant denial | PG-006 artifact | Pending runtime execution |

## Redis Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Redis service availability | Redis workflow artifact | Pending runtime execution |
| Queue enqueue/process | Redis workflow artifact | Pending runtime execution |
| Retry/backoff | Redis workflow artifact | Pending runtime execution |
| Dead-letter handling | Redis workflow artifact | Pending runtime execution |
| Tenant queue naming | Redis workflow artifact | Pending runtime execution |

## Browser Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Module journeys | Browser workflow artifact | Pending runtime execution |
| Auth states | Browser workflow artifact | Pending runtime execution |
| Screenshots | Browser artifact bundle | Pending runtime execution |
| Traces | Browser artifact bundle | Pending runtime execution |
| Failure videos | Browser artifact bundle | Pending runtime execution |

## Storage Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Upload/download/delete | Storage workflow artifact | Pending runtime execution |
| Signed URL behavior | Storage workflow artifact | Pending runtime execution |
| Tenant-isolated paths | Storage workflow artifact | Pending runtime execution |
| MIME/size/checksum validation | Storage workflow artifact | Pending runtime execution |
| Export validation | Storage workflow artifact | Pending runtime execution |

## Authentication Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Mock OIDC validation | Auth workflow artifact | Pending runtime execution |
| Live OIDC validation | Live identity-provider artifact | Pending owner credentials |
| Issuer/audience rejection | Auth workflow artifact | Pending runtime execution |
| Expired/invalid token rejection | Auth workflow artifact | Pending runtime execution |
| Session revocation hooks | Auth workflow artifact | Pending runtime execution |

## Operations Evidence Index

| Evidence Area | Expected Evidence | Status |
| --- | --- | --- |
| Health/readiness/liveness | Observability artifact | Pending runtime execution |
| Alert-rule definitions | Observability artifact | Pending runtime execution |
| Metrics registry | Observability artifact | Pending runtime execution |
| Runbook index | Observability artifact | Pending runtime execution |
| Maintenance procedures | Observability artifact | Pending runtime execution |

## Certification Evidence Manifest

| Certification Area | Status |
| --- | --- |
| Runtime evidence | Pending |
| Security evidence | Pending |
| Accessibility evidence | Pending |
| PostgreSQL evidence | Pending |
| Redis evidence | Pending |
| Browser evidence | Pending |
| Storage evidence | Pending |
| Authentication evidence | Pending |
| Operations evidence | Pending |
| Production certification | Not certified |
