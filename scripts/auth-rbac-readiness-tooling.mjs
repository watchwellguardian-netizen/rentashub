import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
const root = process.cwd();
const routesDir = join(root, "server", "src", "routes");
const AUTH_EVIDENCE_SCAN_PATHS = [
  "server/src/middleware/auth.js",
  "server/src/middleware/rateLimiter.js",
  "src/lib/adapters/apiAuthHeaders.js",
  "src/lib/adapters/authAdapter.js",
  "server/src/auth/supabaseAuthReadiness.js",
  "server/src/auth/supabaseAuthService.js",
];

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

export const RLS_POLICY_TABLES = [
  { table: "tenants", ownerRole: "admin", policyRole: "admin", tenantScoped: true, adminException: true },
  { table: "user_role_assignments", ownerRole: "admin", policyRole: "admin", tenantScoped: true, adminException: true },
  { table: "users", ownerRole: "customer", policyRole: "self", tenantScoped: true, adminException: true },
  { table: "assets", ownerRole: "supplier", policyRole: "owner", tenantScoped: true, adminException: true },
  { table: "bookings", ownerRole: "customer", policyRole: "participant", tenantScoped: true, adminException: true },
  { table: "file_metadata", ownerRole: "participant", policyRole: "owner_or_admin", tenantScoped: true, adminException: true },
  { table: "auctions", ownerRole: "supplier", policyRole: "seller_or_admin", tenantScoped: true, adminException: true },
  { table: "auction_bids", ownerRole: "customer", policyRole: "bidder_or_admin", tenantScoped: true, adminException: true },
  { table: "inspection_marketplace_requests", ownerRole: "inspector", policyRole: "participant_or_admin", tenantScoped: true, adminException: true },
  { table: "transport_marketplace_requests", ownerRole: "transport_provider", policyRole: "participant_or_admin", tenantScoped: true, adminException: true },
  { table: "financing_marketplace_referrals", ownerRole: "financing_partner", policyRole: "participant_or_admin", tenantScoped: true, adminException: true },
  { table: "generated_documents", ownerRole: "participant", policyRole: "participant_or_admin", tenantScoped: true, adminException: true },
  { table: "notification_events", ownerRole: "recipient", policyRole: "recipient_or_admin", tenantScoped: true, adminException: true },
  { table: "audit_logs", ownerRole: "admin", policyRole: "admin", tenantScoped: false, adminException: true },
  { table: "storage_objects_audit", ownerRole: "owner", policyRole: "owner_or_admin", tenantScoped: true, adminException: true },
];

const ADMIN_EXCEPTION_REASONS = {
  customer: "support_impersonation_for_customer_case_review",
  supplier: "listing_moderation_supplier_support_and_dispute_review",
  dealer: "brokerage_lead_review_and_auction_compliance",
  inspector: "provider_credential_review_and_report_moderation",
  transport_provider: "provider_credential_review_and_transport_dispute_support",
  financing_partner: "partner_compliance_review_and_referral_support",
  admin: "native_admin_access",
  super_admin: "security_and_rbac_break_glass_review",
};

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

export function buildRoleToPolicyCoverageMatrix() {
  const roleRows = buildRoleMappingMatrix();
  return roleRows.map((role) => {
    const tableCoverage = RLS_POLICY_TABLES.filter((table) => {
      const normalizedOwner = normalizeRole(table.ownerRole);
      return normalizedOwner === role.role || table.policyRole.includes(role.role) || table.adminException && ["admin", "super_admin"].includes(role.role);
    }).map((table) => ({
      table: table.table,
      policyRole: table.policyRole,
      tenantScoped: table.tenantScoped,
      adminException: table.adminException,
    }));
    return {
      role: role.role,
      aliases: role.serverAliases,
      permissions: role.permissions,
      supabaseClaim: role.supabaseClaim,
      rlsTablesCovered: tableCoverage,
      policyCount: tableCoverage.length,
      coverageStatus: tableCoverage.length ? "covered" : "needs_review",
    };
  });
}

export function renderRoleToPolicyCoverageMatrix() {
  const rows = buildRoleToPolicyCoverageMatrix();
  return [
    "# Role-to-Policy Coverage Matrix",
    "",
    "| Role | Supabase Claim | Policy Count | Covered Tables | Status |",
    "| --- | --- | ---: | --- | --- |",
    ...rows.map((row) => `| ${row.role} | ${row.supabaseClaim} | ${row.policyCount} | ${row.rlsTablesCovered.map((item) => item.table).join(", ") || "-"} | ${row.coverageStatus} |`),
  ].join("\n");
}

