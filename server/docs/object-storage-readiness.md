# Object Storage Integration Readiness

Module 40 moves RentasHub from file metadata-only storage toward a provider-ready object storage architecture. It does not activate real object storage, binary uploads, virus scanning, signed URL delivery, KYC document review, insurance processing, or production file delivery.

## Current State

Default mode:

```text
FILE_STORAGE_PROVIDER=local_placeholder
```

The local placeholder provider creates safe upload-intent metadata only. It does not accept raw binary files and does not generate signed upload URLs.

Provider-ready modes:

```text
FILE_STORAGE_PROVIDER=s3
FILE_STORAGE_PROVIDER=supabase
FILE_STORAGE_PROVIDER=cloudinary
```

If a provider is selected without required credentials, upload intent creation fails with a controlled configuration error. RentasHub does not silently fall back to local placeholder mode when a real provider is explicitly selected.

## Module 45 Supabase Storage Selection

Selected recommended provider: Supabase Storage.

Supabase-specific credential-ready behavior:

- `FILE_STORAGE_PROVIDER=supabase` is the selected production storage target.
- Supabase upload intent requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and the required public/private bucket names.
- Placeholder values are treated as missing credentials.
- Supabase upload intent returns provider-ready bucket/object metadata but does not generate real signed URLs until SDK integration is implemented and tested.
- Verification, inspection, claim, dispute, and message files cannot be public.
- Local placeholder mode remains available for demo/local use only.

See `server/docs/supabase-storage-activation.md`.

## Environment Variables

```text
FILE_STORAGE_PROVIDER=local_placeholder|s3|supabase|cloudinary
FILE_STORAGE_BUCKET=
FILE_STORAGE_REGION=
FILE_STORAGE_ACCESS_KEY=
FILE_STORAGE_SECRET_KEY=
FILE_STORAGE_BUCKET_PUBLIC_ASSETS=public-assets
FILE_STORAGE_BUCKET_SUPPLIER_LOGOS=supplier-logos
FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION=private-verification
FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS=private-inspections
FILE_STORAGE_BUCKET_PRIVATE_CLAIMS=private-claims
FILE_STORAGE_BUCKET_PRIVATE_DISPUTES=private-disputes
FILE_STORAGE_PUBLIC_BASE_URL=
FILE_STORAGE_SIGNED_URL_TTL_SECONDS=900
FILE_UPLOAD_MAX_MB=10
FILE_REQUIRE_VIRUS_SCAN=true
```

Provider-specific compatibility variables are also documented in `server/.env.example` for S3-compatible storage, Supabase Storage, and Cloudinary.

## Upload Intent Contract

`POST /api/files/upload-intent` returns:

```json
{
  "intent": {
    "uploadIntentId": "upload-file-id",
    "fileId": "file-id",
    "provider": "local_placeholder",
    "uploadUrl": null,
    "signedUploadUrl": null,
    "expiresAt": "ISO timestamp",
    "requiredHeaders": {
      "x-rentashub-upload-mode": "metadata-only-placeholder"
    }
  },
  "file": {
    "status": "pending_upload"
  }
}
```

For configured provider modes, `signedUploadUrl` remains a placeholder until a provider SDK/client is implemented and verified. No raw file content is accepted by the backend in this module.

## Future Attachment Points

The storage provider boundary is intended for:

- asset photos
- supplier profile logos and photos
- verification documents
- inspection evidence
- dispute evidence
- claim evidence
- review attachments
- message attachments

Frontend upload UI is not built in this module. Existing file metadata flows remain backend/API foundations only.

## S3-Compatible Setup

1. Choose a provider such as AWS S3, Cloudflare R2, Backblaze B2 S3 API, or another compatible service.
2. Create private buckets for restricted documents and a separate public-read bucket only if public asset media is intentionally allowed.
3. Set:

```text
FILE_STORAGE_PROVIDER=s3
FILE_STORAGE_BUCKET=<bucket>
FILE_STORAGE_REGION=<region>
FILE_STORAGE_ACCESS_KEY=<access key>
FILE_STORAGE_SECRET_KEY=<secret key>
FILE_STORAGE_PUBLIC_BASE_URL=<optional public CDN/base URL>
```

4. Add provider SDK/client implementation.
5. Generate scoped signed upload URLs with short TTL.
6. Verify MIME type, extension, size, checksum, and related entity permissions before issuing the URL.
7. Add virus scanning and quarantine workflow before exposing uploaded files.

## Supabase Storage Setup

1. Create Supabase buckets for public assets, supplier logos, verification, inspection, dispute, and claim evidence.
2. Set:

```text
FILE_STORAGE_PROVIDER=supabase
SUPABASE_URL=<project URL>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_ANON_KEY=<anon key>
FILE_STORAGE_BUCKET_PUBLIC_ASSETS=public-assets
FILE_STORAGE_BUCKET_SUPPLIER_LOGOS=supplier-logos
FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION=private-verification
FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS=private-inspections
FILE_STORAGE_BUCKET_PRIVATE_CLAIMS=private-claims
FILE_STORAGE_BUCKET_PRIVATE_DISPUTES=private-disputes
```

3. Keep service role keys server-side only.
4. Keep verification, inspection, claim, and dispute buckets private.
5. Generate signed upload/download URLs through the backend only after SDK integration is tested.
6. Add row-level access review for file metadata and bucket policies.

## Cloudinary Setup

1. Create upload presets and folder conventions for public media only where appropriate.
2. Set:

```text
FILE_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

3. Do not put private KYC, verification, insurance, dispute, or claim documents in public Cloudinary delivery flows.
4. Use signed uploads and restricted delivery where available.

## Security Notes

- Verification/KYC documents cannot be public.
- Private buckets are required for verification, inspection, dispute, claim, and message evidence.
- Signed URLs must be short-lived and scoped to one file path.
- Backend must validate file type, extension, size, owner, related entity, and visibility before issuing a signed URL.
- Virus/malware scanning is required before production file delivery.
- File metadata should store object keys and checksums, not binary file data.
- Payment card, bank, escrow, KYC provider secrets, and storage credentials must never be stored as file metadata.
- Retention lifecycle rules are required for abandoned uploads, rejected verification files, dispute evidence, and claim evidence.
- Audit logs should record upload intent creation, metadata changes, access changes, and deletion/retention actions.

## Readiness Reporting

`GET /api/health/readiness` reports:

- selected storage provider
- required credentials present or missing
- signed URL readiness
- virus scan readiness
- production suitability
- max upload size
- signed URL TTL

Readiness verifies configuration shape only. It does not prove provider connectivity, upload success, malware scanning, private bucket policy, legal KYC review, insurance coverage, or production security.
