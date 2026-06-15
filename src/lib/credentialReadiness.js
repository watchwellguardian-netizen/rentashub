export const CREDENTIAL_READINESS_NOTICE =
  "Credential readiness identifies manual setup needed before real providers can be activated. It does not activate payments, escrow, object storage, KYC, insurance, deployment, or production security.";

export const REMAINING_WORKSTREAMS = [
  {
    id: "disputes",
    label: "Disputes",
    status: "api_pilot_simulated",
    credentialStage: "foundation_complete",
    manualRequirement: "Policy design, legal review, evidence workflow, payout/refund rules, and escrow/payment integration.",
  },
  {
    id: "payments",
    label: "Payments",
    status: "simulated_ledger",
    credentialStage: "credential_variables_documented",
    manualRequirement: "Payment provider account, API keys, webhook secret, idempotency/reconciliation design, refunds, chargebacks, and payout controls.",
  },
  {
    id: "admin_moderation",
    label: "Broader admin moderation",
    status: "local_foundation",
    credentialStage: "operational_policy_required",
    manualRequirement: "Moderation policy, review queues, escalation owners, audit exports, retention rules, and operational runbooks.",
  },
  {
    id: "database",
    label: "Real database activation",
    status: "json_fallback",
    credentialStage: "supabase_postgres_credentials_required",
    manualRequirement: "Supabase PostgreSQL project, reviewed PostgreSQL driver, DATABASE_PROVIDER=postgres, DATABASE_POSTGRES_VENDOR=supabase, valid Supabase DATABASE_URL, migration validation, backups, pooling, and rollback plan.",
  },
  {
    id: "object_storage",
    label: "Object storage",
    status: "metadata_only",
    credentialStage: "supabase_storage_credentials_required",
    manualRequirement: "Supabase provider credentials, Supabase URL, anon key, server-only service role key, public-assets bucket, supplier-logos bucket, private verification/inspection/claims/disputes buckets, signed URL implementation, virus scanning, retention lifecycle, and private document access policy.",
  },
  {
    id: "payment_escrow",
    label: "Payment processor / escrow",
    status: "not_active",
    credentialStage: "escrow_provider_and_legal_readiness_required",
    manualRequirement: "Escrow provider or manual deposit-hold model, trust account review, legal owner, release/refund policy, dispute policy, settlement owner, webhook verification, and explicit no-live-funds approval.",
  },
  {
    id: "kyc_insurance",
    label: "KYC / insurance integrations",
    status: "simulated_only",
    credentialStage: "provider_credentials_required",
    manualRequirement: "Provider accounts, API keys, document storage, webhook verification, underwriting/claims rules, and privacy review.",
  },
  {
    id: "deployment",
    label: "Deployment",
    status: "local_ci_zip",
    credentialStage: "production_infrastructure_credentials_required",
    manualRequirement: "Hosting account, production/staging domains, DNS plan, TLS certificate provider, CDN provider, infrastructure monitoring, backup policy, disaster recovery region, environment promotion workflow, rollback, and uptime checks.",
  },
  {
    id: "monitoring",
    label: "Monitoring and observability",
    status: "readiness_only",
    credentialStage: "sentry_better_stack_credentials_required",
    manualRequirement: "Sentry DSN, Better Stack API key/heartbeat, log drain, alert email/SMS, incident owner, retention policy, uptime checks, and alert routing.",
  },
  {
    id: "pilot_operations",
    label: "Pilot operations",
    status: "playbook_ready",
    credentialStage: "operational_owners_required",
    manualRequirement: "Supplier onboarding owner, support owner, escalation owner, dispute owner, verification owner, pilot region, target counts, operating hours, and go/no-go checklist approval.",
  },
  {
    id: "security",
    label: "Production security review",
    status: "foundation_only",
    credentialStage: "security_certification_readiness_required",
    manualRequirement: "OWASP review, security architecture review, secrets management, dependency audit, RBAC/auth/storage/payment/escrow/monitoring audits, vulnerability management, penetration testing, and incident response tabletop.",
  },
  {
    id: "revenue_activation",
    label: "Revenue activation",
    status: "provider_ready_only",
    credentialStage: "payment_escrow_finance_policy_required",
    manualRequirement: "Marketplace fee policy, commission engine, payment/refund/deposit lifecycles, escrow ledger, settlement, reconciliation, Tax/GCT, payout policy, transaction audit, and provider sandbox validation.",
  },
  {
    id: "clean_install",
    label: "Clean install confirmation",
    status: "ci_pending",
    credentialStage: "proper_node_environment_required",
    manualRequirement: "Run npm install, tests, backend tests, readiness, and build in GitHub Actions or another proper Node/npm environment.",
  },
];

export const SECURITY_BASELINE_CHECKS = [
  { id: "auth_secret", label: "Auth secret status", status: "requires_strong_secret", detail: "AUTH_TOKEN_SECRET must be replaced before provider-backed review." },
  { id: "cors", label: "CORS status", status: "allowlist_required", detail: "CORS_ALLOWED_ORIGINS must be set for deployed API access." },
  { id: "rate_limiting", label: "Rate limiting status", status: "development_in_memory", detail: "In-memory limiter exists for sensitive routes; distributed production throttling remains pending." },
  { id: "database_provider", label: "Database provider status", status: "json_fallback", detail: "Supabase PostgreSQL is selected for Module 44, but activation remains credential-ready only until a valid DATABASE_URL and reviewed PostgreSQL driver are supplied." },
  { id: "storage_provider", label: "Storage provider status", status: "local_placeholder", detail: "Supabase Storage is selected for Module 45, but activation remains credential-ready only until Supabase keys, bucket policies, signed URL generation, and SDK integration are verified." },
  { id: "payment_provider", label: "Payment provider status", status: "simulated", detail: "Real processor credentials and webhook validation remain pending." },
  { id: "virus_scan", label: "Object storage virus scan status", status: "not_active", detail: "Virus scanning is required before accepting real binary uploads." },
  { id: "deployment_security", label: "Deployment/security checklist", status: "manual_review_required", detail: "TLS, monitoring, backups, incident response, and penetration testing remain pending." },
];