export function renderCrossRoleDenialTestTemplate() {
  const roles = ["customer", "supplier", "dealer", "inspector", "transport_provider", "financing_partner", "admin"];
  const scenarios = [
    ["customer", "supplier", "supplier asset/listing records"],
    ["supplier", "dealer", "dealer brokerage leads"],
    ["dealer", "admin", "admin readiness and moderation routes"],
    ["inspector", "transport_provider", "transport provider requests"],
    ["transport_provider", "financing_partner", "financing partner referrals"],
    ["financing_partner", "supplier", "supplier-owned auction records"],
  ];
  return `# Cross-Role Denial Test Template

Do not include passwords, bearer tokens, refresh tokens, service role keys, JWT secrets, or screenshots containing credentials.

## Test Matrix

Canonical roles under test: ${roles.join(", ")}

| Actor Role | Target Role/Data | Expected Result | Development Evidence | UAT Evidence |
| --- | --- | --- | --- | --- |
${scenarios.map(([actor, target, data]) => `| ${actor} | ${target} ${data} | DENIED unless admin exception is explicitly approved | Pending | Pending |`).join("\n")}

## Required Assertions

- Cross-role read denial confirmed.
- Cross-role mutation denial confirmed.
- Admin exception tested separately.
- Denial returns controlled 401/403 without exposing target data.
- Audit event recorded for denied privileged operation where supported.

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderTenantIsolationEvidenceTemplate() {
  return `# Tenant Isolation Evidence Template

Do not include secrets, raw production customer data, database passwords, JWTs, screenshots containing credentials, or service role keys.

## Environment

- Environment: Development / UAT
- Supabase Project Name:
- Supabase Project ID:
- Test Operator:
- Date:

## Tenant Setup

| Tenant | Test Users | Test Records | Status |
| --- | --- | --- | --- |
| Tenant A | customer, supplier, admin | listings, bookings, files, audit records | Pending |
| Tenant B | customer, supplier, admin | listings, bookings, files, audit records | Pending |

## Isolation Tests

| Scenario | Expected Result | Actual Result | Evidence Location |
| --- | --- | --- | --- |
| Tenant A customer reads Tenant B booking | DENIED | Pending |  |
| Tenant A supplier mutates Tenant B listing | DENIED | Pending |  |
| Tenant A user requests Tenant B private file metadata | DENIED | Pending |  |
| Admin reviews both tenants with approved support context | ALLOWED | Pending |  |
| Cross-tenant audit access by non-admin | DENIED | Pending |  |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function buildAdminAccessExceptionMatrix() {
  const roles = RENTASHUB_ROLES.filter((role) => role !== "anon").map((role) => ({
    role,
    adminMayAccess: canRoleAccess("admin", [role]) || role === "admin",
    superAdminMayAccess: canRoleAccess("super_admin", [role]) || role === "super_admin",
    exceptionReason: ADMIN_EXCEPTION_REASONS[role] || "requires_security_review",
    evidenceRequired: role === "admin" || role === "super_admin"
      ? "privileged_access_review_and_break_glass_audit"
      : "support_case_or_moderation_context_required",
  }));
  return {
    status: roles.every((row) => row.exceptionReason) ? "PASS" : "FAIL",
    roles,
    blockers: roles.filter((row) => !row.exceptionReason).map((row) => `Missing admin exception reason for ${row.role}`),
  };
}

export function renderAdminAccessExceptionMatrix() {
  const matrix = buildAdminAccessExceptionMatrix();
  return [
    "# Admin Access Exception Matrix",
    "",
    "| Role | Admin May Access | Super Admin May Access | Exception Reason | Evidence Required |",
    "| --- | --- | --- | --- | --- |",
    ...matrix.roles.map((row) => `| ${row.role} | ${row.adminMayAccess ? "Yes" : "No"} | ${row.superAdminMayAccess ? "Yes" : "No"} | ${row.exceptionReason} | ${row.evidenceRequired} |`),
  ].join("\n");
}

function extractRouteCoverageFromFile(path) {
  const text = readFileSync(path, "utf8");
  const constantRoles = new Map();
  for (const match of text.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*(\[[^\]]*\])/g)) {
    const roles = [...match[2].matchAll(/"([^"]+)"/g)].map((roleMatch) => roleMatch[1]);
    if (roles.length) constantRoles.set(match[1], roles);
  }
  const routePattern = /router\.(get|post|patch|put|delete)\(\s*"([^"]+)"([\s\S]*?)\);/g;
  return [...text.matchAll(routePattern)].map((match) => {
    const middlewareText = match[3];
    let roles = [];
    const inlineMatch = middlewareText.match(/requireRoles\(\s*(\[[^\]]*\]|[A-Z0-9_]+)\s*\)/);
    if (inlineMatch) {
      if (inlineMatch[1].startsWith("[")) roles = [...inlineMatch[1].matchAll(/"([^"]+)"/g)].map((roleMatch) => roleMatch[1]);
      else roles = constantRoles.get(inlineMatch[1]) || [];
    }
    return {
      method: match[1].toUpperCase(),
      route: match[2],
      roles,
      file: path.replace(`${root}\\`, "").replaceAll("\\", "/"),
      protected: Boolean(inlineMatch),
    };
  });
}

