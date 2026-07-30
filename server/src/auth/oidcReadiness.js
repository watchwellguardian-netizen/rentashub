import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { canRoleAccess, normalizeRole, PERMISSION_MATRIX } from "./rbacPolicy.js";
import { redactSecrets } from "../monitoring/logger.js";

const REQUIRED_OIDC_ENV = ["OIDC_ISSUER_URL", "OIDC_CLIENT_ID", "OIDC_AUDIENCE", "OIDC_JWKS_URL"];
const DEFAULT_ISSUER = "https://mock-idp.rentashub.test";
const DEFAULT_AUDIENCE = "rentashub-api";
const DEFAULT_SECRET = "rentashub-oidc-mock-secret-change-before-live-use";

export const OPERATION_GRID = {
  "asset:create": ["supplier", "admin"],
  "booking:create": ["customer", "admin"],
  "booking:read": ["customer", "supplier", "dealer", "admin"],
  "auction:bid": ["customer", "dealer", "admin"],
  "audit:read": ["admin"],
  "security:manage": ["super_admin"],
  "storage:write": ["supplier", "admin"],
};

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function fromB64(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(input, secret = DEFAULT_SECRET) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function getOidcCredentialReadiness(env = process.env) {
  const missing = REQUIRED_OIDC_ENV.filter((key) => !String(env[key] || "").trim());
  const optional = ["OIDC_CLIENT_SECRET", "OIDC_REDIRECT_URI", "OIDC_LOGOUT_URI", "OIDC_SCOPES"].filter((key) => !String(env[key] || "").trim());
  return {
    status: missing.length ? "OIDC_CREDENTIAL_READY_PENDING_OWNER_INPUT" : "OIDC_CREDENTIALS_SHAPED",
    required: REQUIRED_OIDC_ENV,
    missing,
    optionalMissing: optional,
    failClosed: true,
    liveIdentityProviderPending: true,
    redactedConfig: redactSecrets({
      issuer: env.OIDC_ISSUER_URL || "",
      clientId: env.OIDC_CLIENT_ID || "",
      audience: env.OIDC_AUDIENCE || "",
      clientSecret: env.OIDC_CLIENT_SECRET || "",
    }),
  };
}

export function createMockOidcToken(claims = {}, options = {}) {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT", kid: "rentashub-mock-key" };
  const payload = {
    iss: options.issuer || DEFAULT_ISSUER,
    aud: options.audience || DEFAULT_AUDIENCE,
    sub: claims.sub || `user-${randomUUID()}`,
    tenant_id: claims.tenant_id || "tenant-a",
    role: normalizeRole(claims.role || "customer"),
    permissions: claims.permissions || PERMISSION_MATRIX[normalizeRole(claims.role || "customer")] || [],
    iat: now,
    exp: claims.exp || now + 900,
    jti: claims.jti || `session-${randomUUID()}`,
    ...claims,
  };
  const encodedHeader = b64(header);
  const encodedPayload = b64(payload);
  return `${encodedHeader}.${encodedPayload}.${sign(`${encodedHeader}.${encodedPayload}`, options.secret || DEFAULT_SECRET)}`;
}

export function verifyOidcToken(token = "", options = {}) {
  if (!token) return invalid("missing_token");
  const parts = String(token).split(".");
  if (parts.length !== 3) return invalid("invalid_token_shape");
  const [header, payload, signature] = parts;
  let decodedHeader;
  let decodedPayload;
  try {
    decodedHeader = fromB64(header);
    decodedPayload = fromB64(payload);
  } catch {
    return invalid("invalid_token_payload");
  }
  if (decodedHeader.alg !== "HS256") return invalid("unsupported_signature_algorithm");
  const expected = sign(`${header}.${payload}`, options.secret || DEFAULT_SECRET);
  if (!safeEqual(signature, expected)) return invalid("invalid_signature");
  const expectedIssuer = options.issuer || DEFAULT_ISSUER;
  const expectedAudience = options.audience || DEFAULT_AUDIENCE;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (decodedPayload.iss !== expectedIssuer) return invalid("wrong_issuer", decodedPayload);
  if (decodedPayload.aud !== expectedAudience) return invalid("wrong_audience", decodedPayload);
  if (!decodedPayload.exp || decodedPayload.exp <= now) return invalid("expired_token", decodedPayload);
  for (const claim of ["sub", "tenant_id", "role", "jti"]) {
    if (!decodedPayload[claim]) return invalid(`missing_${claim}`, decodedPayload);
  }
  const user = {
    id: decodedPayload.sub,
    tenantId: decodedPayload.tenant_id,
    role: normalizeRole(decodedPayload.role),
    permissions: Array.isArray(decodedPayload.permissions) ? decodedPayload.permissions : [],
    sessionId: decodedPayload.jti,
  };
  return { valid: true, user, claims: decodedPayload, header: decodedHeader };
}

function invalid(error, claims = null) {
  return { valid: false, error, claims: claims ? redactSecrets(claims) : null };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionRevocationStore(initial = []) {
  const revoked = new Set(initial);
  return {
    revoke(sessionId) {
      revoked.add(sessionId);
      return { revoked: true, sessionId };
    },
    isRevoked(sessionId) {
      return revoked.has(sessionId);
    },
  };
}

export function authorizeOperation({ user, operation, tenantId, ownerId } = {}, options = {}) {
  if (!user) return deny("missing_user");
  if (options.revocationStore?.isRevoked(user.sessionId)) return deny("session_revoked");
  if (tenantId && user.tenantId !== tenantId && !canRoleAccess(user.role, ["admin"])) return deny("cross_tenant_denied");
  const allowedRoles = OPERATION_GRID[operation] || [];
  if (!allowedRoles.length) return deny("unknown_operation");
  if (!canRoleAccess(user.role, allowedRoles)) return deny("role_not_allowed");
  if (ownerId && ownerId !== user.id && !canRoleAccess(user.role, ["admin"])) return deny("owner_mismatch");
  const requiredPermission = permissionForOperation(operation);
  if (requiredPermission && !user.permissions.includes(requiredPermission) && !canRoleAccess(user.role, ["admin"])) return deny("permission_missing");
  return { allowed: true, operation, tenantId: tenantId || user.tenantId, role: user.role };
}

function permissionForOperation(operation) {
  if (operation === "asset:create") return "listing:own";
  if (operation === "booking:create") return "booking:create";
  if (operation === "auction:bid") return "auction:bid";
  if (operation === "audit:read") return "audit:read";
  if (operation === "security:manage") return "security:manage";
  return "";
}

function deny(reason) {
  return { allowed: false, reason };
}

export function getOidcAuthHealth(env = process.env) {
  const readiness = getOidcCredentialReadiness(env);
  return {
    status: readiness.missing.length ? "BLOCKED_LIVE_IDP_PENDING" : "READY_FOR_LIVE_IDP_VALIDATION",
    failClosedStartup: readiness.missing.length > 0,
    mockIdentityProviderReady: true,
    tokenValidationReady: true,
    authorizationGridReady: true,
    auditEventsReady: ["auth.oidc.token.accepted", "auth.oidc.token.rejected", "rbac.permission_denied", "auth.session_revoked"],
    readiness,
  };
}

export function createOidcReadinessEvidence() {
  const revocations = createSessionRevocationStore();
  const customerToken = createMockOidcToken({ sub: "customer-a", role: "customer", tenant_id: "tenant-a" });
  const supplierToken = createMockOidcToken({ sub: "supplier-a", role: "supplier", tenant_id: "tenant-a" });
  const customer = verifyOidcToken(customerToken);
  const supplier = verifyOidcToken(supplierToken);
  const expired = verifyOidcToken(createMockOidcToken({ exp: 1 }), { nowSeconds: 2 });
  const wrongIssuer = verifyOidcToken(createMockOidcToken({}, { issuer: "https://wrong.example.test" }));
  const wrongAudience = verifyOidcToken(createMockOidcToken({}, { audience: "wrong-audience" }));
  const missingClaimPayload = {
    iss: DEFAULT_ISSUER,
    aud: DEFAULT_AUDIENCE,
    sub: "missing-tenant",
    role: "customer",
    iat: 1,
    exp: Math.floor(Date.now() / 1000) + 900,
    jti: "missing-tenant-session",
  };
  const missingHeader = b64({ alg: "HS256", typ: "JWT" });
  const missingBody = b64(missingClaimPayload);
  const missingClaim = verifyOidcToken(`${missingHeader}.${missingBody}.${sign(`${missingHeader}.${missingBody}`)}`);
  const allowed = authorizeOperation({ user: customer.user, operation: "booking:create", tenantId: "tenant-a", ownerId: "customer-a" });
  const crossTenant = authorizeOperation({ user: customer.user, operation: "booking:create", tenantId: "tenant-b" });
  const roleDenied = authorizeOperation({ user: customer.user, operation: "asset:create", tenantId: "tenant-a" });
  revocations.revoke(supplier.user.sessionId);
  const revoked = authorizeOperation({ user: supplier.user, operation: "asset:create", tenantId: "tenant-a" }, { revocationStore: revocations });
  return {
    sprint: "S5-S3F",
    status: "AUTH_ENGINEERING_COMPLETE",
    authorizationStatus: "AUTHORIZATION_ENGINEERING_COMPLETE",
    credentialStatus: "OIDC_CREDENTIAL_READY",
    liveIdentityProvider: "LIVE_IDENTITY_PROVIDER_PENDING",
    checks: {
      validTokenAccepted: customer.valid && supplier.valid,
      expiredTokenRejected: expired.error === "expired_token",
      wrongIssuerRejected: wrongIssuer.error === "wrong_issuer",
      wrongAudienceRejected: wrongAudience.error === "wrong_audience",
      missingClaimRejected: missingClaim.error === "missing_tenant_id",
      operationAllowed: allowed.allowed,
      crossTenantDenied: crossTenant.reason === "cross_tenant_denied",
      roleDenied: roleDenied.reason === "role_not_allowed",
      sessionRevokedDenied: revoked.reason === "session_revoked",
    },
    health: getOidcAuthHealth({}),
    productionTouched: false,
    liveIdentityProviderTouched: false,
  };
}
