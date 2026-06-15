# Environment Promotion Guide

This guide prepares RentasHub for controlled promotion from local development to staging and production. It does not activate production infrastructure.

## Environments

- Local: demo/local mode, JSON fallback, simulated providers.
- Staging: provider credentials can be tested with sandbox/staging resources.
- Production: real infrastructure only after approval, security review, monitoring, backups, and legal/compliance gates.

## Promotion Path

1. Local verification.
2. CI verification.
3. Staging deployment.
4. Staging smoke checks.
5. Staging data/provider checks.
6. Production go/no-go review.
7. Production deployment.
8. Post-deployment monitoring.

## Required Controls

- Separate environment variables.
- Separate database instances.
- Separate object storage buckets.
- Separate auth projects or tenants.
- Separate payment/escrow modes.
- Separate monitoring environment labels.
- Manual approval before production.

## Required Variables

```bash
APP_ENV=staging|production
PRODUCTION_DOMAIN=
STAGING_DOMAIN=
ENVIRONMENT_PROMOTION_WORKFLOW=
DEPLOYMENT_RUNBOOK_OWNER=
```

## Promotion Risks

- Accidentally using production credentials in staging.
- Running destructive migrations without backup.
- CDN cache serving old assets.
- CORS/DNS mismatch.
- Provider webhook endpoints pointing to the wrong environment.

## Approval Gates

- Product owner approval.
- Technical owner approval.
- Security owner approval.
- Support owner approval.
- Incident owner availability.