export function buildApiRouteToRoleCoverageReport({ directory = routesDir } = {}) {
  const files = existsSync(directory)
    ? readdirSync(directory).filter((file) => file.endsWith(".js")).map((file) => join(directory, file))
    : [];
  const routes = files.flatMap(extractRouteCoverageFromFile).sort((a, b) => `${a.route}:${a.method}`.localeCompare(`${b.route}:${b.method}`));
  const protectedRoutes = routes.filter((route) => route.protected);
  const publicRoutes = routes.filter((route) => !route.protected);
  const adminRoutesWithoutAdmin = protectedRoutes.filter((route) => route.route.includes("/admin") && !expandAllowedRoles(route.roles).includes("admin"));
  const mutationWithoutProtection = routes.filter((route) => ["POST", "PATCH", "PUT", "DELETE"].includes(route.method) && !route.protected && !route.route.includes("/auth/"));
  const blockers = [
    ...adminRoutesWithoutAdmin.map((route) => `${route.method} ${route.route} is admin-like but lacks admin role coverage.`),
    ...mutationWithoutProtection.map((route) => `${route.method} ${route.route} mutation route lacks requireRoles coverage.`),
  ];
  return {
    status: blockers.length ? "FAIL" : "PASS",
    scannedFiles: files.length,
    routeCount: routes.length,
    protectedCount: protectedRoutes.length,
    publicCount: publicRoutes.length,
    routes: routes.map((route) => ({ ...route, expandedRoles: expandAllowedRoles(route.roles) })),
    blockers,
  };
}

