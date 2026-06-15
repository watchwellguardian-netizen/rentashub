import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { assertCredentialsForProvider, getIntegrationReadiness } from "../src/config/integrationReadiness.js";
import { app } from "../src/main/app.js";

async function withServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function getJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() };
}

test("integration readiness defaults to credential-level stage without claiming provider completion", () => {
  const readiness = getIntegrationReadiness({
    DATABASE_PROVIDER: "json",
    FILE_STORAGE_PROVIDER: "placeholder",
    PAYMENT_PROVIDER: "placeholder",
    ESCROW_PROVIDER: "placeholder",
    KYC_PROVIDER: "placeholder",
    INSURANCE_PROVIDER: "placeholder",
    NOTIFICATION_PROVIDER: "placeholder",
    DEPLOYMENT_PROVIDER: "local",
    AUTH_TOKEN_SECRET: "change-this-development-secret-before-real-use",
  });

  assert.equal(readiness.stage, "credential_level_readiness");
  assert.equal(readiness.workstreams.frontendAuth.status, "complete_foundation");
  assert.equal(readiness.workstreams.disputes.status, "complete_foundation");
  assert.equal(readiness.workstreams.payments.status, "manual_provider_required");
  assert.equal(readiness.workstreams.database.status, "manual_provider_required");
  assert.equal(readiness.workstreams.objectStorage.status, "manual_provider_required");
  assert.equal(readiness.workstreams.paymentEscrow.status, "manual_provider_required");
  assert.equal(readiness.workstreams.kycInsurance.status, "manual_provider_required");
  assert.equal(readiness.workstreams.deployment.status, "manual_provider_required");
  assert.equal(readiness.workstreams.pilotOperations.status, "manual_provider_required");
  assert.equal(readiness.workstreams.cleanInstall.status, "manual_provider_required");
  assert.match(readiness.note, /does not prove provider connectivity/);
  assert.equal(readiness.checks.security.ready, false);
  assert.ok(readiness.checks.security.missing.includes("AUTH_TOKEN_SECRET"));
  assert.equal(readiness.checks.pilotOperations.ready, false);
  assert.ok(readiness.checks.pilotOperations.missing.includes("PILOT_OWNER_NAME"));
  assert.ok(readiness.checks.pilotOperations.missing.includes("PILOT_REGION"));
  assert.equal(readiness.checks.pilotOperations.score, 0);
  assert.equal(readiness.checks.infrastructure.ready, false);
  assert.equal(readiness.checks.infrastructure.productionTrafficActive, false);
  assert.ok(readiness.checks.infrastructure.missing.includes("PRODUCTION_DOMAIN"));
  assert.equal(readiness.checks.securityCertification.ready, false);
  assert.equal(readiness.checks.securityCertification.certified, false);
  assert.equal(readiness.checks.securityCertification.penetrationTestCompleted, false);
  assert.equal(readiness.checks.securityCertification.soc2Claimed, false);
  assert.ok(readiness.checks.securityCertification.missing.includes("SECURITY_OWNER_NAME"));
});

test("provider credential checks fail clearly until manual credentials are supplied", () => {
  assert.throws(
    () => assertCredentialsForProvider("payment", "stripe", {}),
    (error) => error.code === "missing_provider_credentials" && error.details.some((detail) => detail.field === "PAYMENT_SECRET_KEY"),
  );
  assert.deepEqual(assertCredentialsForProvider("payment", "stripe", {
    PAYMENT_PUBLIC_KEY: "pk_test_placeholder",
    PAYMENT_SECRET_KEY: "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
  }).missing, []);
});

