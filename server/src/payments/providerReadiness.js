import { assertCredentialsForProvider, getIntegrationReadiness } from "../config/integrationReadiness.js";

export const PAYMENT_ARCHITECTURE_NOTICE =
  "Payments are provider-ready but simulated by default. No real card processing, escrow release, refund, chargeback, payout, or bank transfer is active.";

const PLACEHOLDER_VALUES = ["", "placeholder", "simulated", "none", "todo", "tbd", "your-value", "changeme"];

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.includes(normalized) && !normalized.includes("placeholder") && !normalized.includes("<");
}

function paymentProviderWebhookKeys(provider) {
  return {
    stripe: ["STRIPE_WEBHOOK_SECRET"],
    paypal: ["PAYPAL_WEBHOOK_ID"],
    wipay: ["WIPAY_WEBHOOK_SECRET"],
    lynk: ["LYNK_WEBHOOK_SECRET"],
    ncb: ["NCB_WEBHOOK_SECRET"],
    jn: ["JN_WEBHOOK_SECRET"],
  }[provider] || ["PAYMENT_WEBHOOK_SECRET"];
}

export function getPaymentActivationReadiness(env = process.env) {
  const config = getPaymentProviderConfig(env);
  const provider = config.paymentProvider;
  const providerSelected = !["placeholder", "simulated", "none"].includes(provider);
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
  const webhookKeys = providerSelected ? paymentProviderWebhookKeys(provider) : ["PAYMENT_WEBHOOK_SECRET"];
  const missing = [...required, ...webhookKeys].filter((key) => !hasRealValue(env[key]));
  const placeholderRejected = [...required, ...webhookKeys].filter((key) => String(env[key] || "").toLowerCase().includes("placeholder"));
  const score = Math.round((((required.length + webhookKeys.length) - missing.length) / (required.length + webhookKeys.length)) * 100);
  return {
    provider,
    primaryRecommendedProvider: "stripe_connect",
    secondaryRecommendedProviders: ["wipay", "lynk", "ncb"],
    mode: config.paymentMode,
    liveActivation: false,
    simulatedDefault: config.simulated || ["placeholder", "simulated"].includes(provider),
    ready: providerSelected && missing.length === 0,
    productionSuitable: providerSelected && config.paymentMode === "sandbox",
    missing: [...new Set(missing)],
    placeholderRejected,
    score,
    providerReadiness: providerSelected ? "provider_selected" : "provider_not_selected",
    sandboxReadiness: hasRealValue(env.PAYMENT_SANDBOX_ENABLED) && (hasRealValue(env.PAYMENT_PUBLIC_KEY) || hasRealValue(env.PAYMENT_SANDBOX_PUBLIC_KEY)) && (hasRealValue(env.PAYMENT_SECRET_KEY) || hasRealValue(env.PAYMENT_SANDBOX_SECRET_KEY)) ? "sandbox_credentials_present" : "sandbox_credentials_missing",
    webhookReadiness: webhookKeys.every((key) => hasRealValue(env[key])) && hasRealValue(env.PAYMENT_WEBHOOK_URL) ? "webhook_ready_for_sandbox_test" : "webhook_missing_or_placeholder",
    merchantOnboardingReadiness: hasRealValue(env.MERCHANT_ONBOARDING_MODE) || hasRealValue(env.MERCHANT_ONBOARDING_URL) ? "merchant_onboarding_documented" : "merchant_onboarding_missing",
    settlementReadiness: hasRealValue(env.SETTLEMENT_CURRENCY) && (hasRealValue(env.SETTLEMENT_ACCOUNT_ID) || provider === "stripe") ? "settlement_review_ready" : "settlement_missing",
    refundReadiness: hasRealValue(env.REFUND_MODE) ? "refund_policy_ready_for_sandbox" : "refund_policy_missing",
    chargebackReadiness: hasRealValue(env.CHARGEBACK_CONTACT_EMAIL) ? "chargeback_contact_ready" : "chargeback_contact_missing",
    payoutReadiness: hasRealValue(env.PAYOUT_MODE) && !["placeholder", "simulated"].includes(String(env.PAYOUT_MODE || "").toLowerCase()) ? "payout_provider_selected" : "payout_simulated_or_missing",
    complianceReadiness: hasRealValue(env.PAYMENT_COMPLIANCE_OWNER) && hasRealValue(env.PAYMENT_OPERATIONS_OWNER) ? "compliance_owner_assigned" : "compliance_owner_missing",
    message: providerSelected
      ? missing.length
        ? `Payment provider ${provider} is selected but missing sandbox/readiness gates: ${[...new Set(missing)].join(", ")}.`
        : `Payment provider ${provider} is sandbox-ready for validation review. Live payments remain disabled.`
      : "Payment provider is not selected. Simulated payments remain the default safe mode.",
  };
}

export function getPaymentProviderConfig(env = process.env) {
  return {
    paymentProvider: String(env.PAYMENT_PROVIDER || "simulated").toLowerCase(),
    paymentMode: String(env.PAYMENT_MODE || "simulated").toLowerCase(),
    paymentPublicKey: env.PAYMENT_PUBLIC_KEY || "",
    paymentSecretKey: env.PAYMENT_SECRET_KEY || "",
    escrowProvider: String(env.ESCROW_PROVIDER || "placeholder").toLowerCase(),
    escrowApiKey: env.ESCROW_API_KEY || "",
    platformFeePercentage: Number(env.PLATFORM_FEE_PERCENTAGE || 10),
    payoutMode: String(env.PAYOUT_MODE || "simulated").toLowerCase(),
  };
}

export function getPaymentReadiness(env = process.env) {
  const config = getPaymentProviderConfig(env);
  const readiness = getIntegrationReadiness(env);
  const missing = [];
  if (!["simulated", "placeholder"].includes(config.paymentProvider)) {
    try {
      assertCredentialsForProvider("payment", config.paymentProvider, env);
    } catch (error) {
      missing.push(...(error.details || []).map((detail) => detail.field));
    }
    if (!config.paymentPublicKey) missing.push("PAYMENT_PUBLIC_KEY");
    if (!config.paymentSecretKey) missing.push("PAYMENT_SECRET_KEY");
  }
  if (!["simulated", "placeholder", "none"].includes(config.escrowProvider)) {
    try {
      assertCredentialsForProvider("escrow", config.escrowProvider, env);
    } catch (error) {
      missing.push(...(error.details || []).map((detail) => detail.field));
    }
    if (!config.escrowApiKey) missing.push("ESCROW_API_KEY");
  }
  return {
    ...config,
    simulated: config.paymentMode === "simulated" || config.paymentProvider === "simulated",
    ready: missing.length === 0,
    missing: [...new Set(missing)],
    activationReadiness: getPaymentActivationReadiness(env),
    integrationReadiness: {
      payment: readiness.checks.payment,
      escrow: readiness.checks.escrow,
      payout: readiness.checks.payout,
    },
    notice: PAYMENT_ARCHITECTURE_NOTICE,
  };
}

export function assertPaymentProviderReady(env = process.env) {
  const readiness = getPaymentReadiness(env);
  if (!readiness.simulated && !readiness.ready) {
    const error = new Error(`Payment provider "${readiness.paymentProvider}" is missing required credentials: ${readiness.missing.join(", ")}`);
    error.code = "payment_provider_not_ready";
    error.statusCode = 400;
    error.publicMessage = "Payment provider credentials are not configured.";
    error.details = readiness.missing.map((field) => ({ field, message: `${field} is required before real provider mode can be used.` }));
    throw error;
  }
  return readiness;
}
