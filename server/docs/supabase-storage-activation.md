# Supabase Storage Activation

Module 45 selected Supabase Storage as the recommended object storage provider. Project A3 extends that foundation with bucket architecture, upload policy, signed URL strategy, storage audit logging, and RLS/storage policy alignment. This remains credential-ready only. It does not activate real file upload, signed URL generation, virus scanning, private bucket enforcement, CDN delivery, KYC review, claims adjudication, or production file storage unless real Supabase credentials and bucket names are supplied and tested.

## Current Status

- Selected provider: Supabase Storage.
- Local/default provider: `local_placeholder` for demo and restricted environments.
- Real activation status: credential-ready only.
- Silent fallback rule: if `FILE_STORAGE_PROVIDER=supabase` is explicitly selected, upload intent must fail clearly when credentials or bucket names are missing. It must not fall back to local placeholder mode.
- Current activation code: `server/src/files/supabaseStorageActivation.js`.
- Current migration: `server/migrations/006_supabase_storage_activation.sql`.
- Current handoff: `docs/supabase-storage-activation-readiness.md`.

## Required Supabase Variables

```text
FILE_STORAGE_PROVIDER=supabase
SUPABASE_URL=<project URL>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
SUPABASE_ANON_KEY=<public anon key for future frontend integration>
FILE_STORAGE_BUCKET_PUBLIC_ASSETS=public-assets
FILE_STORAGE_BUCKET_SUPPLIER_LOGOS=supplier-logos
FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION=private-verification
FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS=private-inspections
FILE_STORAGE_BUCKET_PRIVATE_CLAIMS=private-claims
FILE_STORAGE_BUCKET_PRIVATE_DISPUTES=private-disputes
FILE_STORAGE_SIGNED_URL_TTL_SECONDS=900
FILE_UPLOAD_MAX_MB=10
FILE_REQUIRE_VIRUS_SCAN=true
FILE_VIRUS_SCAN_PROVIDER=<required before real scanning claims>
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code, screenshots, tickets, logs, or client bundles.

## Recommended Buckets

| Bucket | Suggested visibility | Contents | Rule |
|---|---|---|---|
| `public-assets` | Public | Public asset listing photos | May be public after file validation and moderation checks. |
| `supplier-logos` | Public or signed | Supplier profile logos/photos | May be public for approved suppliers; signed/restricted for incomplete or private profiles. |
| `private-verification` | Private | ID, KYC, business registration, proof of address, insurance, ownership documents | Must never be public. |
| `private-inspections` | Private/restricted | Check-in/check-out photos, odometer, condition evidence | Must be restricted to booking parties, supplier, and approved admin roles. |
| `private-claims` | Private/restricted | Damage claims, repair estimates, claim evidence | Must be restricted to involved parties and admin/claims reviewer roles. |
| `private-disputes` | Private/restricted | Dispute evidence, mediation notes, legal-sensitive attachments | Must be restricted to involved parties and authorized admins. |

## How To Create Buckets

1. Open Supabase project dashboard.
2. Open Storage.
3. Create the six buckets above.
4. Mark only `public-assets` public by default.
5. Keep `private-verification`, `private-inspections`, `private-claims`, and `private-disputes` private.
6. Decide whether `supplier-logos` is public or signed based on supplier approval status.
7. Add bucket policies only after backend ownership checks are ready.
8. Add retention/lifecycle rules for abandoned upload intents and old evidence.

## Upload Intent Behavior

Endpoint:

```text
POST /api/files/upload-intent
```

With local placeholder mode, the response remains metadata-only.

With `FILE_STORAGE_PROVIDER=supabase` and missing credentials, the response fails with:

```text
storage_provider_not_configured
```

With all credential variables present, the response is still provider-ready only:

```json
{
  "provider": "supabase",
  "bucket": "public-assets",
  "objectPath": "supabase/asset/asset-id/file-id-photo.jpg",
  "signedUploadUrl": null,
  "signedUploadUrlStatus": "provider_sdk_not_activated"
}
```

No real signed upload URL is generated until the Supabase SDK/client is implemented and tested in a proper environment.

## Private Signed URL Test Plan

After credentials and SDK integration are added:

1. Request upload intent for `verification`.
2. Confirm bucket is `private-verification`.
3. Confirm `visibility=public` is rejected.
4. Upload a test PDF using the signed URL.
5. Confirm anonymous download fails.
6. Confirm owner/admin authorized signed download works.
7. Confirm URL expires after `FILE_STORAGE_SIGNED_URL_TTL_SECONDS`.
8. Confirm audit log records upload intent, metadata update, and access events.

## Project A3 Policy Alignment

Project A3 adds a `storage_bucket_policies` migration table and additional file metadata fields for bucket name, upload intent ID, signed URL status, scan status, and retention status. These are activation scaffolds only until the Supabase project is live.

Storage audit events must cover upload intent creation, signed upload/download URL requests, object upload confirmation, metadata creation, visibility changes, soft deletes, and denied access attempts.

Supabase `storage.objects` policies must be aligned with application `file_metadata` ownership, tenant, role, and related entity checks before live activation.

## Rollback

If Supabase Storage activation fails:

1. Set `FILE_STORAGE_PROVIDER=local_placeholder` in non-production review environments only.
2. Disable frontend upload UI if enabled.
3. Preserve file metadata records.
4. Do not delete Supabase objects until metadata and audit logs are reconciled.
5. Revoke compromised service role keys immediately.
6. Rotate keys and rerun upload-intent tests before retrying.

## Security Cautions

- Verification/KYC files must never be public.
- Service role keys are server-only.
- Signed URLs must be short-lived and scoped to one object path.
- Virus scanning must be active before accepting real uploads.
- Store file metadata in the database; store binary files only in Supabase Storage.
- Do not store payment card, bank, escrow, or KYC provider secrets as file metadata.
- Claims and dispute evidence may become legal-sensitive records; access and retention require legal review.

## Remaining Manual Gates

- Real Supabase project URL.
- Real Supabase anon key and service role key.
- Real bucket creation and policies.
- Supabase SDK/client implementation.
- Signed URL generation and expiry verification.
- Virus scanning provider and quarantine workflow.
- Production access review.
