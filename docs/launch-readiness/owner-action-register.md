# S5-LRW-001 Owner Action Register

This register lists remaining manual dependencies. Do not include credential values.

| Dependency | Prerequisite | Owner | Credential Location | Validation Command | Expected Evidence | Completion Status |
| --- | --- | --- | --- | --- | --- | --- |
| GitHub | Private repository created and `origin` configured | Operations / DevOps | GitHub repository settings | `git remote -v` and `git push -u origin future-release-backlog` | Remote URL and pushed branch evidence | Pending |
| OIDC | Identity provider selected and configured | Security / Identity owner | Approved secret store | `gh workflow run auth-authorization-runtime-validation.yml --ref future-release-backlog` | Auth runtime artifact | Pending |
| PostgreSQL | Disposable or non-production PostgreSQL path available | Database owner | Approved secret store | `gh workflow run postgres-runtime-validation.yml --ref future-release-backlog` | PG-006 artifact | Pending |
| Redis | Disposable Redis service or CI container available | Operations / DevOps | Approved secret store when external | `gh workflow run redis-bullmq-runtime-validation.yml --ref future-release-backlog` | Redis/BullMQ artifact | Pending |
| Storage | S3-compatible emulator or non-production bucket available | Storage owner | Approved secret store | `gh workflow run object-storage-export-runtime-validation.yml --ref future-release-backlog` | Storage/export artifact | Pending |
| Telemetry | Sentry/Better Stack or approved telemetry destination selected | Monitoring owner | Approved secret store | `gh workflow run observability-operations-runtime-validation.yml --ref future-release-backlog` | Observability artifact | Pending |
| DNS | Domain and DNS provider access confirmed | Infrastructure owner | DNS provider admin console | DNS verification command selected by provider | DNS ownership evidence | Pending |
| TLS | Certificate issuance path configured | Infrastructure owner | Hosting/TLS provider | TLS scan after deployment | Valid certificate evidence | Pending |
| Domains | Production and staging domains approved | Executive sponsor / Infrastructure owner | Domain registrar | WHOIS/DNS provider evidence | Domain ownership evidence | Pending |
| Hosting | Hosting provider selected and environment created | Operations / DevOps | Hosting provider environment variables | Provider deployment command | Deployment evidence | Pending |
| Production Secrets | Production secrets created outside source control | Security / Operations owner | Approved vault or provider secret store | Secret-presence validation without values | Secret inventory evidence | Pending |
