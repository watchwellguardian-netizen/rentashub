-- RentasHub Project A1 Supabase activation architecture.
-- This migration is intended for Supabase PostgreSQL activation only.
-- It prepares tenant-safe audit fields, Phase 2 marketplace tables, and RLS policies.
-- Do not apply to production until credentials, backup, restore, and rollback approvals exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.rentashub_auth_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')
  );
$$;

CREATE OR REPLACE FUNCTION public.rentashub_auth_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role', ''),
    NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION public.rentashub_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.rentashub_auth_role() IN ('admin', 'super_admin', 'service_role');
$$;

CREATE OR REPLACE FUNCTION public.rentashub_is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.rentashub_auth_role() = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.rentashub_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT public.rentashub_auth_role();
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(public.rentashub_auth_user_id(), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  environment text NOT NULL DEFAULT 'uat',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'supplier', 'dealer', 'inspector', 'transport_provider', 'financing_partner', 'admin', 'super_admin')),
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  seller_id uuid NOT NULL,
  asset_id uuid,
  lot_number text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  parish text,
  auction_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  lifecycle_state text NOT NULL DEFAULT 'available_for_auction',
  starting_bid numeric(14,2) DEFAULT 0,
  reserve_price numeric(14,2) DEFAULT 0,
  current_bid numeric(14,2) DEFAULT 0,
  deposit_required numeric(14,2) DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'not_started',
  escrow_status text NOT NULL DEFAULT 'not_created',
  compliance_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_status_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  auction_id uuid NOT NULL REFERENCES public.auctions(id),
  bidder_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  bid_type text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'submitted',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.inspection_marketplace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  auction_id uuid REFERENCES public.auctions(id),
  asset_id uuid,
  requester_id uuid NOT NULL,
  inspector_id uuid,
  status text NOT NULL DEFAULT 'requested',
  quote_amount numeric(14,2),
  report_file_id uuid,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.transport_marketplace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  auction_id uuid REFERENCES public.auctions(id),
  asset_id uuid,
  requester_id uuid NOT NULL,
  provider_id uuid,
  pickup_location text,
  dropoff_location text,
  status text NOT NULL DEFAULT 'quote_requested',
  quote_amount numeric(14,2),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.financing_marketplace_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  auction_id uuid REFERENCES public.auctions(id),
  asset_id uuid,
  requester_id uuid NOT NULL,
  partner_id uuid,
  product_id text,
  status text NOT NULL DEFAULT 'submitted',
  consent_captured_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  related_entity_type text NOT NULL,
  related_entity_id uuid,
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'placeholder_generated',
  file_id uuid,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  recipient_id uuid,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'queued',
  retry_count integer NOT NULL DEFAULT 0,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  actor_id uuid,
  event_type text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ai_recommendation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('listing_quality', 'valuation')),
  related_entity_type text NOT NULL,
  related_entity_id uuid,
  actor_id uuid,
  supplier_id uuid,
  confidence_score integer,
  recommendation_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  acceptance_status text NOT NULL DEFAULT 'pending_review',
  accepted_by uuid,
  accepted_at timestamptz,
  provider_status text NOT NULL DEFAULT 'local_provider_ready_only',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.storage_objects_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  file_id uuid,
  bucket_name text NOT NULL,
  object_path text NOT NULL,
  owner_id uuid,
  visibility text NOT NULL DEFAULT 'private',
  action text NOT NULL,
  actor_id uuid,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.file_metadata ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_auctions_tenant_status ON public.auctions(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON public.auction_bids(auction_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_audit_supplier ON public.ai_recommendation_audit(supplier_id, recommendation_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_events_recipient ON public.notification_events(recipient_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_generated_documents_entity ON public.generated_documents(related_entity_type, related_entity_id) WHERE deleted_at IS NULL;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenants',
    'user_role_assignments',
    'users',
    'assets',
    'bookings',
    'inspections',
    'file_metadata',
    'auctions',
    'auction_bids',
    'inspection_marketplace_requests',
    'transport_marketplace_requests',
    'financing_marketplace_referrals',
    'generated_documents',
    'notification_events',
    'analytics_events',
    'ai_recommendation_audit',
    'storage_objects_audit'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "service role full access" ON public.tenants;
CREATE POLICY "service role full access" ON public.tenants
  FOR ALL USING (public.rentashub_is_service_role() OR public.rentashub_is_admin())
  WITH CHECK (public.rentashub_is_service_role() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "admins manage user role assignments" ON public.user_role_assignments;
CREATE POLICY "admins manage user role assignments" ON public.user_role_assignments
  FOR ALL USING (public.rentashub_is_admin())
  WITH CHECK (public.rentashub_is_admin());

DROP POLICY IF EXISTS "users can read own profile" ON public.users;
CREATE POLICY "users can read own profile" ON public.users
  FOR SELECT USING (id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "owners and admins manage assets" ON public.assets;
CREATE POLICY "owners and admins manage assets" ON public.assets
  FOR ALL USING (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (owner_id = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "public active assets readable" ON public.assets;
CREATE POLICY "public active assets readable" ON public.assets
  FOR SELECT USING (deleted_at IS NULL AND availability_status IN ('available', 'pending approval', 'verified'));

DROP POLICY IF EXISTS "auction sellers admins read manage" ON public.auctions;
CREATE POLICY "auction sellers admins read manage" ON public.auctions
  FOR ALL USING (seller_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (seller_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "public live auctions readable" ON public.auctions;
CREATE POLICY "public live auctions readable" ON public.auctions
  FOR SELECT USING (deleted_at IS NULL AND status IN ('upcoming', 'live', 'extended', 'closed', 'sold', 'unsold'));

DROP POLICY IF EXISTS "bidders admins read bids" ON public.auction_bids;
CREATE POLICY "bidders admins read bids" ON public.auction_bids
  FOR SELECT USING (bidder_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "bidders create own bids" ON public.auction_bids;
CREATE POLICY "bidders create own bids" ON public.auction_bids
  FOR INSERT WITH CHECK (bidder_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "participants manage marketplace service requests" ON public.inspection_marketplace_requests;
CREATE POLICY "participants manage marketplace service requests" ON public.inspection_marketplace_requests
  FOR ALL USING (requester_id::text = public.rentashub_auth_user_id() OR inspector_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (requester_id::text = public.rentashub_auth_user_id() OR inspector_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "participants manage transport requests" ON public.transport_marketplace_requests;
CREATE POLICY "participants manage transport requests" ON public.transport_marketplace_requests
  FOR ALL USING (requester_id::text = public.rentashub_auth_user_id() OR provider_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (requester_id::text = public.rentashub_auth_user_id() OR provider_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "participants manage financing referrals" ON public.financing_marketplace_referrals;
CREATE POLICY "participants manage financing referrals" ON public.financing_marketplace_referrals
  FOR ALL USING (requester_id::text = public.rentashub_auth_user_id() OR partner_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (requester_id::text = public.rentashub_auth_user_id() OR partner_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "document participants read generated docs" ON public.generated_documents;
CREATE POLICY "document participants read generated docs" ON public.generated_documents
  FOR SELECT USING (created_by::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "users read own notifications" ON public.notification_events;
CREATE POLICY "users read own notifications" ON public.notification_events
  FOR SELECT USING (recipient_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "admins read analytics" ON public.analytics_events;
CREATE POLICY "admins read analytics" ON public.analytics_events
  FOR SELECT USING (public.rentashub_is_admin());

DROP POLICY IF EXISTS "suppliers admins read ai recommendation audit" ON public.ai_recommendation_audit;
CREATE POLICY "suppliers admins read ai recommendation audit" ON public.ai_recommendation_audit
  FOR SELECT USING (supplier_id::text = public.rentashub_auth_user_id() OR actor_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "admins read storage audit" ON public.storage_objects_audit;
CREATE POLICY "admins read storage audit" ON public.storage_objects_audit
  FOR SELECT USING (owner_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP TRIGGER IF EXISTS tenants_touch_updated_at ON public.tenants;
CREATE TRIGGER tenants_touch_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.rentashub_touch_updated_at();

DROP TRIGGER IF EXISTS user_role_assignments_touch_updated_at ON public.user_role_assignments;
CREATE TRIGGER user_role_assignments_touch_updated_at
  BEFORE UPDATE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.rentashub_touch_updated_at();

DROP TRIGGER IF EXISTS auctions_touch_updated_at ON public.auctions;
CREATE TRIGGER auctions_touch_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.rentashub_touch_updated_at();

DROP TRIGGER IF EXISTS ai_recommendation_audit_touch_updated_at ON public.ai_recommendation_audit;
CREATE TRIGGER ai_recommendation_audit_touch_updated_at
  BEFORE UPDATE ON public.ai_recommendation_audit
  FOR EACH ROW EXECUTE FUNCTION public.rentashub_touch_updated_at();

INSERT INTO public.tenants (slug, name, environment)
VALUES ('rentashub-staging', 'RentasHub Staging', 'uat')
ON CONFLICT (slug) DO NOTHING;
