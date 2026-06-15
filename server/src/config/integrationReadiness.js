import { getDatabaseProviderReadiness } from "../db/databaseProvider.js";
import { getStorageReadiness } from "../files/storageProviderFactory.js";
import { getSupabaseAuthReadiness } from "../auth/supabaseAuthReadiness.js";
import { getMonitoringReadiness } from "../monitoring/monitoringProvider.js";
import { getEscrowReadiness } from "../escrow/escrowReadiness.js";
import { getInfrastructureReadiness } from "../infrastructure/infrastructureReadiness.js";
import { getSecurityCertificationReadiness } from "../security/securityCertificationReadiness.js";
import { getSecurityHardeningProgram } from "../security/securityHardeningProgram.js";
import { getComplianceReadiness } from "../compliance/complianceReadiness.js";
import { getRevenueReadiness } from "../revenue/revenueReadiness.js";

const DEFAULT_DEV_AUTH_SECRET = "change-this-development-secret-before-real-use";
const PLACEHOLDER_VALUES = new Set(["", "placeholder", "local_placeholder", "simulated", "none", "change-this-development-secret-before-real-use", "changeme", "test", "dev"]);

export const WORKSTREAM_STATUS = {
  COMPLETE_FOUNDATION: "complete_foundation",
  CREDENTIAL_READY: "credential_ready",
  MANUAL_PROVIDER_REQUIRED: "manual_provider_required",
  NOT_STARTED: "not_started",
};