test("readiness report identifies storage payment escrow kyc insurance deployment and security credentials", () => {
  const readiness = getIntegrationReadiness({
    DATABASE_PROVIDER: "postgres",
    FILE_STORAGE_PROVIDER: "s3",
    PAYMENT_PROVIDER: "stripe",
    ESCROW_PROVIDER: "escrow_provider",
    KYC_PROVIDER: "persona",
    INSURANCE_PROVIDER: "insurance_api",
    NOTIFICATION_PROVIDER: "sendgrid",
    DEPLOYMENT_PROVIDER: "aws",
    AUTH_TOKEN_SECRET: "strong-secret",
    SESSION_COOKIE_SECRET: "cookie-secret",
    APP_ENCRYPTION_KEY: "encryption-key",
  });

  assert.deepEqual(readiness.checks.database.missing, ["DATABASE_URL", "postgres driver dependency"]);
  assert.equal(readiness.checks.database.activeProvider, "postgres");
  assert.equal(readiness.checks.database.available, false);
  assert.equal(readiness.checks.database.productionSuitable, true);
  assert.equal(readiness.checks.database.migrationStatus, "blocked_missing_config_or_driver");
  assert.equal(readiness.checks.fileStorage.provider, "s3");
  assert.ok(readiness.checks.fileStorage.missing.includes("FILE_STORAGE_BUCKET"));
  assert.equal(readiness.checks.fileStorage.signedUrlReady, false);
  assert.equal(readiness.checks.fileStorage.virusScanReady, false);
  assert.equal(readiness.checks.fileStorage.productionSuitable, true);
  assert.ok(readiness.checks.payment.missing.includes("PAYMENT_SECRET_KEY"));
  assert.equal(readiness.checks.paymentActivation.ready, false);
  assert.ok(readiness.checks.paymentActivation.missing.includes("PAYMENT_PUBLIC_KEY"));
  assert.ok(readiness.checks.paymentActivation.missing.includes("PAYMENT_WEBHOOK_URL"));
  assert.equal(readiness.checks.paymentActivation.webhookReadiness, "webhook_missing_or_placeholder");
  assert.ok(readiness.checks.escrow.missing.includes("ESCROW_API_KEY"));
  assert.equal(readiness.checks.escrow.liveFundsProcessing, false);
  assert.ok(readiness.checks.escrow.missing.includes("ESCROW_LEGAL_OWNER"));
  assert.equal(readiness.checks.escrow.disputeReadiness, "dispute_policy_missing");
  assert.ok(readiness.checks.kyc.missing.includes("PERSONA_API_KEY"));
  assert.ok(readiness.checks.insurance.missing.includes("INSURANCE_API_KEY"));
  assert.ok(readiness.checks.notification.missing.includes("SENDGRID_API_KEY"));
  assert.ok(readiness.checks.deployment.missing.includes("APP_BASE_URL"));
  assert.equal(readiness.checks.infrastructure.dnsStatus, "domains_missing");
  assert.equal(readiness.checks.infrastructure.tlsStatus, "tls_certificate_missing");
  assert.equal(readiness.checks.infrastructure.cdnStatus, "cdn_provider_missing");
  assert.equal(readiness.checks.infrastructure.backupStatus, "backup_policy_missing");
  assert.equal(readiness.checks.infrastructure.disasterRecoveryStatus, "dr_policy_missing");
  assert.equal(readiness.checks.infrastructure.hostingStatus, "hosting_provider_missing");
  assert.equal(readiness.checks.infrastructure.monitoringStatus, "infrastructure_monitoring_missing");
  assert.equal(readiness.checks.infrastructure.deploymentStatus, "promotion_workflow_missing");
  assert.equal(readiness.checks.deployment.environment, "development");
  assert.equal(readiness.checks.deployment.deploymentTarget, "aws");
  assert.equal(readiness.checks.deployment.monitoringConfigured, false);
  assert.equal(readiness.checks.deployment.backupConfigured, false);
  assert.equal(readiness.checks.deployment.ciStatus, "manual_confirmation_required");
  assert.equal(readiness.checks.security.ready, false);
  assert.ok(readiness.checks.security.missing.includes("PAYMENT_SECRET_KEY"));
  assert.ok(readiness.checks.security.missing.includes("FILE_STORAGE_SECRET_KEY"));
  assert.ok(readiness.checks.security.missing.includes("DATABASE_URL"));
  assert.ok(readiness.checks.security.missing.includes("CORS_ALLOWED_ORIGINS"));
  assert.ok(readiness.checks.pilotOperations.missing.includes("PILOT_SUPPORT_EMAIL"));
  assert.ok(readiness.checks.pilotOperations.missing.includes("PILOT_ESCALATION_EMAIL"));
  assert.equal(readiness.checks.securityCertification.ready, false);
  assert.equal(readiness.checks.securityCertification.owaspStatus, "review_required");
  assert.equal(readiness.checks.securityCertification.dependencyAuditStatus, "audit_required");
  assert.equal(readiness.checks.securityCertification.secretsStatus, "secret_manager_required");
  assert.equal(readiness.checks.securityCertification.incidentResponseStatus, "tabletop_required");
});