export function renderApiRouteToRoleCoverageReport(report = buildApiRouteToRoleCoverageReport()) {
  const lines = [
    "# API Route-to-Role Coverage Report",
    "",
    `Status: ${report.status}`,
    `Routes Scanned: ${report.routeCount}`,
    `Protected Routes: ${report.protectedCount}`,
    `Public Routes: ${report.publicCount}`,
    "",
    "| Method | Route | Protected | Roles | Source |",
    "| --- | --- | --- | --- | --- |",
    ...report.routes.map((route) => `| ${route.method} | ${route.route} | ${route.protected ? "Yes" : "No"} | ${route.expandedRoles.join(", ") || "public"} | ${route.file} |`),
  ];
  if (report.blockers.length) lines.push("", "## Blockers", ...report.blockers.map((blocker) => `- ${blocker}`));
  return lines.join("\n");
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

export function renderPasswordResetTestChecklist() {
  return `# Password Reset Test Checklist

Do not include passwords, reset tokens, magic links, JWTs, screenshots containing credentials, or Supabase service credentials.

## Configuration Evidence

| Item | Development | UAT | Notes |
| --- | --- | --- | --- |
| Password reset enabled in Supabase | Pending | Pending | Record setting only, not secrets. |
| Redirect URL configured for environment | Pending | Pending | Record hostname only. |
| Email template reviewed | Pending | Pending | No private user data. |
| Reset token expiry confirmed | Pending | Pending | Record TTL only. |

## Flow Evidence

| Step | Expected Result | Development | UAT |
| --- | --- | --- | --- |
| Request reset for valid user | Controlled success response | Pending | Pending |
| Request reset for unknown user | No account enumeration | Pending | Pending |
| Open reset link | User reaches controlled reset screen | Pending | Pending |
| Submit weak password | Friendly validation error | Pending | Pending |
| Submit valid password | Password changed | Pending | Pending |
| Reuse reset token | Denied | Pending | Pending |
| Old password login | Denied | Pending | Pending |
| New password login | Allowed | Pending | Pending |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderEmailVerificationTestChecklist() {
  return `# Email Verification Test Checklist

Do not include email verification tokens, JWTs, service keys, passwords, or screenshots containing credentials.

## Configuration Evidence

| Item | Development | UAT | Notes |
| --- | --- | --- | --- |
| Email verification required | Pending | Pending | AUTH_REQUIRE_EMAIL_VERIFICATION expected true before live activation. |
| Site URL configured | Pending | Pending | Record hostname only. |
| Redirect allowlist configured | Pending | Pending | Record hostname only. |
| Email template reviewed | Pending | Pending | No private user data. |

## Flow Evidence

| Step | Expected Result | Development | UAT |
| --- | --- | --- | --- |
| Register new user | Verification email queued/sent | Pending | Pending |
| Login before verification | Denied or limited based on approved policy | Pending | Pending |
| Open verification link | Email marked verified | Pending | Pending |
| Reuse verification link | Controlled response | Pending | Pending |
| Expired verification link | Controlled error | Pending | Pending |
| Login after verification | Allowed | Pending | Pending |

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function buildMfaReadinessEvidencePackage(env = process.env) {
  const provider = env.SECURITY_MFA_PROVIDER || "not_configured";
  const sessionCookiePolicy = env.SECURITY_SESSION_COOKIE_POLICY || "not_configured";
  const refreshRotation = env.SECURITY_REFRESH_TOKEN_ROTATION || env.AUTH_REFRESH_TOKEN_ROTATION || "not_configured";
  const sessionRevocation = env.SECURITY_SESSION_REVOCATION || "not_configured";
  const checks = [
    { id: "mfa_provider_selected", status: hasRealValue(provider) ? "present" : "missing", evidenceRequired: "Provider selection and owner approval" },
    { id: "admin_mfa_required", status: "manual_evidence_required", evidenceRequired: "Admin MFA enrollment test in Development and UAT" },
    { id: "privileged_role_mfa_required", status: "manual_evidence_required", evidenceRequired: "Supplier/admin/dealer privileged workflow MFA policy" },
    { id: "session_cookie_policy", status: hasRealValue(sessionCookiePolicy) ? "present" : "missing", evidenceRequired: "Secure, HttpOnly, SameSite policy evidence" },
    { id: "refresh_token_rotation", status: hasRealValue(refreshRotation) ? "present" : "missing", evidenceRequired: "Refresh rotation setting and reuse-denial evidence" },
    { id: "session_revocation", status: hasRealValue(sessionRevocation) ? "present" : "missing", evidenceRequired: "Session revocation test evidence" },
    { id: "recovery_codes_or_backup_factor", status: "manual_evidence_required", evidenceRequired: "Backup factor policy or recovery procedure" },
    { id: "mfa_audit_events", status: "manual_evidence_required", evidenceRequired: "MFA enrollment/challenge audit event evidence" },
  ];
  const blockers = checks
    .filter((check) => check.status !== "present")
    .map((check) => `${check.id}: ${check.evidenceRequired}`);
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_MANUAL_EVIDENCE" : "CREDENTIAL_READY",
    providerStatus: hasRealValue(provider) ? "present" : "missing_or_placeholder",
    liveMfaActivated: false,
    valuePrinted: false,
    checks,
    blockers,
  };
}

export function renderMfaReadinessEvidencePackage(env = process.env) {
  const report = buildMfaReadinessEvidencePackage(env);
  const lines = [
    "# MFA Readiness Evidence Package",
    "",
    `Status: ${report.status}`,
    "Live MFA Activated: NO",
    "",
    "Do not include MFA secrets, QR codes, recovery codes, bearer tokens, JWTs, passwords, or screenshots containing credentials.",
    "",
    "| Evidence Item | Status | Evidence Required |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.id} | ${check.status} | ${check.evidenceRequired} |`),
  ];
  if (report.blockers.length) lines.push("", "## Blockers", ...report.blockers.map((blocker) => `- ${blocker}`));
  return lines.join("\n");
}

export function scanDevHeaderLockdownEvidence({ env = process.env, paths = AUTH_EVIDENCE_SCAN_PATHS } = {}) {
  const sourceChecks = paths.map((path) => {
    const fullPath = join(root, path);
    const exists = existsSync(fullPath);
    const text = exists ? readFileSync(fullPath, "utf8") : "";
    return {
      path,
      exists,
      referencesDevRoleHeader: /x-user-role/i.test(text),
      referencesDevUserHeader: /x-user-id/i.test(text),
      referencesProductionLock: /AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION|NODE_ENV\s*={0,2}\s*["']production["']|production/i.test(text),
      valuePrinted: false,
    };
  });
  const lockdown = validateDevHeaderLockdown(env);
  const backendAuth = sourceChecks.find((check) => check.path.endsWith("middleware/auth.js"));
  const frontendAdapter = sourceChecks.find((check) => check.path.endsWith("apiAuthHeaders.js"));
  const blockers = [];
  if (!backendAuth?.exists) blockers.push("Backend auth middleware must exist.");
  if (!backendAuth?.referencesProductionLock) blockers.push("Backend auth middleware must reference production dev-header lockdown.");
  if (!backendAuth?.referencesDevRoleHeader || !backendAuth?.referencesDevUserHeader) blockers.push("Backend auth middleware must explicitly inventory dev auth headers.");
  if (!frontendAdapter?.exists) blockers.push("Frontend API auth header adapter must exist.");
  if (!frontendAdapter?.referencesDevRoleHeader || !frontendAdapter?.referencesDevUserHeader) blockers.push("Frontend API auth header adapter must inventory dev headers for lockdown review.");
  blockers.push(...lockdown.blockers);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    devHeadersDisabledInProduction: lockdown.devHeadersDisabledInProduction,
    productionSafe: lockdown.productionSafe,
    liveAuthActivated: false,
    valuePrinted: false,
    sourceChecks,
    blockers,
  };
}

export function buildAuthEvidenceAutomationReport({ env = process.env } = {}) {
  const sessionLifecycle = validateSessionLifecycleReadiness(env);
  const mfaEvidence = buildMfaReadinessEvidencePackage(env);
  const devHeaderScanner = scanDevHeaderLockdownEvidence({ env });
  const blockers = [
    ...sessionLifecycle.blockers,
    ...mfaEvidence.blockers,
    ...devHeaderScanner.blockers,
  ];
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_MANUAL_EVIDENCE" : "CREDENTIAL_READY",
    generatedAt: new Date().toISOString(),
    liveAuthActivated: false,
    valuePrinted: false,
    templates: {
      sessionLifecycle: renderSessionLifecycleEvidenceTemplate(),
      passwordReset: renderPasswordResetTestChecklist(),
      emailVerification: renderEmailVerificationTestChecklist(),
      mfaReadiness: renderMfaReadinessEvidencePackage(env),
    },
    sessionLifecycle,
    mfaEvidence,
    devHeaderScanner,
    blockers,
  };
}

