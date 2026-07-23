import assert from "node:assert/strict";
import { test } from "node:test";
import {
  API_BEARER_GUARD_SCENARIOS,
  PROTECTED_ROUTE_MATRIX,
  SUPABASE_AUTH_CONFIG_KEYS,
  buildAdminAccessExceptionMatrix,
  buildApiRouteAuthGuardCoverageMatrix,
  buildApiRouteToRoleCoverageReport,
  buildAuthEvidenceAutomationReport,
  buildAuthRbacReadinessReport,
  buildMfaReadinessEvidencePackage,
  buildRoleToRouteCoverageReport,
  buildRoleToPolicyCoverageMatrix,
  buildRoleMappingMatrix,
  buildSupabaseAuthConfigChecklist,
  renderAdminAccessExceptionMatrix,
  renderApiRouteToRoleCoverageReport,
  renderCrossRoleDenialTestTemplate,
  renderAuthEvidenceAutomationReport,
  renderApiRouteAuthGuardCoverageMatrix,
  renderEmailVerificationTestChecklist,
  renderEmailVerificationEvidenceForm,
  renderDevHeaderLockdownFinalCertificationChecklist,
  renderLiveAuthEvidenceCollectionTemplate,
  renderMfaReadinessEvidencePackage,
  renderMfaReadinessEvidenceForm,
  renderPasswordResetEvidenceForm,
  renderPasswordResetTestChecklist,
  renderRoleToRouteCoverageReport,
  renderSessionLifecycleEvidenceForm,
  renderSessionRevocationEvidenceChecklist,
  renderRoleToPolicyCoverageMatrix,
  renderRoleMappingMatrix,
  renderSupabaseAuthConfigurationEvidenceChecklist,
  renderSessionLifecycleEvidenceTemplate,
  renderTenantIsolationEvidenceTemplate,
  scanDevHeaderLockdownEvidence,
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

test("role-to-policy coverage matrix maps canonical roles to RLS policy surfaces", () => {
  const matrix = buildRoleToPolicyCoverageMatrix();
  assert.ok(matrix.some((row) => row.role === "supplier" && row.rlsTablesCovered.some((table) => table.table === "assets")));
  assert.ok(matrix.some((row) => row.role === "admin" && row.rlsTablesCovered.some((table) => table.adminException)));
  assert.ok(matrix.every((row) => row.supabaseClaim === "app_role"));
  const markdown = renderRoleToPolicyCoverageMatrix();
  assert.match(markdown, /Role-to-Policy Coverage Matrix/);
  assert.match(markdown, /storage_objects_audit/);
});

test("cross-role denial and tenant isolation evidence templates are credential-safe", () => {
  const denial = renderCrossRoleDenialTestTemplate();
  const isolation = renderTenantIsolationEvidenceTemplate();
  assert.match(denial, /Cross-Role Denial Test Template/);
  assert.match(denial, /Customer|customer/);
  assert.match(isolation, /Tenant Isolation Evidence Template/);
  assert.match(isolation, /Tenant A customer reads Tenant B booking/);
  const forbiddenLabels = [
    ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
    ["JWT", "SECRET"].join("_"),
    "password",
  ].map((label) => `${label}=`);
  for (const forbidden of forbiddenLabels) {
    assert.doesNotMatch(`${denial}\n${isolation}`, new RegExp(forbidden, "i"));
  }
});

test("admin-access exception matrix documents privileged access boundaries", () => {
  const matrix = buildAdminAccessExceptionMatrix();
  assert.equal(matrix.status, "PASS");
  assert.ok(matrix.roles.some((row) => row.role === "supplier" && row.adminMayAccess));
  assert.ok(matrix.roles.some((row) => row.role === "super_admin" && row.evidenceRequired.includes("break_glass")));
  const markdown = renderAdminAccessExceptionMatrix();
  assert.match(markdown, /Admin Access Exception Matrix/);
  assert.match(markdown, /support_case_or_moderation_context_required/);
});

test("API route-to-role coverage report inventories protected routes and admin routes", () => {
  const report = buildApiRouteToRoleCoverageReport();
  assert.equal(report.status, "PASS");
  assert.ok(report.routeCount > 40);
  assert.ok(report.protectedCount > report.publicCount);
  assert.ok(report.routes.some((route) => route.route === "/api/admin/disputes" && route.expandedRoles.includes("admin")));
  assert.ok(report.routes.some((route) => route.route === "/api/assets" && route.method === "POST" && route.expandedRoles.includes("supplier")));
  const markdown = renderApiRouteToRoleCoverageReport(report);
  assert.match(markdown, /API Route-to-Role Coverage Report/);
  assert.match(markdown, /\/api\/monitoring\/test-event/);
});

test("password reset and email verification checklist generators are credential-safe", () => {
  const passwordReset = renderPasswordResetTestChecklist();
  const emailVerification = renderEmailVerificationTestChecklist();
  assert.match(passwordReset, /Password Reset Test Checklist/);
  assert.match(passwordReset, /No account enumeration/);
  assert.match(emailVerification, /Email Verification Test Checklist/);
  assert.match(emailVerification, /Login before verification/);
  const forbiddenLabels = [
    "token",
    "password",
    ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
    ["JWT", "SECRET"].join("_"),
  ].map((label) => `${label}=`);
  for (const forbidden of forbiddenLabels) {
    assert.doesNotMatch(`${passwordReset}\n${emailVerification}`, new RegExp(forbidden, "i"));
  }
});

test("MFA readiness evidence package remains provider-ready and does not activate MFA", () => {
  const report = buildMfaReadinessEvidencePackage({
    SECURITY_MFA_PROVIDER: "supabase-mfa",
    SECURITY_SESSION_COOKIE_POLICY: "secure-httponly-samesite",
    SECURITY_REFRESH_TOKEN_ROTATION: "enabled",
    SECURITY_SESSION_REVOCATION: "enabled",
  });
  assert.equal(report.liveMfaActivated, false);
  assert.equal(report.valuePrinted, false);
  assert.ok(report.checks.some((check) => check.id === "admin_mfa_required"));
  assert.ok(report.blockers.some((blocker) => /evidence|policy|procedure/i.test(blocker)));

  const markdown = renderMfaReadinessEvidencePackage();
  assert.match(markdown, /MFA Readiness Evidence Package/);
  assert.match(markdown, /Live MFA Activated: NO/);
});

test("dev-header lockdown evidence scanner inventories source locations and production safety", () => {
  const safe = scanDevHeaderLockdownEvidence({ env: { NODE_ENV: "production", AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "true" } });
  assert.equal(safe.status, "PASS");
  assert.equal(safe.productionSafe, true);
  assert.equal(safe.valuePrinted, false);
  assert.ok(safe.sourceChecks.some((check) => check.path.endsWith("middleware/auth.js") && check.referencesProductionLock));
  assert.ok(safe.sourceChecks.some((check) => check.path.endsWith("apiAuthHeaders.js") && check.referencesDevRoleHeader));

  const unsafe = scanDevHeaderLockdownEvidence({ env: { NODE_ENV: "production", AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "false" } });
  assert.equal(unsafe.status, "FAIL");
  assert.ok(unsafe.blockers.some((blocker) => /must be true/.test(blocker)));
});

test("auth evidence automation report combines session password email MFA and dev-header evidence", () => {
  const report = buildAuthEvidenceAutomationReport({ env: shapedEnv });
  assert.equal(report.liveAuthActivated, false);
  assert.equal(report.valuePrinted, false);
  assert.equal(report.devHeaderScanner.status, "PASS");
  assert.match(report.templates.sessionLifecycle, /Session Lifecycle Evidence/);
  assert.match(report.templates.passwordReset, /Password Reset Test Checklist/);
  assert.match(report.templates.emailVerification, /Email Verification Test Checklist/);
  assert.match(report.templates.mfaReadiness, /MFA Readiness Evidence Package/);

  const rendered = renderAuthEvidenceAutomationReport(report);
  assert.match(rendered, /Auth Evidence Automation Report/);
  assert.match(rendered, /Live Auth Activated: NO/);
});

test("live-auth evidence template and Supabase config evidence checklist are credential-safe", () => {
  const liveAuth = renderLiveAuthEvidenceCollectionTemplate();
  const configEvidence = renderSupabaseAuthConfigurationEvidenceChecklist({ AUTH_PROVIDER: "supabase" });
  assert.match(liveAuth, /Live Auth Evidence Collection Template/);
  assert.match(liveAuth, /Registration/);
  assert.match(liveAuth, /Session Revocation/);
  assert.match(configEvidence, /Supabase Auth Configuration Evidence Checklist/);
  assert.match(configEvidence, /SUPABASE_URL/);
  assert.match(configEvidence, /Secure secret store reference/);
  assert.doesNotMatch(`${liveAuth}\n${configEvidence}`, /postgresql:\/\/|sb_secret_|eyJ/i);
});

test("password reset email verification MFA and session evidence forms are generated", () => {
  const passwordReset = renderPasswordResetEvidenceForm();
  const emailVerification = renderEmailVerificationEvidenceForm();
  const mfa = renderMfaReadinessEvidenceForm();
  const session = renderSessionLifecycleEvidenceForm();
  const revocation = renderSessionRevocationEvidenceChecklist();
  assert.match(passwordReset, /Password Reset Evidence Form/);
  assert.match(emailVerification, /Email Verification Evidence Form/);
  assert.match(mfa, /MFA Readiness Evidence Form/);
  assert.match(session, /Session Lifecycle Evidence Form/);
  assert.match(revocation, /Session Revocation Evidence Checklist/);
  assert.match(revocation, /Admin revokes user session/);
  assert.doesNotMatch(`${passwordReset}\n${emailVerification}\n${mfa}\n${session}\n${revocation}`, /=[A-Za-z0-9_-]{20,}/);
});

test("role-to-route coverage report maps roles to protected frontend routes", () => {
  const report = buildRoleToRouteCoverageReport();
  assert.equal(report.status, "REVIEW_REQUIRED");
  assert.ok(report.coverage.some((row) => row.role === "customer" && row.routes.some((route) => route.route === "/customer-dashboard")));
  assert.ok(report.coverage.some((row) => row.role === "supplier" && row.routes.some((route) => route.route === "/supplier-dashboard")));
  assert.ok(report.coverage.some((row) => row.role === "admin" && row.routes.some((route) => route.route === "/admin")));
  assert.ok(report.blockers.some((blocker) => /inspector/.test(blocker)));
  const markdown = renderRoleToRouteCoverageReport(report);
  assert.match(markdown, /Role-to-Route Coverage Report/);
  assert.match(markdown, /\/brokerage\/leads/);
});

test("API auth guard coverage matrix reports protected mutations and admin guards", () => {
  const matrix = buildApiRouteAuthGuardCoverageMatrix();
  assert.equal(matrix.status, "PASS");
  assert.equal(matrix.guardSummary.mutationRoutesWithoutProtection, 0);
  assert.equal(matrix.guardSummary.adminRoutesProtected, true);
  assert.ok(matrix.routes.some((route) => route.route === "/api/assets" && route.method === "POST" && route.protected));
  const markdown = renderApiRouteAuthGuardCoverageMatrix(matrix);
  assert.match(markdown, /API Route Auth Guard Coverage Matrix/);
  assert.match(markdown, /Mutation Routes Without Protection: 0/);
});

test("dev-header lockdown final certification checklist remains evidence-only", () => {
  const checklist = renderDevHeaderLockdownFinalCertificationChecklist({
    NODE_ENV: "production",
    AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION: "true",
  });
  assert.match(checklist, /Dev Header Lockdown Final Certification Checklist/);
  assert.match(checklist, /Production lock enabled/);
  assert.match(checklist, /Backend middleware references production lock/);
  assert.doesNotMatch(checklist, /x-user-role:\s*\w/i);
});
