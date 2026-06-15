import assert from "node:assert/strict";
import { test } from "node:test";
import {
  API_BEARER_GUARD_SCENARIOS,
  PROTECTED_ROUTE_MATRIX,
  SUPABASE_AUTH_CONFIG_KEYS,
  buildAuthRbacReadinessReport,
  buildRoleMappingMatrix,
  buildSupabaseAuthConfigChecklist,
  renderRoleMappingMatrix,
  renderSessionLifecycleEvidenceTemplate,
  validateApiBearerTokenGuardReadiness,
  validateDevHeaderLockdown,
  validateProtectedRouteMatrix,
  validateRoleMappingMatrix,
  validateSessionLifecycleReadiness,
} from "../../scripts/auth-rbac-readiness-tooling.mjs";

const shapedEnv = {
  AUTH_PROVIDER: "supabase",
  SUPABASE_URL: "https://rentashub.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-shaped-for-readiness",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-shaped-for-readiness",
  AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
  AUTH_PASSWORD_RESET_ENABLED: "true",
  AUTH_REFRESH_TOKEN_ROTATION: "true",
  AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "true",
  NODE_ENV: "production",
};

test("role mapping matrix covers canonical roles aliases permissions and persistence source", () => {
  const matrix = buildRoleMappingMatrix();
  assert.ok(matrix.some((row) => row.role === "customer" && row.permissions.includes("booking:create")));
  assert.ok(matrix.some((row) => row.role === "supplier" && row.serverAliases.includes("vendor")));
  assert.ok(matrix.some((row) => row.role === "dealer" && row.serverAliases.includes("broker")));
  assert.ok(matrix.some((row) => row.role === "admin" && row.permissions.includes("admin:mutate")));
  assert.ok(matrix.every((row) => row.supabaseClaim === "app_role"));
  assert.ok(matrix.every((row) => row.persistenceSource === "user_role_assignments"));
  assert.equal(validateRoleMappingMatrix().status, "PASS");
});

test("Supabase Auth config checklist reports missing credentials without printing values", () => {
  const missing = buildSupabaseAuthConfigChecklist({ AUTH_PROVIDER: "supabase" });
  assert.equal(missing.status, "NEEDS_CREDENTIALS");
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /SUPABASE_URL/.test(blocker)));

  const shaped = buildSupabaseAuthConfigChecklist(shapedEnv);
  assert.equal(shaped.status, "CREDENTIAL_READY");
  assert.equal(shaped.valuePrinted, false);
  for (const key of SUPABASE_AUTH_CONFIG_KEYS) assert.ok(shaped.checks.some((check) => check.key === key));
});

test("protected-route matrix expands customer supplier broker and admin routes", () => {
  const result = validateProtectedRouteMatrix();
  assert.equal(result.status, "PASS");
  for (const route of ["/customer-dashboard", "/supplier-dashboard", "/brokerage/leads", "/admin", "/booking/:id"]) {
    assert.ok(PROTECTED_ROUTE_MATRIX.some((row) => row.route === route));
  }
  const supplier = result.routes.find((row) => row.route === "/supplier-dashboard");
  assert.ok(supplier.expandedRoles.includes("supplier"));
  const admin = result.routes.find((row) => row.route === "/admin");
  assert.ok(admin.expandedRoles.includes("admin"));
});

test("API bearer-token guard scenarios cover missing invalid valid wrong-role and admin cases", () => {
  const result = validateApiBearerTokenGuardReadiness();
  assert.equal(result.status, "PASS");
  assert.equal(result.bearerPreferredInProduction, true);
  for (const expected of ["missing bearer token", "invalid bearer token", "valid supplier bearer token", "valid customer bearer token on supplier write", "valid admin bearer token"]) {
    assert.ok(API_BEARER_GUARD_SCENARIOS.some((scenario) => scenario.scenario === expected));
  }
});

test("dev-header lockdown validation fails only when production disables the lock", () => {
  const safe = validateDevHeaderLockdown({ NODE_ENV: "production", AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "true" });
  assert.equal(safe.status, "PASS");
  assert.equal(safe.productionSafe, true);

  const unsafe = validateDevHeaderLockdown({ NODE_ENV: "production", AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "false" });
  assert.equal(unsafe.status, "FAIL");
  assert.ok(unsafe.blockers.some((blocker) => /must be true/.test(blocker)));
});

test("session lifecycle readiness and evidence template cover required auth events without secrets", () => {
  const lifecycle = validateSessionLifecycleReadiness(shapedEnv);
  assert.equal(lifecycle.status, "CREDENTIAL_READY");
  for (const phase of ["registration", "login", "email_verification", "password_reset", "token_refresh", "logout", "session_revocation", "mfa_enrollment"]) {
    assert.ok(lifecycle.phases.includes(phase));
  }
  const template = renderSessionLifecycleEvidenceTemplate();
  assert.match(template, /Session Lifecycle Evidence/);
  assert.match(template, /Dev headers disabled in production/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "access token", "refresh token"]) {
    assert.doesNotMatch(template, new RegExp(`${label}\\s*=`));
  }
});

test("auth RBAC readiness report remains credential-safe and blocks missing external inputs", () => {
  const missing = buildAuthRbacReadinessReport({ env: { AUTH_PROVIDER: "supabase" } });
  assert.equal(missing.status, "NEEDS_CREDENTIALS_OR_REMEDIATION");
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.blockers.some((blocker) => /SUPABASE_URL/.test(blocker)));

  const shaped = buildAuthRbacReadinessReport({ env: shapedEnv });
  assert.equal(shaped.status, "CREDENTIAL_READY");
  assert.equal(shaped.valuePrinted, false);
  assert.equal(shaped.roleMapping.status, "PASS");
  assert.equal(shaped.protectedRoutes.status, "PASS");
  assert.equal(shaped.bearerGuards.status, "PASS");
});

test("rendered role matrix includes enterprise activation roles", () => {
  const markdown = renderRoleMappingMatrix();
  assert.match(markdown, /transport_provider/);
  assert.match(markdown, /financing_partner/);
  assert.match(markdown, /super_admin/);
});