export const SECURITY_CERTIFICATION_READINESS_CHECKS = [
  { id: "owasp", label: "OWASP status", status: "review_required", detail: "OWASP Top 10 and API Security Top 10 checklist must be completed before certification review." },
  { id: "architecture", label: "Security architecture review", status: "review_required", detail: "Auth, API, data, storage, payment, escrow, monitoring, and deployment architecture require formal review." },
  { id: "secrets", label: "Secrets status", status: "secret_manager_required", detail: "Secrets must move to a managed secret store with rotation, owner, access audit, and emergency revoke process." },
  { id: "dependencies", label: "Dependency audit status", status: "audit_required", detail: "Dependency scan, license review, vulnerability triage, and remediation SLA must be documented." },
  { id: "rbac", label: "RBAC status", status: "audit_required", detail: "Role aliases, route guards, API permissions, and data ownership checks need independent audit." },
  { id: "authentication", label: "Authentication audit", status: "audit_required", detail: "Session, token, password reset, email verification, refresh rotation, MFA/passkey roadmap, and dev-header removal require review." },
  { id: "storage", label: "Storage security audit", status: "audit_required", detail: "Private bucket policy, signed URLs, file scanning, retention, and KYC/document privacy controls require review." },
  { id: "payment", label: "Payment security audit", status: "audit_required", detail: "Provider webhooks, idempotency, ledger integrity, refunds, chargebacks, payouts, and card-data boundaries require review." },
  { id: "escrow", label: "Escrow security audit", status: "audit_required", detail: "Deposit state transitions, dispute evidence, release permissions, reconciliation, and legal trust/account boundaries require review." },
  { id: "monitoring", label: "Monitoring audit", status: "audit_required", detail: "Error tracking, uptime alerts, log redaction, security event routing, and incident alerting require review." },
  { id: "incident_response", label: "Incident response status", status: "tabletop_required", detail: "Incident response plan, severity levels, owner routing, communications, and post-incident review must be tested." },
  { id: "certification_boundary", label: "Certification status", status: "not_certified", detail: "This readiness layer does not claim SOC2, penetration testing completion, or production security certification." },
];

export const SECURITY_HARDENING_PROGRAM_CHECKS = [
  { id: "authentication_security", label: "Authentication security", status: "mfa_session_review_required", detail: "MFA architecture, session cookie policy, refresh-token rotation, and session revocation must be validated in staging." },
  { id: "application_security", label: "Application security", status: "policy_review_required", detail: "CSP, security headers, CORS allowlist, and CSRF strategy must be reviewed against deployed origins." },
  { id: "api_security", label: "API security", status: "abuse_protection_required", detail: "Distributed rate limiting, request validation, API abuse protection, and sensitive-route hardening must be activated before public traffic." },
  { id: "dependency_security", label: "Dependency security", status: "scan_pipeline_required", detail: "Dependency audit, vulnerability scanning, license review, and patch SLA must be assigned and run in CI." },
  { id: "security_monitoring", label: "Security monitoring", status: "alert_routing_required", detail: "Security event taxonomy, severity classes, alert routing, and incident runbook must be validated with monitoring providers." },
  { id: "boundary", label: "Live tooling boundary", status: "provider_ready_only", detail: "No live MFA provider, WAF, SOC/SIEM, penetration-testing vendor, or production security tooling is active from this program step." },
];

export const COMPLIANCE_ACTIVATION_READINESS_CHECKS = [
  { id: "privacy_program", label: "Privacy program", status: "owner_policy_required", detail: "Assign privacy owner and document consent, retention, deletion, export, and data subject request workflows." },
  { id: "jamaica_dpa", label: "Jamaica Data Protection Act", status: "legal_review_required", detail: "Jamaica Data Protection Act readiness must be reviewed before live user data processing." },
  { id: "gdpr", label: "GDPR framework", status: "framework_review_required", detail: "GDPR readiness requires lawful basis, data rights, retention, transfer, and processor controls where applicable." },
  { id: "marketplace_compliance", label: "Marketplace compliance", status: "owner_required", detail: "Marketplace compliance owner must approve supplier, buyer, auction, inspection, transport, financing, and dispute data flows." },
  { id: "audit_retention", label: "Audit retention", status: "retention_policy_required", detail: "Audit retention and export policies must align with legal, security, and dispute requirements." },
  { id: "legal_documents", label: "Legal documents", status: "legal_document_owner_required", detail: "Terms, privacy notices, beta disclaimers, KYC notices, and provider disclosures require legal ownership." },
  { id: "kyc_readiness", label: "KYC readiness", status: "provider_policy_required", detail: "KYC provider, policy owner, consent, data sharing, and document handling must be approved before activation." },
  { id: "boundary", label: "Live verification boundary", status: "provider_ready_only", detail: "No live KYC vendor, real identity verification, sanctions screening, AML monitoring, or document-verification provider is active." },
];

export const REVENUE_ACTIVATION_READINESS_CHECKS = [
  { id: "marketplace_fees", label: "Marketplace fee architecture", status: "policy_required", detail: "Platform fee, supplier commission, buyer fee, discounts, exemptions, and fee-display rules require owner approval." },
  { id: "commission_engine", label: "Commission engine architecture", status: "policy_required", detail: "Commission basis, category overrides, supplier tiers, refund adjustments, and audit rules must be documented before paid pilot." },
  { id: "payment_lifecycle", label: "Payment lifecycle architecture", status: "lifecycle_policy_required", detail: "Intent, authorization, simulated payment, failure, cancellation, refund, and ledger-posting states must be approved against provider behavior." },
  { id: "refund_lifecycle", label: "Refund lifecycle architecture", status: "refund_policy_required", detail: "Full, partial, failed, manual-review, and dispute-linked refund rules must be tested in sandbox before revenue activation." },
  { id: "deposit_lifecycle", label: "Deposit lifecycle architecture", status: "deposit_policy_required", detail: "Reservation, security, damage, equipment, property, and booking-hold deposits require state-machine and legal review." },
  { id: "escrow_ledger", label: "Escrow ledger model", status: "ledger_policy_required", detail: "Escrow ledger entries must support held, released, partially released, refunded, disputed, cancelled, and expired states." },
  { id: "settlement", label: "Settlement workflow", status: "settlement_policy_required", detail: "Settlement timing, currency, provider reconciliation, payout review, and supplier earning rules must be approved." },
  { id: "reconciliation", label: "Reconciliation workflow", status: "owner_required", detail: "Assign reconciliation owner and define daily/weekly exception review, mismatch handling, and audit evidence requirements." },
  { id: "financial_reporting", label: "Financial reporting readiness", status: "owner_required", detail: "Assign reporting owner and define GMV, net revenue, supplier earnings, escrow liability, refunds, chargebacks, and payout reports." },
  { id: "tax_gct", label: "Tax/GCT readiness", status: "tax_policy_required", detail: "Tax/GCT handling, invoices, receipts, supplier remittance, and finance/legal review are required before paid pilot." },
  { id: "payouts", label: "Payout readiness", status: "payout_policy_required", detail: "Payout timing, approval, withholding, failed payout, bank-change, and supplier notification policies must be documented." },
  { id: "no_live_money", label: "No live money movement", status: "enforced", detail: "Project E1 does not activate Stripe, PayPal, WiPay, Fygaro, NCB gateways, real escrow accounts, real settlements, refunds, payouts, chargebacks, or bank transfers." },
];

