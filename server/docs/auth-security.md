# Authentication Security Foundation

Module 24 adds a backend authentication foundation without replacing the frontend demo/local auth.

## Password Handling

Passwords are not stored in plaintext. The backend uses Node `crypto.pbkdf2Sync` with a per-user salt and stores only:

- `password_hash`
- `password_salt`

The current password policy requires at least 10 characters, uppercase, lowercase, number, and symbol.

## Tokens And Sessions

The backend issues a development-safe signed token using Node `crypto` HMAC. It includes:

- user ID
- role
- issued-at timestamp
- expiry timestamp
- token ID

This is not described as a production JWT implementation. A later production module should adopt a reviewed JWT/session library, secure cookie strategy, key rotation, CSRF controls where needed, and stronger device/session management.

Sessions are recorded in `auth_sessions`. Logout revokes the active session token. Expired or invalid tokens are rejected.

## RBAC Roles

Roles are normalized to the existing RentasHub RBAC model:

- `admin`
- `customer`
- `supplier`
- `broker`

Aliases:

- `user` and `guest` map to `customer`
- `vendor` maps to `supplier`

Protected API writes can use the new bearer token path or the existing simulated development headers while the frontend remains unmigrated.

## Frontend Migration

The frontend demo/local auth remains active. A later module should introduce an auth adapter, login UI migration, secure token storage strategy, refresh handling, and route guards that depend on backend sessions.

## Future Hardening

Before any production release, authentication needs:

- HTTPS-only transport
- secure token/cookie storage strategy
- rate limiting for login and password reset
- account lockout or risk-based throttling
- audit logs for sensitive auth events
- password reset token delivery and expiry
- MFA or passkey option
- secret management and rotation
- monitoring for suspicious session activity

This module does not implement advanced security controls, SSO, passkeys, MFA, production JWT, OAuth, KYC, payments, escrow, or deployment.
