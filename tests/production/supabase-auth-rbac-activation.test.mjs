import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getSupabaseAuthActivationPlan, validateSupabaseJwtReadiness } from "../../server/src/auth/supabaseAuthService.js";
import { canRoleAccess, getPermissionMatrix, normalizeRole } from "../../server/src/auth/rbacPolicy.js";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Project A2 Supabase auth and RBAC artifacts exist", () => {
  for (const file of [
    "docs/supabase-auth-rbac-activation.md",
    "server/src/auth/rbacPolicy.js",
    "server/src/auth/supabaseAuthService.js",
    "server/migrations/005_supabase_auth_rbac_activation.sql",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("Supabase auth RBAC docs cover lifecycle roles guards RLS and rollback", () => {
  const doc = read("docs/supabase-auth-rbac-activation.md");
  for (const phrase of [
    "Supabase Auth",
    "Session Lifecycle",
    "Password reset",
    "refresh tokens",
    "MFA-Ready Framework",
    "Route and API Guards",
    "RLS Alignment",
    "customer",
    "supplier",
    "dealer",
    "inspector",
    "transport_provider",
    "financing_partner",
    "admin",
    "super_admin",
    "Rollback Plan",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${phrase} should be documented`);
  }
});

test("RBAC policy normalizes aliases and supports inherited admin access", () => {
  assert.equal(normalizeRole("vendor"), "supplier");
  assert.equal(normalizeRole("broker"), "dealer");
  assert.equal(normalizeRole("certified_inspector"), "inspector");
  assert.equal(canRoleAccess("super_admin", ["admin"]), true);
  assert.equal(canRoleAccess("admin", ["supplier"]), true);
  assert.equal(canRoleAccess("customer", ["admin"]), false);
  const matrix = getPermissionMatrix();
  assert.ok(matrix.some((row) => row.role === "transport_provider" && row.permissions.includes("transport:assigned")));
  assert.ok(matrix.some((row) => row.role === "financing_partner" && row.permissions.includes("financing:assigned")));
});

test("Supabase auth activation plan reports credential-ready status and session lifecycle", () => {
  const plan = getSupabaseAuthActivationPlan({
    AUTH_PROVIDER: "supabase",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "anon-live-key-value",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-live-key-value",
    AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
    AUTH_PASSWORD_RESET_ENABLED: "true",
    AUTH_REFRESH_TOKEN_ROTATION: "true",
    AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "true",
    AUTH_MFA_READY: "false",
  });
  assert.equal(plan.provider, "supabase");
  assert.equal(plan.readiness.credentialsReady, true);
  assert.equal(plan.readiness.ready, true);
  assert.match(plan.sessionLifecycle.passwordReset, /Password reset redirects/);
  assert.equal(plan.rolePersistence.source, "user_role_assignments");
  assert.equal(plan.mfa.status, "framework_placeholder");
});

test("Supabase JWT readiness remains guarded without credentials and shape-valid without signature claim", () => {
  const missing = validateSupabaseJwtReadiness("not-a-jwt", { AUTH_PROVIDER: "supabase" });
  assert.equal(missing.valid, false);
  assert.equal(missing.code, "supabase_credentials_missing");
  const payload = Buffer.from(JSON.stringify({ sub: "user-1", email: "user@example.test", app_role: "supplier", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const result = validateSupabaseJwtReadiness(`header.${payload}.signature`, {
    AUTH_PROVIDER: "supabase",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "anon-live-key-value",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-live-key-value",
  });
  assert.equal(result.valid, true);
  assert.equal(result.code, "jwt_shape_valid_signature_not_verified");
  assert.equal(result.user.role, "supplier");
});

test("Supabase auth RBAC migration adds session events MFA RBAC matrix and RLS", () => {
  const sql = read("server/migrations/005_supabase_auth_rbac_activation.sql");
  for (const phrase of [
    "auth_session_events",
    "auth_mfa_enrollments",
    "rbac_permission_matrix",
    "supabase_auth_user_id",
    "mfa_required",
    "session_revoked_at",
    "ENABLE ROW LEVEL SECURITY",
    "CREATE POLICY",
    "rbac:manage",
  ]) {
    assert.match(sql, new RegExp(phrase), `${phrase} should be present`);
  }
});

test("Supabase auth activation docs avoid false live auth claims", () => {
  const combined = [
    read("docs/supabase-auth-rbac-activation.md"),
    read("server/src/auth/supabaseAuthService.js"),
  ].join("\n");
  assert.match(combined, /does not activate live Supabase credentials/i);
  assert.match(combined, /credential-ready/i);
  assert.doesNotMatch(combined, /live auth is active|production auth complete|public launch approved|certified for public production/i);
});
