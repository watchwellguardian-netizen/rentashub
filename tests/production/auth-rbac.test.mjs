import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  API_AUTH_MIGRATION_NOTICE,
  AUTH_MODES,
  AuthApiError,
  authAdapter,
  getSupabaseFrontendReadiness,
  normalizeAuthMode,
  SUPABASE_AUTH_MIGRATION_NOTICE,
} from "../../src/lib/adapters/authAdapter.js";
import { API_CONFIG, getStoredAuthHeaders } from "../../src/lib/apiClient.js";
import {
  AUTH_SESSION_NOTICE,
  clearAuthSession,
  readApiAuthExpiresAt,
  readApiAuthUser,
  readApiTokenPlaceholder,
  readLocalReviewUser,
  writeApiTokenPlaceholder,
} from "../../src/lib/authSession.js";
import { canAccessRole, expandAllowedRoles, roleLabel } from "../../src/lib/rbac.js";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

test("standalone RentasHub RBAC maps customer aliases", () => {
  assert.equal(canAccessRole("customer", ["customer"]), true);
  assert.equal(canAccessRole("guest", ["customer"]), true);
  assert.equal(canAccessRole("user", ["customer"]), true);
});

test("standalone RentasHub RBAC blocks unrelated roles", () => {
  assert.equal(canAccessRole("supplier", ["customer"]), false);
  assert.equal(canAccessRole("broker", ["customer"]), false);
  assert.equal(canAccessRole("admin", ["customer"]), false);
});

test("standalone RentasHub RBAC documents supplier aliases", () => {
  assert.ok(expandAllowedRoles(["supplier"]).includes("vendor"));
  assert.equal(roleLabel("supplier"), "Supplier");
  assert.equal(roleLabel("customer"), "Customer");
});

test("frontend auth adapter and auth session files exist with local default config", () => {
  assert.equal(existsSync(join(root, "src/lib/adapters/authAdapter.js")), true);
  assert.equal(existsSync(join(root, "src/lib/authSession.js")), true);
  assert.equal(existsSync(join(root, "docs/frontend-auth-migration.md")), true);
  assert.match(read(".env.example"), /VITE_AUTH_MODE=local/);
  assert.match(read("README.md"), /VITE_AUTH_MODE=local/);
  assert.match(read("docs/frontend-auth-migration.md"), /VITE_AUTH_MODE=local/);
  assert.equal(normalizeAuthMode("local"), AUTH_MODES.LOCAL);
  assert.equal(normalizeAuthMode("api"), AUTH_MODES.API);
  assert.equal(normalizeAuthMode("supabase"), AUTH_MODES.SUPABASE);
});

test("local auth adapter logs in demo admin customer supplier and broker users", () => {
  for (const role of ["admin", "customer", "supplier", "vendor", "broker"]) {
    const storage = createMemoryStorage();
    const user = authAdapter.forMode("local").signInReviewUser(storage, role);
    const expectedRole = role === "vendor" ? "supplier" : role;
    assert.equal(user.role, expectedRole);
    assert.equal(readLocalReviewUser(storage).role, expectedRole);
  }
});

test("API auth mode does not allow demo review-user sign-in", () => {
  const storage = createMemoryStorage();
  assert.equal(authAdapter.forMode("api").getCurrentUser(storage), null);
  assert.throws(
    () => authAdapter.forMode("api").signInReviewUser(storage, "admin"),
    /Demo review users are only available/,
  );
});

test("Supabase auth mode is guarded and does not allow demo fallback", async () => {
  const storage = createMemoryStorage();
  assert.equal(authAdapter.forMode("supabase").getCurrentUser(storage), null);
  assert.throws(
    () => authAdapter.forMode("supabase").signInReviewUser(storage, "admin"),
    /Demo review users are not available/,
  );
  await assert.rejects(
    () => authAdapter.forMode("supabase").login(storage, { email: "owner@example.test", password: "StrongPass123!" }),
    (err) => err instanceof AuthApiError && err.code === "supabase_auth_not_configured" && /No local\/demo fallback/.test(err.message),
  );
  assert.equal(readLocalReviewUser(storage), null);
});

test("Supabase auth readiness rejects placeholder keys and guards shaped credentials", async () => {
  const storage = createMemoryStorage();
  assert.equal(getSupabaseFrontendReadiness({ supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "placeholder-anon" }).credentialsReady, false);
  assert.deepEqual(getSupabaseFrontendReadiness({ supabaseUrl: "https://rentashub.supabase.co", supabaseAnonKey: "sb_anon_realistic_key_for_readiness" }).missing, []);

  const originalUrl = API_CONFIG.supabaseUrl;
  const originalAnon = API_CONFIG.supabaseAnonKey;
  API_CONFIG.supabaseUrl = "https://rentashub.supabase.co";
  API_CONFIG.supabaseAnonKey = "sb_anon_realistic_key_for_readiness";
  try {
    await assert.rejects(
      () => authAdapter.forMode("supabase").login(storage, { email: "owner@example.test", password: "StrongPass123!" }),
      (err) => err instanceof AuthApiError && err.code === "supabase_auth_guarded",
    );
  } finally {
    API_CONFIG.supabaseUrl = originalUrl;
    API_CONFIG.supabaseAnonKey = originalAnon;
  }
});

