-- ACCEL-P1-008: Core rental production-readiness bridge.
-- Prepared SQL only. Do not execute against production until A4 evidence,
-- backup/restore validation, RLS tests, and release approval are accepted.
-- This migration is mirrored to both migration directories for future execution.

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contract_status text NOT NULL DEFAULT 'not_generated';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'not_started';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkin_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id text;
UPDATE public.notifications SET recipient_id = user_id WHERE recipient_id IS NULL AND user_id IS NOT NULL;

ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS provider_event_id text;
ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id text;

CREATE TABLE IF NOT EXISTS public.core_rental_idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_hash text,
  status text NOT NULL DEFAULT 'recorded',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz,
  deleted_at timestamptz,
  UNIQUE(actor_id, action, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.core_rental_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  booking_id text NOT NULL,
  provider text NOT NULL DEFAULT 'sandbox_placeholder',
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  event_status text NOT NULL,
  amount numeric(14,2),
  currency text NOT NULL DEFAULT 'JMD',
  signature_verified boolean NOT NULL DEFAULT false,
  idempotency_key text,
  ledger_event_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.core_rental_storage_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case text NOT NULL UNIQUE,
  bucket_name text NOT NULL,
  path_template text NOT NULL,
  owner_role text NOT NULL,
  visibility text NOT NULL,
  allowed_mime_types text[] NOT NULL,
  max_mb integer NOT NULL,
  signed_upload_required boolean NOT NULL DEFAULT true,
  signed_download_required boolean NOT NULL DEFAULT true,
  malware_scan_required boolean NOT NULL DEFAULT true,
  retention_policy text NOT NULL,
  deletion_policy text NOT NULL,
  activation_status text NOT NULL DEFAULT 'prepared_not_activated',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant_owner ON public.assets(tenant_id, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_customer ON public.bookings(tenant_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_supplier ON public.bookings(tenant_id, supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_asset_window ON public.bookings(asset_id, start_at, end_at, status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_customer_idempotency ON public.bookings(customer_id, idempotency_key) WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_core_rental_idempotency_lookup ON public.core_rental_idempotency_records(actor_id, action, idempotency_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_core_rental_payment_events_booking ON public.core_rental_payment_events(booking_id, event_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id) WHERE deleted_at IS NULL;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_rental_idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_rental_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_rental_storage_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS core_assets_supplier_admin_select ON public.assets;
CREATE POLICY core_assets_supplier_admin_select ON public.assets
  FOR SELECT TO authenticated
  USING (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_assets_supplier_admin_insert ON public.assets;
CREATE POLICY core_assets_supplier_admin_insert ON public.assets
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_assets_supplier_admin_update ON public.assets;
CREATE POLICY core_assets_supplier_admin_update ON public.assets
  FOR UPDATE TO authenticated
  USING (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_bookings_party_admin_select ON public.bookings;
CREATE POLICY core_bookings_party_admin_select ON public.bookings
  FOR SELECT TO authenticated
  USING (customer_id = public.rentashub_auth_user_id() OR supplier_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_bookings_customer_admin_insert ON public.bookings;
CREATE POLICY core_bookings_customer_admin_insert ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_bookings_party_admin_update ON public.bookings;
CREATE POLICY core_bookings_party_admin_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (customer_id = public.rentashub_auth_user_id() OR supplier_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (customer_id = public.rentashub_auth_user_id() OR supplier_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_payment_ledger_party_admin_select ON public.payment_ledger;
CREATE POLICY core_payment_ledger_party_admin_select ON public.payment_ledger
  FOR SELECT TO authenticated
  USING (customer_id = public.rentashub_auth_user_id() OR supplier_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_file_metadata_owner_admin_select ON public.file_metadata;
CREATE POLICY core_file_metadata_owner_admin_select ON public.file_metadata
  FOR SELECT TO authenticated
  USING (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_notifications_recipient_admin_select ON public.notifications;
CREATE POLICY core_notifications_recipient_admin_select ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_audit_logs_admin_select ON public.audit_logs;
CREATE POLICY core_audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.rentashub_is_admin());

DROP POLICY IF EXISTS core_idempotency_actor_admin_select ON public.core_rental_idempotency_records;
CREATE POLICY core_idempotency_actor_admin_select ON public.core_rental_idempotency_records
  FOR SELECT TO authenticated
  USING (actor_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS core_payment_events_admin_select ON public.core_rental_payment_events;
CREATE POLICY core_payment_events_admin_select ON public.core_rental_payment_events
  FOR SELECT TO authenticated
  USING (public.rentashub_is_admin());

DROP POLICY IF EXISTS core_storage_requirements_admin_select ON public.core_rental_storage_requirements;
CREATE POLICY core_storage_requirements_admin_select ON public.core_rental_storage_requirements
  FOR SELECT TO authenticated
  USING (public.rentashub_is_admin());

INSERT INTO public.core_rental_storage_requirements (
  use_case, bucket_name, path_template, owner_role, visibility, allowed_mime_types, max_mb,
  signed_upload_required, signed_download_required, malware_scan_required, retention_policy, deletion_policy
) VALUES
  ('listing_images', 'public-assets', 'assets/{asset_id}/listing/{file_id}', 'supplier', 'public_after_moderation', ARRAY['image/jpeg','image/png','image/webp'], 10, true, false, true, 'asset lifecycle plus audit retention', 'soft delete metadata before object purge'),
  ('asset_documents', 'private-verification', 'assets/{asset_id}/documents/{file_id}', 'supplier', 'private', ARRAY['application/pdf','image/jpeg','image/png'], 25, true, true, true, 'legal review required', 'retention hold before purge'),
  ('contracts', 'private-claims', 'bookings/{booking_id}/contracts/{file_id}', 'booking_party', 'private_restricted', ARRAY['application/pdf'], 15, true, true, true, 'contract retention schedule', 'not before legal retention expiry'),
  ('check_in_evidence', 'private-inspections', 'bookings/{booking_id}/check-in/{file_id}', 'booking_party', 'private_restricted', ARRAY['image/jpeg','image/png','video/mp4','application/pdf'], 50, true, true, true, 'inspection evidence retention', 'claim/dispute hold aware'),
  ('check_out_evidence', 'private-inspections', 'bookings/{booking_id}/check-out/{file_id}', 'booking_party', 'private_restricted', ARRAY['image/jpeg','image/png','video/mp4','application/pdf'], 50, true, true, true, 'inspection evidence retention', 'claim/dispute hold aware'),
  ('dispute_evidence', 'private-disputes', 'disputes/{dispute_id}/evidence/{file_id}', 'dispute_party', 'private_restricted', ARRAY['application/pdf','image/jpeg','image/png','video/mp4'], 50, true, true, true, 'dispute legal hold', 'legal approval required')
ON CONFLICT (use_case) DO UPDATE SET
  bucket_name = EXCLUDED.bucket_name,
  path_template = EXCLUDED.path_template,
  visibility = EXCLUDED.visibility,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  max_mb = EXCLUDED.max_mb,
  updated_at = NOW();
