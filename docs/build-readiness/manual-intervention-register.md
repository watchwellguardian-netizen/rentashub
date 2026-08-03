# S5-ABW-003 Manual Intervention Register

Current gate: A4-01 Infrastructure Ownership Confirmation
Production ready: NO

## A4 Infrastructure Ownership

- Owner: Operations / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Create or confirm real Supabase projects and store credentials only in approved secret storage.
- Credential-readiness limit: Can validate submitted names, IDs, owners, and absence of secret leaks; cannot create projects.
- Validation command after credentials/evidence are available: `npm run a4:governance:validate`
- Required env names only: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Evidence required:
  - Development Supabase project name and ID
  - UAT/Staging Supabase project name and ID
  - Production Supabase project name and ID
  - Infrastructure owner, billing owner, and access owner
  - Security confirmation that no secrets are included

## Database / PostgreSQL

- Owner: Engineering / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Provide disposable PostgreSQL, local Supabase, GitHub Actions PostgreSQL service, or UAT database access.
- Credential-readiness limit: Can validate migration order, SQL contracts, and required env names; cannot execute PostgreSQL without a runtime.
- Validation command after credentials/evidence are available: `npm run database:readiness`
- Required env names only: `DATABASE_URL`, `DATABASE_PROVIDER`, `MIGRATION_TARGET_ENV`
- Evidence required:
  - Migrations 001-009 execution log
  - Schema fingerprint before and after reset
  - Seed counts
  - Transaction commit and rollback proof
  - Constraint enforcement proof
  - Backup and restore evidence

## RLS / RBAC Runtime

- Owner: Security / Backend Engineering
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Run RLS tests against disposable PostgreSQL/Supabase with representative users and tenants.
- Credential-readiness limit: Can statically inspect policies and route coverage; cannot prove enforcement without database execution.
- Validation command after credentials/evidence are available: `npm run a4:governance:rls-rbac`
- Required env names only: `DATABASE_URL`, `RLS_VALIDATION_MODE`, `AUTH_TEST_TENANT_IDS`
- Evidence required:
  - RLS enabled table evidence
  - Same-tenant access proof
  - Cross-tenant denial proof
  - Cross-role denial proof
  - Admin exception proof

## Authentication Provider

- Owner: Security / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Configure Supabase Auth or approved OIDC provider and run live-provider evidence collection.
- Credential-readiness limit: Can validate env-name contract and mock/local flows; cannot certify live Auth without provider credentials.
- Validation command after credentials/evidence are available: `npm run auth-rbac:readiness`
- Required env names only: `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `OIDC_CLIENT_SECRET`
- Evidence required:
  - Registration proof
  - Login and logout proof
  - Password reset proof
  - Email verification proof
  - MFA proof
  - Session refresh and revocation proof

## Object Storage

- Owner: DevOps / Backend Engineering
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Create buckets and credentials in Supabase Storage or approved S3-compatible provider.
- Credential-readiness limit: Can validate bucket naming and evidence templates; cannot prove object access without storage credentials.
- Validation command after credentials/evidence are available: `npm run storage:readiness`
- Required env names only: `STORAGE_PROVIDER`, `STORAGE_BUCKET_PUBLIC_ASSETS`, `STORAGE_BUCKET_PRIVATE_VERIFICATION`, `STORAGE_SIGNED_URL_TTL_SECONDS`
- Evidence required:
  - Bucket creation proof
  - Upload and download proof
  - Signed URL generation and expiry proof
  - Private object unauthorized-access denial proof
  - Storage cleanup proof

## Payments / Revenue

- Owner: Finance / Revenue Operations
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Provision sandbox provider accounts and store keys in approved secret storage.
- Credential-readiness limit: Can validate readiness checklists and mock webhook shapes; cannot move money or certify sandbox without provider credentials.
- Validation command after credentials/evidence are available: `npm run revenue:readiness`
- Required env names only: `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `WIPAY_API_KEY`, `PAYMENT_SANDBOX_MODE`
- Evidence required:
  - Sandbox credential confirmation
  - Payment intent proof
  - Webhook verification proof
  - Refund proof
  - Chargeback workflow proof
  - Tax/GCT signoff evidence

