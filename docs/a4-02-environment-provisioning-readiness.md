# A4-02 Environment Provisioning Readiness

Status: Credential-readiness only.

This pack prepares RentasHub for A4-02 Environment Provisioning Verification without connecting to Supabase, reading `.env` files, printing secrets, or claiming environment provisioning has passed.

## What Was Added

- Development environment evidence template.
- UAT/Staging environment evidence template.
- Production environment evidence template.
- Environment variable checklist covering frontend, backend, Supabase, storage, monitoring, payment, escrow, and security variables.
- Variable-name validation script.
- Focused production tests for templates, required sections, variable names, no-secret behavior, and blocked A4-02 status.

## How To Use The Templates

Use these files when real environment evidence becomes available:

- `docs/a4-02-development-environment-template.md`
- `docs/a4-02-staging-environment-template.md`
- `docs/a4-02-production-environment-template.md`

Operators should fill in evidence such as project names, project IDs, environment owners, access owners, billing owners, database status, auth status, storage status, backup status, secret storage locations, readiness endpoint results, and sign-off.

Do not paste secret values into these files.

## Variable-Name Validation

Run:

```bash
npm run a4:env-names
```

The validator confirms:

- Required variable names are listed.
- Required launch-stage columns are present.
- Environment templates contain required sections and fields.
- No secret-like values appear in the checklist or templates.
- No `.env` files are loaded.
- No values are printed.

## Why A4-02 Is Still Blocked

A4-02 cannot pass until A4-01 passes first.

A4-01 still requires real Supabase Development, UAT/Staging, and Production project names and IDs, plus infrastructure, billing, and access ownership evidence.

After A4-01 passes, A4-02 still requires actual environment evidence proving:

- Projects are accessible.
- Secret names are configured in approved secret stores.
- Development, UAT/Staging, and Production are separated.
- Production remains untouched until UAT signoff.
- Readiness endpoint behavior is captured for each environment.

This document and its tooling do not prove live provisioning.