test("security certification readiness reports assigned owners without claiming certification", () => {
  const readiness = getIntegrationReadiness({
    SECURITY_OWNER_NAME: "Security Lead",
    SECURITY_OWNER_EMAIL: "security@example.com",
    OWASP_REVIEW_OWNER: "OWASP Lead",
    DEPENDENCY_AUDIT_OWNER: "Dependency Lead",
    SECRETS_MANAGER_PROVIDER: "1password",
    RBAC_AUDIT_OWNER: "RBAC Lead",
    AUTH_AUDIT_OWNER: "Auth Lead",
    STORAGE_SECURITY_OWNER: "Storage Lead",
    PAYMENT_SECURITY_OWNER: "Payment Lead",
    ESCROW_SECURITY_OWNER: "Escrow Lead",
    MONITORING_SECURITY_OWNER: "Monitoring Lead",
    INCIDENT_RESPONSE_OWNER: "Incident Lead",
    VULNERABILITY_MANAGEMENT_OWNER: "Vulnerability Lead",
  });

  assert.equal(readiness.checks.securityCertification.ready, true);
  assert.equal(readiness.checks.securityCertification.certified, false);
  assert.equal(readiness.checks.securityCertification.penetrationTestCompleted, false);
  assert.equal(readiness.checks.securityCertification.soc2Claimed, false);
  assert.equal(readiness.checks.securityCertification.owaspStatus, "owner_assigned");
  assert.equal(readiness.checks.securityCertification.dependencyAuditStatus, "owner_assigned");
  assert.equal(readiness.checks.securityCertification.secretsStatus, "secret_manager_selected");
  assert.equal(readiness.checks.securityCertification.rbacStatus, "owner_assigned");
  assert.equal(readiness.checks.securityCertification.monitoringStatus, "owner_assigned");
  assert.equal(readiness.checks.securityCertification.incidentResponseStatus, "owner_assigned");
});

test("payment activation readiness reports sandbox provider gates without enabling live payments", () => {
  const missing = getIntegrationReadiness({
    PAYMENT_PROVIDER: "stripe",
    PAYMENT_MODE: "sandbox",
    PAYMENT_PUBLIC_KEY: "placeholder",
    PAYMENT_SECRET_KEY: "",
    PAYMENT_SANDBOX_ENABLED: "true",
  });
  assert.equal(missing.checks.paymentActivation.ready, false);
  assert.equal(missing.checks.paymentActivation.liveActivation, false);
  assert.ok(missing.checks.paymentActivation.missing.includes("PAYMENT_SECRET_KEY"));
  assert.ok(missing.checks.paymentActivation.missing.includes("PAYMENT_WEBHOOK_URL"));
  assert.ok(missing.checks.paymentActivation.missing.includes("STRIPE_WEBHOOK_SECRET"));

  const ready = getIntegrationReadiness({
    PAYMENT_PROVIDER: "stripe",
    PAYMENT_MODE: "sandbox",
    PAYMENT_PUBLIC_KEY: "pk_test_realish",
    PAYMENT_SECRET_KEY: "sk_test_realish",
    PAYMENT_SANDBOX_ENABLED: "true",
    PAYMENT_WEBHOOK_URL: "https://api.example.com/api/payments/webhook",
    STRIPE_WEBHOOK_SECRET: "whsec_test_realish",
    MERCHANT_ONBOARDING_MODE: "provider_hosted",
    PAYMENT_OPERATIONS_OWNER: "Payments Lead",
    PAYMENT_COMPLIANCE_OWNER: "Compliance Lead",
    SETTLEMENT_CURRENCY: "JMD",
    REFUND_MODE: "provider_sandbox",
    CHARGEBACK_CONTACT_EMAIL: "chargebacks@example.com",
    PAYOUT_MODE: "provider",
  });
  assert.equal(ready.checks.paymentActivation.ready, true);
  assert.equal(ready.checks.paymentActivation.liveActivation, false);
  assert.equal(ready.checks.paymentActivation.webhookReadiness, "webhook_ready_for_sandbox_test");
  assert.equal(ready.checks.paymentActivation.sandboxReadiness, "sandbox_credentials_present");
  assert.equal(ready.checks.paymentActivation.complianceReadiness, "compliance_owner_assigned");
});