## Escrow / Protected Funds

- Owner: Legal / Finance / Revenue Operations
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Select escrow/legal trust structure and configure sandbox provider where available.
- Credential-readiness limit: Can validate ledger templates and state-machine contracts; cannot certify protected funds without legal/provider evidence.
- Validation command after credentials/evidence are available: `npm run escrow:readiness`
- Required env names only: `ESCROW_PROVIDER`, `ESCROW_SANDBOX_MODE`, `ESCROW_WEBHOOK_SECRET`, `ESCROW_LEDGER_MODE`
- Evidence required:
  - Escrow provider intake evidence
  - Legal trust account readiness evidence
  - Deposit hold and release proof
  - Refund and dispute proof
  - Ledger reconciliation proof

## Monitoring / Observability

- Owner: Operations / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Provision monitoring destinations and execute notification tests.
- Credential-readiness limit: Can validate configuration contract and alert templates; cannot prove telemetry delivery without destinations.
- Validation command after credentials/evidence are available: `npm run monitoring:readiness`
- Required env names only: `SENTRY_DSN`, `BETTER_STACK_SOURCE_TOKEN`, `ALERT_WEBHOOK_URL`, `UPTIME_MONITOR_URL`
- Evidence required:
  - Sentry project evidence
  - Better Stack source evidence
  - Alert route test evidence
  - Uptime monitor evidence
  - Log drain evidence

## Messages / Notifications Delivery

- Owner: Operations / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Select delivery providers, configure credentials in approved secret storage, and execute notification delivery tests.
- Credential-readiness limit: Can validate templates and local notification contracts; cannot prove real delivery without provider credentials.
- Validation command after credentials/evidence are available: `npm run operations:readiness`
- Required env names only: `EMAIL_PROVIDER`, `EMAIL_FROM_ADDRESS`, `SMS_PROVIDER`, `PUSH_PROVIDER`, `NOTIFICATION_WEBHOOK_SECRET`
- Evidence required:
  - Email delivery provider evidence
  - SMS or push provider evidence where in scope
  - Notification template approval
  - Delivery failure handling proof
  - Tenant-safe notification audit proof

## Claims / Disputes Operations

- Owner: Operations / Legal
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Approve operating process, legal escalation path, and external case-tracking or support integration if required.
- Credential-readiness limit: Can validate workflow states and evidence templates; cannot certify legal operations without owner approval.
- Validation command after credentials/evidence are available: `npm run operations:readiness`
- Required env names only: `CLAIMS_REVIEW_QUEUE_MODE`, `DISPUTE_ESCALATION_OWNER`, `LEGAL_CASE_TRACKING_SYSTEM`
- Evidence required:
  - Claims intake proof
  - Dispute escalation proof
  - Admin review queue proof
  - Legal handoff approval
  - Resolution audit evidence

## Transport Provider Network

- Owner: Marketplace Operations
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Onboard transport providers and approve operational handoff, pricing, and escalation process.
- Credential-readiness limit: Can validate local referral/request flows; cannot certify provider network operations without vendor evidence.
- Validation command after credentials/evidence are available: `npm run operations:readiness`
- Required env names only: `TRANSPORT_PROVIDER_MODE`, `TRANSPORT_VENDOR_PORTAL_URL`, `TRANSPORT_NOTIFICATION_PROVIDER`
- Evidence required:
  - Transport provider onboarding evidence
  - Quote request proof
  - Booking handoff proof
  - Provider SLA acceptance
  - Support escalation proof

## Financing Provider Network

- Owner: Marketplace Operations / Legal
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Approve financing partners, referral disclosures, consent language, and any regulated handoff workflow.
- Credential-readiness limit: Can validate referral templates and consent evidence; cannot certify financing operations without partner/legal approval.
- Validation command after credentials/evidence are available: `npm run compliance:readiness`
- Required env names only: `FINANCING_PROVIDER_MODE`, `FINANCING_PARTNER_PORTAL_URL`, `FINANCING_REFERRAL_WEBHOOK_SECRET`
- Evidence required:
  - Financing partner approval evidence
  - Referral consent proof
  - Disclosure approval evidence
  - Partner handoff proof
  - Regulatory review evidence

