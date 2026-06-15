import assert from "node:assert/strict";
import { test } from "node:test";
import { getSupabaseAuthActivationPlan, validateSupabaseJwtReadiness } from "../src/auth/supabaseAuthService.js";
import { canRoleAccess, normalizeRole } from "../src/auth/rbacPolicy.js";
import { attachUser, requireRoles } from "../src/middleware/auth.js";

function runMiddleware(middleware, req = {}) {
  let nextCalled = false;
  const res = { statusCode: 200, body: null, json(status, body) { this.statusCode = status; this.body = body; } };
  middleware(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
}

test("server RBAC policy normalizes activation roles and inheritance", () => {
  assert.equal(normalizeRole("vendor"), "supplier");
  assert.equal(normalizeRole("broker"), "dealer");
  assert.equal(canRoleAccess("super_admin", ["admin"]), true);
  assert.equal(canRoleAccess("admin", ["transport_provider"]), true);
  assert.equal(canRoleAccess("customer", ["supplier"]), false);
});

test("development headers are ignored in production when lockdown is enabled", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLock = process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION;
  process.env.NODE_ENV = "production";
  process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION = "true";
  try {
    const req = { headers: { "x-user-role": "admin", "x-user-id": "admin-demo" } };
    const result = runMiddleware(attachUser, req);
    assert.equal(result.nextCalled, true);
    assert.equal(result.req.user, undefined);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION = previousLock;
  }
});

test("requireRoles uses normalized RBAC policy", () => {
  const allowed = runMiddleware(requireRoles(["dealer"]), { user: { id: "broker-1", role: "broker" } });
  assert.equal(allowed.nextCalled, true);
  const blocked = runMiddleware(requireRoles(["admin"]), { user: { id: "customer-1", role: "customer" } });
  assert.equal(blocked.res.statusCode, 403);
});

test("Supabase auth activation plan and JWT readiness are guarded", () => {
  const plan = getSupabaseAuthActivationPlan({ AUTH_PROVIDER: "supabase" });
  assert.equal(plan.readiness.credentialsReady, false);
  const missing = validateSupabaseJwtReadiness("bad-token", { AUTH_PROVIDER: "supabase" });
  assert.equal(missing.valid, false);
  assert.equal(missing.code, "supabase_credentials_missing");
});
