export const CORE_RENTAL_PRODUCTION_BRIDGE_STATUS = "PROVIDER_READY_NOT_ACTIVATED";

export const CORE_RENTAL_DATABASE_ADAPTER_CONTRACT = {
  status: "ADAPTER_PREPARED_NOT_CONNECTED",
  providerTargets: ["postgres", "supabase_postgres"],
  liveConnection: false,
  silentFallbackAllowed: false,
  requiredEnvironment: ["DATABASE_PROVIDER", "DATABASE_URL"],
  entities: [
    "supplier_profiles",
    "assets",
    "bookings",
    "payment_ledger",
    "file_metadata",
    "disputes",
    "audit_logs",
    "notifications",
    "core_rental_idempotency_records",
  ],
  transactionBoundary: {
    strategy: "single booking lifecycle mutation per transaction",
    rollbackRequirement: "all booking, ledger, file metadata, notification, and audit writes must roll back together",
    idempotencyRequirement: "idempotency key is durable per actor/action/resource",
    optimisticConcurrency: "booking version must match expected_version before mutation",
    overlapPrevention: "blocking booking states must not overlap per asset",
  },
};

export const CORE_RENTAL_AUTH_BRIDGE_CONTRACT = {
  status: "CONTRACT_PREPARED_LIVE_AUTH_DISABLED",
  liveSupabaseAuth: false,
  developmentHeadersAllowed: false,
  requiredMappings: [
    "Supabase auth user id to users.supabase_auth_user_id",
    "users.id to role assignments and organization membership",
    "JWT app_metadata role to RentasHub canonical role",
    "tenant or organization id to tenant-scoped records",
  ],
  requiredSessionChecks: ["registration", "login", "logout", "password reset", "email verification", "session refresh", "session revocation", "MFA challenge"],
  ownershipContracts: [
    "customer can access own bookings only",
    "supplier can access own assets and related bookings only",
    "admin can access operational records by explicit admin role only",
    "anonymous users cannot mutate core rental resources",
  ],
};

export const CORE_RENTAL_RLS_POLICY_MATRIX = [
  { table: "assets", ownerColumn: "owner_id", tenantColumn: "tenant_id", roles: ["supplier", "admin"], operations: ["select", "insert", "update", "delete"], requirement: "supplier owns listing or admin role" },
  { table: "bookings", ownerColumn: "customer_id", supplierColumn: "supplier_id", tenantColumn: "tenant_id", roles: ["customer", "supplier", "admin"], operations: ["select", "insert", "update"], requirement: "customer owns request, supplier owns related asset booking, or admin role" },
  { table: "payment_ledger", ownerColumn: "customer_id", supplierColumn: "supplier_id", tenantColumn: "tenant_id", roles: ["customer", "supplier", "admin"], operations: ["select", "insert"], requirement: "party-scoped read and service/admin write only" },
  { table: "file_metadata", ownerColumn: "owner_id", tenantColumn: "tenant_id", roles: ["customer", "supplier", "admin"], operations: ["select", "insert", "update"], requirement: "owner or related booking party access only" },
  { table: "audit_logs", ownerColumn: "actor_id", tenantColumn: "tenant_id", roles: ["admin"], operations: ["select", "insert"], requirement: "admin read, service/server insert only" },
  { table: "notifications", ownerColumn: "recipient_id", tenantColumn: "tenant_id", roles: ["customer", "supplier", "admin"], operations: ["select", "update"], requirement: "recipient or admin access only" },
];