## Security Certification

- Owner: Security / External Assessor
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Run approved security review and capture assessor evidence.
- Credential-readiness limit: Can generate evidence package and scan source artifacts; cannot certify external penetration testing.
- Validation command after credentials/evidence are available: `npm run security:readiness`
- Required env names only: `SECURITY_SCAN_MODE`, `DEPENDENCY_AUDIT_MODE`, `PENTEST_TRACKING_ID`
- Evidence required:
  - Dependency audit evidence
  - Vulnerability scan evidence
  - OWASP review evidence
  - Pen-test intake and results
  - Secrets exposure certification

## Compliance / Legal

- Owner: Legal / Compliance
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Obtain legal, policy, and vendor approvals.
- Credential-readiness limit: Can generate checklists and evidence packages; cannot approve legal/compliance posture.
- Validation command after credentials/evidence are available: `npm run compliance:readiness`
- Required env names only: `KYC_PROVIDER`, `PRIVACY_POLICY_VERSION`, `TERMS_VERSION`, `RETENTION_POLICY_VERSION`
- Evidence required:
  - Privacy policy approval
  - Terms approval
  - Jamaica DPA review evidence
  - GDPR readiness evidence
  - DSAR workflow proof
  - KYC vendor approval

## Runtime CI Evidence

- Owner: Engineering / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Configure GitHub remote or approved executable runtime environment and run prepared workflows.
- Credential-readiness limit: Can generate workflow commands and manifests; cannot produce runtime evidence without an executable environment.
- Validation command after credentials/evidence are available: `npm run runtime:evidence`
- Required env names only: `GITHUB_REPOSITORY`, `CI_RUNTIME_ENV`, `REDIS_URL`, `PLAYWRIGHT_BASE_URL`
- Evidence required:
  - GitHub Actions workflow run IDs
  - PostgreSQL/RLS runtime artifact
  - Redis/BullMQ runtime artifact
  - Storage/export runtime artifact
  - Browser/accessibility runtime artifact
  - Auth/operations runtime artifact

## Release / Hosting Controls

- Owner: Release Manager / DevOps
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Configure repository host, branch protections, hosting target, and release approvers.
- Credential-readiness limit: Can generate checklists and artifact manifests; cannot certify release controls without repository/hosting evidence.
- Validation command after credentials/evidence are available: `npm run release:readiness`
- Required env names only: `GITHUB_REPOSITORY`, `HOSTING_PROVIDER`, `DEPLOYMENT_ENVIRONMENT`, `RELEASE_APPROVER_GROUP`
- Evidence required:
  - Branch protection evidence
  - Release approval evidence
  - Artifact integrity evidence
  - Release tag evidence
  - Rollback approval evidence

## Mobile Applications

- Owner: Product / Governance
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Governance approval is required before mobile apps can be built or counted toward launch.
- Credential-readiness limit: Currently deferred by governance; can only record the future credential contract and blocker.
- Validation command after credentials/evidence are available: `npm run build:readiness`
- Required env names only: `MOBILE_RELEASE_SCOPE`, `MOBILE_APP_STORE_OWNER`, `MOBILE_BUILD_PIPELINE`
- Evidence required:
  - Owner authorization if mobile scope is reopened
  - App store ownership evidence
  - Mobile build pipeline evidence
  - Mobile privacy disclosure evidence

## Government / Customs / Court Integrations

- Owner: Product / Legal / Governance
- Status: CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING
- Manual intervention: Governance and legal approval are required before public-sector integrations can be built or counted toward launch.
- Credential-readiness limit: Currently deferred by governance; can only record the future credential and approval contract.
- Validation command after credentials/evidence are available: `npm run compliance:readiness`
- Required env names only: `GOVERNMENT_INTEGRATION_SCOPE`, `PUBLIC_SECTOR_APPROVER`, `DATA_SHARING_AGREEMENT_ID`
- Evidence required:
  - Explicit governance authorization
  - Data sharing agreement evidence
  - Public-sector integration owner evidence
  - Security and legal approval evidence

