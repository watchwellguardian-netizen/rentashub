# File Storage Security Foundation

Module 25 adds metadata-only file handling for RentasHub. It does not store binary file contents and does not connect to real object storage.

## Metadata-Only Design

The backend stores file metadata in `file_metadata`:

- owner user ID
- related entity type and ID
- original and stored placeholder names
- MIME type
- file size
- storage provider placeholder
- storage path placeholder
- visibility
- checksum placeholder
- status

Actual files must later be stored in a real object storage provider.

## Allowed File Types

Allowed:

- JPG/JPEG images
- PNG images
- WEBP images
- PDF documents

Blocked:

- executable files
- scripts
- shell files
- HTML/SVG files
- installer/binary-like file extensions

The current max file size is a placeholder limit of 10 MB.

## Provider-Ready Storage Boundary

Module 40 adds a provider-ready storage boundary for:

- `local_placeholder`
- `s3`
- `cloudinary`
- `supabase`

The default remains `local_placeholder`, which creates metadata-only upload intents. Real provider modes fail clearly when credentials are missing and do not silently fall back to local placeholder mode. See `server/docs/object-storage-readiness.md` for provider setup and readiness reporting.

## Privacy Handling

Verification/KYC files cannot be marked public. Owner and admin access is supported for metadata. Related entity access is conservative and metadata-only. No route returns actual binary content.

## Production Requirements Later

Before production use, file handling needs:

- virus and malware scanning
- signed URLs for upload and download
- encrypted object storage
- strict MIME sniffing and file signature checks
- audit logging for file access
- retention/deletion policies
- private bucket defaults
- KYC/verification document access controls
- evidence chain-of-custody rules for disputes and claims

This module does not implement live object-storage integration, virus scanning, signed URLs, encryption, KYC review, insurance processing, or production file delivery.
