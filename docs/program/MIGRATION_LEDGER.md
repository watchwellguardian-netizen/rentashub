# Migration Ledger

Only WS1 Core Platform Foundation may approve shared migration ordering.

| Migration | Purpose | Owner | Status | Reset tested | RLS impact | Rollback reference | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `001_initial_schema.sql` | Initial local platform schema. | WS1 | Present | Passed in-memory reset | Partial | Required | Existing baseline migration. |
| `002_auth_foundation.sql` | Authentication foundation. | WS1 | Present | Passed in-memory reset | Partial | Required | Provider-independent auth schema support. |
| `003_file_storage_foundation.sql` | File metadata/storage foundation. | WS1 | Present | Passed in-memory reset | Partial | Required | Does not prove live object storage. |
| `004_supabase_activation_architecture.sql` | Supabase activation architecture. | WS1 | Present | Passed in-memory reset only; not live executed | Expected | Required | A4-03 target. |
| `005_supabase_auth_rbac_activation.sql` | Supabase Auth/RBAC activation. | WS1 | Present | Passed in-memory reset only; not live executed | Expected | Required | A4-03/A4-04 target. |
| `006_supabase_storage_activation.sql` | Supabase Storage activation. | WS1 | Present | Passed in-memory reset only; not live executed | Expected | Required | A4-03/A4-04 target. |
| `007_audit_logging_activation.sql` | Audit logging activation. | WS1 | Present | Passed in-memory reset only; not live executed | Expected | Required | A4-03/A4-04 target. |

Next required migration work:

- Local reset evidence generated at `artifacts/accelerated-delivery/local-foundation-evidence.md`.
- Add rollback checklist per SQL file.
- Add RLS coverage evidence.
- Do not run Production migrations until UAT signoff.