export const DEPLOYMENT_READINESS_CHECKS = [
  { id: "environment", label: "Environment separation", status: "templates_added", detail: "Staging and production env templates exist; real secrets must be configured externally." },
  { id: "deployment_target", label: "Deployment target", status: "placeholder_required", detail: "Hosting target must be selected and approved before live deployment." },
  { id: "dns_tls", label: "DNS and TLS", status: "manual_setup_required", detail: "Domain, API origin, TLS certificates, HTTPS redirects, and CORS origin matching remain manual gates." },
  { id: "monitoring", label: "Monitoring", status: "readiness_only", detail: "Sentry and Better Stack are selected for Module 47 readiness; real credentials, alert routing, and on-call ownership are not active." },
  { id: "backups", label: "Backups", status: "not_active", detail: "Database/object storage backup and restore tests remain pending." },
  { id: "rollback", label: "Rollback", status: "documented_not_tested", detail: "Rollback process is documented and must be tested in staging." },
  { id: "ci_cd", label: "CI/CD", status: "gates_defined", detail: "CI runs tests, backend tests, readiness, build, and artifact checks; auto-deploy is not enabled." },
  { id: "release_approval", label: "Release approval", status: "manual_required", detail: "Deployment must not proceed without explicit credentials, hosting target, and approval." },
];

export const INFRASTRUCTURE_ACTIVATION_READINESS_CHECKS = [
  { id: "dns", label: "DNS status", status: "domain_plan_required", detail: "Production and staging domains must be selected, verified, and mapped before traffic cutover." },
  { id: "tls", label: "TLS status", status: "certificate_provider_required", detail: "TLS certificate provider, HTTPS enforcement, renewal, and HSTS policy must be approved." },
  { id: "cdn", label: "CDN status", status: "cdn_provider_required", detail: "CDN provider, cache policy, purge process, and asset routing must be configured before public launch." },
  { id: "backup", label: "Backup status", status: "backup_policy_required", detail: "Database, object storage, environment, and audit backup policies must include retention and restore tests." },
  { id: "disaster_recovery", label: "DR status", status: "dr_region_required", detail: "Disaster recovery region, RTO, RPO, failover owner, and recovery runbook must be documented." },
  { id: "hosting", label: "Hosting status", status: "hosting_provider_required", detail: "Frontend and backend hosting targets must be selected and separated by environment." },
  { id: "monitoring", label: "Monitoring status", status: "infra_monitoring_required", detail: "Infrastructure uptime checks, provider alerts, log drains, and incident routing must be configured." },
  { id: "deployment", label: "Deployment status", status: "promotion_workflow_required", detail: "Environment promotion, rollback, approval, and release runbooks must be approved before activation." },
];

export const MONITORING_READINESS_CHECKS = [
  { id: "provider", label: "Monitoring provider", status: "none", detail: "Set MONITORING_PROVIDER=sentry, better_stack, or sentry_better_stack before live monitoring." },
  { id: "sentry", label: "Sentry readiness", status: "credentials_required", detail: "SENTRY_DSN, SENTRY_ENVIRONMENT, and SENTRY_RELEASE are required before SDK activation." },
  { id: "better_stack", label: "Better Stack readiness", status: "credentials_required", detail: "BETTER_STACK_API_KEY, heartbeat URL, and status page ID are required before uptime/log alerting." },
  { id: "alert_routing", label: "Alert routing", status: "owner_required", detail: "ALERT_EMAIL or ALERT_SMS plus incident owner name/email are required before external pilot." },
  { id: "log_drain", label: "Log drain", status: "manual_required", detail: "LOG_DRAIN_URL and retention policy are required before production deployment." },
];

export const PILOT_OPERATIONS_READINESS_CHECKS = [
  { id: "pilot_owner", label: "Pilot owner", status: "owner_required", detail: "Set PILOT_OWNER_NAME and PILOT_OWNER_EMAIL before external supplier onboarding." },
  { id: "supplier_onboarding_owner", label: "Supplier onboarding owner", status: "owner_required", detail: "Assign the person accountable for supplier invitations, profile setup, listing quality, and first-week follow-up." },
  { id: "support_owner", label: "Support owner", status: "owner_required", detail: "Assign the person accountable for customer/supplier support triage and response-time tracking." },
  { id: "escalation_owner", label: "Escalation owner", status: "owner_required", detail: "Assign the person accountable for safety, fraud, dispute, payment, and claims escalation decisions." },
  { id: "dispute_owner", label: "Dispute owner", status: "owner_required", detail: "Assign the person accountable for dispute intake, evidence review, and controlled resolution notes." },
  { id: "verification_owner", label: "Verification owner", status: "owner_required", detail: "Assign the person accountable for supplier profile and document-review readiness." },
  { id: "pilot_region", label: "Pilot region", status: "region_required", detail: "Set PILOT_REGION so supplier/customer testing remains geographically controlled." },
  { id: "pilot_categories", label: "Pilot asset categories", status: "category_scope_required", detail: "Set PILOT_ASSET_CATEGORIES to limit launch scope and support complexity." },
  { id: "pilot_targets", label: "Pilot target counts", status: "targets_required", detail: "Set supplier and customer target counts before inviting external users." },
  { id: "support_channel", label: "Support channel", status: "channel_required", detail: "Set PILOT_SUPPORT_EMAIL and optional PILOT_SUPPORT_PHONE for pilot support routing." },
  { id: "escalation_contact", label: "Escalation contact", status: "contact_required", detail: "Set PILOT_ESCALATION_EMAIL and emergency phone rules before live user issues." },
  { id: "operating_hours", label: "Operating hours", status: "hours_required", detail: "Set PILOT_OPERATING_HOURS and publish support availability expectations." },
  { id: "go_no_go", label: "Go/no-go checklist", status: "manual_approval_required", detail: "Pilot Go requires owner signoff, supplier list, support coverage, moderation process, and rollback decision path." },
];

