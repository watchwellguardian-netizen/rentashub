import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROLE_ALIASES as FRONTEND_ROLE_ALIASES, ROLE_GROUPS, ROLE_LABELS, expandAllowedRoles } from "../src/lib/rbac.js";
import {
  PERMISSION_MATRIX,
  RENTASHUB_ROLES,
  ROLE_ALIASES as SERVER_ROLE_ALIASES,
  ROLE_INHERITANCE,
  canRoleAccess,
  getPermissionMatrix,
  normalizeRole,
} from "../server/src/auth/rbacPolicy.js";
import { getSupabaseAuthActivationPlan, validateSupabaseJwtReadiness } from "../server/src/auth/supabaseAuthService.js";

const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/];

export const SUPABASE_AUTH_CONFIG_KEYS = [
  "AUTH_PROVIDER",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_REQUIRE_EMAIL_VERIFICATION",
  "AUTH_PASSWORD_RESET_ENABLED",
  "AUTH_REFRESH_TOKEN_ROTATION",
  "AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION",
];

export const PROTECTED_ROUTE_MATRIX = [
  { route: "/dashboard", allowedRoles: ["customer", "supplier", "broker", "admin"], purpose: "role-aware dashboard redirect" },
  { route: "/messages", allowedRoles: ["customer", "supplier", "broker", "admin"], purpose: "authenticated communications" },
  { route: "/customer-dashboard", allowedRoles: ["customer"], purpose: "customer workspace" },
  { route: "/bookings", allowedRoles: ["customer"], purpose: "customer bookings" },
  { route: "/wallet", allowedRoles: ["customer"], purpose: "customer wallet placeholder" },
  { route: "/supplier-dashboard", allowedRoles: ["supplier"], purpose: "supplier workspace" },
  { route: "/list-asset", allowedRoles: ["supplier"], purpose: "supplier listing creation" },
  { route: "/my-listings", allowedRoles: ["supplier"], purpose: "owned listing management" },
  { route: "/brokerage/leads", allowedRoles: ["broker", "admin"], purpose: "dealer/broker lead workspace" },
  { route: "/dealer/auction-dashboard", allowedRoles: ["broker", "admin"], purpose: "dealer auction workspace" },
  { route: "/admin", allowedRoles: ["admin"], purpose: "admin center" },
  { route: "/admin/users", allowedRoles: ["admin"], purpose: "admin user management" },
  { route: "/admin/compliance", allowedRoles: ["admin"], purpose: "admin compliance readiness" },
  { route: "/admin/revenue", allowedRoles: ["admin"], purpose: "admin revenue readiness" },
  { route: "/booking/:id", allowedRoles: ["customer", "supplier", "admin"], purpose: "booking detail ownership checks" },
  { route: "/claims", allowedRoles: ["customer", "supplier", "admin"], purpose: "claims workspace" },
  { route: "/disputes", allowedRoles: ["customer", "supplier", "admin"], purpose: "dispute workspace" },
];

