# Supabase Auth and Storage Certification Checklist

Status: Required before UAT signoff.

## Auth Certification

- [ ] `AUTH_PROVIDER=supabase` configured in Development.
- [ ] `AUTH_PROVIDER=supabase` configured in UAT.
- [ ] Registration validated.
- [ ] Login validated.
- [ ] Logout validated.
- [ ] Password reset validated.
- [ ] Email verification validated.
- [ ] Expired session rejected.
- [ ] Revoked session rejected where supported.
- [ ] Role metadata mapped.
- [ ] Role aliases normalized.
- [ ] Protected frontend routes validated.
- [ ] Protected API routes validated.
- [ ] Dev headers disabled for production configuration.
- [ ] RLS policies aligned to auth claims.

## Storage Certification

- [ ] `public-assets` bucket created.
- [ ] `supplier-logos` bucket created.
- [ ] `private-verification` bucket created.
- [ ] `private-inspections` bucket created.
- [ ] `private-claims` bucket created.
- [ ] `private-disputes` bucket created.
- [ ] Public asset upload validated.
- [ ] Supplier logo upload validated.
- [ ] Verification document upload private.
- [ ] Inspection evidence upload private.
- [ ] Claim evidence upload private.
- [ ] Dispute evidence upload private.
- [ ] Signed URL generation validated.
- [ ] Public access rejected for private buckets.
- [ ] File metadata matches storage object references.
- [ ] Storage audit events recorded.

## Secrets Certification

- [ ] Service role key stored only in backend/server secrets.
- [ ] Frontend bundle scan passed.
- [ ] Repository secret scan passed.
- [ ] ZIP artifact secret scan passed.
- [ ] CI/CD secret masking verified.
- [ ] Rotation procedure documented.
- [ ] Emergency revoke process documented.

## Certification Decision

- Development Auth/Storage certification: Pending.
- UAT Auth/Storage certification: Pending.
- Production Auth/Storage authorization: NO-GO until UAT certification passes.