export const PROVIDER_REQUIREMENTS = {
  auth: {
    local: [],
    placeholder: [],
    supabase: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  database: {
    json: [],
    sqlite: ["DATABASE_URL"],
    postgres: ["DATABASE_URL"],
  },
  fileStorage: {
    placeholder: [],
    local_placeholder: [],
    s3: ["FILE_STORAGE_BUCKET", "FILE_STORAGE_REGION", "FILE_STORAGE_ACCESS_KEY", "FILE_STORAGE_SECRET_KEY"],
    cloudinary: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    supabase: [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_ANON_KEY",
      "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
      "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
      "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
      "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
      "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
      "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
    ],
  },
  payment: {
    placeholder: [],
    simulated: [],
    stripe: ["PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    paypal: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"],
    wipay: ["WIPAY_ACCOUNT_ID", "WIPAY_API_KEY", "WIPAY_WEBHOOK_SECRET"],
    lynk: ["LYNK_MERCHANT_ID", "LYNK_API_KEY", "LYNK_WEBHOOK_SECRET"],
    ncb: ["NCB_MERCHANT_ID", "NCB_API_KEY", "NCB_WEBHOOK_SECRET"],
    jn: ["JN_MERCHANT_ID", "JN_API_KEY", "JN_WEBHOOK_SECRET"],
  },
  escrow: {
    placeholder: [],
    none: [],
    stripe_connect: ["STRIPE_SECRET_KEY", "STRIPE_CONNECT_CLIENT_ID", "STRIPE_WEBHOOK_SECRET"],
    wipay: ["WIPAY_ACCOUNT_ID", "WIPAY_API_KEY", "WIPAY_WEBHOOK_SECRET"],
    lynk: ["LYNK_MERCHANT_ID", "LYNK_API_KEY", "LYNK_WEBHOOK_SECRET"],
    ncb: ["NCB_MERCHANT_ID", "NCB_API_KEY", "NCB_WEBHOOK_SECRET"],
    manual_deposit_hold: ["MANUAL_DEPOSIT_HOLD_POLICY_URL", "DEPOSIT_RECONCILIATION_OWNER"],
    legal_trust_account: ["LEGAL_TRUST_ACCOUNT_BANK", "LEGAL_TRUST_ACCOUNT_OWNER", "LEGAL_TRUST_ACCOUNT_POLICY_URL"],
    escrow_provider: ["ESCROW_API_BASE_URL", "ESCROW_API_KEY", "ESCROW_WEBHOOK_SECRET"],
  },
  kyc: {
    placeholder: [],
    none: [],
    persona: ["PERSONA_API_KEY", "PERSONA_TEMPLATE_ID", "PERSONA_WEBHOOK_SECRET"],
    onfido: ["ONFIDO_API_TOKEN", "ONFIDO_WEBHOOK_SECRET"],
    alloy: ["ALLOY_API_KEY", "ALLOY_WEBHOOK_SECRET"],
  },
  insurance: {
    placeholder: [],
    none: [],
    insurance_api: ["INSURANCE_API_BASE_URL", "INSURANCE_API_KEY", "INSURANCE_WEBHOOK_SECRET"],
  },
  notification: {
    placeholder: [],
    local: [],
    sendgrid: ["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"],
    twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    firebase: ["FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON"],
  },
  deployment: {
    local: [],
    placeholder: [],
    vercel: ["APP_BASE_URL", "CORS_ORIGIN"],
    render: ["APP_BASE_URL", "CORS_ORIGIN"],
    railway: ["APP_BASE_URL", "CORS_ORIGIN"],
    aws: ["APP_BASE_URL", "CORS_ORIGIN", "AWS_REGION"],
  },
  monitoring: {
    none: [],
    sentry: ["SENTRY_DSN", "ALERT_EMAIL", "INCIDENT_OWNER_NAME", "INCIDENT_OWNER_EMAIL"],
    better_stack: ["BETTER_STACK_API_KEY", "BETTER_STACK_HEARTBEAT_URL", "ALERT_EMAIL", "INCIDENT_OWNER_NAME", "INCIDENT_OWNER_EMAIL"],
    sentry_better_stack: ["SENTRY_DSN", "BETTER_STACK_API_KEY", "BETTER_STACK_HEARTBEAT_URL", "ALERT_EMAIL", "INCIDENT_OWNER_NAME", "INCIDENT_OWNER_EMAIL"],
  },
  payout: {
    simulated: [],
    placeholder: [],
    provider: ["PAYOUT_PROVIDER_CREDENTIALS"],
  },
};

function normalize(value, fallback = "placeholder") {
  return String(value || fallback).trim().toLowerCase();
}

function requiredFor(kind, provider) {
  return PROVIDER_REQUIREMENTS[kind]?.[provider] || [];
}

function missing(env, keys) {
  return keys.filter((key) => !String(env[key] || "").trim());
}

function providerCheck(kind, provider, env) {
  const required = requiredFor(kind, provider);
  const missingKeys = missing(env, required);
  return {
    kind,
    provider,
    required,
    missing: missingKeys,
    ready: missingKeys.length === 0,
    status: required.length === 0 ? WORKSTREAM_STATUS.CREDENTIAL_READY : missingKeys.length ? WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED : WORKSTREAM_STATUS.CREDENTIAL_READY,
  };
}

function providerIsPlaceholder(provider) {
  return ["placeholder", "simulated", "local", "local_placeholder", "none", "json"].includes(String(provider || "").toLowerCase());
}

function realProviderStatus(check) {
  return !providerIsPlaceholder(check.provider) && check.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED;
}

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder");
}

