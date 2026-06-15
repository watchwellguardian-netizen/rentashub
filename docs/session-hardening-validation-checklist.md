# Session Hardening Validation Checklist

Status: Draft security readiness artifact.

Session hardening is provider-ready only until Supabase Auth and hosting environments are live.

## Cookie And Token Controls

- [ ] Secure cookies enabled in staging/production.
- [ ] HttpOnly cookies used where applicable.
- [ ] SameSite policy selected and tested.
- [ ] Refresh-token rotation enabled.
- [ ] Access-token lifetime approved.
- [ ] Refresh-token lifetime approved.
- [ ] Session revocation path tested.

## Route And API Controls

- [ ] Bearer-token auth preferred over development headers.
- [ ] Development auth headers disabled in production.
- [ ] Protected frontend routes block unauthenticated users.
- [ ] Protected API mutations reject unauthenticated users.
- [ ] Cross-role access denied.
- [ ] Cross-tenant access denied.

## Incident Controls

- [ ] Forced logout procedure documented.
- [ ] Stolen-token response procedure documented.
- [ ] Admin session revocation tested.
- [ ] Session anomaly events routed to audit logs.

## Browser Validation

- [ ] Refresh preserves only authorized session state.
- [ ] Direct URL access does not expose protected data.
- [ ] Logout clears local session state.
- [ ] Supabase session refresh tested in UAT.

## Boundary

This checklist does not activate live Supabase session handling, real MFA, production cookies, or external identity-provider controls.