export const CORE_RENTAL_STORAGE_BRIDGE_MANIFEST = [
  { useCase: "listing_images", bucket: "public-assets", pathTemplate: "assets/{asset_id}/listing/{file_id}", visibility: "public_after_moderation", owner: "supplier", mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxMb: 10, signedUpload: true, signedDownload: false, retention: "asset lifecycle plus audit retention", deletion: "soft delete metadata before object purge", malwareScanRequired: true },
  { useCase: "asset_documents", bucket: "private-verification", pathTemplate: "assets/{asset_id}/documents/{file_id}", visibility: "private", owner: "supplier", mimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxMb: 25, signedUpload: true, signedDownload: true, retention: "legal review required", deletion: "retention hold before purge", malwareScanRequired: true },
  { useCase: "contracts", bucket: "private-claims", pathTemplate: "bookings/{booking_id}/contracts/{file_id}", visibility: "private_restricted", owner: "booking_party", mimeTypes: ["application/pdf"], maxMb: 15, signedUpload: true, signedDownload: true, retention: "contract retention schedule", deletion: "not before legal retention expiry", malwareScanRequired: true },
  { useCase: "check_in_evidence", bucket: "private-inspections", pathTemplate: "bookings/{booking_id}/check-in/{file_id}", visibility: "private_restricted", owner: "booking_party", mimeTypes: ["image/jpeg", "image/png", "video/mp4", "application/pdf"], maxMb: 50, signedUpload: true, signedDownload: true, retention: "inspection evidence retention", deletion: "claim/dispute hold aware", malwareScanRequired: true },
  { useCase: "check_out_evidence", bucket: "private-inspections", pathTemplate: "bookings/{booking_id}/check-out/{file_id}", visibility: "private_restricted", owner: "booking_party", mimeTypes: ["image/jpeg", "image/png", "video/mp4", "application/pdf"], maxMb: 50, signedUpload: true, signedDownload: true, retention: "inspection evidence retention", deletion: "claim/dispute hold aware", malwareScanRequired: true },
  { useCase: "dispute_evidence", bucket: "private-disputes", pathTemplate: "disputes/{dispute_id}/evidence/{file_id}", visibility: "private_restricted", owner: "dispute_party", mimeTypes: ["application/pdf", "image/jpeg", "image/png", "video/mp4"], maxMb: 50, signedUpload: true, signedDownload: true, retention: "dispute legal hold", deletion: "legal approval required", malwareScanRequired: true },
];

export const CORE_RENTAL_PAYMENT_SANDBOX_BRIDGE_CONTRACT = {
  status: "CONTRACT_PREPARED_PROVIDER_DISABLED",
  liveMoneyMovement: false,
  requiredOperations: [
    "payment intent creation",
    "authorization state tracking",
    "signed webhook verification",
    "idempotent webhook handling",
    "failed payment state",
    "cancellation state",
    "refund contract",
    "ledger event contract",
  ],
  webhookEvents: [
    "payment_intent.created",
    "payment_intent.requires_action",
    "payment_intent.authorized",
    "payment_intent.payment_failed",
    "payment_intent.canceled",
    "charge.refunded",
    "charge.dispute.created",
  ],
  blockedUntil: ["payment provider selected", "sandbox credentials stored in secret vault", "webhook signing secret configured", "A4 infrastructure evidence accepted"],
};

export const CORE_RENTAL_STAGING_JOURNEY_TEST_PLAN = [
  "supplier authentication",
  "supplier listing creation",
  "customer authentication",
  "booking request",
  "supplier acceptance",
  "sandbox payment",
  "contract generation",
  "check-in",
  "check-out",
  "settlement preparation",
  "review",
  "audit verification",
];

export const ACCEL_P1_008_MANDATORY_TESTS = [
  "database transaction rollback",
  "duplicate idempotency key",
  "overlapping accepted bookings",
  "concurrent supplier acceptance",
  "stale-version update",
  "customer tenant isolation",
  "supplier tenant isolation",
  "admin permission enforcement",
  "unauthorized storage access",
  "signed URL expiry",
  "duplicate payment webhook",
  "failed payment",
  "refund limit",
  "settlement before check-out",
  "payout before reconciliation",
  "feature-flag rollback to provider-independent path",
];