export const PAYMENT_ACTIVATION_READINESS_CHECKS = [
  { id: "provider", label: "Provider selection", status: "provider_required", detail: "Recommended primary provider is Stripe Connect; secondary Jamaica-focused options are WiPay, Lynk Business, and NCB Merchant Services." },
  { id: "sandbox_credentials", label: "Sandbox credentials", status: "credentials_required", detail: "Sandbox public/secret keys must be supplied and verified before provider testing." },
  { id: "webhooks", label: "Webhook readiness", status: "webhook_secret_required", detail: "Webhook URL and provider webhook secret must be configured before sandbox validation." },
  { id: "merchant_onboarding", label: "Merchant onboarding", status: "workflow_required", detail: "Supplier/merchant onboarding flow and required business fields must be approved." },
  { id: "settlement", label: "Settlement readiness", status: "settlement_policy_required", detail: "Settlement currency, account model, fees, reconciliation, and payout timing must be defined." },
  { id: "refunds", label: "Refund readiness", status: "refund_policy_required", detail: "Refund policy, permissions, audit trail, and provider flow must be validated in sandbox." },
  { id: "chargebacks", label: "Chargeback readiness", status: "chargeback_contact_required", detail: "Chargeback contact, evidence workflow, and response SLA must be assigned." },
  { id: "payouts", label: "Payout readiness", status: "provider_required", detail: "Payout provider, payout mode, and reconciliation process must be configured before paid pilot." },
  { id: "compliance", label: "Payment compliance", status: "owner_required", detail: "Payment operations and compliance owners must approve card data, webhook, refund, payout, and record-retention controls." },
];

export const ESCROW_ACTIVATION_READINESS_CHECKS = [
  { id: "provider", label: "Provider readiness", status: "provider_required", detail: "Recommended paths are Stripe Connect architecture, WiPay, Lynk Business, NCB settlement, manual deposit hold, or legal trust account model." },
  { id: "trust_account", label: "Trust account readiness", status: "legal_finance_review_required", detail: "A legal trust account or approved manual hold model must be reviewed before any live deposits are held." },
  { id: "legal", label: "Legal readiness", status: "legal_owner_required", detail: "Escrow terms, deposit release rules, cancellation rules, and customer/supplier notices require legal review." },
  { id: "disputes", label: "Dispute readiness", status: "dispute_policy_required", detail: "Damage, late return, missing item, and inspection-disagreement workflows must be documented before live escrow." },
  { id: "settlement", label: "Settlement readiness", status: "settlement_policy_required", detail: "Settlement currency, reconciliation owner, payout timing, and audit controls must be approved." },
  { id: "release", label: "Release readiness", status: "release_policy_required", detail: "Conditional release, partial release, refund, cancellation, and expiry rules must be approved before paid pilot." },
  { id: "no_live_funds", label: "No live funds processing", status: "enforced", detail: "Module 50 readiness does not activate real deposits, escrow holds, refunds, payouts, chargebacks, or bank transfers." },
];

const PILOT_ENV_CHECKS = [
  { env: "PILOT_OWNER_NAME", id: "pilot_owner_name" },
  { env: "PILOT_OWNER_EMAIL", id: "pilot_owner_email" },
  { env: "PILOT_SUPPORT_EMAIL", id: "support_email" },
  { env: "PILOT_ESCALATION_EMAIL", id: "escalation_email" },
  { env: "PILOT_REGION", id: "pilot_region" },
  { env: "PILOT_ASSET_CATEGORIES", id: "pilot_asset_categories" },
  { env: "PILOT_SUPPLIER_TARGET", id: "supplier_target" },
  { env: "PILOT_CUSTOMER_TARGET", id: "customer_target" },
  { env: "PILOT_OPERATING_HOURS", id: "operating_hours" },
];

const PAYMENT_ENV_CHECKS = [
  "PAYMENT_PROVIDER",
  "PAYMENT_MODE",
  "PAYMENT_PUBLIC_KEY",
  "PAYMENT_SECRET_KEY",
  "PAYMENT_SANDBOX_ENABLED",
  "PAYMENT_WEBHOOK_URL",
  "PAYMENT_WEBHOOK_SECRET",
  "MERCHANT_ONBOARDING_MODE",
  "PAYMENT_OPERATIONS_OWNER",
  "PAYMENT_COMPLIANCE_OWNER",
  "SETTLEMENT_CURRENCY",
  "REFUND_MODE",
  "CHARGEBACK_CONTACT_EMAIL",
  "PAYOUT_MODE",
];

const ESCROW_ENV_CHECKS = [
  "ESCROW_PROVIDER",
  "ESCROW_MODE",
  "ESCROW_OPERATIONS_OWNER",
  "ESCROW_LEGAL_OWNER",
  "ESCROW_DISPUTE_OWNER",
  "ESCROW_RELEASE_POLICY_URL",
  "ESCROW_DISPUTE_POLICY_URL",
  "ESCROW_SETTLEMENT_CURRENCY",
];

const INFRASTRUCTURE_ENV_CHECKS = [
  "PRODUCTION_DOMAIN",
  "STAGING_DOMAIN",
  "TLS_CERTIFICATE_PROVIDER",
  "CDN_PROVIDER",
  "HOSTING_PROVIDER",
  "BACKUP_PROVIDER",
  "DISASTER_RECOVERY_REGION",
  "INFRASTRUCTURE_MONITORING_PROVIDER",
  "ENVIRONMENT_PROMOTION_WORKFLOW",
  "DEPLOYMENT_RUNBOOK_OWNER",
];

const SECURITY_CERTIFICATION_ENV_CHECKS = [
  "SECURITY_OWNER_NAME",
  "SECURITY_OWNER_EMAIL",
  "OWASP_REVIEW_OWNER",
  "DEPENDENCY_AUDIT_OWNER",
  "SECRETS_MANAGER_PROVIDER",
  "RBAC_AUDIT_OWNER",
  "AUTH_AUDIT_OWNER",
  "STORAGE_SECURITY_OWNER",
  "PAYMENT_SECURITY_OWNER",
  "ESCROW_SECURITY_OWNER",
  "INCIDENT_RESPONSE_OWNER",
  "VULNERABILITY_MANAGEMENT_OWNER",
];

