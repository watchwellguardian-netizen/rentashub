# Deployment And Production Operations Readiness

Module 42 prepares RentasHub for controlled deployment review. It does not deploy the app live and does not activate real database, object storage, payments, escrow, KYC, insurance, DNS, TLS, monitoring, backups, or production security certification.

## Deployment Options

### Vercel/Netlify Frontend + Separate Node API

- Build frontend with `npm run build`.
- Host `dist/` on Vercel or Netlify.
- Deploy `server/src/main/server.js` as a separate Node API on Render, Fly.io, Railway, AWS, GCP, Azure, or VPS.
- Set `VITE_API_BASE_URL` to the API origin.
- Lock API CORS to the frontend origin.

### Render/Fly.io/Railway

- Deploy the Node API as a service.
- Deploy frontend as static site or separate preview service.
- Use managed PostgreSQL and object storage provider integrations.
- Store all secrets in the platform secret manager.

### AWS/GCP/Azure

- Recommended for production-scale marketplace operations.
- Use managed database, managed object storage, load balancer, TLS certificate, log aggregation, metrics, alerts, backup policies, and secret manager.
- Keep frontend static hosting/CDN separate from backend API if possible.

### Docker/VPS

- Use `Dockerfile` and `docker-compose.example.yml` for staging-style review only.
- Do not use local JSON persistence for production.
- Add reverse proxy, TLS termination, secret management, backups, monitoring, and patching process before any public launch.

## Recommended Production Architecture

- Static frontend on CDN-backed hosting.
- Node API behind HTTPS load balancer.
- PostgreSQL managed database.
- Private object storage buckets for restricted files.
- Public CDN only for intentionally public asset images.
- Payment provider integration through hosted/tokenized flows.
- Escrow provider only after legal and financial review.
- Centralized logs, metrics, alerts, and audit-log retention.
- CI/CD with manual approval before deployment.

## Environment Variable Checklist

Frontend:

- `VITE_APP_ENV`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_APP_URL`
- `VITE_DATA_MODE`
- `VITE_AUTH_MODE`
- `VITE_ENABLE_LOCAL_STORAGE_MODE`
- `VITE_PAYMENT_PROVIDER`
- `VITE_NOTIFICATION_PROVIDER`
- `VITE_FILE_STORAGE_PROVIDER`

Backend:

- `NODE_ENV`
- `APP_ENV`
- `APP_BASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `DEPLOYMENT_PROVIDER`
- `DEPLOYMENT_TARGET`
- `MONITORING_PROVIDER`
- `BACKUP_PROVIDER`
- `AUTH_TOKEN_SECRET`
- `SESSION_SECRET`
- `APP_ENCRYPTION_KEY`
- `DATABASE_PROVIDER`
- `DATABASE_URL`
- `FILE_STORAGE_PROVIDER`
- `PAYMENT_PROVIDER`
- `PAYMENT_SECRET_KEY`
- `ESCROW_PROVIDER`
- `ESCROW_API_KEY`

## DNS And TLS Checklist

- Domain registered and controlled.
- Frontend DNS configured.
- API DNS configured.
- TLS certificate active for frontend.
- TLS certificate active for API.
- HTTP redirects to HTTPS.
- CORS allowlist matches exact frontend origin.
- HSTS policy reviewed after staging validation.

## Health And Readiness Endpoints

- `GET /api/health` confirms API process health.
- `GET /api/health/readiness` reports credential/configuration readiness.

Readiness reports configuration shape only. It does not prove provider connectivity, payment settlement, storage safety, legal compliance, or production hardening.

## Logging And Monitoring Checklist

- API request logs with request IDs.
- Error logs without secrets.
- Auth failure and rate-limit event monitoring.
- Payment webhook monitoring when payments are enabled.
- Database connection and slow-query monitoring.
- Object storage upload/download error monitoring.
- Admin mutation audit review.
- Alert routing and on-call owner.

## Rollback Process

1. Keep previous deploy artifact available.
2. Snapshot database before migrations.
3. Deploy to staging first.
4. Verify health/readiness endpoints.
5. Run smoke checks.
6. Promote only after manual approval.
7. If release fails, roll back app artifact.
8. If migration fails, restore database snapshot or run documented rollback.
9. Record incident and remediation in the release log.

## Backup And Restore Checklist

- Database automated backups enabled.
- Restore tested in staging.
- Object storage versioning or lifecycle configured.
- Audit log retention configured.
- Secrets backup/recovery process documented.
- Recovery time and recovery point objectives approved.

## Audit Log Review Checklist

- Review protected mutations.
- Review admin actions.
- Review auth/session events.
- Review payment/provider events once enabled.
- Review storage upload intent and metadata changes.
- Confirm logs do not contain passwords, tokens, card data, bank data, or secret values.

## Release Checklist

- CI clean install passed.
- Frontend tests passed.
- Backend tests passed.
- Readiness report reviewed.
- Production build passed.
- ZIP/artifact sanity check passed.
- Environment templates reviewed.
- Secrets configured in secret manager.
- DNS/TLS confirmed.
- Monitoring and backups confirmed.
- Rollback owner assigned.
- No auto-deploy without explicit approval.
