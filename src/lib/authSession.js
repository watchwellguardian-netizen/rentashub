export const AUTH_SESSION_KEYS = {
  reviewUser: "rentashub_review_user",
  apiToken: "rentashub_api_auth_token",
  apiUser: "rentashub_api_auth_user",
  apiExpiresAt: "rentashub_api_auth_expires_at",
  apiTokenPlaceholder: "rentashub_api_token_placeholder",
};

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readLocalReviewUser(storage) {
  return safeParse(storage?.getItem(AUTH_SESSION_KEYS.reviewUser));
}

export function writeLocalReviewUser(storage, user) {
  storage?.setItem(AUTH_SESSION_KEYS.reviewUser, JSON.stringify(user));
}

export function clearLocalReviewUser(storage) {
  storage?.removeItem(AUTH_SESSION_KEYS.reviewUser);
}

export function readApiAuthToken(storage) {
  return storage?.getItem(AUTH_SESSION_KEYS.apiToken) || "";
}

export function writeApiAuthToken(storage, token) {
  storage?.setItem(AUTH_SESSION_KEYS.apiToken, String(token || ""));
}

export function clearApiAuthToken(storage) {
  storage?.removeItem(AUTH_SESSION_KEYS.apiToken);
}

export function readApiAuthUser(storage) {
  return safeParse(storage?.getItem(AUTH_SESSION_KEYS.apiUser));
}

export function writeApiAuthUser(storage, user) {
  storage?.setItem(AUTH_SESSION_KEYS.apiUser, JSON.stringify(user || null));
}

export function clearApiAuthUser(storage) {
  storage?.removeItem(AUTH_SESSION_KEYS.apiUser);
}

export function readApiAuthExpiresAt(storage) {
  return storage?.getItem(AUTH_SESSION_KEYS.apiExpiresAt) || "";
}

export function writeApiAuthExpiresAt(storage, expiresAt) {
  storage?.setItem(AUTH_SESSION_KEYS.apiExpiresAt, String(expiresAt || ""));
}

export function clearApiAuthExpiresAt(storage) {
  storage?.removeItem(AUTH_SESSION_KEYS.apiExpiresAt);
}

export function readApiTokenPlaceholder(storage) {
  return readApiAuthToken(storage) || storage?.getItem(AUTH_SESSION_KEYS.apiTokenPlaceholder) || "";
}

export function writeApiTokenPlaceholder(storage, token) {
  writeApiAuthToken(storage, token);
  storage?.setItem(AUTH_SESSION_KEYS.apiTokenPlaceholder, String(token || ""));
}

export function clearApiTokenPlaceholder(storage) {
  clearApiAuthToken(storage);
  storage?.removeItem(AUTH_SESSION_KEYS.apiTokenPlaceholder);
}

export function clearAuthSession(storage) {
  clearLocalReviewUser(storage);
  clearApiTokenPlaceholder(storage);
  clearApiAuthUser(storage);
  clearApiAuthExpiresAt(storage);
}

export const AUTH_SESSION_NOTICE =
  "Frontend API auth stores development tokens in a local browser boundary for this migration stage. Production auth must use hardened backend sessions, HTTPS, expiry, CSRF/XSS protections, and a reviewed token strategy.";
