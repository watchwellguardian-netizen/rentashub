# Project A Supabase Activation Intake

Status: Credential Intake

This is the next actionable handoff for Phase 3. Live activation cannot be completed until the values below are supplied through an approved secret-management process.

Do not commit real secrets to this repository.

## Required Supabase Assets

Storage bucket names must be supplied for public assets, supplier logos, private verification, private inspections, private claims, and private disputes.

| Item | Required | Notes |
| --- | --- | --- |
| Supabase account | Yes | Owner/admin access required. |
| Supabase project | Yes | Use a staging project before production. |
| PostgreSQL `DATABASE_URL` | Yes | Must be a real Supabase PostgreSQL connection string, not a placeholder. |
| `SUPABASE_URL` | Yes | Project URL from Supabase settings. |
| `SUPABASE_ANON_KEY` | Yes | Used by browser-safe Supabase flows where appropriate. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. Never expose to frontend. |
| Public asset bucket name | Yes | Recommended: `public-assets`. |
| Supplier logo bucket name | Yes | Recommended: `supplier-logos`. |
| Private verification bucket name | Yes | Recommended: `private-verification`. |
| Private inspection bucket name | Yes | Recommended: `private-inspections`. |
| Private claims bucket name | Yes | Recommended: `private-claims`. |
| Private disputes bucket name | Yes | Recommended: `private-disputes`. |
| Backup retention policy | Yes | Define retention days and restore owner. |

## Environment Values To Configure

```text
DATABASE_PROVIDER=postgres
DATABASE_POSTGRES_VENDOR=supabase
DATABASE_URL=<supabase-postgres-url>

AUTH_PROVIDER=supabase
VITE_AUTH_MODE=supabase
SUPABASE_URL=<supabase-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_PASSWORD_RESET_ENABLED=true
AUTH_REFRESH_TOKEN_ROTATION=true
AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true

FILE_STORAGE_PROVIDER=supabase
FILE_STORAGE_BUCKET_PUBLIC_ASSETS=public-assets
FILE_STORAGE_BUCKET_SUPPLIER_LOGOS=supplier-logos
FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION=private-verification
FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS=private-inspections
FILE_STORAGE_BUCKET_PRIVATE_CLAIMS=private-claims
FILE_STORAGE_BUCKET_PRIVATE_DISPUTES=private-disputes
FILE_STORAGE_SIGNED_URL_TTL_SECONDS=900
FILE_UPLOAD_MAX_MB=10
FILE_REQUIRE_VIRUS_SCAN=true
```

## Activation Checklist

- [ ] Create Supabase staging project.
- [ ] Store credentials in approved secret manager or deployment environment.
- [ ] Configure PostgreSQL provider variables.
- [ ] Run migration command against Supabase staging.
- [ ] Run seed command only if approved for staging.
- [ ] Run database connection smoke test.
- [ ] Configure Supabase Auth email/password.
- [ ] Configure email verification.
- [ ] Configure password reset redirects.
- [ ] Create storage buckets.
- [ ] Apply public/private bucket policies.
- [ ] Verify private buckets are not publicly downloadable.
- [ ] Confirm backup retention.
- [ ] Run backup and restore test.
- [ ] Run backend tests.
- [ ] Run frontend tests.
- [ ] Run readiness CLI.
- [ ] Run production build.
- [ ] Refresh ZIP artifact.

## Completion Definition

Project A is complete only when Supabase PostgreSQL, Auth, Storage, backup validation, and restore testing are verified in staging with real non-placeholder credentials.

Until then, Project A remains credential-ready only.
