# A4-02 Environment Provisioning Checklist

Status: Credential-readiness checklist only.

This checklist prepares the A4-02 Environment Provisioning Verification gate. It does not prove that Supabase projects exist, secrets are stored, migrations are executed, or live infrastructure is active.

## Development Environment

Required values:

- Supabase project name.
- Supabase project ID.
- `SUPABASE_URL` stored in approved secret storage.
- `SUPABASE_ANON_KEY` stored in approved secret storage.
- `SUPABASE_SERVICE_ROLE_KEY` stored in approved backend-only secret storage.
- `DATABASE_URL` stored in approved backend-only secret storage.
- Development database isolated from UAT and Production.
- Development storage buckets isolated from UAT and Production.
- Development auth configuration isolated from UAT and Production.

## UAT/Staging Environment

Required values:

- Supabase project name.
- Supabase project ID.
- `SUPABASE_URL` stored in approved secret storage.
- `SUPABASE_ANON_KEY` stored in approved secret storage.
- `SUPABASE_SERVICE_ROLE_KEY` stored in approved backend-only secret storage.
- `DATABASE_URL` stored in approved backend-only secret storage.
- UAT database isolated from Development and Production.
- UAT storage buckets isolated from Development and Production.
- UAT auth configuration isolated from Development and Production.

## Production Environment

Required values:

- Supabase project name.
- Supabase project ID.
- `SUPABASE_URL` stored in approved secret storage.
- `SUPABASE_ANON_KEY` stored in approved secret storage.
- `SUPABASE_SERVICE_ROLE_KEY` stored in approved backend-only secret storage.
- `DATABASE_URL` stored in approved backend-only secret storage.
- Production database isolated from Development and UAT.
- Production storage buckets isolated from Development and UAT.
- Production auth configuration isolated from Development and UAT.
- Production migrations remain untouched until UAT signoff.

## Environment Variable Name Requirements

Use variable names only in evidence. Do not paste values.

- `DATABASE_PROVIDER`
- `DATABASE_POSTGRES_VENDOR`
- `DATABASE_URL`
- `AUTH_PROVIDER`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FILE_STORAGE_PROVIDER`
- `FILE_STORAGE_BUCKET_PUBLIC_ASSETS`
- `FILE_STORAGE_BUCKET_SUPPLIER_LOGOS`
- `FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION`
- `FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS`
- `FILE_STORAGE_BUCKET_PRIVATE_CLAIMS`
- `FILE_STORAGE_BUCKET_PRIVATE_DISPUTES`

## No-Secrets-In-Docs Warning

Do not place credentials, database passwords, JWT secrets, Supabase anon keys, Supabase service role keys, API tokens, screenshots containing credentials, or copied secret-store values in documentation.

Evidence may state:

- Present.
- Missing.
- Stored in GitHub Secrets.
- Stored in hosting environment variables.
- Stored in approved vault.

Evidence must not include secret values.

## Sign-Off

- Environment owner:
- Access owner:
- Security reviewer:
- Date:
- A4-02 decision: PASS / FAIL
- Blockers:
- Next gate: A4-03 Migration Execution
