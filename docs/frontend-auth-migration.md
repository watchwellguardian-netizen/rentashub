# Frontend Auth Migration

Module 28 prepared a frontend authentication bridge. Module 36 migrates that bridge so the frontend can use backend authentication when explicitly enabled, without removing the current local demo auth flow.

## Current Local Demo Mode

Default mode:

```text
VITE_AUTH_MODE=local
```

Local mode keeps the existing review users for customer, supplier/vendor, broker, and admin review. It stores only the selected demo user in browser localStorage through `src/lib/authSession.js`.

This is for development and review only. It is not real identity verification, account security, or backend authentication.

## API Auth Mode

API mode:

```text
VITE_AUTH_MODE=api
```

In Module 36, API auth mode is active when `VITE_AUTH_MODE=api` and `VITE_API_BASE_URL` points to the backend.

The frontend login screen can call:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

Local demo review users are disabled in API auth mode. Backend auth responses hydrate `AuthContext`, route guards, role redirects, and the app shell user display.

## Supabase Auth Mode

Supabase mode:

```text
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=<project URL>
VITE_SUPABASE_ANON_KEY=<anon key>
```

Module 46 adds Supabase auth as a credential-ready guarded mode. It does not silently fall back to local/demo auth. Demo review users are hidden in Supabase mode.

Supabase mode fails clearly until valid frontend credentials are supplied. Even with shaped credentials, login and registration remain guarded until Supabase SDK/session validation, email verification, password reset, refresh token rotation, and session revocation are implemented and tested.

## Token And Session Plan

`src/lib/authSession.js` is the frontend token/session boundary. It stores the backend development token, API auth user, and expiry timestamp for this migration stage.

Future production auth must define:

- HTTPS-only communication.
- Token expiry and refresh rules.
- CSRF and XSS protections.
- Secure cookie or reviewed token storage strategy.
- Logout/session revocation behavior.
- Rate limiting and abuse controls.
- MFA or passkey upgrade path.

No production token storage claim is made by this module. The current token storage is a development migration boundary only.

## Route Protection Vs API Protection

Frontend protected routes only control page access in the browser. Backend API routes must still enforce authentication and RBAC independently.

Future API migration should ensure:

- Frontend route guards remain user-friendly.
- Backend routes reject unauthenticated and unauthorized requests.
- Role aliases stay aligned across frontend and backend: admin, customer/user/guest, supplier/vendor, and broker.
- Domain API adapters now prefer bearer-token auth when a frontend API auth token exists.

## Remaining Security Risks

- Demo users remain available.
- API auth mode is available only when explicitly enabled and a backend is running.
- Development `x-user-role` and `x-user-id` headers remain only as a local/demo fallback for API pilots without an active frontend API token.
- Supabase Auth is selected as the production target, but live Supabase session handling is not active yet.
- Many domains still use localStorage.
- No real database server, object storage, payment processor, escrow, KYC/insurance integration, deployment, or production security review is complete.