function secretCheck(env) {
  const missingKeys = [];
  if (!hasRealValue(env.AUTH_TOKEN_SECRET) || env.AUTH_TOKEN_SECRET === DEFAULT_DEV_AUTH_SECRET) missingKeys.push("AUTH_TOKEN_SECRET");
  if (!hasRealValue(env.SESSION_SECRET) && !hasRealValue(env.SESSION_COOKIE_SECRET)) missingKeys.push("SESSION_SECRET");
  if (!hasRealValue(env.APP_ENCRYPTION_KEY)) missingKeys.push("APP_ENCRYPTION_KEY");
  if (!hasRealValue(env.PAYMENT_SECRET_KEY)) missingKeys.push("PAYMENT_SECRET_KEY");
  if (!hasRealValue(env.ESCROW_API_KEY)) missingKeys.push("ESCROW_API_KEY");
  if (!hasRealValue(env.FILE_STORAGE_SECRET_KEY) && !hasRealValue(env.S3_SECRET_ACCESS_KEY) && !hasRealValue(env.CLOUDINARY_API_SECRET) && !hasRealValue(env.SUPABASE_SERVICE_ROLE_KEY)) missingKeys.push("FILE_STORAGE_SECRET_KEY");
  if (!hasRealValue(env.DATABASE_URL)) missingKeys.push("DATABASE_URL");
  if (!hasRealValue(env.CORS_ALLOWED_ORIGINS) && !hasRealValue(env.CORS_ORIGIN)) missingKeys.push("CORS_ALLOWED_ORIGINS");
  return {
    kind: "security",
    provider: "application",
    required: ["AUTH_TOKEN_SECRET", "SESSION_SECRET", "APP_ENCRYPTION_KEY", "PAYMENT_SECRET_KEY", "ESCROW_API_KEY", "FILE_STORAGE_SECRET_KEY", "DATABASE_URL", "CORS_ALLOWED_ORIGINS"],
    missing: missingKeys,
    ready: missingKeys.length === 0,
    status: missingKeys.length ? WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED : WORKSTREAM_STATUS.CREDENTIAL_READY,
  };
}

function deploymentSignals(env) {
  const environment = normalize(env.APP_ENV || env.NODE_ENV || "development", "development");
  const deploymentTarget = env.DEPLOYMENT_TARGET || env.DEPLOYMENT_PROVIDER || "local";
  const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS || env.CORS_ORIGIN || "";
  const monitoringProvider = normalize(env.MONITORING_PROVIDER, "placeholder");
  const backupProvider = normalize(env.BACKUP_PROVIDER, "placeholder");
  const ciProvider = normalize(env.CI_PROVIDER, env.GITHUB_ACTIONS ? "github_actions" : "placeholder");
  return {
    environment,
    deploymentTarget,
    corsConfigured: hasRealValue(corsAllowedOrigins),
    corsAllowedOriginsConfigured: hasRealValue(corsAllowedOrigins),
    monitoringConfigured: !providerIsPlaceholder(monitoringProvider),
    monitoringProvider,
    backupConfigured: !providerIsPlaceholder(backupProvider),
    backupProvider,
    ciStatus: ciProvider === "github_actions" || hasRealValue(ciProvider) ? "configured_placeholder" : "manual_confirmation_required",
    ciProvider,
  };
}

const PILOT_REQUIRED_KEYS = [
  "PILOT_OWNER_NAME",
  "PILOT_OWNER_EMAIL",
  "PILOT_SUPPORT_EMAIL",
  "PILOT_ESCALATION_EMAIL",
  "PILOT_REGION",
  "PILOT_ASSET_CATEGORIES",
  "PILOT_SUPPLIER_TARGET",
  "PILOT_CUSTOMER_TARGET",
  "PILOT_OPERATING_HOURS",
];

function pilotOperationsCheck(env) {
  const missingKeys = PILOT_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  const score = Math.round(((PILOT_REQUIRED_KEYS.length - missingKeys.length) / PILOT_REQUIRED_KEYS.length) * 100);
  return {
    kind: "pilotOperations",
    provider: "manual_operations",
    required: PILOT_REQUIRED_KEYS,
    missing: missingKeys,
    ready: missingKeys.length === 0,
    status: missingKeys.length ? WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED : WORKSTREAM_STATUS.CREDENTIAL_READY,
    score,
    pilotRegion: env.PILOT_REGION || "",
    pilotAssetCategories: env.PILOT_ASSET_CATEGORIES || "",
    supplierTarget: env.PILOT_SUPPLIER_TARGET || "",
    customerTarget: env.PILOT_CUSTOMER_TARGET || "",
    supportChannelConfigured: hasRealValue(env.PILOT_SUPPORT_EMAIL) || hasRealValue(env.PILOT_SUPPORT_PHONE),
    escalationContactConfigured: hasRealValue(env.PILOT_ESCALATION_EMAIL),
    incidentOwnerAligned: hasRealValue(env.INCIDENT_OWNER_EMAIL),
    operatingHoursConfigured: hasRealValue(env.PILOT_OPERATING_HOURS),
    message: missingKeys.length
      ? `Pilot operations are missing required owner/configuration gates: ${missingKeys.join(", ")}.`
      : "Pilot operations are configured for controlled review. External launch still requires manual approval.",
  };
}

