-- Project B2: Audit Logging Activation Readiness
-- Strengthens audit log records for enterprise review. This does not activate
-- a live SIEM, external log drain, compliance-certified immutable ledger, or
-- legal archive.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'api';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS immutable_style boolean NOT NULL DEFAULT true;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS previous_hash text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS immutable_hash text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS retention_policy text NOT NULL DEFAULT 'default';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS export_status text NOT NULL DEFAULT 'export_ready_placeholder';

CREATE TABLE IF NOT EXISTS public.audit_event_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  action text NOT NULL UNIQUE,
  severity text NOT NULL DEFAULT 'info',
  retention_policy text NOT NULL DEFAULT 'default',
  exportable boolean NOT NULL DEFAULT true,
  live_siem_required boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.audit_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL UNIQUE,
  retention_days integer NOT NULL,
  legal_hold_supported boolean NOT NULL DEFAULT true,
  exportable boolean NOT NULL DEFAULT true,
  live_archive_required boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created ON public.audit_logs(category, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON public.audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_immutable_hash ON public.audit_logs(immutable_hash);
CREATE INDEX IF NOT EXISTS idx_audit_event_catalog_category ON public.audit_event_catalog(category) WHERE deleted_at IS NULL;

INSERT INTO public.audit_retention_policies (policy_key, retention_days, legal_hold_supported, exportable, live_archive_required, description)
VALUES
  ('default', 365, true, true, false, 'Default operational audit retention placeholder.'),
  ('auth', 730, true, true, true, 'Authentication/session audit retention placeholder.'),
  ('rbac', 730, true, true, true, 'Role and permission audit retention placeholder.'),
  ('payments', 2555, true, true, true, 'Payment, payout, refund, and escrow audit retention placeholder.'),
  ('trustSafety', 2555, true, true, true, 'Claims, disputes, reviews, and trust/risk audit retention placeholder.'),
  ('storage', 2555, true, true, true, 'File, evidence, signed URL, and storage access audit retention placeholder.')
ON CONFLICT (policy_key) DO UPDATE SET
  retention_days = EXCLUDED.retention_days,
  legal_hold_supported = EXCLUDED.legal_hold_supported,
  exportable = EXCLUDED.exportable,
  live_archive_required = EXCLUDED.live_archive_required,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO public.audit_event_catalog (category, action, severity, retention_policy, live_siem_required, description)
VALUES
  ('auth', 'auth.login_failed', 'high', 'auth', true, 'Failed login audit event.'),
  ('rbac', 'rbac.permission_denied', 'high', 'rbac', true, 'Permission denied audit event.'),
  ('marketplace', 'assets.created', 'medium', 'default', false, 'Asset listing created.'),
  ('marketplace', 'auctions.created', 'medium', 'default', false, 'Auction listing created.'),
  ('operations', 'inspections.created', 'medium', 'default', false, 'Inspection record created.'),
  ('operations', 'transport.requested', 'medium', 'default', false, 'Transport request created.'),
  ('operations', 'financing.referral.created', 'medium', 'default', false, 'Financing referral created.'),
  ('communications', 'messages.created', 'info', 'default', false, 'Message created.'),
  ('communications', 'notifications.created', 'info', 'default', false, 'Notification created.'),
  ('communications', 'documents.generated', 'medium', 'default', false, 'Document generated.'),
  ('trustSafety', 'claims.created', 'high', 'trustSafety', true, 'Claim created.'),
  ('trustSafety', 'disputes.created', 'high', 'trustSafety', true, 'Dispute created.'),
  ('trustSafety', 'reviews.created', 'medium', 'trustSafety', false, 'Review created.'),
  ('payments', 'payments.simulated', 'high', 'payments', true, 'Simulated payment recorded.'),
  ('payments', 'payouts.simulated_requested', 'high', 'payments', true, 'Simulated payout request recorded.'),
  ('storage', 'files.upload_intent.created', 'high', 'storage', true, 'File upload intent created.'),
  ('storage', 'storage.access.denied', 'high', 'storage', true, 'Storage access denied.'),
  ('intelligence', 'ai.listing.recommendation_recorded', 'info', 'default', false, 'AI listing recommendation audit.'),
  ('intelligence', 'ai.valuation.recommendation_recorded', 'info', 'default', false, 'AI valuation recommendation audit.'),
  ('system', 'monitoring.test_event', 'info', 'default', false, 'Monitoring test event.')
ON CONFLICT (action) DO UPDATE SET
  category = EXCLUDED.category,
  severity = EXCLUDED.severity,
  retention_policy = EXCLUDED.retention_policy,
  live_siem_required = EXCLUDED.live_siem_required,
  description = EXCLUDED.description,
  updated_at = NOW();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_event_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read
  ON public.audit_logs
  FOR SELECT
  USING (public.current_app_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS audit_event_catalog_admin_read ON public.audit_event_catalog;
CREATE POLICY audit_event_catalog_admin_read
  ON public.audit_event_catalog
  FOR SELECT
  USING (public.current_app_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS audit_retention_policies_admin_read ON public.audit_retention_policies;
CREATE POLICY audit_retention_policies_admin_read
  ON public.audit_retention_policies
  FOR SELECT
  USING (public.current_app_role() IN ('admin', 'super_admin'));

DROP TRIGGER IF EXISTS trg_audit_event_catalog_updated_at ON public.audit_event_catalog;
CREATE TRIGGER trg_audit_event_catalog_updated_at
  BEFORE UPDATE ON public.audit_event_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_retention_policies_updated_at ON public.audit_retention_policies;
CREATE TRIGGER trg_audit_retention_policies_updated_at
  BEFORE UPDATE ON public.audit_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Live activation notes:
-- 1. Configure SIEM/log drain after credentials are supplied.
-- 2. Confirm immutable_hash chain verification in staging.
-- 3. Confirm audit exports are reviewed by authorized admins only.
-- 4. Confirm retention and legal hold policies before paid pilot.
