# A4-02 Development Environment Evidence Template

Status: Credential-readiness template only.

Do not include secrets, keys, passwords, tokens, screenshots containing credentials, database URLs, JWTs, or service-role values in this document.

## Environment Identity

- Environment: Development
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

- Development database isolated from UAT/Staging: Pending
- Development database isolated from Production: Pending
- Development auth configuration isolated from UAT/Staging: Pending
- Development auth configuration isolated from Production: Pending
- Development storage buckets isolated from UAT/Staging: Pending
- Development storage buckets isolated from Production: Pending

## Readiness Endpoint Expected Result

Expected after A4-02 and later A4 execution evidence:

- `/api/health/readiness` environment: development
- Database readiness: needs credentials until migrations and connection are verified
- Auth readiness: needs credentials until live Supabase Auth is verified
- Storage readiness: needs credentials until buckets and policies are verified
- Production suitability: no

## Sign-Off

- Prepared by:
- Reviewed by:
- Approval date:
- A4-02 Development decision: PASS / FAIL
- Blockers:
- Next action:
