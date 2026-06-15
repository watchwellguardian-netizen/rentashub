import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("credential-readiness source and documentation exist", () => {
  assert.equal(existsSync(join(root, "server/src/config/integrationReadiness.js")), true);
  assert.equal(existsSync(join(root, "src/lib/credentialReadiness.js")), true);
  assert.equal(existsSync(join(root, "scripts/check-readiness.mjs")), true);
  assert.equal(existsSync(join(root, "docs/production-credential-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/phase-2-production-activation-roadmap.md")), true);
  assert.equal(existsSync(join(root, "docs/supabase-auth-activation.md")), true);
  assert.equal(existsSync(join(root, "server/docs/supabase-postgres-activation.md")), true);
  assert.equal(existsSync(join(root, "server/docs/supabase-storage-activation.md")), true);
  assert.equal(existsSync(join(root, "docs/monitoring-observability-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/pilot-operations-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/supplier-onboarding-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/customer-support-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/admin-moderation-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/payment-provider-activation-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/payment-operations-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/escrow-activation-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/escrow-operations-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/escrow-dispute-playbook.md")), true);
  assert.equal(existsSync(join(root, "server/src/infrastructure/infrastructureReadiness.js")), true);
  assert.equal(existsSync(join(root, "docs/infrastructure-activation-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/disaster-recovery-plan.md")), true);
  assert.equal(existsSync(join(root, "docs/backup-recovery-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/deployment-runbook.md")), true);
  assert.equal(existsSync(join(root, "docs/environment-promotion-guide.md")), true);
  assert.equal(existsSync(join(root, "docs/security-hardening-baseline.md")), true);
  assert.equal(existsSync(join(root, "server/src/security/securityCertificationReadiness.js")), true);
  assert.equal(existsSync(join(root, "docs/security-certification-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/owasp-review-checklist.md")), true);
  assert.equal(existsSync(join(root, "docs/security-audit-checklist.md")), true);
  assert.equal(existsSync(join(root, "docs/incident-response-plan.md")), true);
  assert.equal(existsSync(join(root, "docs/vulnerability-management-plan.md")), true);
  assert.equal(existsSync(join(root, "docs/secrets-management-guide.md")), true);
  assert.equal(existsSync(join(root, "docs/closed-beta-readiness-report.md")), true);
  assert.equal(existsSync(join(root, "docs/closed-beta-checklist.md")), true);
  assert.equal(existsSync(join(root, "docs/beta-risk-register.md")), true);
  assert.equal(existsSync(join(root, "docs/beta-success-metrics.md")), true);
  assert.equal(existsSync(join(root, "docs/paid-pilot-readiness-report.md")), true);
  assert.equal(existsSync(join(root, "docs/revenue-operations-playbook.md")), true);
  assert.equal(existsSync(join(root, "docs/pilot-sla-framework.md")), true);
  assert.equal(existsSync(join(root, "docs/commercial-risk-register.md")), true);
  assert.equal(existsSync(join(root, "docs/public-launch-certification-report.md")), true);
  assert.equal(existsSync(join(root, "docs/final-launch-gap-register.md")), true);
  assert.equal(existsSync(join(root, "docs/public-launch-risk-register.md")), true);
  assert.equal(existsSync(join(root, "docs/executive-launch-report.md")), true);
  assert.equal(existsSync(join(root, "docs/board-launch-readiness-report.md")), true);
  assert.equal(existsSync(join(root, "docs/phase-3-production-activation-program.md")), true);
  assert.equal(existsSync(join(root, "docs/project-a-supabase-activation-intake.md")), true);
  assert.equal(existsSync(join(root, "docs/deployment-readiness.md")), true);
  assert.equal(existsSync(join(root, "docs/production-launch-checklist.md")), true);
  assert.match(read("server/src/routes/healthRoutes.js"), /\/api\/health\/readiness/);
});

