-- Project A3: Supabase Storage Activation Readiness
-- This migration prepares metadata, policy, and audit structures for Supabase
-- Storage. It does not create live buckets, upload binary files, or enable real
-- signed URL generation.

CREATE TABLE IF NOT EXISTS public.storage_bucket_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name text NOT NULL UNIQUE,
  bucket_env_key text NOT NULL,
  provider text NOT NULL DEFAULT 'supabase',
  visibility text NOT NULL CHECK (visibility IN ('public', 'public_or_signed', 'private', 'private_restricted')),
  related_entity_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  allows_public_download boolean NOT NULL DEFAULT false,
  requires_signed_upload boolean NOT NULL DEFAULT true,
  requires_signed_download boolean NOT NULL DEFAULT true,
  requires_virus_scan boolean NOT NULL DEFAULT true,
  retention_policy text NOT NULL DEFAULT 'policy_required_before_live_activation',
  activation_status text NOT NULL DEFAULT 'credential_ready_only',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS bucket_name text;
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS upload_intent_id text;
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS signed_url_status text NOT NULL DEFAULT 'not_requested';
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'scan_not_active';
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS retention_status text NOT NULL DEFAULT 'retention_policy_pending';

ALTER TABLE public.storage_objects_audit ADD COLUMN IF NOT EXISTS upload_intent_id text;
ALTER TABLE public.storage_objects_audit ADD COLUMN IF NOT EXISTS signed_url_status text NOT NULL DEFAULT 'not_generated';
ALTER TABLE public.storage_objects_audit ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'scan_not_active';
ALTER TABLE public.storage_objects_audit ADD COLUMN IF NOT EXISTS access_decision text NOT NULL DEFAULT 'metadata_only';

CREATE INDEX IF NOT EXISTS idx_file_metadata_bucket_status ON public.file_metadata(bucket_name, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_file_metadata_entity_visibility ON public.file_metadata(entity_type, entity_id, visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_storage_bucket_policies_provider ON public.storage_bucket_policies(provider, activation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_storage_objects_audit_file ON public.storage_objects_audit(file_id, action);

INSERT INTO public.storage_bucket_policies (
  bucket_name,
  bucket_env_key,
  visibility,
  related_entity_types,
  allows_public_download,
  requires_signed_upload,
  requires_signed_download,
  requires_virus_scan,
  retention_policy,
  activation_status
) VALUES
  ('public-assets', 'FILE_STORAGE_BUCKET_PUBLIC_ASSETS', 'public', ARRAY['asset'], true, true, false, true, 'moderated_public_asset_retention_required', 'credential_ready_only'),
  ('supplier-logos', 'FILE_STORAGE_BUCKET_SUPPLIER_LOGOS', 'public_or_signed', ARRAY['supplier_profile'], true, true, false, true, 'supplier_profile_media_retention_required', 'credential_ready_only'),
  ('private-verification', 'FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION', 'private', ARRAY['verification'], false, true, true, true, 'kyc_verification_retention_legal_review_required', 'credential_ready_only'),
  ('private-inspections', 'FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS', 'private_restricted', ARRAY['inspection'], false, true, true, true, 'inspection_evidence_retention_required', 'credential_ready_only'),
  ('private-claims', 'FILE_STORAGE_BUCKET_PRIVATE_CLAIMS', 'private_restricted', ARRAY['claim', 'review'], false, true, true, true, 'claim_evidence_retention_required', 'credential_ready_only'),
  ('private-disputes', 'FILE_STORAGE_BUCKET_PRIVATE_DISPUTES', 'private_restricted', ARRAY['dispute', 'message'], false, true, true, true, 'dispute_evidence_retention_required', 'credential_ready_only')
ON CONFLICT (bucket_name) DO UPDATE SET
  bucket_env_key = EXCLUDED.bucket_env_key,
  visibility = EXCLUDED.visibility,
  related_entity_types = EXCLUDED.related_entity_types,
  allows_public_download = EXCLUDED.allows_public_download,
  requires_signed_upload = EXCLUDED.requires_signed_upload,
  requires_signed_download = EXCLUDED.requires_signed_download,
  requires_virus_scan = EXCLUDED.requires_virus_scan,
  retention_policy = EXCLUDED.retention_policy,
  activation_status = EXCLUDED.activation_status,
  updated_at = NOW();

ALTER TABLE public.storage_bucket_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_objects_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_bucket_policies_admin_read ON public.storage_bucket_policies;
CREATE POLICY storage_bucket_policies_admin_read
  ON public.storage_bucket_policies
  FOR SELECT
  USING (public.current_app_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS storage_objects_audit_admin_read ON public.storage_objects_audit;
CREATE POLICY storage_objects_audit_admin_read
  ON public.storage_objects_audit
  FOR SELECT
  USING (public.current_app_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS storage_objects_audit_owner_read ON public.storage_objects_audit;
CREATE POLICY storage_objects_audit_owner_read
  ON public.storage_objects_audit
  FOR SELECT
  USING (owner_id = public.current_app_user_id());

DROP TRIGGER IF EXISTS trg_storage_bucket_policies_updated_at ON public.storage_bucket_policies;
CREATE TRIGGER trg_storage_bucket_policies_updated_at
  BEFORE UPDATE ON public.storage_bucket_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Supabase storage.objects policies must be created after live buckets exist.
-- Required policy alignment:
-- 1. Public buckets may expose only moderated public asset/logo objects.
-- 2. Private verification, inspection, claim, and dispute buckets require
--    server-authorized signed URLs after file_metadata ownership checks.
-- 3. SUPABASE_SERVICE_ROLE_KEY remains server-only and must not be used by
--    frontend clients or documentation artifacts.
