const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/];

function hasPlaceholder(value) {
  const raw = String(value || "").trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function boolFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

export function getSupabaseAuthReadiness(env = process.env) {
  const authProvider = String(env.AUTH_PROVIDER || "local").toLowerCase();
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = authProvider === "supabase" ? required.filter((key) => hasPlaceholder(env[key])) : [];
  const emailVerificationRequired = boolFlag(env.AUTH_REQUIRE_EMAIL_VERIFICATION, true);
  const passwordResetEnabled = boolFlag(env.AUTH_PASSWORD_RESET_ENABLED, false);
  const refreshTokenRotation = boolFlag(env.AUTH_REFRESH_TOKEN_ROTATION, false);
  const devHeadersDisabledInProduction = boolFlag(env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION, true);
  const nodeEnv = String(env.NODE_ENV || "development").toLowerCase();
  const productionLockReady = nodeEnv === "production" ? devHeadersDisabledInProduction : true;
  const productionSuitable = authProvider === "supabase";
  const credentialsReady = authProvider === "supabase" && missing.length === 0;

  return {
    provider: authProvider,
    selectedProvider: authProvider,
    productionSuitable,
    ready: credentialsReady && emailVerificationRequired && passwordResetEnabled && refreshTokenRotation && productionLockReady,
    credentialsReady,
    missing,
    supabaseUrlPresent: !hasPlaceholder(env.SUPABASE_URL),
    supabaseAnonKeyPresent: !hasPlaceholder(env.SUPABASE_ANON_KEY),
    supabaseServiceRoleKeyPresent: !hasPlaceholder(env.SUPABASE_SERVICE_ROLE_KEY),
    placeholderKeysRejected: authProvider === "supabase" && missing.length > 0,
    emailVerificationRequired,
    emailVerificationReady: authProvider === "supabase" && emailVerificationRequired,
    passwordResetEnabled,
    passwordResetReady: authProvider === "supabase" && passwordResetEnabled,
    refreshTokenRotation,
    refreshTokenRotationReady: authProvider === "supabase" && refreshTokenRotation,
    devHeadersDisabledInProduction,
    devHeaderProductionLockReady: productionLockReady,
    jwtValidationStrategy: authProvider === "supabase" ? "supabase_jwt_validation_required" : "local_or_backend_foundation",
    message: authProvider === "supabase"
      ? missing.length
        ? `Supabase Auth requires valid Supabase URL, anon key, and server-only service role key. Missing: ${missing.join(", ")}.`
        : "Supabase Auth credentials are present; live auth still requires Supabase SDK/session validation and staging tests."
      : "Local/demo auth remains the default safe mode.",
  };
}
