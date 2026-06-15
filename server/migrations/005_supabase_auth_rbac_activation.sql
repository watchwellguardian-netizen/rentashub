-- RentasHub Project A2 Supabase Auth and RBAC activation readiness.
-- Credential-ready only: do not apply to a live project until Supabase credentials,
-- backup/restore, RLS tests, and auth owner approval exist.

CREATE TABLE IF NOT EXISTS public.auth_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid,
  auth_user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('register', 'login', 'logout', 'refresh', 'password_reset_requested', 'password_reset_completed', 'email_verified', 'mfa_enrolled', 'mfa_challenge', 'session_revoked')),
  ip_address text,
  user_agent text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.auth_mfa_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  auth_user_id uuid,
  factor_type text NOT NULL DEFAULT 'totp',
  status text NOT NULL DEFAULT 'placeholder',
  enrolled_at timestamptz,
  verified_at timestamptz,
  revoked_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.rbac_permission_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz,
  UNIQUE(role, permission)
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supabase_auth_user_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'local';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_revoked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_user_id ON public.users(supabase_auth_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_role ON public.user_role_assignments(user_id, role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_session_events_user ON public.auth_session_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_auth_mfa_enrollments_user ON public.auth_mfa_enrollments(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rbac_permission_matrix_role ON public.rbac_permission_matrix(role, status) WHERE deleted_at IS NULL;

ALTER TABLE public.auth_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_mfa_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permission_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users admins read auth session events" ON public.auth_session_events;
CREATE POLICY "users admins read auth session events" ON public.auth_session_events
  FOR SELECT USING (user_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "users admins manage mfa enrollment records" ON public.auth_mfa_enrollments;
CREATE POLICY "users admins manage mfa enrollment records" ON public.auth_mfa_enrollments
  FOR ALL USING (user_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin())
  WITH CHECK (user_id::text = public.rentashub_auth_user_id() OR public.rentashub_is_admin());

DROP POLICY IF EXISTS "admins read rbac permission matrix" ON public.rbac_permission_matrix;
CREATE POLICY "admins read rbac permission matrix" ON public.rbac_permission_matrix
  FOR SELECT USING (public.rentashub_is_admin());

DROP TRIGGER IF EXISTS auth_mfa_enrollments_touch_updated_at ON public.auth_mfa_enrollments;
CREATE TRIGGER auth_mfa_enrollments_touch_updated_at
  BEFORE UPDATE ON public.auth_mfa_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.rentashub_touch_updated_at();

DROP TRIGGER IF EXISTS rbac_permission_matrix_touch_updated_at ON public.rbac_permission_matrix;
CREATE TRIGGER rbac_permission_matrix_touch_updated_at
  BEFORE UPDATE ON public.rbac_permission_matrix
  FOR EACH ROW EXECUTE FUNCTION public.rentashub_touch_updated_at();

INSERT INTO public.rbac_permission_matrix (role, permission, description)
VALUES
  ('customer', 'marketplace:read', 'Browse public marketplace records.'),
  ('customer', 'booking:create', 'Create booking and auction service requests.'),
  ('supplier', 'listing:own', 'Manage own listings.'),
  ('supplier', 'auction:own', 'Manage own auction lots.'),
  ('dealer', 'auction:dealer', 'Access dealer auction workflows.'),
  ('inspector', 'inspection:assigned', 'Manage assigned inspection requests.'),
  ('transport_provider', 'transport:assigned', 'Manage assigned transport requests.'),
  ('financing_partner', 'financing:assigned', 'Manage assigned financing referrals.'),
  ('admin', 'admin:mutate', 'Perform controlled admin mutations.'),
  ('super_admin', 'rbac:manage', 'Manage RBAC configuration after security approval.')
ON CONFLICT (role, permission) DO NOTHING;
