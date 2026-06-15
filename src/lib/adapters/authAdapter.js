import { API_CONFIG } from "../apiClient.js";
import { REVIEW_USERS, normalizeRole } from "../rbac.js";
import {
  clearAuthSession,
  clearLocalReviewUser,
  readApiAuthToken,
  readApiAuthUser,
  readLocalReviewUser,
  writeApiAuthExpiresAt,
  writeApiAuthToken,
  writeApiAuthUser,
  writeLocalReviewUser,
} from "../authSession.js";

export const AUTH_MODES = {
  LOCAL: "local",
  API: "api",
  SUPABASE: "supabase",
};

export const API_AUTH_MIGRATION_NOTICE =
  "Backend auth mode is a development migration path. Tokens are not a production security implementation yet.";

export const SUPABASE_AUTH_MIGRATION_NOTICE =
  "Supabase auth mode is selected for production activation readiness. It is not live until valid Supabase credentials, email verification, password reset, refresh rotation, and session revocation are configured and tested.";

export class AuthApiError extends Error {
  constructor(message, { status = 0, code = "auth_api_error", details = [] } = {}) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function normalizeAuthMode(mode = API_CONFIG.authMode) {
  const normalized = String(mode || AUTH_MODES.LOCAL).toLowerCase();
  if (normalized === AUTH_MODES.SUPABASE) return AUTH_MODES.SUPABASE;
  if (normalized === AUTH_MODES.API) return AUTH_MODES.API;
  return AUTH_MODES.LOCAL;
}

export function getConfiguredAuthMode() {
  return normalizeAuthMode(API_CONFIG.authMode);
}

function localAdapter() {
  return {
    mode: AUTH_MODES.LOCAL,
    getCurrentUser(storage) {
      return readLocalReviewUser(storage);
    },
    signInReviewUser(storage, role = "customer") {
      const normalized = normalizeRole(role);
      const reviewRole = normalized === "vendor" ? "supplier" : normalized;
      const nextUser = REVIEW_USERS.find((candidate) => candidate.role === reviewRole) || REVIEW_USERS[0];
      writeLocalReviewUser(storage, nextUser);
      return nextUser;
    },
    logout(storage) {
      clearLocalReviewUser(storage);
    },
  };
}

function normalizeBaseUrl(baseUrl = API_CONFIG.baseUrl) {
  return String(baseUrl || "").replace(/\/$/, "");
}

function isPlaceholder(value) {
  const raw = String(value || "").trim();
  return !raw || /placeholder|example|your[-_]?|<[^>]+>|change/i.test(raw);
}

export function getSupabaseFrontendReadiness(config = API_CONFIG) {
  const missing = [];
  if (isPlaceholder(config.supabaseUrl)) missing.push("VITE_SUPABASE_URL");
  if (isPlaceholder(config.supabaseAnonKey)) missing.push("VITE_SUPABASE_ANON_KEY");
  return {
    provider: "supabase",
    credentialsReady: missing.length === 0,
    missing,
    emailVerificationRequired: Boolean(config.authRequireEmailVerification),
    passwordResetEnabled: Boolean(config.authPasswordResetEnabled),
    productionSuitable: true,
    message: missing.length
      ? `Supabase auth mode is selected but missing valid frontend credentials: ${missing.join(", ")}. No local/demo fallback was used.`
      : "Supabase frontend credentials are present, but live Supabase session handling is still activation-readiness only.",
  };
}

function requireSupabaseReadiness() {
  const readiness = getSupabaseFrontendReadiness();
  if (!readiness.credentialsReady) {
    throw new AuthApiError(readiness.message, {
      code: "supabase_auth_not_configured",
      details: readiness.missing.map((field) => ({ field, message: `${field} is required for Supabase auth mode.` })),
    });
  }
  return readiness;
}

function requireBaseUrl() {
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    throw new AuthApiError("API auth mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function normalizeApiUser(user = null) {
  if (!user) return null;
  return {
    ...user,
    full_name: user.full_name || user.name || user.email || "RentasHub user",
    role: normalizeRole(user.role),
  };
}

async function requestAuthApi(path, { method = "GET", body, token } = {}) {
  let response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AuthApiError("Authentication backend is unavailable. Start the backend or switch VITE_AUTH_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthApiError(payload.message || `Auth API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "auth_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function persistApiSession(storage, result = {}) {
  const user = normalizeApiUser(result.user);
  writeApiAuthToken(storage, result.token || "");
  writeApiAuthUser(storage, user);
  writeApiAuthExpiresAt(storage, result.expiresAt || "");
  clearLocalReviewUser(storage);
  return user;
}

function apiAdapter() {
  return {
    mode: AUTH_MODES.API,
    getCurrentUser(storage) {
      return normalizeApiUser(readApiAuthUser(storage));
    },
    signInReviewUser() {
      throw new AuthApiError("Demo review users are only available when VITE_AUTH_MODE=local.", {
        code: "demo_auth_disabled",
      });
    },
    async login(storage, credentials = {}) {
      const result = await requestAuthApi("/api/auth/login", { method: "POST", body: credentials });
      persistApiSession(storage, result);
      return { ...result, user: normalizeApiUser(result.user) };
    },
    async register(storage, input = {}) {
      const result = await requestAuthApi("/api/auth/register", { method: "POST", body: input });
      persistApiSession(storage, result);
      return { ...result, user: normalizeApiUser(result.user) };
    },
    async refresh(storage) {
      const token = readApiAuthToken(storage);
      const result = await requestAuthApi("/api/auth/refresh", { method: "POST", token });
      persistApiSession(storage, result);
      return { ...result, user: normalizeApiUser(result.user) };
    },
    async me(storage) {
      const token = readApiAuthToken(storage);
      if (!token) return null;
      const result = await requestAuthApi("/api/auth/me", { token });
      const user = normalizeApiUser(result.user);
      writeApiAuthUser(storage, user);
      writeApiAuthExpiresAt(storage, result.session?.expiresAt || "");
      return user;
    },
    async logout(storage) {
      const token = readApiAuthToken(storage);
      if (token) {
        try {
          await requestAuthApi("/api/auth/logout", { method: "POST", token });
        } catch {
          // Local session is cleared even if the development backend is unavailable.
        }
      }
      clearAuthSession(storage);
    },
  };
}

function supabaseAdapter() {
  return {
    mode: AUTH_MODES.SUPABASE,
    getCurrentUser() {
      return null;
    },
    signInReviewUser() {
      throw new AuthApiError("Demo review users are not available when VITE_AUTH_MODE=supabase.", {
        code: "demo_auth_disabled",
      });
    },
    async login() {
      requireSupabaseReadiness();
      throw new AuthApiError("Supabase Auth credentials are present, but live Supabase login is not activated until SDK/session validation is implemented and tested.", {
        code: "supabase_auth_guarded",
      });
    },
    async register() {
      requireSupabaseReadiness();
      throw new AuthApiError("Supabase Auth registration is credential-ready only. Email verification and session handling must be tested before live use.", {
        code: "supabase_auth_guarded",
      });
    },
    async refresh() {
      requireSupabaseReadiness();
      throw new AuthApiError("Supabase refresh token rotation is not active until Supabase session handling is implemented and tested.", {
        code: "supabase_auth_guarded",
      });
    },
    async me() {
      requireSupabaseReadiness();
      return null;
    },
    async logout(storage) {
      clearAuthSession(storage);
    },
  };
}

export const authAdapter = {
  forMode(mode = getConfiguredAuthMode()) {
    const normalized = normalizeAuthMode(mode);
    if (normalized === AUTH_MODES.API) return apiAdapter();
    if (normalized === AUTH_MODES.SUPABASE) return supabaseAdapter();
    return localAdapter();
  },
  getCurrentUser(storage, mode) {
    return this.forMode(mode).getCurrentUser(storage);
  },
  signInReviewUser(storage, role, mode) {
    return this.forMode(mode).signInReviewUser(storage, role);
  },
  login(storage, credentials, mode) {
    return this.forMode(mode).login(storage, credentials);
  },
  register(storage, input, mode) {
    return this.forMode(mode).register(storage, input);
  },
  refresh(storage, mode) {
    return this.forMode(mode).refresh(storage);
  },
  me(storage, mode) {
    return this.forMode(mode).me(storage);
  },
  logout(storage, mode) {
    return this.forMode(mode).logout(storage);
  },
};