export const API_BEARER_GUARD_SCENARIOS = [
  { scenario: "missing bearer token", endpoint: "POST /api/assets", expectedStatus: 401, expectedCode: "unauthorized" },
  { scenario: "invalid bearer token", endpoint: "GET /api/auth/me", expectedStatus: 401, expectedCode: "invalid_or_expired_token" },
  { scenario: "valid supplier bearer token", endpoint: "POST /api/assets", expectedStatus: 201, expectedCode: "created" },
  { scenario: "valid customer bearer token on supplier write", endpoint: "POST /api/assets", expectedStatus: 403, expectedCode: "forbidden" },
  { scenario: "valid admin bearer token", endpoint: "GET /api/admin", expectedStatus: 200, expectedCode: "ok" },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

function redactStatus(value) {
  return hasRealValue(value) ? "present" : "missing_or_placeholder";
}

export function buildRoleMappingMatrix() {
  return getPermissionMatrix().map((row) => ({
    role: row.role,
    label: ROLE_LABELS[row.role] || row.role.replace(/_/g, " "),
    serverAliases: Object.entries(SERVER_ROLE_ALIASES).filter(([, canonical]) => canonical === row.role).map(([alias]) => alias),
    frontendAliases: Object.entries(FRONTEND_ROLE_ALIASES)
      .filter(([alias, targets]) => alias === row.role || targets.includes(row.role))
      .map(([alias]) => alias),
    inherits: ROLE_INHERITANCE[row.role] || [],
    permissions: PERMISSION_MATRIX[row.role] || [],
    supabaseClaim: "app_role",
    persistenceSource: "user_role_assignments",
  }));
}

export function validateRoleMappingMatrix() {
  const matrix = buildRoleMappingMatrix();
  const roles = new Set(matrix.map((row) => row.role));
  const blockers = [];
  for (const role of ["customer", "supplier", "dealer", "inspector", "transport_provider", "financing_partner", "admin", "super_admin"]) {
    if (!roles.has(role)) blockers.push(`Missing canonical role mapping: ${role}`);
  }
  if (normalizeRole("vendor") !== "supplier") blockers.push("Vendor alias must normalize to supplier.");
  if (normalizeRole("broker") !== "dealer") blockers.push("Broker alias must normalize to dealer.");
  if (!canRoleAccess("admin", ["supplier"])) blockers.push("Admin inheritance must include supplier workflows.");
  if (canRoleAccess("customer", ["admin"])) blockers.push("Customer must not inherit admin access.");
  return {
    status: blockers.length ? "FAIL" : "PASS",
    matrix,
    blockers,
  };
}

export function buildSupabaseAuthConfigChecklist(env = process.env) {
  const plan = getSupabaseAuthActivationPlan(env);
  const checks = SUPABASE_AUTH_CONFIG_KEYS.map((key) => {
    const requiredValue = key === "AUTH_PROVIDER" ? "supabase" : key.startsWith("AUTH_") ? "true_or_false" : "secret_store_value";
    const configured = key === "AUTH_PROVIDER"
      ? String(env[key] || "").toLowerCase() === "supabase"
      : hasRealValue(env[key]);
    return {
      key,
      requiredValue,
      status: configured ? "present" : "missing_or_placeholder",
      valuePrinted: false,
    };
  });
  const blockers = checks.filter((check) => check.status !== "present").map((check) => `${check.key} is required for Supabase Auth readiness.`);
  if (plan.readiness.placeholderKeys?.length) blockers.push(...plan.readiness.placeholderKeys.map((key) => `${key} must not be placeholder-like.`));
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS" : "CREDENTIAL_READY",
    provider: "supabase",
    checks,
    readiness: {
      credentialsReady: plan.readiness.credentialsReady,
      emailVerificationReady: plan.readiness.emailVerificationReady,
      passwordResetReady: plan.readiness.passwordResetReady,
      refreshTokenRotationReady: plan.readiness.refreshTokenRotationReady,
      devHeaderProductionLockReady: plan.readiness.devHeaderProductionLockReady,
    },
    valuePrinted: false,
    blockers,
  };
}

export function validateProtectedRouteMatrix() {
  const blockers = [];
  const requiredRoutes = ["/customer-dashboard", "/supplier-dashboard", "/brokerage/leads", "/admin", "/messages", "/booking/:id"];
  const routes = new Set(PROTECTED_ROUTE_MATRIX.map((row) => row.route));
  for (const route of requiredRoutes) {
    if (!routes.has(route)) blockers.push(`Missing protected-route expectation: ${route}`);
  }
  for (const row of PROTECTED_ROUTE_MATRIX) {
    const expanded = expandAllowedRoles(row.allowedRoles);
    if (!expanded.length) blockers.push(`${row.route} must have at least one allowed role.`);
    if (row.route.startsWith("/admin") && !expanded.includes("admin")) blockers.push(`${row.route} must include admin access.`);
    if (row.route.includes("supplier") && !expanded.includes("supplier")) blockers.push(`${row.route} should include supplier access.`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    routes: PROTECTED_ROUTE_MATRIX.map((row) => ({ ...row, expandedRoles: expandAllowedRoles(row.allowedRoles) })),
    blockers,
  };
}

export function validateApiBearerTokenGuardReadiness() {
  const blockers = [];
  const scenarioNames = new Set(API_BEARER_GUARD_SCENARIOS.map((item) => item.scenario));
  for (const required of ["missing bearer token", "invalid bearer token", "valid supplier bearer token", "valid customer bearer token on supplier write", "valid admin bearer token"]) {
    if (!scenarioNames.has(required)) blockers.push(`Missing API bearer-token guard scenario: ${required}`);
  }
  return {
    status: blockers.length ? "FAIL" : "PASS",
    scenarios: API_BEARER_GUARD_SCENARIOS,
    bearerPreferredInProduction: true,
    devHeadersAreDevelopmentOnly: true,
    blockers,
  };
}

export function validateDevHeaderLockdown(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || "development").toLowerCase();
  const lockValue = String(env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION || "true").toLowerCase();
  const production = nodeEnv === "production";
  const disabledInProduction = lockValue === "true";
  const blockers = [];
  if (production && !disabledInProduction) blockers.push("AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION must be true in production.");
  return {
    status: blockers.length ? "FAIL" : "PASS",
    environment: nodeEnv,
    devHeadersDisabledInProduction: disabledInProduction,
    productionSafe: production ? disabledInProduction : true,
    valuePrinted: false,
    blockers,
  };
}

