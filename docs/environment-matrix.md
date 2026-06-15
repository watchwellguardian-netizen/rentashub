# Environment Matrix

Status: Draft for future activation.

This matrix defines expected RentasHub environments without storing credentials. It does not prove that any environment is active.

## Environment Overview

| Environment | Purpose | Expected branch/source | Current activation status |
| --- | --- | --- | --- |
| Development | Developer testing and integration validation. | `future-release-backlog` or feature branches. | Pending Supabase provisioning. |
| UAT/Staging | User acceptance testing, certification testing, and closed beta preparation. | `release`. | Pending Supabase provisioning. |
| Production | Live production environment after certification. | Approved release tag from `main`/`release`. | Not active. |

## Expected URLs

| Environment | Frontend URL | Backend/API URL | Supabase project |
| --- | --- | --- | --- |
| Development | To be assigned. | To be assigned. | RentasHub Development, pending Project ID. |
| UAT/Staging | To be assigned. | To be assigned. | RentasHub UAT, pending Project ID. |
| Production | To be assigned. | To be assigned. | RentasHub Production, pending Project ID. |

## Expected Secret Categories

Secrets must be stored in approved secret stores only and must not appear in source code, documentation, chat, screenshots, logs, ZIP files, or frontend bundles.

| Category | Development | UAT/Staging | Production |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Required after provisioning. | Required after provisioning. | Required before production activation. |
| `SUPABASE_ANON_KEY` | Required after provisioning. | Required after provisioning. | Required before production activation. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend secret only. | Backend secret only. | Backend secret only, restricted access. |
| `DATABASE_URL` | Backend secret only. | Backend secret only. | Backend secret only, restricted access. |
| `AUTH_TOKEN_SECRET` / `SESSION_SECRET` | Required before auth activation testing. | Required before UAT auth testing. | Required before production certification. |
| Payment provider secrets | Not active. | Sandbox only when authorized. | Not configured until revenue activation. |
| Monitoring secrets | Optional until monitoring activation. | Required for monitoring activation. | Required before production certification. |

## Expected Providers

| Domain | Development | UAT/Staging | Production |
| --- | --- | --- | --- |
| Database | Supabase PostgreSQL after A4 provisioning. | Supabase PostgreSQL after A4 provisioning. | Supabase PostgreSQL after UAT signoff. |
| Authentication | Supabase Auth after A4 provisioning. | Supabase Auth after A4 provisioning. | Supabase Auth after UAT signoff. |
| Storage | Supabase Storage after A4 provisioning. | Supabase Storage after A4 provisioning. | Supabase Storage after UAT signoff. |
| Monitoring | Provider-ready only. | Sentry/Better Stack when B3 is authorized. | Sentry/Better Stack before production certification. |
| Payments | Simulated only. | Sandbox only when E2 is authorized. | Live only after revenue certification. |
| Escrow | Simulated/provider-ready only. | Legal/sandbox readiness only when authorized. | Live only after legal and revenue certification. |

## Environment Separation Rules

- Development, UAT/Staging, and Production must use separate Supabase projects.
- Production must not reuse Development or UAT databases, buckets, auth settings, redirect URLs, or service role keys.
- Production migrations remain blocked until UAT signoff.
- Production traffic must not point to Development or UAT infrastructure.
- Service role keys must never use `VITE_` prefixes or appear in frontend environments.

## A4-01 Required Submission

The next infrastructure submission should contain only:

- Development Project Name.
- Development Project ID.
- UAT/Staging Project Name.
- UAT/Staging Project ID.
- Production Project Name.
- Production Project ID.
- Infrastructure Owner.
- Billing Owner.
- Access Owner.

Do not submit keys, passwords, tokens, JWT secrets, connection strings, or screenshots containing credential material.
