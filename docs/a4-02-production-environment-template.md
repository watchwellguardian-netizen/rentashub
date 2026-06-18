# A4-02 Production Environment Evidence Template

Status: Credential-readiness template only.

Do not include secrets, keys, passwords, tokens, screenshots containing credentials, database URLs, JWTs, or service-role values in this document.

Production must remain isolated and must not receive A4 migrations until UAT signoff is approved.

## Environment Identity

- Environment: Production
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

- Production database isolated from Development: Pending
- Production database isolated from UAT/Staging: Pending
- Production auth configuration isolated from Development: Pending
- Production auth configuration isolated from UAT/Staging: Pending
- Production storage buckets isolated from Development: Pending
- Production storage buckets isolated from UAT/Staging: Pending
- Production migrations have not been executed: Pending

## Readiness Endpoint Expected Result

Expected after A4-02 and later A4 execution evidence:

- `/api/health/readiness` environment: production
- Database readiness: needs credentials until production activation is explicitly approved
- Auth readiness: needs credentials until production activation is explicitly approved
- Storage readiness: needs credentials until production activation is explicitly approved
- Production suitability: no until A4-05 and later security/compliance gates pass

## Sign-Off

- Prepared by:
- Reviewed by:
- Approval date:
- A4-02 Production decision: PASS / FAIL
- Blockers:
- Next action:
