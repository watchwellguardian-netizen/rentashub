# Content Security Policy Draft

Status: Draft security readiness artifact.

This policy is a provider-ready baseline for staging validation. It must be tested with real hosting, Supabase, monitoring, and asset domains before enforcement in production.

## Baseline Policy

```text
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
form-action 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co https://*.sentry.io;
media-src 'self' blob: https:;
worker-src 'self' blob:;
manifest-src 'self';
upgrade-insecure-requests;
```

## Staging Validation

- Confirm the app loads without inline script violations.
- Confirm Google Fonts are the only external font endpoints.
- Confirm Supabase API and storage domains are explicitly listed before live activation.
- Confirm Sentry DSN endpoints are listed only when monitoring is enabled.
- Confirm no wildcard `script-src` or `connect-src` is introduced without security approval.

## Production Requirements

- Replace broad `https:` image/media allowances with approved CDN and Supabase Storage domains where feasible.
- Add report-only mode before enforcement.
- Capture CSP violations in monitoring.
- Review every new provider domain before release.

## Boundary

This draft does not activate CSP enforcement, WAF, SOC/SIEM, monitoring, or production security certification.