function paymentWebhookKeys(provider) {
  return {
    stripe: ["STRIPE_WEBHOOK_SECRET"],
    paypal: ["PAYPAL_WEBHOOK_ID"],
    wipay: ["WIPAY_WEBHOOK_SECRET"],
    lynk: ["LYNK_WEBHOOK_SECRET"],
    ncb: ["NCB_WEBHOOK_SECRET"],
    jn: ["JN_WEBHOOK_SECRET"],
  }[provider] || ["PAYMENT_WEBHOOK_SECRET"];
}

function paymentActivationCheck(env) {
  const provider = normalize(env.PAYMENT_PROVIDER, "placeholder");
  const providerSelected = !providerIsPlaceholder(provider);
  const required = providerSelected ? [
    "PAYMENT_PROVIDER",
    "PAYMENT_MODE",
    "PAYMENT_PUBLIC_KEY",
    "PAYMENT_SECRET_KEY",
    "PAYMENT_SANDBOX_ENABLED",
    "PAYMENT_WEBHOOK_URL",
    "MERCHANT_ONBOARDING_MODE",
    "PAYMENT_OPERATIONS_OWNER",
    "PAYMENT_COMPLIANCE_OWNER",
    "SETTLEMENT_CURRENCY",
    "REFUND_MODE",
    "CHARGEBACK_CONTACT_EMAIL",
    "PAYOUT_MODE",
  ] : [
    "PAYMENT_PROVIDER",
    "PAYMENT_SANDBOX_ENABLED",
    "PAYMENT_OPERATIONS_OWNER",
    "PAYMENT_COMPLIANCE_OWNER",
  ];
  const webhookKeys = providerSelected ? paymentWebhookKeys(provider) : ["PAYMENT_WEBHOOK_SECRET"];
  const allRequired = [...required, ...webhookKeys];
  const missingKeys = allRequired.filter((key) => !hasRealValue(env[key]));
  const score = Math.round(((allRequired.length - missingKeys.length) / allRequired.length) * 100);
  return {
    kind: "paymentActivation",
    provider,
    required: allRequired,
    missing: missingKeys,
    ready: providerSelected && missingKeys.length === 0,
    status: providerSelected && missingKeys.length === 0 ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
    score,
    liveActivation: false,
    sandboxReadiness: hasRealValue(env.PAYMENT_SANDBOX_ENABLED) && hasRealValue(env.PAYMENT_PUBLIC_KEY) && hasRealValue(env.PAYMENT_SECRET_KEY) ? "sandbox_credentials_present" : "sandbox_credentials_missing",
    webhookReadiness: webhookKeys.every((key) => hasRealValue(env[key])) && hasRealValue(env.PAYMENT_WEBHOOK_URL) ? "webhook_ready_for_sandbox_test" : "webhook_missing_or_placeholder",
    merchantOnboardingReadiness: hasRealValue(env.MERCHANT_ONBOARDING_MODE) || hasRealValue(env.MERCHANT_ONBOARDING_URL) ? "merchant_onboarding_documented" : "merchant_onboarding_missing",
    settlementReadiness: hasRealValue(env.SETTLEMENT_CURRENCY) ? "settlement_review_ready" : "settlement_missing",
    refundReadiness: hasRealValue(env.REFUND_MODE) ? "refund_policy_ready_for_sandbox" : "refund_policy_missing",
    chargebackReadiness: hasRealValue(env.CHARGEBACK_CONTACT_EMAIL) ? "chargeback_contact_ready" : "chargeback_contact_missing",
    payoutReadiness: !providerIsPlaceholder(env.PAYOUT_MODE) ? "payout_provider_selected" : "payout_simulated_or_missing",
    complianceReadiness: hasRealValue(env.PAYMENT_COMPLIANCE_OWNER) && hasRealValue(env.PAYMENT_OPERATIONS_OWNER) ? "compliance_owner_assigned" : "compliance_owner_missing",
    recommendedProviders: ["stripe_connect", "wipay", "lynk", "ncb"],
    message: providerSelected
      ? missingKeys.length
        ? `Payment provider ${provider} is selected but missing sandbox/readiness gates: ${missingKeys.join(", ")}.`
        : `Payment provider ${provider} is sandbox-ready for validation review. Live payments remain disabled.`
      : "Payment provider is not selected. Simulated payments remain the default safe mode.",
  };
}