test("escrow activation readiness reports provider legal dispute and release gates without enabling funds", () => {
  const missing = getIntegrationReadiness({
    ESCROW_PROVIDER: "stripe_connect",
    ESCROW_MODE: "readiness_only",
    STRIPE_SECRET_KEY: "placeholder",
    STRIPE_CONNECT_CLIENT_ID: "",
    STRIPE_WEBHOOK_SECRET: "",
  });
  assert.equal(missing.checks.escrow.ready, false);
  assert.equal(missing.checks.escrow.liveActivation, false);
  assert.equal(missing.checks.escrow.liveFundsProcessing, false);
  assert.ok(missing.checks.escrow.missing.includes("STRIPE_CONNECT_CLIENT_ID"));
  assert.ok(missing.checks.escrow.missing.includes("ESCROW_RELEASE_POLICY_URL"));
  assert.ok(missing.checks.escrow.missing.includes("ESCROW_DISPUTE_POLICY_URL"));
  assert.equal(missing.checks.escrow.legalReadiness, "legal_review_missing");

  const ready = getIntegrationReadiness({
    ESCROW_PROVIDER: "legal_trust_account",
    ESCROW_MODE: "legal_review",
    ESCROW_OPERATIONS_OWNER: "Escrow Ops",
    ESCROW_LEGAL_OWNER: "Legal Counsel",
    ESCROW_DISPUTE_OWNER: "Dispute Lead",
    ESCROW_RELEASE_POLICY_URL: "https://example.com/escrow-release",
    ESCROW_DISPUTE_POLICY_URL: "https://example.com/escrow-disputes",
    ESCROW_SETTLEMENT_CURRENCY: "JMD",
    LEGAL_TRUST_ACCOUNT_BANK: "Example Bank",
    LEGAL_TRUST_ACCOUNT_OWNER: "Trust Owner",
    LEGAL_TRUST_ACCOUNT_POLICY_URL: "https://example.com/trust-account",
  });
  assert.equal(ready.checks.escrow.ready, true);
  assert.equal(ready.checks.escrow.liveActivation, false);
  assert.equal(ready.checks.escrow.trustAccountReadiness, "trust_account_review_ready");
  assert.equal(ready.checks.escrow.releaseReadiness, "release_policy_documented");
  assert.ok(ready.checks.escrow.supportedStates.includes("disputed"));
  assert.equal(ready.workstreams.paymentEscrow.status, "credential_ready");
});

test("readiness report identifies configured pilot operations gates", () => {
  const readiness = getIntegrationReadiness({
    DATABASE_PROVIDER: "json",
    FILE_STORAGE_PROVIDER: "local_placeholder",
    PAYMENT_PROVIDER: "placeholder",
    ESCROW_PROVIDER: "placeholder",
    DEPLOYMENT_PROVIDER: "local",
    PILOT_OWNER_NAME: "Pilot Lead",
    PILOT_OWNER_EMAIL: "pilot@example.com",
    PILOT_SUPPORT_EMAIL: "support@example.com",
    PILOT_ESCALATION_EMAIL: "escalations@example.com",
    PILOT_REGION: "Kingston",
    PILOT_ASSET_CATEGORIES: "cars,trucks,tools",
    PILOT_SUPPLIER_TARGET: "20",
    PILOT_CUSTOMER_TARGET: "100",
    PILOT_OPERATING_HOURS: "Mon-Fri 9:00-17:00",
  });

  assert.equal(readiness.checks.pilotOperations.ready, true);
  assert.equal(readiness.checks.pilotOperations.score, 100);
  assert.equal(readiness.checks.pilotOperations.supportChannelConfigured, true);
  assert.equal(readiness.checks.pilotOperations.escalationContactConfigured, true);
  assert.equal(readiness.workstreams.pilotOperations.status, "credential_ready");
});

