const env = typeof import.meta !== "undefined" ? import.meta.env || {} : {};

export const API_CONFIG = {
  baseUrl: env.VITE_API_BASE_URL || "",
  appEnv: env.VITE_APP_ENV || "local",
  dataMode: env.VITE_DATA_MODE || "local",
  authMode: env.VITE_AUTH_MODE || "local",
  supabaseUrl: env.VITE_SUPABASE_URL || env.SUPABASE_URL || "",
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "",
  authRequireEmailVerification: String(env.VITE_AUTH_REQUIRE_EMAIL_VERIFICATION ?? "true") !== "false",
  authPasswordResetEnabled: String(env.VITE_AUTH_PASSWORD_RESET_ENABLED ?? "false") === "true",
  localStorageMode: String(env.VITE_ENABLE_LOCAL_STORAGE_MODE ?? "true") !== "false",
  paymentProvider: env.VITE_PAYMENT_PROVIDER || "simulated",
  notificationProvider: env.VITE_NOTIFICATION_PROVIDER || "local",
  fileStorageProvider: env.VITE_FILE_STORAGE_PROVIDER || "local_placeholder",
};

export function isLocalStorageMode() {
  return API_CONFIG.dataMode !== "api" && (API_CONFIG.localStorageMode || !API_CONFIG.baseUrl);
}

export function getRepositoryStorage(storage) {
  if (storage) return storage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

export function getStoredAuthHeaders(storage) {
  const activeStorage = getRepositoryStorage(storage);
  const token = activeStorage?.getItem("rentashub_api_auth_token") || "";
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(path, options = {}) {
  if (isLocalStorageMode()) {
    throw new Error("Backend API is not implemented. Repositories are using temporary localStorage adapters.");
  }
  const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...getStoredAuthHeaders(options.storage), ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}

// Temporary adapter marker. Module 18 prepares the boundary only; backend repositories will replace localStorage adapters later.
export const LOCAL_STORAGE_ADAPTER_NOTICE = "Temporary localStorage repository adapter. Replace with backend/API adapter during migration.";