const SECURITY_HARDENING_ENV_CHECKS = [
  "SECURITY_MFA_PROVIDER",
  "SECURITY_SESSION_COOKIE_POLICY",
  "SECURITY_REFRESH_TOKEN_ROTATION",
  "SECURITY_SESSION_REVOCATION",
  "SECURITY_CSP_POLICY",
  "SECURITY_CORS_REVIEW_STATUS",
  "SECURITY_CSRF_STRATEGY",
  "SECURITY_RATE_LIMIT_POLICY",
  "SECURITY_ABUSE_PROTECTION_PROVIDER",
  "SECURITY_REQUEST_VALIDATION_STATUS",
  "SECURITY_DEPENDENCY_AUDIT_TOOL",
  "SECURITY_VULNERABILITY_SCAN_PROVIDER",
  "SECURITY_PATCH_SLA_POLICY_URL",
  "SECURITY_EVENT_TAXONOMY_STATUS",
  "SECURITY_ALERT_ROUTING_STATUS",
  "SECURITY_INCIDENT_RUNBOOK_STATUS",
  "SECURITY_REMEDIATION_OWNER",
];

const COMPLIANCE_ENV_CHECKS = [
  "PRIVACY_OWNER_NAME",
  "PRIVACY_OWNER_EMAIL",
  "CONSENT_MANAGEMENT_STRATEGY",
  "DATA_RETENTION_POLICY_URL",
  "DATA_DELETION_POLICY_URL",
  "DATA_EXPORT_POLICY_URL",
  "DSAR_WORKFLOW_OWNER",
  "JAMAICA_DPA_REVIEW_OWNER",
  "GDPR_REVIEW_OWNER",
  "MARKETPLACE_COMPLIANCE_OWNER",
  "LEGAL_DOCUMENT_OWNER",
  "AUDIT_RETENTION_POLICY_URL",
  "KYC_PROVIDER",
  "KYC_POLICY_OWNER",
  "KYC_DATA_SHARING_POLICY_URL",
];

const REVENUE_ENV_CHECKS = [
  "REVENUE_OWNER_NAME",
  "REVENUE_OWNER_EMAIL",
  "MARKETPLACE_FEE_POLICY_URL",
  "COMMISSION_POLICY_URL",
  "PAYMENT_LIFECYCLE_POLICY_URL",
  "REFUND_LIFECYCLE_POLICY_URL",
  "DEPOSIT_LIFECYCLE_POLICY_URL",
  "ESCROW_LEDGER_POLICY_URL",
  "ESCROW_STATE_MACHINE_POLICY_URL",
  "SETTLEMENT_WORKFLOW_POLICY_URL",
  "RECONCILIATION_OWNER",
  "FINANCIAL_REPORTING_OWNER",
  "TAX_GCT_POLICY_URL",
  "PAYOUT_POLICY_URL",
  "TRANSACTION_AUDIT_POLICY_URL",
];

function hasConfiguredValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !["placeholder", "todo", "tbd", "none", "your-value"].includes(normalized) && !normalized.includes("placeholder");
}

export function getPilotOperationsReadiness(env = {}) {
  const missing = PILOT_ENV_CHECKS.filter((item) => !hasConfiguredValue(env[item.env])).map((item) => item.env);
  const score = Math.round(((PILOT_ENV_CHECKS.length - missing.length) / PILOT_ENV_CHECKS.length) * 100);
  return {
    status: missing.length ? "manual_operations_required" : "pilot_operations_ready_for_review",
    score,
    missing,
    configured: PILOT_ENV_CHECKS.filter((item) => hasConfiguredValue(env[item.env])).map((item) => item.env),
    supplierOnboardingStatus: hasConfiguredValue(env.PILOT_SUPPLIER_TARGET) && hasConfiguredValue(env.PILOT_ASSET_CATEGORIES) ? "scope_defined" : "scope_missing",
    supportReadiness: hasConfiguredValue(env.PILOT_SUPPORT_EMAIL) ? "support_channel_defined" : "support_channel_missing",
    moderationReadiness: hasConfiguredValue(env.PILOT_ESCALATION_EMAIL) ? "escalation_path_defined" : "escalation_path_missing",
    disputeEscalationReadiness: hasConfiguredValue(env.PILOT_ESCALATION_EMAIL) ? "dispute_escalation_placeholder_defined" : "dispute_escalation_owner_missing",
    verificationReadiness: hasConfiguredValue(env.PILOT_OWNER_EMAIL) ? "verification_owner_placeholder_defined" : "verification_owner_missing",
    message: missing.length
      ? `Pilot operations are missing required owner/configuration gates: ${missing.join(", ")}.`
      : "Pilot operations are configured for controlled review; external pilot still requires manual approval and live-provider decisions.",
  };
}

export function getPaymentActivationReadiness(env = {}) {
  const provider = String(env.PAYMENT_PROVIDER || "placeholder").toLowerCase();
  const providerSelected = !["placeholder", "simulated", "none", ""].includes(provider);
  const missing = PAYMENT_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((PAYMENT_ENV_CHECKS.length - missing.length) / PAYMENT_ENV_CHECKS.length) * 100);
  return {
    status: providerSelected && missing.length === 0 ? "sandbox_ready_for_review" : "manual_payment_setup_required",
    score,
    provider,
    liveActivation: false,
    missing,
    providerReadiness: providerSelected ? "provider_selected" : "provider_not_selected",
    sandboxReadiness: hasConfiguredValue(env.PAYMENT_SANDBOX_ENABLED) && hasConfiguredValue(env.PAYMENT_PUBLIC_KEY) && hasConfiguredValue(env.PAYMENT_SECRET_KEY) ? "sandbox_credentials_present" : "sandbox_credentials_missing",
    webhookReadiness: hasConfiguredValue(env.PAYMENT_WEBHOOK_URL) && hasConfiguredValue(env.PAYMENT_WEBHOOK_SECRET) ? "webhook_ready_for_sandbox_test" : "webhook_missing_or_placeholder",
    merchantOnboardingReadiness: hasConfiguredValue(env.MERCHANT_ONBOARDING_MODE) || hasConfiguredValue(env.MERCHANT_ONBOARDING_URL) ? "merchant_onboarding_documented" : "merchant_onboarding_missing",
    settlementReadiness: hasConfiguredValue(env.SETTLEMENT_CURRENCY) ? "settlement_review_ready" : "settlement_missing",
    refundReadiness: hasConfiguredValue(env.REFUND_MODE) ? "refund_policy_ready_for_sandbox" : "refund_policy_missing",
    chargebackReadiness: hasConfiguredValue(env.CHARGEBACK_CONTACT_EMAIL) ? "chargeback_contact_ready" : "chargeback_contact_missing",
    payoutReadiness: hasConfiguredValue(env.PAYOUT_MODE) && !["simulated", "placeholder"].includes(String(env.PAYOUT_MODE).toLowerCase()) ? "payout_provider_selected" : "payout_simulated_or_missing",
    complianceReadiness: hasConfiguredValue(env.PAYMENT_COMPLIANCE_OWNER) && hasConfiguredValue(env.PAYMENT_OPERATIONS_OWNER) ? "compliance_owner_assigned" : "compliance_owner_missing",
    message: providerSelected
      ? missing.length
        ? `Payment provider ${provider} is selected but missing sandbox/readiness gates: ${missing.join(", ")}.`
        : `Payment provider ${provider} is sandbox-ready for validation review. Live payments remain disabled.`
      : "Payment provider is not selected. Simulated payments remain the default safe mode.",
  };
}

