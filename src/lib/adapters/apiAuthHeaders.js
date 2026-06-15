import { getStoredAuthHeaders } from "../apiClient.js";

export const BEARER_AUTH_MIGRATION_NOTICE =
  "API pilot adapters prefer backend bearer auth when a frontend API auth token exists. Development role headers remain only as a local/demo fallback.";

export function apiPilotAuthHeaders(user = {}, options = {}, fallback = {}) {
  if (options.authHeaders) return options.authHeaders;
  const bearerHeaders = getStoredAuthHeaders(options.storage);
  if (bearerHeaders.authorization && options.bearerAuth !== false) return bearerHeaders;
  if (options.devAuth === false) return {};

  const resolvedUser = options.user || user || {};
  const role = resolvedUser.role || fallback.role || "";
  const userId = resolvedUser.id || fallback.id || "";
  if (!role) return {};
  return {
    "x-user-role": role === "vendor" ? "supplier" : role,
    "x-user-id": userId || fallback.defaultId || "frontend-api-pilot",
  };
}