export function getIntegrationReadiness(env = process.env) {
  const databaseReadiness = getDatabaseProviderReadiness({
    provider: env.DATABASE_PROVIDER,
    databaseUrl: env.DATABASE_URL,
  });
  const storageReadiness = getStorageReadiness(env);
  const authReadiness = getSupabaseAuthReadiness(env);
  const monitoringReadiness = getMonitoringReadiness(env);
  const paymentActivationReadiness = paymentActivationCheck(env);
  const escrowActivationReadiness = getEscrowReadiness(env);
  const infrastructureReadiness = getInfrastructureReadiness(env);
  const securityCertificationReadiness = getSecurityCertificationReadiness(env);
  const securityHardeningReadiness = getSecurityHardeningProgram(env);
  const complianceReadiness = getComplianceReadiness(env);
  const revenueReadiness = getRevenueReadiness(env);
  const checks = {
    auth: {
      ...providerCheck("auth", normalize(env.AUTH_PROVIDER, "local"), env),
      ...authReadiness,
      ready: authReadiness.ready,
      missing: authReadiness.missing,
    },
    database: {
      ...providerCheck("database", normalize(env.DATABASE_PROVIDER, "json"), env),
      ...databaseReadiness,
      ready: databaseReadiness.available,
      missing: databaseReadiness.missing,
    },
    fileStorage: {
      ...providerCheck("fileStorage", storageReadiness.selectedProvider, env),
      ...storageReadiness,
      provider: storageReadiness.selectedProvider,
      ready: storageReadiness.ready,
      missing: storageReadiness.missing,
    },
    payment: providerCheck("payment", normalize(env.PAYMENT_PROVIDER, "placeholder"), env),
    paymentActivation: paymentActivationReadiness,
    escrow: {
      ...providerCheck("escrow", escrowActivationReadiness.provider, env),
      ...escrowActivationReadiness,
      ready: escrowActivationReadiness.ready,
      missing: escrowActivationReadiness.missing,
    },
    kyc: providerCheck("kyc", normalize(env.KYC_PROVIDER, "placeholder"), env),
    insurance: providerCheck("insurance", normalize(env.INSURANCE_PROVIDER, "placeholder"), env),
    notification: providerCheck("notification", normalize(env.NOTIFICATION_PROVIDER, "placeholder"), env),
    deployment: {
      ...providerCheck("deployment", normalize(env.DEPLOYMENT_PROVIDER, "local"), env),
      ...deploymentSignals(env),
    },
    infrastructure: infrastructureReadiness,
    monitoring: {
      ...providerCheck("monitoring", normalize(env.MONITORING_PROVIDER, "none"), env),
      ...monitoringReadiness,
      ready: monitoringReadiness.ready,
      missing: monitoringReadiness.missing,
    },
    pilotOperations: pilotOperationsCheck(env),
    payout: providerCheck("payout", normalize(env.PAYOUT_MODE, "simulated"), env),
    security: secretCheck(env),
    securityHardening: securityHardeningReadiness,
    securityCertification: securityCertificationReadiness,
    compliance: complianceReadiness,
    revenue: revenueReadiness,
  };

  return {
    ok: Object.values(checks).every((check) => check.ready),
    stage: "credential_level_readiness",
    note: "This readiness report verifies configuration and credential presence only. It does not prove provider connectivity, deployment, compliance, or production security.",
    checks,
    workstreams: {
      frontendAuth: {
        status: checks.auth.provider === "supabase" && checks.auth.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.COMPLETE_FOUNDATION,
        note: checks.auth.provider === "supabase"
          ? "Supabase Auth is selected for production authentication; credentials, email verification, password reset, refresh rotation, and dev-header lockdown must pass before live use."
          : "Frontend login can use backend auth in explicit API mode; production Supabase Auth activation remains pending.",
      },
      disputes: {
        status: WORKSTREAM_STATUS.COMPLETE_FOUNDATION,
        note: "Disputes are API-pilot capable and simulated; no legal mediation, payout, refund, or escrow is active.",
      },
      payments: {
        status: checks.paymentActivation.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : realProviderStatus(checks.payment),
        note: "Payment ledger remains simulated until sandbox credentials, webhook verification, merchant onboarding, settlement, refunds, chargebacks, payouts, compliance owners, and provider credentials are completed.",
      },
      database: {
        status: checks.database.productionSuitable && checks.database.available ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "JSON fallback remains active until a real database provider, credentials, driver, migrations, backups, and migration plan are completed.",
      },
      adminModeration: {
        status: WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Admin moderation has local foundations; broad moderation policy, permissions, review queues, and production audit workflows need a separate module.",
      },
      objectStorage: {
        status: realProviderStatus(checks.fileStorage),
        note: "File metadata exists; binary upload, signed URLs, scanning, and storage provider credentials remain required.",
      },
      paymentEscrow: {
        status: checks.escrow.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Escrow is readiness-only until a real provider, trust account/legal review, release/refund rules, dispute workflow, webhook verification, and live funds approval are completed.",
      },
      kycInsurance: {
        status: !providerIsPlaceholder(checks.kyc.provider) && checks.kyc.ready && !providerIsPlaceholder(checks.insurance.provider) && checks.insurance.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "KYC and insurance remain simulated until provider accounts, credentials, document handling, webhooks, and privacy/compliance review are completed.",
      },
      deployment: {
        status: checks.infrastructure.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Deployment remains local/CI/ZIP until hosting credentials, DNS, TLS, CDN, infrastructure monitoring, backups, disaster recovery, promotion workflow, and rollback are completed.",
      },
      monitoring: {
        status: checks.monitoring.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Monitoring remains readiness-only until Sentry/Better Stack credentials, heartbeat checks, log drain, alert routing, and incident ownership are configured and tested.",
      },
      pilotOperations: {
        status: checks.pilotOperations.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Pilot operations require assigned owners, scoped region/categories, support and escalation contacts, operating hours, KPI review, and go/no-go signoff.",
      },
      productionSecurity: {
        status: checks.securityCertification.ready && checks.security.ready && checks.securityHardening.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Security hardening and certification are readiness-only until MFA/session controls, CSP/CORS/CSRF policy, abuse protection, dependency scanning, security monitoring, OWASP, penetration testing, and external review are completed.",
      },
      cleanInstall: {
        status: WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Clean install must be confirmed in CI or a proper Node/npm environment.",
      },
      complianceActivation: {
        status: checks.compliance.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Privacy and compliance remain provider-ready until Jamaica DPA/GDPR review, consent, retention, deletion/export, DSAR, KYC data-sharing policy, and legal document review are completed.",
      },
      revenueActivation: {
        status: checks.revenue.ready ? WORKSTREAM_STATUS.CREDENTIAL_READY : WORKSTREAM_STATUS.MANUAL_PROVIDER_REQUIRED,
        note: "Revenue activation remains provider-ready until marketplace fees, commissions, payment/refund/deposit lifecycles, escrow ledger states, settlement, reconciliation, Tax/GCT, payout, and transaction audit controls are approved and validated with real providers.",
      },
    },
  };
}

export function assertCredentialsForProvider(kind, provider, env = process.env) {
  const check = providerCheck(kind, normalize(provider), env);
  if (!check.ready) {
    const error = new Error(`${kind} provider "${check.provider}" is missing required credential variables: ${check.missing.join(", ")}`);
    error.code = "missing_provider_credentials";
    error.statusCode = 400;
    error.details = check.missing.map((field) => ({ field, message: `${field} is required for ${check.provider}.` }));
    throw error;
  }
  return check;
}