export function getEscrowActivationReadiness(env = {}) {
  const provider = String(env.ESCROW_PROVIDER || "placeholder").toLowerCase();
  const providerSelected = !["placeholder", "none", ""].includes(provider);
  const missing = ESCROW_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((ESCROW_ENV_CHECKS.length - missing.length) / ESCROW_ENV_CHECKS.length) * 100);
  return {
    status: providerSelected && missing.length === 0 ? "credential_ready_for_legal_review" : "manual_escrow_setup_required",
    score,
    provider,
    liveActivation: false,
    liveFundsProcessing: false,
    missing,
    providerReadiness: providerSelected ? "provider_selected" : "provider_not_selected",
    trustAccountReadiness: hasConfiguredValue(env.LEGAL_TRUST_ACCOUNT_BANK) && hasConfiguredValue(env.LEGAL_TRUST_ACCOUNT_OWNER) ? "trust_account_review_ready" : "trust_account_missing",
    legalReadiness: hasConfiguredValue(env.ESCROW_LEGAL_OWNER) && hasConfiguredValue(env.ESCROW_RELEASE_POLICY_URL) ? "legal_review_owner_assigned" : "legal_review_missing",
    disputeReadiness: hasConfiguredValue(env.ESCROW_DISPUTE_OWNER) && hasConfiguredValue(env.ESCROW_DISPUTE_POLICY_URL) ? "dispute_policy_ready_for_review" : "dispute_policy_missing",
    settlementReadiness: hasConfiguredValue(env.ESCROW_SETTLEMENT_CURRENCY) ? "settlement_currency_defined" : "settlement_currency_missing",
    releaseReadiness: hasConfiguredValue(env.ESCROW_RELEASE_POLICY_URL) ? "release_policy_documented" : "release_policy_missing",
    supportedDepositTypes: ["security_deposit", "damage_deposit", "reservation_deposit", "booking_hold_deposit", "property_deposit", "equipment_deposit"],
    supportedStates: ["draft", "pending", "held", "released", "partially_released", "refunded", "disputed", "cancelled", "expired"],
    message: providerSelected
      ? missing.length
        ? `Escrow provider ${provider} is selected but missing readiness gates: ${missing.join(", ")}.`
        : `Escrow provider ${provider} is credential-ready for legal/sandbox review. Live funds remain disabled.`
      : "Escrow provider is not selected. No live deposits, holds, releases, refunds, payouts, or legal escrow capability are active.",
  };
}

export function getInfrastructureActivationReadiness(env = {}) {
  const missing = INFRASTRUCTURE_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((INFRASTRUCTURE_ENV_CHECKS.length - missing.length) / INFRASTRUCTURE_ENV_CHECKS.length) * 100);
  return {
    status: missing.length ? "manual_infrastructure_setup_required" : "credential_ready_for_staging_review",
    score,
    liveActivation: false,
    productionTrafficActive: false,
    missing,
    dnsStatus: hasConfiguredValue(env.PRODUCTION_DOMAIN) && hasConfiguredValue(env.STAGING_DOMAIN) ? "domains_documented" : "domains_missing",
    tlsStatus: hasConfiguredValue(env.TLS_CERTIFICATE_PROVIDER) && hasConfiguredValue(env.TLS_ENFORCEMENT_POLICY) ? "tls_policy_documented" : "tls_certificate_missing",
    cdnStatus: hasConfiguredValue(env.CDN_PROVIDER) ? "cdn_provider_selected" : "cdn_provider_missing",
    backupStatus: hasConfiguredValue(env.BACKUP_PROVIDER) && hasConfiguredValue(env.BACKUP_RETENTION_DAYS) ? "backup_policy_documented" : "backup_policy_missing",
    disasterRecoveryStatus: hasConfiguredValue(env.DISASTER_RECOVERY_REGION) && hasConfiguredValue(env.DISASTER_RECOVERY_RTO_MINUTES) && hasConfiguredValue(env.DISASTER_RECOVERY_RPO_MINUTES) ? "dr_policy_documented" : "dr_policy_missing",
    hostingStatus: hasConfiguredValue(env.HOSTING_PROVIDER) ? "hosting_provider_selected" : "hosting_provider_missing",
    monitoringStatus: hasConfiguredValue(env.INFRASTRUCTURE_MONITORING_PROVIDER) || hasConfiguredValue(env.MONITORING_PROVIDER) ? "infrastructure_monitoring_selected" : "infrastructure_monitoring_missing",
    deploymentStatus: hasConfiguredValue(env.ENVIRONMENT_PROMOTION_WORKFLOW) && hasConfiguredValue(env.DEPLOYMENT_RUNBOOK_OWNER) ? "promotion_workflow_documented" : "promotion_workflow_missing",
    message: missing.length
      ? `Infrastructure readiness is missing required gates: ${missing.join(", ")}.`
      : "Infrastructure is credential-ready for staging review. Production deployment, DNS cutover, TLS activation, CDN routing, and live traffic remain disabled.",
  };
}

