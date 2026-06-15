# Supabase Auth Activation

Module 46 selects Supabase Auth as the production authentication target. This module prepares RentasHub for Supabase Auth activation up to credential readiness. It does not activate live authentication unless real Supabase credentials, email templates, redirects, token/session behavior, and staging tests are completed.

## Current Status

- Selected provider: Supabase Auth.
- Default frontend auth mode: `local`.
- Production target: `AUTH_PROVIDER=supabase` and `VITE_AUTH_MODE=supabase`.
- Local/demo auth remains available for review only.
- Supabase mode must not silently fall back to local/demo users.

## Required Environment

Backend:

```text
AUTH_PROVIDER=supabase
SUPABASE_URL=<project URL>
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
SUPABASE_JWT_SECRET=<placeholder if JWT verification requires it>
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_PASSWORD_RESET_ENABLED=true
AUTH_REFRESH_TOKEN_ROTATION=true
AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true
```

Frontend:

```text
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=<project URL>
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_AUTH_REQUIRE_EMAIL_VERIFICATION=true
VITE_AUTH_PASSWORD_RESET_ENABLED=true
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code, browser bundles, screenshots, tickets, or client logs.

## Supabase Project Setup

1. Create or open the Supabase project.
2. Enable Email/Password authentication.
3. Configure site URL and redirect URLs for staging and production.
4. Enable email confirmation before trusted marketplace activity.
5. Configure password reset email templates and redirect URLs.
6. Copy the project URL.
7. Copy the anon key for frontend use.
8. Copy the service role key only into backend secret storage.
9. Configure token expiry and refresh behavior.
10. Run staging login/register/logout/session-restore tests before any production use.

## Role Mapping Strategy

RentasHub roles must remain aligned across frontend, backend, Supabase user metadata, and API RBAC:

| RentasHub role | Aliases | Supabase metadata suggestion |
|---|---|---|
| `admin` | admin | `app_role=admin` |
| `customer` | customer, user, guest | `app_role=customer` |
| `supplier` | supplier, vendor | `app_role=supplier` |
| `broker` | broker | `app_role=broker` |

Do not trust client-submitted roles for privileged access. Admin and supplier/vendor role changes require backend-controlled service-role operations and audit logging.

## JWT Validation Strategy

- Backend APIs should validate Supabase access tokens before protected operations.
- Bearer token auth must be preferred over development headers.
- `x-user-id` and `x-user-role` development headers must be disabled in production.
- JWT role claims should be mapped to the same RBAC source of truth used by the frontend and backend.

## Refresh Token Strategy

- Supabase session refresh must be tested in staging.
- Refresh-token rotation must be enabled or documented according to Supabase-supported behavior.
- Expired or invalid sessions must clear frontend session state and redirect to login.

## Session Revocation Strategy

Session revocation must support:

- logout from current device
- admin/user-initiated session revocation later
- password reset revocation policy
- suspicious activity revocation later

## Dev Header Removal Strategy

Development headers are allowed only in local/demo/staging API pilot workflows. Production must use:

```text
AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true
NODE_ENV=production
```

No protected write route should depend on `x-user-id` or `x-user-role` in production.

## Rollback

If Supabase Auth activation fails:

1. Disable Supabase auth mode in staging.
2. Set `VITE_AUTH_MODE=local` only for demo/review environments.
3. Do not enable real payments, claims, disputes, or provider-backed workflows while auth is rolled back.
4. Rotate exposed keys immediately.
5. Review logs and audit events.
6. Retry in staging after fixing redirect, email, token, or role-mapping failures.

## Remaining Manual Gates

- Real Supabase URL and keys.
- Email verification configured and tested.
- Password reset configured and tested.
- JWT validation implemented against Supabase tokens.
- Refresh/session revocation tested.
- Dev headers disabled in production.
- Staging and production Supabase projects separated.