function hasConfiguredValue(env, key) {
  const value = String(env?.[key] || "").trim();
  return Boolean(value) && !/[<[{]|placeholder|changeme|your[-_ ]?value/i.test(value);
}

export function getCoreRentalProductionBridgeReadiness(env = process.env) {
  const databaseCredentialReady = hasConfiguredValue(env, "DATABASE_URL") && ["postgres", "supabase"].includes(String(env.DATABASE_PROVIDER || "").toLowerCase());
  const supabaseAuthCredentialReady = hasConfiguredValue(env, "SUPABASE_URL") && hasConfiguredValue(env, "SUPABASE_ANON_KEY");
  const storageCredentialReady = hasConfiguredValue(env, "SUPABASE_URL") && hasConfiguredValue(env, "SUPABASE_SERVICE_ROLE_KEY");
  const paymentSandboxCredentialReady = hasConfiguredValue(env, "PAYMENT_PROVIDER") && hasConfiguredValue(env, "PAYMENT_WEBHOOK_SECRET");

  return {
    status: CORE_RENTAL_PRODUCTION_BRIDGE_STATUS,
    liveActivation: false,
    databaseAdapter: {
      ...CORE_RENTAL_DATABASE_ADAPTER_CONTRACT,
      credentialReady: databaseCredentialReady,
      missing: databaseCredentialReady ? [] : ["DATABASE_PROVIDER=postgres or supabase", "DATABASE_URL"],
    },
    authBridge: {
      ...CORE_RENTAL_AUTH_BRIDGE_CONTRACT,
      credentialReady: supabaseAuthCredentialReady,
      missing: supabaseAuthCredentialReady ? [] : ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
    },
    rlsPolicyStatus: {
      status: "POLICIES_PREPARED_NOT_EXECUTED",
      policyCount: CORE_RENTAL_RLS_POLICY_MATRIX.length,
      executableAgainstPostgres: true,
      enforcementProven: false,
    },
    storageBridge: {
      status: "MANIFEST_PREPARED_NOT_ACTIVATED",
      credentialReady: storageCredentialReady,
      bucketCount: new Set(CORE_RENTAL_STORAGE_BRIDGE_MANIFEST.map((item) => item.bucket)).size,
      objectUseCases: CORE_RENTAL_STORAGE_BRIDGE_MANIFEST.length,
      missing: storageCredentialReady ? [] : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    },
    paymentSandboxBridge: {
      ...CORE_RENTAL_PAYMENT_SANDBOX_BRIDGE_CONTRACT,
      credentialReady: paymentSandboxCredentialReady,
      missing: paymentSandboxCredentialReady ? [] : ["PAYMENT_PROVIDER", "PAYMENT_WEBHOOK_SECRET"],
    },
    stagingJourney: {
      status: "PLAN_PREPARED_NOT_EXECUTED",
      steps: CORE_RENTAL_STAGING_JOURNEY_TEST_PLAN,
      executedInStaging: false,
    },
    boundaries: [
      "No Supabase connection was opened.",
      "No PostgreSQL migration execution is claimed.",
      "No RLS enforcement is claimed.",
      "No live Supabase Auth or Storage is active.",
      "No real payment, refund, payout, escrow, or settlement provider is active.",
      "No staging validation or production readiness is claimed.",
    ],
  };
}

export function validateCoreRentalProductionBridge() {
  const failures = [];
  if (CORE_RENTAL_RLS_POLICY_MATRIX.length < 6) failures.push("RLS policy matrix is incomplete.");
  if (CORE_RENTAL_STORAGE_BRIDGE_MANIFEST.length < 6) failures.push("Storage bridge manifest is incomplete.");
  if (CORE_RENTAL_STAGING_JOURNEY_TEST_PLAN.length !== 12) failures.push("Staging journey plan must include 12 steps.");
  for (const required of ["duplicate payment webhook", "signed URL expiry", "feature-flag rollback to provider-independent path"]) {
    if (!ACCEL_P1_008_MANDATORY_TESTS.includes(required)) failures.push(`Missing mandatory test: ${required}`);
  }
  return {
    status: failures.length ? "FAIL" : "PASS",
    failures,
    mandatoryTestCount: ACCEL_P1_008_MANDATORY_TESTS.length,
    classification: CORE_RENTAL_PRODUCTION_BRIDGE_STATUS,
  };
}