export function getSecurityCertificationReadiness(env = {}) {
  const missing = SECURITY_CERTIFICATION_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((SECURITY_CERTIFICATION_ENV_CHECKS.length - missing.length) / SECURITY_CERTIFICATION_ENV_CHECKS.length) * 100);
  return {
    status: missing.length ? "security_certification_readiness_missing" : "ready_for_external_security_review",
    score,
    certified: false,
    penetrationTestCompleted: false,
    soc2Claimed: false,
    missing,
    owaspStatus: hasConfiguredValue(env.OWASP_REVIEW_OWNER) ? "owner_assigned" : "review_required",
    dependencyAuditStatus: hasConfiguredValue(env.DEPENDENCY_AUDIT_OWNER) ? "owner_assigned" : "audit_required",
    secretsStatus: hasConfiguredValue(env.SECRETS_MANAGER_PROVIDER) ? "secret_manager_selected" : "secret_manager_required",
    rbacStatus: hasConfiguredValue(env.RBAC_AUDIT_OWNER) ? "owner_assigned" : "audit_required",
    authenticationStatus: hasConfiguredValue(env.AUTH_AUDIT_OWNER) ? "owner_assigned" : "audit_required",
    storageStatus: hasConfiguredValue(env.STORAGE_SECURITY_OWNER) ? "owner_assigned" : "audit_required",
    paymentStatus: hasConfiguredValue(env.PAYMENT_SECURITY_OWNER) ? "owner_assigned" : "audit_required",
    escrowStatus: hasConfiguredValue(env.ESCROW_SECURITY_OWNER) ? "owner_assigned" : "audit_required",
    monitoringStatus: hasConfiguredValue(env.INFRASTRUCTURE_MONITORING_PROVIDER) || hasConfiguredValue(env.MONITORING_PROVIDER) ? "monitoring_review_ready" : "audit_required",
    incidentResponseStatus: hasConfiguredValue(env.INCIDENT_RESPONSE_OWNER) ? "owner_assigned" : "tabletop_required",
    message: missing.length
      ? `Security certification readiness is missing required owners/configuration: ${missing.join(", ")}.`
      : "Security certification readiness is prepared for external review. Certification, SOC2, and penetration testing remain incomplete until performed by qualified reviewers.",
  };
}

export function getSecurityHardeningProgramReadiness(env = {}) {
  const missing = SECURITY_HARDENING_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((SECURITY_HARDENING_ENV_CHECKS.length - missing.length) / SECURITY_HARDENING_ENV_CHECKS.length) * 100);
  return {
    status: missing.length ? "security_hardening_inputs_missing" : "ready_for_staging_security_validation",
    score,
    liveMfaActive: false,
    liveWafActive: false,
    liveSiemActive: false,
    externalPenTestVendorActive: false,
    productionSecurityToolingActive: false,
    missing,
    authenticationSecurityStatus: ["SECURITY_MFA_PROVIDER", "SECURITY_SESSION_COOKIE_POLICY", "SECURITY_REFRESH_TOKEN_ROTATION", "SECURITY_SESSION_REVOCATION"].every((key) => hasConfiguredValue(env[key])) ? "staging_validation_ready" : "mfa_session_inputs_missing",
    applicationSecurityStatus: ["SECURITY_CSP_POLICY", "SECURITY_CORS_REVIEW_STATUS", "SECURITY_CSRF_STRATEGY"].every((key) => hasConfiguredValue(env[key])) ? "policy_review_ready" : "policy_inputs_missing",
    apiSecurityStatus: ["SECURITY_RATE_LIMIT_POLICY", "SECURITY_ABUSE_PROTECTION_PROVIDER", "SECURITY_REQUEST_VALIDATION_STATUS"].every((key) => hasConfiguredValue(env[key])) ? "api_hardening_review_ready" : "api_hardening_inputs_missing",
    dependencySecurityStatus: ["SECURITY_DEPENDENCY_AUDIT_TOOL", "SECURITY_VULNERABILITY_SCAN_PROVIDER", "SECURITY_PATCH_SLA_POLICY_URL"].every((key) => hasConfiguredValue(env[key])) ? "scan_pipeline_ready" : "scan_pipeline_inputs_missing",
    securityMonitoringStatus: ["SECURITY_EVENT_TAXONOMY_STATUS", "SECURITY_ALERT_ROUTING_STATUS", "SECURITY_INCIDENT_RUNBOOK_STATUS", "SECURITY_REMEDIATION_OWNER"].every((key) => hasConfiguredValue(env[key])) ? "security_alert_review_ready" : "security_alert_inputs_missing",
    message: missing.length
      ? `Security hardening program is missing required inputs: ${missing.join(", ")}.`
      : "Security hardening controls are ready for staging validation. Live MFA, WAF, SOC/SIEM, penetration-test vendors, and production security tooling remain inactive.",
  };
}

export function getComplianceActivationReadiness(env = {}) {
  const missing = COMPLIANCE_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((COMPLIANCE_ENV_CHECKS.length - missing.length) / COMPLIANCE_ENV_CHECKS.length) * 100);
  return {
    status: missing.length ? "privacy_compliance_inputs_missing" : "ready_for_legal_compliance_review",
    score,
    liveKycVendorActive: false,
    realIdentityVerificationActive: false,
    sanctionsScreeningActive: false,
    amlMonitoringActive: false,
    documentVerificationProviderActive: false,
    complianceApproved: false,
    missing,
    privacyProgramStatus: ["PRIVACY_OWNER_NAME", "PRIVACY_OWNER_EMAIL", "CONSENT_MANAGEMENT_STRATEGY", "DATA_RETENTION_POLICY_URL", "DATA_DELETION_POLICY_URL", "DATA_EXPORT_POLICY_URL", "DSAR_WORKFLOW_OWNER"].every((key) => hasConfiguredValue(env[key])) ? "privacy_review_ready" : "privacy_inputs_missing",
    jamaicaDpaStatus: hasConfiguredValue(env.JAMAICA_DPA_REVIEW_OWNER) ? "review_owner_assigned" : "review_owner_missing",
    gdprStatus: hasConfiguredValue(env.GDPR_REVIEW_OWNER) ? "framework_owner_assigned" : "framework_owner_missing",
    marketplaceComplianceStatus: hasConfiguredValue(env.MARKETPLACE_COMPLIANCE_OWNER) ? "marketplace_owner_assigned" : "marketplace_owner_missing",
    auditRetentionStatus: hasConfiguredValue(env.AUDIT_RETENTION_POLICY_URL) ? "retention_policy_documented" : "retention_policy_missing",
    legalDocumentStatus: hasConfiguredValue(env.LEGAL_DOCUMENT_OWNER) ? "legal_document_owner_assigned" : "legal_document_owner_missing",
    kycReadinessStatus: ["KYC_PROVIDER", "KYC_POLICY_OWNER", "KYC_DATA_SHARING_POLICY_URL"].every((key) => hasConfiguredValue(env[key])) ? "kyc_policy_review_ready" : "kyc_policy_inputs_missing",
    message: missing.length
      ? `Privacy and compliance activation is missing required inputs: ${missing.join(", ")}.`
      : "Privacy and compliance controls are ready for legal review. Live KYC, identity verification, sanctions screening, AML monitoring, and document-verification providers remain inactive.",
  };
}