test("Phase 3 production activation program defines waves gates and Project A credential intake", () => {
  const program = read("docs/phase-3-production-activation-program.md");
  const supabaseIntake = read("docs/project-a-supabase-activation-intake.md");

  for (const phrase of [
    "Wave 1 - Core Platform Activation",
    "Project A - Supabase Activation",
    "Project D - Monitoring Activation",
    "Project E - Infrastructure Deployment",
    "Wave 1 exit condition: RentasHub runs as a live operational platform in staging",
    "Wave 2 - Commercial Activation",
    "Project B - Payment Activation",
    "Project C - Escrow Activation",
    "Wave 2 exit condition: RentasHub can safely support real commercial transactions",
    "Wave 3 - Certification And Launch",
    "Project F - Security Certification",
    "Wave 3 exit condition: formal production approval package",
    "Gate 1 - Closed Beta GO",
    "Gate 2 - Paid Pilot GO",
    "Gate 3 - Public Launch GO",
    "Public Launch: NO-GO",
  ]) {
    assert.match(program, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }

  for (const phrase of [
    "Supabase account",
    "Supabase project",
    "PostgreSQL `DATABASE_URL`",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "Storage bucket names",
    "Backup retention policy",
    "Do not commit real secrets",
    "Project A is complete only when Supabase PostgreSQL, Auth, Storage, backup validation, and restore testing are verified",
  ]) {
    assert.match(supabaseIntake, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
});

test("Module 55 public launch certification review blocks public launch until final gates are closed", () => {
  const certification = read("docs/public-launch-certification-report.md");
  const gapRegister = read("docs/final-launch-gap-register.md");
  const riskRegister = read("docs/public-launch-risk-register.md");
  const executive = read("docs/executive-launch-report.md");
  const board = read("docs/board-launch-readiness-report.md");

  for (const phrase of [
    "Decision: PUBLIC LAUNCH NO-GO",
    "Launch readiness score: 71%",
    "Production-ready status: Not production ready",
    "Architecture",
    "Database",
    "Storage",
    "Authentication",
    "Payments",
    "Escrow",
    "Support",
    "Monitoring",
    "Infrastructure",
    "Security",
    "Compliance",
    "Operations",
    "RentasHub cannot be considered production ready",
  ]) {
    assert.match(certification, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }

  assert.match(gapRegister, /LAUNCH-001/);
  assert.match(gapRegister, /PostgreSQL not active/);
  assert.match(gapRegister, /Launch blocker/);
  assert.match(riskRegister, /Risk level: Critical/);
  assert.match(riskRegister, /PUBLIC LAUNCH NO-GO|NO-GO/);
  assert.match(executive, /RentasHub is not approved for public launch/);
  assert.match(executive, /RentasHub cannot be considered production ready/);
  assert.match(board, /Board Decision/);
  assert.match(board, /PUBLIC LAUNCH NO-GO/);
});

test("Module 53 closed beta launch readiness review defines decision risks checklist and metrics", () => {
  const report = read("docs/closed-beta-readiness-report.md");
  const checklist = read("docs/closed-beta-checklist.md");
  const riskRegister = read("docs/beta-risk-register.md");
  const metrics = read("docs/beta-success-metrics.md");

  for (const phrase of [
    "Closed Beta Go/No-Go Matrix",
    "Marketplace",
    "Trust",
    "Reviews",
    "Messaging",
    "Claims",
    "Protection",
    "Escrow Readiness",
    "Supplier Onboarding",
    "Customer Support",
    "Admin Moderation",
    "Infrastructure",
    "Monitoring",
    "Security",
    "Recommendation: Conditional GO",
    "Beta readiness score: 88%",
    "Risk level: Medium-High",
    "Do not approve public launch",
  ]) {
    assert.match(report, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }

  assert.match(checklist, /Beta Launch Checklist/);
  assert.match(checklist, /Go\/No-Go Decision/);
  assert.match(checklist, /Conditional GO/);
  assert.match(riskRegister, /BETA-001/);
  assert.match(riskRegister, /Real database not active/);
  assert.match(riskRegister, /Overall Risk Level/);
  assert.match(metrics, /Beta Success Metrics/);
  assert.match(metrics, /Beta Operations Plan/);
  assert.match(metrics, /Beta Escalation Plan/);
});

test("Module 54 paid pilot readiness review blocks revenue launch until commercial gates are active", () => {
  const report = read("docs/paid-pilot-readiness-report.md");
  const revenueOps = read("docs/revenue-operations-playbook.md");
  const sla = read("docs/pilot-sla-framework.md");
  const commercialRisks = read("docs/commercial-risk-register.md");

  for (const phrase of [
    "Paid Pilot Go/No-Go Matrix",
    "Database",
    "Storage",
    "Auth",
    "Payments",
    "Escrow",
    "Support",
    "Monitoring",
    "Moderation",
    "Infrastructure",
    "Security",
    "Recommendation: NO-GO",
    "Paid pilot readiness: 62%",
    "Commercial risk score: 78/100 High",
    "Do not activate paid customers",
  ]) {
    assert.match(report, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }

  assert.match(revenueOps, /Revenue Operations Checklist/);
  assert.match(revenueOps, /Customer Support Requirements/);
  assert.match(revenueOps, /Paid pilot may not start/);
  assert.match(sla, /Pilot SLA Framework/);
  assert.match(sla, /Severity 1/);
  assert.match(sla, /SLA Preconditions/);
  assert.match(commercialRisks, /COMM-001/);
  assert.match(commercialRisks, /No live payment provider/);
  assert.match(commercialRisks, /Commercial risk score: 78\/100 High/);
  assert.match(commercialRisks, /Paid pilot remains NO-GO/);
});

test("env examples expose manual credential gates for remaining production workstreams", () => {
  const backendEnv = read("server/.env.example");
  for (const key of [
    "DATABASE_PROVIDER",
    "AUTH_PROVIDER",
    "AUTH_REQUIRE_EMAIL_VERIFICATION",
    "AUTH_PASSWORD_RESET_ENABLED",
    "AUTH_REFRESH_TOKEN_ROTATION",
    "AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION",
    "DATABASE_POSTGRES_VENDOR",
    "DATABASE_URL",
    "FILE_STORAGE_PROVIDER",
    "FILE_STORAGE_BUCKET",
    "FILE_STORAGE_REGION",
    "FILE_STORAGE_ACCESS_KEY",
    "FILE_STORAGE_SECRET_KEY",
    "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
    "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
    "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
    "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
    "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
    "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
    "FILE_STORAGE_PUBLIC_BASE_URL",
    "FILE_STORAGE_SIGNED_URL_TTL_SECONDS",
    "FILE_UPLOAD_MAX_MB",
    "FILE_REQUIRE_VIRUS_SCAN",
    "PAYMENT_PROVIDER",
    "PAYMENT_SANDBOX_ENABLED",
    "PAYMENT_SANDBOX_PUBLIC_KEY",
    "PAYMENT_SANDBOX_SECRET_KEY",
    "PAYMENT_WEBHOOK_URL",
    "PAYMENT_WEBHOOK_SECRET",
    "PAYMENT_OPERATIONS_OWNER",
    "PAYMENT_COMPLIANCE_OWNER",
    "MERCHANT_ONBOARDING_MODE",
    "MERCHANT_ONBOARDING_URL",
    "SETTLEMENT_ACCOUNT_ID",
    "SETTLEMENT_CURRENCY",
    "REFUND_MODE",
    "CHARGEBACK_CONTACT_EMAIL",
    "PAYOUT_PROVIDER",
    "PAYOUT_WEBHOOK_SECRET",
    "ESCROW_PROVIDER",
    "ESCROW_MODE",
    "ESCROW_OPERATIONS_OWNER",
    "ESCROW_LEGAL_OWNER",
    "ESCROW_DISPUTE_OWNER",
    "ESCROW_RELEASE_POLICY_URL",
    "ESCROW_DISPUTE_POLICY_URL",
    "ESCROW_SETTLEMENT_CURRENCY",
    "MANUAL_DEPOSIT_HOLD_POLICY_URL",
    "LEGAL_TRUST_ACCOUNT_BANK",
    "KYC_PROVIDER",
    "INSURANCE_PROVIDER",
    "DEPLOYMENT_PROVIDER",
    "HOSTING_PROVIDER",
    "PRODUCTION_DOMAIN",
    "STAGING_DOMAIN",
    "TLS_CERTIFICATE_PROVIDER",
    "TLS_ENFORCEMENT_POLICY",
    "CDN_PROVIDER",
    "BACKUP_RETENTION_DAYS",
    "DISASTER_RECOVERY_REGION",
    "DISASTER_RECOVERY_RTO_MINUTES",
    "DISASTER_RECOVERY_RPO_MINUTES",
    "INFRASTRUCTURE_MONITORING_PROVIDER",
    "ENVIRONMENT_PROMOTION_WORKFLOW",
    "DEPLOYMENT_RUNBOOK_OWNER",
    "MONITORING_PROVIDER",
    "SENTRY_DSN",
    "SENTRY_ENVIRONMENT",
    "SENTRY_RELEASE",
    "BETTER_STACK_API_KEY",
    "BETTER_STACK_HEARTBEAT_URL",
    "BETTER_STACK_STATUS_PAGE_ID",
    "LOG_LEVEL",
    "LOG_DRAIN_URL",
    "ALERT_EMAIL",
    "ALERT_SMS",
    "INCIDENT_OWNER_NAME",
    "INCIDENT_OWNER_EMAIL",
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
    "MONITORING_SECURITY_OWNER",
    "INCIDENT_RESPONSE_OWNER",
    "VULNERABILITY_MANAGEMENT_OWNER",
    "PILOT_REGION",
    "PILOT_ASSET_CATEGORIES",
    "PILOT_SUPPLIER_TARGET",
    "PILOT_CUSTOMER_TARGET",
    "PILOT_SUPPORT_EMAIL",
    "PILOT_SUPPORT_PHONE",
    "PILOT_ESCALATION_EMAIL",
    "PILOT_OPERATING_HOURS",
    "PILOT_OWNER_NAME",
    "PILOT_OWNER_EMAIL",
    "APP_BASE_URL",
    "CORS_ORIGIN",
    "CORS_ALLOWED_ORIGINS",
    "AUTH_TOKEN_SECRET",
    "SESSION_SECRET",
    "SESSION_COOKIE_SECRET",
    "APP_ENCRYPTION_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "STRIPE_SECRET_KEY",
    "S3_BUCKET",
    "SUPABASE_ANON_KEY",
    "PERSONA_API_KEY",
    "INSURANCE_API_KEY",
  ]) {
    assert.match(backendEnv, new RegExp(`${key}=?`), `${key} should be documented`);
  }
});

test("Module 52 security certification readiness docs cover audits incident response and no-certification boundary", () => {
  const readiness = read("docs/security-certification-readiness.md");
  const owasp = read("docs/owasp-review-checklist.md");
  const audit = read("docs/security-audit-checklist.md");
  const incident = read("docs/incident-response-plan.md");
  const vulnerability = read("docs/vulnerability-management-plan.md");
  const secrets = read("docs/secrets-management-guide.md");
  const adminPage = read("src/pages/AdminCenter.jsx");
  const source = read("src/lib/credentialReadiness.js");
  const serverSource = read("server/src/security/securityCertificationReadiness.js");

  for (const phrase of [
    "OWASP review checklist",
    "Security architecture review",
    "Secrets management checklist",
    "Dependency audit checklist",
    "RBAC audit",
    "Authentication audit",
    "Storage security audit",
    "Payment security audit",
    "Escrow security audit",
    "Monitoring audit",
    "Incident response plan",
    "not completed",
    "SOC2: not claimed",
  ]) {
    assert.match(readiness, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }

  assert.match(owasp, /OWASP API Top 10/);
  assert.match(audit, /RBAC Audit/);
  assert.match(incident, /Severity Levels/);
  assert.match(vulnerability, /Remediation Targets/);
  assert.match(secrets, /No real secrets committed/);
  assert.match(adminPage, /Security certification readiness/);
  assert.match(source, /SECURITY_CERTIFICATION_READINESS_CHECKS/);
  assert.match(serverSource, /certified: false/);
  assert.match(serverSource, /penetrationTestCompleted: false/);
  assert.match(serverSource, /soc2Claimed: false/);
});

test("Module 51 infrastructure activation readiness docs cover DNS TLS hosting CDN backup DR and promotion", () => {
  const readiness = read("docs/infrastructure-activation-readiness.md");
  const dr = read("docs/disaster-recovery-plan.md");
  const backup = read("docs/backup-recovery-playbook.md");
  const runbook = read("docs/deployment-runbook.md");
  const promotion = read("docs/environment-promotion-guide.md");
  const adminPage = read("src/pages/AdminCenter.jsx");
  const source = read("src/lib/credentialReadiness.js");
  const serverSource = read("server/src/infrastructure/infrastructureReadiness.js");
  for (const phrase of [
    "DNS readiness",
    "TLS/SSL readiness",
    "Hosting readiness",
    "CDN readiness",
    "Backup readiness",
    "Disaster recovery readiness",
    "Environment promotion readiness",
    "Infrastructure monitoring readiness",
    "Do not point production DNS",
  ]) {
    assert.match(readiness, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
  assert.match(dr, /RTO/);
  assert.match(dr, /RPO/);
  assert.match(backup, /Restore Test Procedure/);
  assert.match(runbook, /Rollback Steps/);
  assert.match(promotion, /Promotion Path/);
  assert.match(adminPage, /Infrastructure activation readiness/);
  assert.match(source, /INFRASTRUCTURE_ACTIVATION_READINESS_CHECKS/);
  assert.match(serverSource, /PRODUCTION_DOMAIN/);
  assert.match(serverSource, /productionTrafficActive: false/);
});

test("Module 50 escrow readiness docs cover providers deposits states and no-live-funds boundary", () => {
  const readiness = read("docs/escrow-activation-readiness.md");
  const operations = read("docs/escrow-operations-playbook.md");
  const disputes = read("docs/escrow-dispute-playbook.md");
  const adminPage = read("src/pages/AdminCenter.jsx");
  const source = read("src/lib/credentialReadiness.js");
  const serverReadiness = read("server/src/escrow/escrowReadiness.js");
  for (const phrase of [
    "Stripe Connect",
    "WiPay",
    "Lynk Business",
    "NCB settlement",
    "Manual deposit hold",
    "Legal trust account",
    "Security deposits",
    "Damage deposits",
    "Reservation deposits",
    "Booking hold deposits",
    "Property deposits",
    "Equipment deposits",
    "No live funds processing",
  ]) {
    assert.match(readiness, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
  for (const state of ["draft", "pending", "held", "released", "partially_released", "refunded", "disputed", "cancelled", "expired"]) {
    assert.match(readiness, new RegExp(state), `${state} should be documented`);
    assert.match(serverReadiness, new RegExp(state), `${state} should be in backend readiness constants`);
  }
  assert.match(operations, /Reconciliation/);
  assert.match(operations, /No real fund movement/);
  assert.match(disputes, /Inspection evidence conflict/);
  assert.match(disputes, /No legal mediation or arbitration/);
  assert.match(adminPage, /Escrow activation readiness/);
  assert.match(source, /ESCROW_ACTIVATION_READINESS_CHECKS/);
  assert.match(source, /legal_finance_review_required/);
});

test("Module 49 payment provider readiness docs cover sandbox operations and compliance", () => {
  const readiness = read("docs/payment-provider-activation-readiness.md");
  const playbook = read("docs/payment-operations-playbook.md");
  const adminPage = read("src/pages/AdminCenter.jsx");
  const source = read("src/lib/credentialReadiness.js");
  for (const phrase of [
    "Stripe Connect",
    "WiPay",
    "Lynk Business",
    "NCB Merchant Services",
    "Sandbox Readiness",
    "Webhook Readiness",
    "Merchant Onboarding Readiness",
    "Settlement Readiness",
    "Refund Readiness",
    "Chargeback Readiness",
    "Payout Readiness",
    "Compliance Checklist",
    "No card data stored",
  ]) {
    assert.match(readiness, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  for (const phrase of [
    "Payment Operations Owner",
    "Compliance Owner",
    "Sandbox Validation Steps",
    "Webhook Test Matrix",
    "Merchant Onboarding Workflow",
    "Settlement Workflow",
    "Refund Workflow",
    "Chargeback Workflow",
    "Payout Workflow",
    "Paid Pilot No-Go Conditions",
  ]) {
    assert.match(playbook, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(adminPage, /Payment activation readiness/);
  assert.match(source, /PAYMENT_ACTIVATION_READINESS_CHECKS/);
  assert.match(source, /webhook_secret_required/);
  assert.match(source, /chargeback_contact_required/);
});

test("Module 48 pilot operations playbooks cover required operating workflows", () => {
  const pilot = read("docs/pilot-operations-playbook.md");
  const supplier = read("docs/supplier-onboarding-playbook.md");
  const support = read("docs/customer-support-playbook.md");
  const moderation = read("docs/admin-moderation-playbook.md");
  for (const phrase of [
    "supplier onboarding owner",
    "support owner",
    "escalation owner",
    "dispute owner",
    "verification owner",
    "Pilot KPIs",
    "suppliers onboarded",
    "booking requests",
    "message response rate",
    "failed workflows",
    "Go/No-Go Checklist",
  ]) {
    assert.match(pilot, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
  for (const phrase of [
    "supplier invitation",
    "Business Profile Setup",
    "Asset Listing Standards",
    "Photo Requirements",
    "Verification Checklist",
    "Trust Score Explanation",
    "Booking Response Expectations",
    "Dispute and Claim Process",
    "Support Contact Rules",
  ]) {
    assert.match(supplier, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
  for (const phrase of [
    "Account Support",
    "Booking Support",
    "Payment and Protection Support Placeholders",
    "Safety Issue Escalation",
    "Dispute and Claim Routing",
    "Supplier Complaint Handling",
    "Evidence Collection",
    "Response Time SLAs",
  ]) {
    assert.match(support, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
  for (const phrase of [
    "Listing Review Process",
    "Supplier Verification Review",
    "Review and Report Moderation",
    "Dispute Escalation",
    "Claim Escalation",
    "Suspicious Activity Review",
    "Audit Log Review",
    "Takedown Workflow",
  ]) {
    assert.match(moderation, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
});

test("Module 47 monitoring and observability readiness docs and endpoints are present", () => {
  const doc = read("docs/monitoring-observability-readiness.md");
  const routes = read("server/src/routes/monitoringRoutes.js");
  const provider = read("server/src/monitoring/monitoringProvider.js");
  const adminPage = read("src/pages/AdminCenter.jsx");
  for (const phrase of [
    "Sentry",
    "Better Stack",
    "MONITORING_PROVIDER=sentry_better_stack",
    "BETTER_STACK_HEARTBEAT_URL",
    "LOG_DRAIN_URL",
    "INCIDENT_OWNER_NAME",
    "auth_failure_spike",
    "payment_failure_spike",
    "provider_webhook_failure",
    "No real alert is sent",
    "Production Monitoring Checklist",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(routes, /\/api\/health\/observability/);
  assert.match(routes, /\/api\/monitoring\/test-event/);
  assert.match(provider, /live_alert_sending_disabled_until_provider_clients_are_verified/);
  assert.match(adminPage, /Monitoring readiness/);
});

test("Module 45 Supabase Storage activation docs and bucket policy are present", () => {
  const doc = read("server/docs/supabase-storage-activation.md");
  const objectStorageDoc = read("server/docs/object-storage-readiness.md");
  for (const phrase of [
    "Supabase Storage",
    "FILE_STORAGE_PROVIDER=supabase",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "public-assets",
    "supplier-logos",
    "private-verification",
    "private-inspections",
    "private-claims",
    "private-disputes",
    "No real signed upload URL is generated",
    "Verification/KYC files must never be public",
    "Rollback",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(objectStorageDoc, /Module 45 Supabase Storage Selection/);
});

test("credential readiness doc preserves honest status for auth and remaining risks", () => {
  const doc = read("docs/production-credential-readiness.md");
  assert.match(doc, /Frontend login can use backend auth in explicit API mode/);
  assert.match(doc, /Production security hardening, secure token strategy, real deployment, and full domain migration remain pending/);
  assert.match(doc, /It verifies configuration presence only/);
  assert.match(doc, /Explicit SQLite\/PostgreSQL selection fails clearly/);
  assert.match(doc, /JSON is not a production database/);
  assert.match(doc, /Clean install remains pending/);
  assert.match(doc, /WiPay/);
  assert.match(doc, /Lynk Business/);
  assert.match(doc, /NCB payment APIs/);
  assert.match(doc, /Stripe Connect/);
  assert.match(doc, /Supabase PostgreSQL/);
  assert.match(doc, /Neon/);
  assert.match(doc, /Amazon RDS/);
  assert.match(doc, /Supabase Storage/);
  assert.match(doc, /Amazon S3-compatible storage/);
  assert.match(doc, /Sentry/);
  assert.match(doc, /Better Stack/);
  assert.doesNotMatch(doc, /production ready/i);
});

test("Module 46 Supabase Auth activation docs and env switches are present", () => {
  const doc = read("docs/supabase-auth-activation.md");
  const frontendEnv = read(".env.example");
  for (const phrase of [
    "Supabase Auth",
    "AUTH_PROVIDER=supabase",
    "VITE_AUTH_MODE=supabase",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "AUTH_REQUIRE_EMAIL_VERIFICATION=true",
    "AUTH_PASSWORD_RESET_ENABLED=true",
    "AUTH_REFRESH_TOKEN_ROTATION=true",
    "AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION=true",
    "Role Mapping Strategy",
    "JWT Validation Strategy",
    "Refresh Token Strategy",
    "Session Revocation Strategy",
    "Dev Header Removal Strategy",
    "Rollback",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(frontendEnv, /VITE_AUTH_MODE=local/);
  assert.match(frontendEnv, /VITE_SUPABASE_URL=/);
  assert.match(frontendEnv, /VITE_SUPABASE_ANON_KEY=/);
});

test("Module 44 Supabase PostgreSQL activation docs and scripts are present", () => {
  const doc = read("server/docs/supabase-postgres-activation.md");
  const packageJson = read("package.json");
  const serverPackageJson = read("server/package.json");
  for (const phrase of [
    "Selected provider: Supabase PostgreSQL",
    "DATABASE_PROVIDER=postgres",
    "DATABASE_POSTGRES_VENDOR=supabase",
    "DATABASE_URL",
    "npm run db:check",
    "GET /api/health/database",
    "No silent fallback",
    "Rollback Instructions",
    "Production Database Checklist",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(packageJson, /"db:check"/);
  assert.match(serverPackageJson, /"db:check"/);
});

test("frontend credential readiness model covers every remaining risk", () => {
  const source = read("src/lib/credentialReadiness.js");
  for (const id of ["disputes", "payments", "admin_moderation", "database", "object_storage", "payment_escrow", "kyc_insurance", "deployment", "monitoring", "pilot_operations", "security", "clean_install"]) {
    assert.match(source, new RegExp(`id: "${id}"`), `${id} should be represented`);
  }
  assert.match(source, /manualInterventionRequired/);
  assert.match(source, /provider credentials/);
  assert.match(source, /supabase_postgres_credentials_required/);
  assert.match(source, /DATABASE_POSTGRES_VENDOR=supabase/);
  assert.match(source, /supabase_storage_credentials_required/);
  assert.match(source, /Supabase Storage is selected/);
  assert.match(source, /SECURITY_BASELINE_CHECKS/);
  assert.match(source, /development_in_memory/);
  assert.match(source, /DEPLOYMENT_READINESS_CHECKS/);
  assert.match(source, /MONITORING_READINESS_CHECKS/);
  assert.match(source, /sentry_better_stack_credentials_required/);
  assert.match(source, /PILOT_OPERATIONS_READINESS_CHECKS/);
  assert.match(source, /operational_owners_required/);
  assert.match(source, /PAYMENT_ACTIVATION_READINESS_CHECKS/);
  assert.match(source, /manual_required/);
});