test("infrastructure readiness reports DNS TLS CDN backup DR monitoring and promotion gates", () => {
  const missing = getIntegrationReadiness({
    DEPLOYMENT_PROVIDER: "local",
    PRODUCTION_DOMAIN: "placeholder",
    STAGING_DOMAIN: "",
  });
  assert.equal(missing.checks.infrastructure.ready, false);
  assert.equal(missing.checks.infrastructure.liveActivation, false);
  assert.equal(missing.checks.infrastructure.productionTrafficActive, false);
  assert.ok(missing.checks.infrastructure.missing.includes("PRODUCTION_DOMAIN"));
  assert.ok(missing.checks.infrastructure.missing.includes("STAGING_DOMAIN"));
  assert.equal(missing.checks.infrastructure.dnsStatus, "domains_missing");

  const ready = getIntegrationReadiness({
    PRODUCTION_DOMAIN: "rentashub.example.com",
    STAGING_DOMAIN: "staging.rentashub.example.com",
    TLS_CERTIFICATE_PROVIDER: "cloudflare",
    TLS_ENFORCEMENT_POLICY: "https-only-hsts",
    CDN_PROVIDER: "cloudflare",
    HOSTING_PROVIDER: "render-vercel",
    BACKUP_PROVIDER: "managed_database",
    BACKUP_RETENTION_DAYS: "30",
    DISASTER_RECOVERY_REGION: "us-east-1",
    DISASTER_RECOVERY_RTO_MINUTES: "240",
    DISASTER_RECOVERY_RPO_MINUTES: "60",
    INFRASTRUCTURE_MONITORING_PROVIDER: "better_stack",
    ENVIRONMENT_PROMOTION_WORKFLOW: "dev-staging-production-manual-approval",
    DEPLOYMENT_RUNBOOK_OWNER: "Release Lead",
  });
  assert.equal(ready.checks.infrastructure.ready, true);
  assert.equal(ready.checks.infrastructure.liveActivation, false);
  assert.equal(ready.checks.infrastructure.dnsStatus, "domains_documented");
  assert.equal(ready.checks.infrastructure.tlsStatus, "tls_policy_documented");
  assert.equal(ready.checks.infrastructure.backupStatus, "backup_policy_documented");
  assert.equal(ready.checks.infrastructure.disasterRecoveryStatus, "dr_policy_documented");
  assert.equal(ready.workstreams.deployment.status, "credential_ready");
});

test("readiness report identifies Supabase Storage credential and bucket status", () => {
  const readiness = getIntegrationReadiness({
    DATABASE_PROVIDER: "json",
    FILE_STORAGE_PROVIDER: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "placeholder-service",
    SUPABASE_ANON_KEY: "",
    FILE_STORAGE_BUCKET_PUBLIC_ASSETS: "public-assets",
    FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION: "",
    FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS: "private-inspections",
    FILE_STORAGE_BUCKET_PRIVATE_CLAIMS: "private-claims",
    FILE_STORAGE_BUCKET_PRIVATE_DISPUTES: "private-disputes",
    FILE_STORAGE_BUCKET_SUPPLIER_LOGOS: "supplier-logos",
  });

  assert.equal(readiness.checks.fileStorage.provider, "supabase");
  assert.equal(readiness.checks.fileStorage.ready, false);
  assert.equal(readiness.checks.fileStorage.credentialsReady, false);
  assert.equal(readiness.checks.fileStorage.signedUrlReady, false);
  assert.equal(readiness.checks.fileStorage.productionSuitable, true);
  assert.ok(readiness.checks.fileStorage.missing.includes("SUPABASE_ANON_KEY"));
  assert.ok(readiness.checks.fileStorage.missing.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(readiness.checks.fileStorage.missing.includes("FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION"));
  assert.equal(readiness.checks.fileStorage.bucketPolicy.publicAssets, "public-assets");
});

test("readiness report identifies Supabase Auth missing credentials and dev-header lock", () => {
  const readiness = getIntegrationReadiness({
    NODE_ENV: "production",
    AUTH_PROVIDER: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "placeholder-anon",
    SUPABASE_SERVICE_ROLE_KEY: "",
    AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
    AUTH_PASSWORD_RESET_ENABLED: "false",
    AUTH_REFRESH_TOKEN_ROTATION: "false",
    AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "false",
  });

  assert.equal(readiness.checks.auth.provider, "supabase");
  assert.equal(readiness.checks.auth.ready, false);
  assert.equal(readiness.checks.auth.placeholderKeysRejected, true);
  assert.ok(readiness.checks.auth.missing.includes("SUPABASE_ANON_KEY"));
  assert.ok(readiness.checks.auth.missing.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.equal(readiness.checks.auth.emailVerificationReady, true);
  assert.equal(readiness.checks.auth.passwordResetReady, false);
  assert.equal(readiness.checks.auth.refreshTokenRotationReady, false);
  assert.equal(readiness.checks.auth.devHeaderProductionLockReady, false);
  assert.equal(readiness.checks.auth.productionSuitable, true);
});

test("health readiness route returns credential-level report", async () => {
  await withServer(app.handler, async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, "/api/health/readiness");
    assert.equal(response.status, 200);
    assert.equal(body.service, "rentashub-api");
    assert.equal(body.module, "credential-readiness");
    assert.equal(body.readiness.stage, "credential_level_readiness");
    assert.equal(body.readiness.workstreams.frontendAuth.status, "complete_foundation");
  });
});