export function getRevenueActivationReadiness(env = {}) {
  const missing = REVENUE_ENV_CHECKS.filter((key) => !hasConfiguredValue(env[key]));
  const score = Math.round(((REVENUE_ENV_CHECKS.length - missing.length) / REVENUE_ENV_CHECKS.length) * 100);
  return {
    status: missing.length ? "revenue_activation_inputs_missing" : "ready_for_sandbox_revenue_review",
    score,
    providerReadyOnly: true,
    liveMoneyMovementActive: false,
    realEscrowAccountActive: false,
    realSettlementActive: false,
    stripeActive: false,
    paypalActive: false,
    wipayActive: false,
    fygaroActive: false,
    ncbGatewayActive: false,
    missing,
    paymentArchitectureStatus: ["MARKETPLACE_FEE_POLICY_URL", "COMMISSION_POLICY_URL", "PAYMENT_LIFECYCLE_POLICY_URL", "REFUND_LIFECYCLE_POLICY_URL"].every((key) => hasConfiguredValue(env[key])) ? "payment_architecture_review_ready" : "payment_architecture_inputs_missing",
    escrowArchitectureStatus: ["DEPOSIT_LIFECYCLE_POLICY_URL", "ESCROW_LEDGER_POLICY_URL", "ESCROW_STATE_MACHINE_POLICY_URL", "SETTLEMENT_WORKFLOW_POLICY_URL"].every((key) => hasConfiguredValue(env[key])) ? "escrow_architecture_review_ready" : "escrow_architecture_inputs_missing",
    financialControlsStatus: ["RECONCILIATION_OWNER", "FINANCIAL_REPORTING_OWNER", "TRANSACTION_AUDIT_POLICY_URL"].every((key) => hasConfiguredValue(env[key])) ? "financial_controls_review_ready" : "financial_controls_inputs_missing",
    transactionAuditStatus: hasConfiguredValue(env.TRANSACTION_AUDIT_POLICY_URL) ? "transaction_audit_policy_documented" : "transaction_audit_policy_missing",
    taxGctStatus: hasConfiguredValue(env.TAX_GCT_POLICY_URL) ? "tax_gct_policy_documented" : "tax_gct_policy_missing",
    payoutReadinessStatus: hasConfiguredValue(env.PAYOUT_POLICY_URL) ? "payout_policy_documented" : "payout_policy_missing",
    reconciliationStatus: hasConfiguredValue(env.RECONCILIATION_OWNER) ? "reconciliation_owner_assigned" : "reconciliation_owner_missing",
    financialReportingStatus: hasConfiguredValue(env.FINANCIAL_REPORTING_OWNER) ? "financial_reporting_owner_assigned" : "financial_reporting_owner_missing",
    paymentLifecycleStates: ["draft", "intent_created", "authorized_placeholder", "simulated_paid", "failed", "cancelled", "refunded_placeholder"],
    depositLifecycleStates: ["not_required", "draft", "requested", "pending_hold", "held_placeholder", "release_pending", "released_placeholder", "refund_pending", "refunded_placeholder", "disputed", "expired"],
    escrowLedgerStates: ["draft", "pending", "held", "released", "partially_released", "refunded", "disputed", "cancelled", "expired"],
    settlementWorkflowSteps: ["capture_review", "ledger_posting", "fee_calculation", "supplier_earnings", "reconciliation", "payout_review", "reporting"],
    message: missing.length
      ? `Revenue activation architecture is missing required inputs: ${missing.join(", ")}. No live payment, escrow, refund, payout, settlement, or bank-transfer flow is active.`
      : "Revenue activation architecture is ready for sandbox/provider review. Live money movement remains disabled.",
  };
}

export function getCredentialReadinessSummary() {
  const pilotOperations = getPilotOperationsReadiness(typeof process !== "undefined" ? process.env : {});
  const paymentActivation = getPaymentActivationReadiness(typeof process !== "undefined" ? process.env : {});
  const escrowActivation = getEscrowActivationReadiness(typeof process !== "undefined" ? process.env : {});
  const infrastructureActivation = getInfrastructureActivationReadiness(typeof process !== "undefined" ? process.env : {});
  const securityHardening = getSecurityHardeningProgramReadiness(typeof process !== "undefined" ? process.env : {});
  const complianceActivation = getComplianceActivationReadiness(typeof process !== "undefined" ? process.env : {});
  const revenueActivation = getRevenueActivationReadiness(typeof process !== "undefined" ? process.env : {});
  const securityCertification = getSecurityCertificationReadiness(typeof process !== "undefined" ? process.env : {});
  return {
    notice: CREDENTIAL_READINESS_NOTICE,
    completedToCredentialLevel: REMAINING_WORKSTREAMS.map((item) => item.id),
    manualInterventionRequired: REMAINING_WORKSTREAMS.filter((item) => item.credentialStage !== "foundation_complete").map((item) => item.id),
    workstreams: REMAINING_WORKSTREAMS,
    securityBaseline: SECURITY_BASELINE_CHECKS,
    deploymentReadiness: DEPLOYMENT_READINESS_CHECKS,
    monitoringReadiness: MONITORING_READINESS_CHECKS,
    pilotOperationsReadiness: PILOT_OPERATIONS_READINESS_CHECKS,
    pilotOperations,
    paymentActivationReadiness: PAYMENT_ACTIVATION_READINESS_CHECKS,
    paymentActivation,
    escrowActivationReadiness: ESCROW_ACTIVATION_READINESS_CHECKS,
    escrowActivation,
    infrastructureActivationReadiness: INFRASTRUCTURE_ACTIVATION_READINESS_CHECKS,
    infrastructureActivation,
    securityHardeningProgramReadiness: SECURITY_HARDENING_PROGRAM_CHECKS,
    securityHardening,
    complianceActivationReadiness: COMPLIANCE_ACTIVATION_READINESS_CHECKS,
    complianceActivation,
    revenueActivationReadiness: REVENUE_ACTIVATION_READINESS_CHECKS,
    revenueActivation,
    securityCertificationReadiness: SECURITY_CERTIFICATION_READINESS_CHECKS,
    securityCertification,
  };
}
