const PLACEHOLDER_URL_PATTERNS = [
  /<[^>]+>/,
  /user:password/i,
  /password@host/i,
  /example/i,
  /placeholder/i,
  /changeme/i,
  /your[-_]?project/i,
];

function normalizeVendor(value) {
  return String(value || process.env.DATABASE_POSTGRES_VENDOR || "supabase").trim().toLowerCase();
}

function redactUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.password) url.password = "REDACTED";
    if (url.username) url.username = url.username ? "REDACTED" : "";
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
}

export function validatePostgresDatabaseUrl(databaseUrl, { vendor = "supabase" } = {}) {
  const raw = String(databaseUrl || "").trim();
  if (!raw) {
    return { valid: false, code: "missing_database_url", message: "DATABASE_URL is required for PostgreSQL activation." };
  }
  if (PLACEHOLDER_URL_PATTERNS.some((pattern) => pattern.test(raw))) {
    return { valid: false, code: "placeholder_database_url", message: "DATABASE_URL still looks like a placeholder and cannot be used for PostgreSQL activation." };
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, code: "invalid_database_url", message: "DATABASE_URL must be a valid PostgreSQL connection string." };
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    return { valid: false, code: "invalid_database_protocol", message: "DATABASE_URL must use postgres:// or postgresql://." };
  }
  if (!parsed.hostname || !parsed.username || !parsed.password) {
    return { valid: false, code: "incomplete_database_url", message: "DATABASE_URL must include host, username, and password from the provider secret store." };
  }
  const selectedVendor = normalizeVendor(vendor);
  const hostname = parsed.hostname.toLowerCase();
  const isSupabaseHost = hostname.includes("supabase.co") || hostname.includes("supabase.com");
  if (selectedVendor === "supabase" && !isSupabaseHost) {
    return {
      valid: false,
      code: "non_supabase_database_url",
      message: "Supabase PostgreSQL was selected, so DATABASE_URL must point to a Supabase database or pooler host.",
      sanitizedUrl: redactUrl(raw),
    };
  }
  return {
    valid: true,
    code: "valid_database_url",
    message: selectedVendor === "supabase" ? "Supabase PostgreSQL DATABASE_URL format is valid." : "PostgreSQL DATABASE_URL format is valid.",
    sanitizedUrl: redactUrl(raw),
    host: parsed.hostname,
    vendor: selectedVendor,
  };
}

export function isPostgresDriverAvailable() {
  return false;
}

export function getPostgresDriverStatus(options = {}) {
  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL || "";
  const vendor = normalizeVendor(options.vendor);
  const validation = validatePostgresDatabaseUrl(databaseUrl, { vendor });
  const missing = [];
  if (!databaseUrl) missing.push("DATABASE_URL");
  else if (!validation.valid) missing.push(vendor === "supabase" ? "valid Supabase DATABASE_URL" : "valid DATABASE_URL");
  if (!isPostgresDriverAvailable()) missing.push("postgres driver dependency");
  const driverAvailable = isPostgresDriverAvailable();
  return {
    provider: "postgres",
    selectedProvider: vendor,
    urlConfigured: Boolean(databaseUrl),
    urlValid: validation.valid,
    urlValidationCode: validation.code,
    urlValidationMessage: validation.message,
    sanitizedUrl: validation.sanitizedUrl || "",
    driverAvailable,
    available: missing.length === 0,
    productionSuitable: true,
    missing,
    message: missing.length
      ? `${vendor === "supabase" ? "Supabase PostgreSQL" : "PostgreSQL"} provider requires a valid DATABASE_URL and a reviewed PostgreSQL driver before activation.`
      : `${vendor === "supabase" ? "Supabase PostgreSQL" : "PostgreSQL"} provider is configured for production-target activation.`,
  };
}

export async function createPostgresDatabase(options = {}) {
  const status = getPostgresDriverStatus(options);
  const error = new Error(`${status.message} No silent fallback was used.`);
  error.code = "postgres_provider_not_configured";
  error.statusCode = 501;
  error.details = status.missing.map((field) => ({ field, message: `${field} is required for PostgreSQL activation.` }));
  throw error;
}