export function renderAuthEvidenceAutomationReport(report = buildAuthEvidenceAutomationReport()) {
  const lines = [
    "# Auth Evidence Automation Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    "Live Auth Activated: NO",
    "",
    "## Checks",
    `- Session lifecycle evidence: ${report.sessionLifecycle.status}`,
    `- MFA readiness evidence: ${report.mfaEvidence.status}`,
    `- Dev-header lockdown scanner: ${report.devHeaderScanner.status}`,
    "- Password reset checklist: GENERATED",
    "- Email verification checklist: GENERATED",
  ];
  if (report.blockers.length) lines.push("", "## Blockers", ...report.blockers.map((blocker) => `- ${blocker}`));
  return lines.join("\n");
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
    authEvidenceAutomation: {
      status: buildAuthEvidenceAutomationReport({ env }).status,
      liveAuthActivated: false,
      valuePrinted: false,
    },
    rolePolicyCoverage: {
      status: buildRoleToPolicyCoverageMatrix().every((row) => row.coverageStatus === "covered") ? "PASS" : "NEEDS_REVIEW",
      matrix: buildRoleToPolicyCoverageMatrix(),
    },
    adminAccessExceptions: buildAdminAccessExceptionMatrix(),
    apiRouteCoverage: buildApiRouteToRoleCoverageReport(),
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
  else if (command === "policy-matrix") console.log(renderRoleToPolicyCoverageMatrix());
  else if (command === "cross-role-template") console.log(renderCrossRoleDenialTestTemplate());
  else if (command === "tenant-isolation-template") console.log(renderTenantIsolationEvidenceTemplate());
  else if (command === "admin-exceptions") console.log(renderAdminAccessExceptionMatrix());
  else if (command === "api-route-coverage") console.log(renderApiRouteToRoleCoverageReport());
  else if (command === "supabase-checklist") console.log(renderSupabaseChecklist(buildSupabaseAuthConfigChecklist()));
  else if (command === "session-template") console.log(renderSessionLifecycleEvidenceTemplate());
  else if (command === "password-reset-checklist") console.log(renderPasswordResetTestChecklist());
  else if (command === "email-verification-checklist") console.log(renderEmailVerificationTestChecklist());
  else if (command === "mfa-evidence-package") console.log(renderMfaReadinessEvidencePackage());
  else if (command === "dev-header-scan") console.log(JSON.stringify(scanDevHeaderLockdownEvidence(), null, 2));
  else if (command === "auth-evidence-report") console.log(renderAuthEvidenceAutomationReport());
  else renderReport(buildAuthRbacReadinessReport());
}
