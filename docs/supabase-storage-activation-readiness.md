# Project A3 - Supabase Storage Activation Readiness

Status: Credential-ready only.

This project prepares RentasHub for Supabase Storage activation. It does not activate live storage credentials, create real buckets, upload binary files, generate real signed URLs, enable virus scanning, or certify production storage security.

## Activation Boundary

Local placeholder storage remains safe for demo and restricted review environments. If `FILE_STORAGE_PROVIDER=supabase` is explicitly selected, RentasHub must fail clearly when Supabase credentials, bucket names, or policy inputs are missing. It must not silently fall back to local placeholder mode.

## Required Environment

```text
FILE_STORAGE_PROVIDER=supabase
SUPABASE_URL=<required>
SUPABASE_ANON_KEY=<required>
SUPABASE_SERVICE_ROLE_KEY=<server-only required>
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

`SUPABASE_SERVICE_ROLE_KEY` is a privileged server-side secret. It must only live in backend/server environment variables, encrypted CI/CD secrets, or a managed secret vault. It must never be committed, included in ZIP artifacts, embedded in frontend code, pasted into chat, sent by email, shown in screenshots, or placed in documentation.

## Bucket Architecture

| Bucket | Visibility | Contents | Live activation rule |
|---|---|---|---|
| `public-assets` | Public | Listing and auction asset photos | Public only after validation and moderation. |
| `supplier-logos` | Public or signed | Supplier logos and public profile media | Public only for approved profile media; otherwise signed. |
| `private-verification` | Private | KYC, business registration, ownership, insurance, proof documents | Never public. Signed access only. |
| `private-inspections` | Private/restricted | Inspection reports, condition photos, VIN/chassis/serial evidence | Signed access for involved parties and admins only. |
| `private-claims` | Private/restricted | Claim evidence, repair estimates, claim decision files | Signed access for involved parties and authorized reviewers only. |
| `private-disputes` | Private/restricted | Dispute evidence, mediation notes, legal-sensitive files | Signed access for involved parties and authorized admins only. |

## Upload Policy Framework

RentasHub routes files by `relatedEntityType`:

| Entity type | Bucket | Public allowed |
|---|---|---|
| `asset` | `public-assets` | Yes, after validation/moderation |
| `supplier_profile` | `supplier-logos` | Conditional |
| `verification` | `private-verification` | No |
| `inspection` | `private-inspections` | No |
| `claim` | `private-claims` | No |
| `review` | `private-claims` | No |
| `dispute` | `private-disputes` | No |
| `message` | `private-disputes` | No |

Validation must continue to enforce allowed MIME types, file extensions, max file size, owner identity, related entity ID, storage provider, and visibility before issuing any upload intent.

## Signed URL Strategy

Upload:

- Future Supabase method: `createSignedUploadUrl`.
- TTL source: `FILE_STORAGE_SIGNED_URL_TTL_SECONDS`.
- Default TTL: 900 seconds.
- Current status: provider SDK required; no real signed URL is generated.

Download:

- Future Supabase method: `createSignedUrl`.
- Private bucket downloads require backend authorization before a signed URL is issued.
- Current status: provider SDK required; no real signed download URL is generated.

Signed URLs must be short-lived, scoped to one object path, and recorded in audit logs.

## Storage Audit Logging

Required audit events:

- `storage.upload_intent.created`
- `storage.signed_upload_url.requested`
- `storage.metadata.created`
- `storage.object_uploaded.confirmed`
- `storage.signed_download_url.requested`
- `storage.visibility.changed`
- `storage.object.soft_deleted`
- `storage.access.denied`

Audit records should include user ID, role, file ID, bucket name, object path, related entity, access decision, signed URL status, scan status, request ID, and timestamp.

## RLS And Storage Policy Alignment

Database metadata and Supabase Storage policies must agree:

- `file_metadata` is the application source of truth.
- `storage_objects_audit` records storage decisions and access attempts.
- `storage_bucket_policies` documents bucket behavior and required controls.
- Supabase `storage.objects` policies must not allow anonymous reads for private buckets.
- Private verification, inspection, claim, dispute, and message evidence must require backend authorization and signed URLs.
- Admin users may review metadata but must not bypass private file controls for public downloads.

Live activation must validate both PostgreSQL RLS and Supabase bucket policies in staging.

## Connection Points

Listing photo storage:

- Asset and auction listing media use `public-assets` after validation.

Inspection report storage:

- Inspection reports and photos use `private-inspections`.

Auction/document storage:

- Generated public auction images may use `public-assets`.
- Legal-sensitive auction documents, dispute evidence, and escrow evidence must use private buckets.

User upload storage:

- User-uploaded files are routed by related entity type and visibility.

## Activation Steps

1. Create the six Supabase buckets.
2. Keep private buckets private.
3. Store `SUPABASE_SERVICE_ROLE_KEY` only in server-side secrets.
4. Run migration `006_supabase_storage_activation.sql`.
5. Validate `/api/health/readiness` reports Supabase Storage credential status.
6. Request upload intents for asset, verification, inspection, claim, and dispute files.
7. Confirm public visibility is rejected for private evidence categories.
8. Add Supabase SDK integration in a later credentialed activation pass.
9. Generate signed upload/download URLs in staging only after credentials are supplied.
10. Confirm private signed URLs expire and anonymous downloads fail.
11. Confirm storage audit events are written.
12. Confirm virus scanning or quarantine workflow before real user files are accepted.

## Rollback

If activation fails in staging:

1. Set `FILE_STORAGE_PROVIDER=local_placeholder` only in non-production review environments.
2. Disable frontend upload UI if enabled.
3. Preserve `file_metadata` records.
4. Reconcile Supabase objects against metadata before deletion.
5. Revoke and rotate exposed keys.
6. Rerun upload-intent, access-control, and audit tests before retrying.

## Completion Criteria

Credential-ready completion:

- Bucket architecture documented.
- Upload policy framework implemented.
- Signed URL strategy represented without claiming live signed URLs.
- Storage audit events documented and migration-prepared.
- RLS/storage policy alignment documented.
- Missing/placeholder credentials fail clearly.
- Tests, build, smoke, and ZIP pass.

Live activation is complete only after:

- Real Supabase credentials are supplied through secure secrets management.
- Buckets exist in Supabase.
- Bucket policies are reviewed and tested.
- Supabase SDK signed upload/download URLs work in staging.
- Private file access and expiration tests pass.
- Virus scanning/quarantine policy is active or explicitly approved for staging limits.
- Full regression passes.
