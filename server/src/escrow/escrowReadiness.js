const PLACEHOLDER_VALUES = new Set(["", "placeholder", "simulated", "none", "todo", "tbd", "changeme", "your-value", "test", "dev"]);

export const ESCROW_PROVIDERS = [
  "placeholder",
  "stripe_connect",
  "wipay",
  "lynk",
  "ncb",
  "escrow_provider",
  "manual_deposit_hold",
  "legal_trust_account",
];

export const ESCROW_DEPOSIT_TYPES = [
  "security_deposit",
  "damage_deposit",
  "reservation_deposit",
  "booking_hold_deposit",
  "property_deposit",
  "equipment_deposit",
];

export const ESCROW_STATES = [
  "draft",
  "pending",
  "held",
  "released",
  "partially_released",
  "refunded",
  "disputed",
  "cancelled",
  "expired",
];

const PROVIDER_REQUIREMENTS = {
  placeholder: [],
  stripe_connect: ["STRIPE_SECRET_KEY", "STRIPE_CONNECT_CLIENT_ID", "STRIPE_WEBHOOK_SECRET"],
  wipay: ["WIPAY_ACCOUNT_ID", "WIPAY_API_KEY", "WIPAY_WEBHOOK_SECRET"],
  lynk: ["LYNK_MERCHANT_ID", "LYNK_API_KEY", "LYNK_WEBHOOK_SECRET"],
  ncb: ["NCB_MERCHANT_ID", "NCB_API_KEY", "NCB_WEBHOOK_SECRET"],
  escrow_provider: ["ESCROW_API_BASE_URL", "ESCROW_API_KEY", "ESCROW_WEBHOOK_SECRET"],
  manual_deposit_hold: ["MANUAL_DEPOSIT_HOLD_POLICY_URL", "DEPOSIT_RECONCILIATION_OWNER"],
  legal_trust_account: ["LEGAL_TRUST_ACCOUNT_BANK", "LEGAL_TRUST_ACCOUNT_OWNER", "LEGAL_TRUST_ACCOUNT_POLICY_URL"],
};

const COMMON_REQUIREMENTS = [
  "ESCROW_PROVIDER",
  "ESCROW_MODE",
  "ESCROW_OPERATIONS_OWNER",
  "ESCROW_LEGAL_OWNER",
  "ESCROW_DISPUTE_OWNER",
  "ESCROW_RELEASE_POLICY_URL",
  "ESCROW_DISPUTE_POLICY_URL",
  "ESCROW_SETTLEMENT_CURRENCY",
];

function normalize(value, fallback = "placeholder") {
  return String(value || fallback).trim().toLowerCase();
}

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder") && !normalized.startsWith("<");
}

function missingFields(env, keys) {
  return keys.filter((key) => !hasRealValue(env[key]));
}

function providerIsActive(provider) {
  return provider && provider !== "placeholder" && provider !== "none";
}

export function getEscrowReadiness(env = process.env) {
  const provider = normalize(env.ESCROW_PROVIDER, "placeholder");
  const providerKnown = ESCROW_PROVIDERS.includes(provider);
  const selectedProvider = providerKnown ? provider : "placeholder";
  const providerRequired = PROVIDER_REQUIREMENTS[selectedProvider] || [];
  const required = providerIsActive(selectedProvider) ? [...COMMON_REQUIREMENTS, ...providerRequired] : [...COMMON_REQUIREMENTS];
  const missing = missingFields(env, required);
  const placeholderRejected = required.some((key) => String(env[key] || "").toLowerCase().includes("placeholder") || String(env[key] || "").startsWith("<"));
  const score = required.length ? Math.round(((required.length - missing.length) / required.length) * 100) : 0;
  const ready = providerIsActive(selectedProvider) && missing.length === 0 && !placeholderRejected;

  return {
    kind: "escrowActivation",
    provider: selectedProvider,
    providerKnown,
    mode: env.ESCROW_MODE || "readiness_only",
    required,
    missing,
    placeholderRejected,
    ready,
    status: ready ? "credential_ready" : "manual_provider_required",
    score,
    liveActivation: false,
    liveFundsProcessing: false,
    legalEscrowClaim: false,
    providerReadiness: providerIsActive(selectedProvider) ? (missingFields(env, providerRequired).length ? "provider_credentials_missing" : "provider_credentials_present") : "provider_not_selected",
    trustAccountReadiness: hasRealValue(env.LEGAL_TRUST_ACCOUNT_BANK) && hasRealValue(env.LEGAL_TRUST_ACCOUNT_OWNER) ? "trust_account_review_ready" : "trust_account_missing",
    legalReadiness: hasRealValue(env.ESCROW_LEGAL_OWNER) && hasRealValue(env.ESCROW_RELEASE_POLICY_URL) ? "legal_review_owner_assigned" : "legal_review_missing",
    disputeReadiness: hasRealValue(env.ESCROW_DISPUTE_OWNER) && hasRealValue(env.ESCROW_DISPUTE_POLICY_URL) ? "dispute_policy_ready_for_review" : "dispute_policy_missing",
    settlementReadiness: hasRealValue(env.ESCROW_SETTLEMENT_CURRENCY) ? "settlement_currency_defined" : "settlement_currency_missing",
    releaseReadiness: hasRealValue(env.ESCROW_RELEASE_POLICY_URL) ? "release_policy_documented" : "release_policy_missing",
    supportedDepositTypes: ESCROW_DEPOSIT_TYPES,
    supportedStates: ESCROW_STATES,
    recommendedProviders: ["stripe_connect", "wipay", "lynk", "ncb", "manual_deposit_hold", "legal_trust_account"],
    message: ready
      ? `Escrow provider ${selectedProvider} is credential-ready for sandbox/legal review. Live escrow and funds handling remain disabled.`
      : providerIsActive(selectedProvider)
        ? `Escrow provider ${selectedProvider} is selected but missing readiness gates: ${missing.join(", ")}.`
        : "Escrow provider is not selected. No escrow deposits, holds, releases, refunds, or legal escrow capability are active.",
  };
}
