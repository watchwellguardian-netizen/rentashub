# A4-02 UAT/Staging Environment Evidence Template

Status: Credential-readiness template only.

Do not include secrets, keys, passwords, tokens, screenshots containing credentials, database URLs, JWTs, or service-role values in this document.

## Environment Identity

- Environment: UAT/Staging
- Supabase project name:
- Supabase project ID:
- Environment owner:
- Access owner:
- Billing owner:

## Provisioning Status

- Database status: Not submitted / Provisioned / Blocked
- Auth status: Not submitted / Provisioned / Blocked
- Storage status: Not submitted / Provisioned / Blocked
- Backup status: Not submitted / Configured / Blocked

## Secret Storage Evidence

Record storage locations only. Do not record values.

- `SUPABASE_URL` storage location:
- `SUPABASE_ANON_KEY` storage location:
- `SUPABASE_SERVICE_ROLE_KEY` storage location:
- `DATABASE_URL` storage location:
- Secret access owner:
- Secret rotation owner:

## Environment Separation Evidence

- UAT/Staging database isolated from Development: Pending
- UAT/Staging database isolated from Production: Pending
- UAT/Staging auth configuration isolated from Development: Pending
- UAT/Staging auth configuration isolated from Production: Pending
- UAT/Staging storage buckets isolated from Development: Pending
- UAT/Staging storage buckets isolated from Production: Pending
- Production remains untouched until UAT signoff: Pending

## Readiness Endpoint Expected Result

Expected after A4-02 and later A4 execution evidence:

- `/api/health/readiness` environment: uat/staging
- Database readiness: needs credentials until migrations and connection are verified
- Auth readiness: needs credentials until live Supabase Auth is verified
- Storage readiness: needs credentials until buckets and policies are verified
- Production suitability: no

## Sign-Off

- Prepared by:
- Reviewed by:
- Approval date:
- A4-02 UAT/Staging decision: PASS / FAIL
- Blockers:
- Next action:
