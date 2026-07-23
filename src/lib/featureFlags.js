export const FEATURE_FLAG_STATUSES = {
  implementedLocally: "Implemented locally",
  integratedWithSandbox: "Integrated with sandbox",
  validatedInStaging: "Validated in staging",
  activatedInProduction: "Activated in production",
  blockedByExternalDependency: "Blocked by external dependency",
  notCertified: "Not certified",
};

export const FEATURE_FLAGS = [
  {
    key: "rental_core_backend_path",
    description: "Enables backend-persisted rental vertical slice once A4 persistence exists.",
    owner: "WS2 Rental marketplace",
    defaultState: false,
    environments: { development: false, uat: false, production: false },
    prerequisites: ["A4-04 persistence evidence", "A4-04 Auth evidence", "A4-04 Storage evidence"],
    removalCondition: "Core rental path uses backend in all environments.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-09-30",
    status: FEATURE_FLAG_STATUSES.blockedByExternalDependency,
  },
  {
    key: "finance_sandbox_mode",
    description: "Enables sandbox-only financial backbone once provider sandbox evidence exists.",
    owner: "WS3 Financial platform",
    defaultState: false,
    environments: { development: false, uat: false, production: false },
    prerequisites: ["Payment sandbox evidence", "Ledger invariant tests"],
    removalCondition: "Replaced by provider-specific certified flags.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-09-30",
    status: FEATURE_FLAG_STATUSES.notCertified,
  },
  {
    key: "escrow_state_engine",
    description: "Enables escrow state engine without live funds movement.",
    owner: "WS3 Financial platform",
    defaultState: true,
    environments: { development: true, uat: true, production: false },
    prerequisites: ["No live funds movement", "Escrow legal review before production"],
    removalCondition: "Live escrow provider is certified.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-09-30",
    status: FEATURE_FLAG_STATUSES.implementedLocally,
  },
  {
    key: "auction_engine_simulation",
    description: "Keeps auction features simulation-safe until live auction gates pass.",
    owner: "WS5 Auctions and recovery",
    defaultState: true,
    environments: { development: true, uat: true, production: false },
    prerequisites: ["Simulation-safe boundary"],
    removalCondition: "Live auction engine is certified.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-09-30",
    status: FEATURE_FLAG_STATUSES.implementedLocally,
  },
  {
    key: "recovery_private_treaty_readiness",
    description: "Enables repossession/private treaty readiness workflows only.",
    owner: "WS5 Auctions and recovery",
    defaultState: false,
    environments: { development: false, uat: false, production: false },
    prerequisites: ["Legal authority workflow", "Settlement controls"],
    removalCondition: "Legal and settlement gates pass.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-10-31",
    status: FEATURE_FLAG_STATUSES.notCertified,
  },
  {
    key: "ecosystem_provider_marketplaces",
    description: "Enables inspection, transport, and financing provider-ready workflows.",
    owner: "WS6 Trust, operations, and ecosystem services",
    defaultState: true,
    environments: { development: true, uat: true, production: false },
    prerequisites: ["Provider onboarding evidence before live use"],
    removalCondition: "Provider marketplaces are certified.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-09-30",
    status: FEATURE_FLAG_STATUSES.implementedLocally,
  },
  {
    key: "external_ai_gateway",
    description: "Enables external AI provider gateway after governance and credentials.",
    owner: "WS6 Trust, operations, and ecosystem services",
    defaultState: false,
    environments: { development: false, uat: false, production: false },
    prerequisites: ["AI safety review", "Provider credentials", "Audit logging"],
    removalCondition: "AI gateway is certified.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-10-31",
    status: FEATURE_FLAG_STATUSES.blockedByExternalDependency,
  },
  {
    key: "live_notifications",
    description: "Enables real email/SMS/push providers.",
    owner: "WS6 Trust, operations, and ecosystem services",
    defaultState: false,
    environments: { development: false, uat: false, production: false },
    prerequisites: ["Provider credentials", "Delivery evidence", "Retry evidence"],
    removalCondition: "Notification providers are certified.",
    createdAt: "2026-07-22",
    expiryReviewDate: "2026-09-30",
    status: FEATURE_FLAG_STATUSES.blockedByExternalDependency,
  },
];

const VALID_ENVIRONMENTS = new Set(["development", "uat", "production"]);

export function listFeatureFlags() {
  return FEATURE_FLAGS.map((flag) => ({ ...flag, environments: { ...flag.environments }, prerequisites: [...flag.prerequisites] }));
}

export function getFeatureFlag(key) {
  return listFeatureFlags().find((flag) => flag.key === key) || null;
}

export function isFeatureEnabled(key, environment = "development", overrides = {}) {
  const flag = getFeatureFlag(key);
  if (!flag) return false;
  const normalizedEnvironment = String(environment || "development").toLowerCase();
  if (!VALID_ENVIRONMENTS.has(normalizedEnvironment)) return false;
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return Boolean(overrides[key]);
  return Boolean(flag.environments[normalizedEnvironment]);
}

export function validateFeatureFlagRegistry(flags = FEATURE_FLAGS) {
  const errors = [];
  const seen = new Set();
  for (const flag of flags) {
    if (!flag.key || !/^[a-z][a-z0-9_]*$/.test(flag.key)) errors.push(`Invalid flag key: ${flag.key}`);
    if (seen.has(flag.key)) errors.push(`Duplicate flag key: ${flag.key}`);
    seen.add(flag.key);
    if (!flag.owner) errors.push(`${flag.key} missing owner`);
    if (!flag.description) errors.push(`${flag.key} missing description`);
    if (!flag.removalCondition) errors.push(`${flag.key} missing removal condition`);
    if (!flag.expiryReviewDate) errors.push(`${flag.key} missing expiry review date`);
    for (const environment of VALID_ENVIRONMENTS) {
      if (typeof flag.environments?.[environment] !== "boolean") errors.push(`${flag.key} missing boolean ${environment} value`);
    }
    if (flag.environments?.production && flag.status !== FEATURE_FLAG_STATUSES.activatedInProduction) {
      errors.push(`${flag.key} cannot be enabled in production unless activated in production`);
    }
  }
  return { valid: errors.length === 0, errors };
}
