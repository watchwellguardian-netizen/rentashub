# Project A2 - Supabase Authentication and RBAC Activation

Status: Credential-ready implementation plan

This document prepares RentasHub for Supabase Auth and persistent RBAC. It does not remove local/demo auth and does not activate live Supabase credentials.

## Objective

Replace demo authentication in live environments with Supabase Auth, persistent roles, guarded sessions, and RLS-aligned authorization.

## Auth Provider Target

```text
AUTH_PROVIDER=supabase
VITE_AUTH_MODE=supabase
SUPABASE_URL=<project-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_PASSWORD_RESET_ENABLED=true
AUTH_REFRESH_TOKEN_ROTATION=true
AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true
AUTH_MFA_READY=false
```

## Role Model

Production roles:

- customer
- supplier
- dealer
- inspector
- transport_provider
- financing_partner
- admin
- super_admin

Role aliases:

- `guest` and `user` map to `customer`.
- `vendor` maps to `supplier`.
- `broker`, `vehicle_dealer`, and `equipment_dealer` map to `dealer`.
- `certified_inspector` maps to `inspector`.
- `auction_admin` and `compliance_officer` map to `admin`.

Persistent roles live in `user_role_assignments`. Supabase JWT custom claims should include `app_role` only after server-side role assignment is verified.

## Session Lifecycle

1. Registration uses Supabase email/password.
2. Email verification is required before paid or privileged workflows.
3. Login creates a Supabase session with access and refresh tokens.
4. Refresh token rotation must be enabled and verified.
5. Logout must call Supabase sign-out and clear frontend session state.
6. Session revocation must be supported for compromised accounts and admin actions.
7. Session events must be written to `auth_session_events`.

## MFA-Ready Framework

MFA is not activated in this module. The table `auth_mfa_enrollments` prepares storage for future TOTP/passkey/SMS policy decisions. MFA must be activated before public launch if required by the security owner.

## Route and API Guards

Frontend route guards continue to support local/demo mode by default. Supabase mode must:

- Hide demo users.
- Fail clearly without valid Supabase credentials.
- Avoid silent fallback to local auth.
- Prefer bearer tokens over development headers.

Backend API guards must:

- Prefer bearer token/user context.
- Ignore development `x-user-role` and `x-user-id` headers in production when `AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true`.
- Enforce normalized RBAC roles.
- Align route permissions with RLS policy assumptions.

## RLS Alignment

Project A1 RLS policies use:

- `rentashub_auth_user_id()`
- `rentashub_auth_role()`
- `rentashub_is_admin()`
- `rentashub_is_service_role()`

Project A2 adds:

- `auth_session_events`
- `auth_mfa_enrollments`
- `rbac_permission_matrix`
- Supabase auth id linkage on `users`

## Security Review Requirements

- Confirm service role key is server-only.
- Confirm frontend bundle does not contain service role key or database URL.
- Confirm Supabase anon key is used only for approved browser auth flows.
- Confirm dev headers are disabled in production.
- Confirm password reset redirect URLs use approved staging/production domains.
- Confirm refresh token rotation is enabled.
- Confirm RLS tests pass for all production roles.

## Rollback Plan

- Keep local/demo auth available for development only.
- If Supabase Auth validation fails in staging, set `VITE_AUTH_MODE=local` only in local/demo environments.
- Disable staging traffic, revoke test sessions, and rotate exposed keys if any credential leak is suspected.
- Do not fall back to local/demo auth in production.

## Completion Criteria

Project A2 is credential-ready when:

- Supabase Auth/RBAC architecture is documented.
- RBAC policy helper exists.
- Supabase session/JWT readiness helpers exist.
- Auth/RBAC migration exists.
- Tests verify role mapping, dev-header production lockdown, and no live-activation claims.

Live auth activation may be closed only after real Supabase credentials are supplied securely and registration, login, logout, password reset, email verification, refresh token rotation, session revocation, route guards, API guards, and RLS tests pass in staging.
