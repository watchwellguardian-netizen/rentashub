# Secrets Management Guide

This guide prepares RentasHub for managed secrets. It does not activate a real secrets manager.

## Required Secret Categories

- Auth token/session secrets.
- Supabase URL, anon key, and service role key.
- Database connection URL.
- Object storage credentials.
- Payment provider keys and webhook secrets.
- Escrow provider keys and webhook secrets.
- Monitoring provider keys.
- Notification provider keys.
- KYC/insurance provider keys.

## Recommended Providers

- 1Password Secrets Automation.
- AWS Secrets Manager.
- Doppler.
- HashiCorp Vault.
- Cloud provider secret stores.
- Supabase secret handling where applicable.

## Required Controls

- No real secrets committed to the repository.
- Separate secrets for local, staging, and production.
- Least-privilege access.
- Rotation owner and schedule.
- Emergency revocation process.
- Audit logging for secret reads/changes.
- CI/CD secret injection without printing values.

## Rotation Plan

1. Identify secret owner.
2. Create replacement secret in provider.
3. Update staging environment.
4. Run smoke tests.
5. Update production during approved window.
6. Revoke old secret.
7. Confirm logs do not expose values.

## Launch Blockers

- Placeholder secrets in production.
- Shared staging/production secrets.
- Service role keys exposed to frontend.
- Missing webhook secret rotation process.
- Missing incident revoke process.
