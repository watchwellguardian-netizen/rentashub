import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  authorizeOperation,
  createMockOidcToken,
  createOidcReadinessEvidence,
  createSessionRevocationStore,
  getOidcAuthHealth,
  getOidcCredentialReadiness,
  verifyOidcToken,
} from "../../server/src/auth/oidcReadiness.js";

test("OIDC credential readiness fails closed without owner-supplied provider values", () => {
  const readiness = getOidcCredentialReadiness({});
  assert.equal(readiness.status, "OIDC_CREDENTIAL_READY_PENDING_OWNER_INPUT");
  assert.deepEqual(readiness.missing, ["OIDC_ISSUER_URL", "OIDC_CLIENT_ID", "OIDC_AUDIENCE", "OIDC_JWKS_URL"]);
  assert.equal(readiness.failClosed, true);
  assert.equal(readiness.liveIdentityProviderPending, true);
});

test("OIDC credential readiness redacts secret values", () => {
  const readiness = getOidcCredentialReadiness({
    OIDC_ISSUER_URL: "https://issuer.example.test",
    OIDC_CLIENT_ID: "rentashub",
    OIDC_AUDIENCE: "rentashub-api",
    OIDC_JWKS_URL: "https://issuer.example.test/.well-known/jwks.json",
    OIDC_CLIENT_SECRET: "super-secret",
  });
  assert.equal(readiness.status, "OIDC_CREDENTIALS_SHAPED");
  assert.doesNotMatch(JSON.stringify(readiness), /super-secret/);
  assert.match(JSON.stringify(readiness), /REDACTED/);
});

test("mock OIDC token validation accepts valid tokens and rejects negative security cases", () => {
  const valid = verifyOidcToken(createMockOidcToken({ sub: "customer-a", role: "customer", tenant_id: "tenant-a" }));
  assert.equal(valid.valid, true);
  assert.equal(valid.user.role, "customer");

  assert.equal(verifyOidcToken("").error, "missing_token");
  assert.equal(verifyOidcToken("bad.token").error, "invalid_token_shape");
  assert.equal(verifyOidcToken(createMockOidcToken({ exp: 1 }), { nowSeconds: 2 }).error, "expired_token");
  assert.equal(verifyOidcToken(createMockOidcToken({}, { issuer: "https://wrong.example.test" })).error, "wrong_issuer");
  assert.equal(verifyOidcToken(createMockOidcToken({}, { audience: "wrong-audience" })).error, "wrong_audience");
  const tampered = createMockOidcToken({ sub: "customer-a" }).replace(/.$/, "x");
  assert.equal(verifyOidcToken(tampered).error, "invalid_signature");
});

test("authorization grid enforces operation role permissions tenant isolation owner checks and revocation", () => {
  const customer = verifyOidcToken(createMockOidcToken({ sub: "customer-a", role: "customer", tenant_id: "tenant-a" })).user;
  const supplier = verifyOidcToken(createMockOidcToken({ sub: "supplier-a", role: "supplier", tenant_id: "tenant-a" })).user;
  assert.equal(authorizeOperation({ user: customer, operation: "booking:create", tenantId: "tenant-a", ownerId: "customer-a" }).allowed, true);
  assert.equal(authorizeOperation({ user: customer, operation: "asset:create", tenantId: "tenant-a" }).reason, "role_not_allowed");
  assert.equal(authorizeOperation({ user: customer, operation: "booking:create", tenantId: "tenant-b" }).reason, "cross_tenant_denied");
  assert.equal(authorizeOperation({ user: customer, operation: "booking:create", tenantId: "tenant-a", ownerId: "other" }).reason, "owner_mismatch");
  assert.equal(authorizeOperation({ user: supplier, operation: "asset:create", tenantId: "tenant-a", ownerId: "supplier-a" }).allowed, true);
  const revocations = createSessionRevocationStore([supplier.sessionId]);
  assert.equal(authorizeOperation({ user: supplier, operation: "asset:create", tenantId: "tenant-a" }, { revocationStore: revocations }).reason, "session_revoked");
});

test("OIDC health diagnostics and evidence remain live-provider pending", () => {
  const health = getOidcAuthHealth({});
  assert.equal(health.status, "BLOCKED_LIVE_IDP_PENDING");
  assert.equal(health.failClosedStartup, true);
  assert.equal(health.mockIdentityProviderReady, true);
  assert.ok(health.auditEventsReady.includes("auth.session_revoked"));

  const evidence = createOidcReadinessEvidence();
  assert.equal(evidence.status, "AUTH_ENGINEERING_COMPLETE");
  assert.equal(evidence.authorizationStatus, "AUTHORIZATION_ENGINEERING_COMPLETE");
  assert.equal(evidence.credentialStatus, "OIDC_CREDENTIAL_READY");
  assert.equal(evidence.liveIdentityProvider, "LIVE_IDENTITY_PROVIDER_PENDING");
  assert.equal(evidence.productionTouched, false);
  assert.equal(evidence.liveIdentityProviderTouched, false);
  assert.equal(Object.values(evidence.checks).every(Boolean), true);
});

test("S5-S3F workflow prepares focused auth validation without live provider secrets", () => {
  const workflow = readFileSync(".github/workflows/auth-authorization-runtime-validation.yml", "utf8");
  for (const required of [
    "node --test tests/production/s5-s3f-auth-authorization-readiness.test.mjs",
    "node scripts/s5-s3f-auth-authorization-readiness.mjs json",
    "OIDC_PROVIDER_MODE: mock",
    "LIVE_IDENTITY_PROVIDER_PENDING",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(workflow, /OIDC_PROVIDER_MODE}" != "mock"/);
  assert.doesNotMatch(workflow, /OIDC_CLIENT_SECRET|SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|https?:\/\/[^:\s]+:[^@\s]+@/i);
});

test("S5-S3F source includes fail-closed validation and no live IdP activation commands", () => {
  const source = readFileSync("server/src/auth/oidcReadiness.js", "utf8");
  for (const required of ["wrong_issuer", "wrong_audience", "expired_token", "missing_tenant_id", "session_revoked", "cross_tenant_denied", "permission_missing"]) {
    assert.match(source, new RegExp(required));
  }
  assert.doesNotMatch(source, /fetch\(|jwks-rsa|openid-client|supabase\s+link|OIDC_CLIENT_SECRET\s*=/i);
});