test("API auth mode logs in, registers, reads me, refreshes, and logs out through backend endpoints", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const storage = createMemoryStorage();
  const calls = [];
  API_CONFIG.baseUrl = "http://api.test";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body || "{}");
    if (url.endsWith("/api/auth/register")) {
      return { ok: true, status: 201, async json() { return { token: "registered-token", expiresAt: "2026-06-09T00:00:00.000Z", user: { id: "api-user-1", name: body.name, email: body.email, role: body.role } }; } };
    }
    if (url.endsWith("/api/auth/login")) {
      return { ok: true, status: 200, async json() { return { token: "login-token", expiresAt: "2026-06-09T00:00:00.000Z", user: { id: "api-user-1", name: "API Customer", email: body.email, role: "customer" } }; } };
    }
    if (url.endsWith("/api/auth/me")) {
      return { ok: true, status: 200, async json() { return { user: { id: "api-user-1", name: "API Customer", email: "api@example.test", role: "customer" }, session: { expiresAt: "2026-06-09T00:00:00.000Z" } }; } };
    }
    if (url.endsWith("/api/auth/refresh")) {
      return { ok: true, status: 200, async json() { return { token: "refresh-token", expiresAt: "2026-06-10T00:00:00.000Z", user: { id: "api-user-1", name: "API Customer", email: "api@example.test", role: "customer" } }; } };
    }
    return { ok: true, status: 200, async json() { return { loggedOut: true }; } };
  };

  try {
    const registered = await authAdapter.forMode("api").register(storage, { name: "API Customer", email: "api@example.test", password: "StrongPass123!", role: "customer" });
    const loggedIn = await authAdapter.forMode("api").login(storage, { email: "api@example.test", password: "StrongPass123!" });
    const current = await authAdapter.forMode("api").me(storage);
    const refreshed = await authAdapter.forMode("api").refresh(storage);

    assert.equal(registered.user.full_name, "API Customer");
    assert.equal(loggedIn.user.role, "customer");
    assert.equal(current.full_name, "API Customer");
    assert.equal(refreshed.token, "refresh-token");
    assert.equal(readApiAuthUser(storage).id, "api-user-1");
    assert.equal(readApiAuthExpiresAt(storage), "2026-06-10T00:00:00.000Z");
    assert.deepEqual(getStoredAuthHeaders(storage), { authorization: "Bearer refresh-token" });
    assert.equal(calls.some((call) => call.url === "http://api.test/api/auth/me" && call.options.headers.authorization === "Bearer login-token"), true);

    await authAdapter.forMode("api").logout(storage);
    assert.equal(readApiTokenPlaceholder(storage), "");
    assert.deepEqual(getStoredAuthHeaders(storage), {});
    assert.equal(calls.some((call) => call.url === "http://api.test/api/auth/logout" && call.options.headers.authorization === "Bearer refresh-token"), true);
  } finally {
    globalThis.fetch = originalFetch;
    API_CONFIG.baseUrl = originalBaseUrl;
  }
});

test("API auth mode returns controlled errors for unavailable backend and invalid credentials", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = API_CONFIG.baseUrl;
  const storage = createMemoryStorage();
  API_CONFIG.baseUrl = "http://api.test";

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    async json() {
      return { error: "invalid_credentials", message: "Email or password is incorrect." };
    },
  });
  await assert.rejects(
    () => authAdapter.forMode("api").login(storage, { email: "bad@example.test", password: "wrong" }),
    (err) => err instanceof AuthApiError && err.code === "invalid_credentials",
  );

  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.rejects(
    () => authAdapter.forMode("api").login(storage, { email: "api@example.test", password: "StrongPass123!" }),
    (err) => err instanceof AuthApiError && err.code === "backend_unavailable",
  );

  API_CONFIG.baseUrl = "";
  await assert.rejects(
    () => authAdapter.forMode("api").login(storage, { email: "api@example.test", password: "StrongPass123!" }),
    (err) => err instanceof AuthApiError && err.code === "backend_unavailable",
  );

  globalThis.fetch = originalFetch;
  API_CONFIG.baseUrl = originalBaseUrl;
});

test("token and session utility stays inside a safe local boundary", () => {
  const storage = createMemoryStorage();
  authAdapter.signInReviewUser(storage, "customer", "local");
  writeApiTokenPlaceholder(storage, "placeholder-token");

  assert.equal(readLocalReviewUser(storage).role, "customer");
  assert.equal(readApiTokenPlaceholder(storage), "placeholder-token");
  assert.match(AUTH_SESSION_NOTICE, /development tokens/);

  clearAuthSession(storage);
  assert.equal(readLocalReviewUser(storage), null);
  assert.equal(readApiTokenPlaceholder(storage), "");
});

test("AuthContext, protected routes, and login page use the auth bridge without removing demo flow", () => {
  assert.match(read("src/state/AuthContext.jsx"), /authAdapter/);
  assert.match(read("src/state/AuthContext.jsx"), /getConfiguredAuthMode/);
  assert.match(read("src/components/ProtectedRoute.jsx"), /isAuthenticated/);
  assert.match(read("src/pages/Login.jsx"), /Local demo sign-in is active for review/);
  assert.match(read("src/pages/Login.jsx"), /API_AUTH_MIGRATION_NOTICE/);
  assert.match(read("src/pages/Login.jsx"), /SUPABASE_AUTH_MIGRATION_NOTICE/);
  assert.match(read("src/pages/Login.jsx"), /Check Supabase auth readiness/);
  assert.match(read("src/pages/Login.jsx"), /Create account/);
  assert.match(read("src/components/ProtectedRoute.jsx"), /AUTH_MODES\.LOCAL/);
  assert.match(read("src/pages/Login.jsx"), /Review as customer/);
  assert.match(read("src/pages/Login.jsx"), /Review as supplier/);
  assert.match(read("src/pages/Login.jsx"), /Review as broker/);
  assert.match(read("src/pages/Login.jsx"), /Review as admin/);
});