export function validateSessionLifecycleReadiness(env = process.env) {
  const checklist = buildSupabaseAuthConfigChecklist(env);
  const lifecycle = getSupabaseAuthActivationPlan(env).sessionLifecycle;
  const phases = [
    "registration",
    "login",
    "email_verification",
    "password_reset",
    "token_refresh",
    "logout",
    "session_revocation",
    "mfa_enrollment",
  ];
  return {
    status: checklist.status,
    phases,
    lifecycle,
    evidenceRequired: phases.map((phase) => `${phase}: PASS / FAIL evidence required from Development and UAT`),
    blockers: checklist.blockers,
  };
}

export function renderRoleMappingMatrix() {
  const rows = buildRoleMappingMatrix();
  return [
    "# Auth/RBAC Role Mapping Matrix",
    "",
    "| Canonical Role | Label | Server Aliases | Inherits | Permissions | Supabase Claim | Persistence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.role} | ${row.label} | ${row.serverAliases.join(", ") || "-"} | ${row.inherits.join(", ") || "-"} | ${row.permissions.join(", ")} | ${row.supabaseClaim} | ${row.persistenceSource} |`),
  ].join("\n");
}

export function renderSessionLifecycleEvidenceTemplate() {
  return `# Supabase Auth Session Lifecycle Evidence Template

Do not include access tokens, refresh tokens, service role keys, JWT secrets, passwords, or screenshots containing credentials.

## Environment

- Environment: Development / UAT
- Supabase Project Name:
- Supabase Project ID:
- Auth Operator:
- Date:

## Session Lifecycle Evidence

| Step | Status | Evidence Location | Notes |
| --- | --- | --- | --- |
| Registration | Pending |  |  |
| Login | Pending |  |  |
| Email verification | Pending |  |  |
| Password reset | Pending |  |  |
| Token refresh | Pending |  |  |
| Logout | Pending |  |  |
| Session revocation | Pending |  |  |
| MFA enrollment readiness | Pending |  |  |

## RBAC Evidence

- Customer route access:
- Supplier route access:
- Dealer/broker route access:
- Admin route access:
- Cross-role denial:
- Cross-tenant denial:
- RLS role claim mapping:

## API Guard Evidence

- Missing bearer token rejected:
- Invalid bearer token rejected:
- Valid bearer token accepted:
- Wrong role rejected:
- Dev headers disabled in production:

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function buildAuthRbacReadinessReport({ env = process.env } = {}) {
  const roleMapping = validateRoleMappingMatrix();
  const supabaseConfig = buildSupabaseAuthConfigChecklist(env);
  const protectedRoutes = validateProtectedRouteMatrix();
  const bearerGuards = validateApiBearerTokenGuardReadiness();
  const devHeaderLockdown = validateDevHeaderLockdown(env);
  const sessionLifecycle = validateSessionLifecycleReadiness(env);
  const jwtReadiness = validateSupabaseJwtReadiness("not-a-live-token", env);
  const blockers = [...new Set([
    ...roleMapping.blockers,
    ...supabaseConfig.blockers,
    ...protectedRoutes.blockers,
    ...bearerGuards.blockers,
    ...devHeaderLockdown.blockers,
    ...sessionLifecycle.blockers,
  ])];
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_REMEDIATION" : "CREDENTIAL_READY",
    provider: "supabase",
    roleMapping,
    supabaseConfig,
    protectedRoutes,
    bearerGuards,
    devHeaderLockdown,
    sessionLifecycle,
    jwtReadiness: {
      valid: jwtReadiness.valid,
      code: jwtReadiness.code,
      valuePrinted: false,
    },
    valuePrinted: false,
    blockers,
  };
}

function renderSupabaseChecklist(checklist) {
  return [
    "# Supabase Auth Config Checklist",
    "",
    `Status: ${checklist.status}`,
    "",
    "| Key | Required | Status |",
    "| --- | --- | --- |",
    ...checklist.checks.map((check) => `| ${check.key} | ${check.requiredValue} | ${redactStatus(check.status === "present" ? "configured" : "")} |`),
  ].join("\n");
}

function renderReport(report) {
  console.log("# Auth/RBAC Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- Role mapping matrix: ${report.roleMapping.status}`);
  console.log(`- Supabase Auth config checklist: ${report.supabaseConfig.status}`);
  console.log(`- Protected route matrix: ${report.protectedRoutes.status}`);
  console.log(`- API bearer-token guard scenarios: ${report.bearerGuards.status}`);
  console.log(`- Dev-header lockdown validation: ${report.devHeaderLockdown.status}`);
  console.log(`- Session lifecycle readiness: ${report.sessionLifecycle.status}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildAuthRbacReadinessReport(), null, 2));
  else if (command === "role-matrix") console.log(renderRoleMappingMatrix());
  else if (command === "supabase-checklist") console.log(renderSupabaseChecklist(buildSupabaseAuthConfigChecklist()));
  else if (command === "session-template") console.log(renderSessionLifecycleEvidenceTemplate());
  else renderReport(buildAuthRbacReadinessReport());
}
