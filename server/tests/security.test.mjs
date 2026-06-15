import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { getIntegrationReadiness } from "../src/config/integrationReadiness.js";
import { createApp } from "../src/main/app.js";
import { resetRateLimitersForTests } from "../src/middleware/rateLimiter.js";

async function createTestApp(options = {}) {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  return { database, app: createApp({ database, ...options }) };
}

async function withServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function requestJson(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json() };
}

test("security headers, request IDs, and CORS allowlist are controlled", async () => {
  const previous = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = "https://app.rentashub.test";
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/api/health`, { headers: { origin: "https://app.rentashub.test", "x-request-id": "req-test-1" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://app.rentashub.test");
    assert.equal(allowed.headers.get("x-request-id"), "req-test-1");
    assert.equal(allowed.headers.get("x-content-type-options"), "nosniff");
    assert.equal(allowed.headers.get("x-frame-options"), "DENY");
    assert.match(allowed.headers.get("content-security-policy"), /default-src 'self'/);

    const blocked = await fetch(`${baseUrl}/api/health`, { headers: { origin: "https://evil.example" } });
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  });
  if (previous === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
  else process.env.CORS_ALLOWED_ORIGINS = previous;
});

test("rate limiter blocks excessive auth attempts in development mode", async () => {
  resetRateLimitersForTests();
  const { app } = await createTestApp({ rateLimits: { auth: { max: 1, windowMs: 60_000 } } });
  await withServer(app.handler, async (baseUrl) => {
    const body = { email: "missing@example.com", password: "WrongPassword1!" };
    const first = await requestJson(baseUrl, "/api/auth/login", { method: "POST", body });
    assert.notEqual(first.response.status, 429);
    const second = await requestJson(baseUrl, "/api/auth/login", { method: "POST", body });
    assert.equal(second.response.status, 429);
    assert.equal(second.body.error, "rate_limited");
  });
  resetRateLimitersForTests();
});

test("invalid JSON and oversized bodies return controlled responses", async () => {
  const { app } = await createTestApp({ maxBodyBytes: 20 });
  await withServer(app.handler, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad json",
    });
    const invalidBody = await invalid.json();
    assert.equal(invalid.status, 400);
    assert.equal(invalidBody.error, "invalid_json");

    const tooLarge = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "long@example.com", password: "x".repeat(100) }),
    });
    const tooLargeBody = await tooLarge.json();
    assert.equal(tooLarge.status, 413);
    assert.equal(tooLargeBody.error, "request_too_large");
  });
});

test("production-mode errors do not leak stack traces", async () => {
  const previous = process.env.NODE_ENV;
  const previousDevHeaderLock = process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION;
  process.env.NODE_ENV = "production";
  process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION = "false";
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/upload-intent", {
      method: "POST",
      headers: { "x-user-role": "supplier", "x-user-id": "supplier-demo" },
      body: {
        relatedEntityType: "asset",
        relatedEntityId: "asset-demo",
        originalFileName: "photo.jpg",
        mimeType: "image/jpeg",
        fileSize: 1000,
        visibility: "public",
        storageProvider: "s3",
      },
    });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error, "storage_provider_not_configured");
    assert.equal("stack" in result.body, false);
    assert.equal("debugCode" in result.body, false);
  });
  if (previous === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous;
  if (previousDevHeaderLock === undefined) delete process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION;
  else process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION = previousDevHeaderLock;
});

test("placeholder secrets are reported as missing or not production-ready", () => {
  const readiness = getIntegrationReadiness({
    AUTH_TOKEN_SECRET: "change-this-development-secret-before-real-use",
    SESSION_SECRET: "placeholder",
    PAYMENT_SECRET_KEY: "placeholder",
    ESCROW_API_KEY: "",
    FILE_STORAGE_SECRET_KEY: "",
    DATABASE_URL: "",
    CORS_ALLOWED_ORIGINS: "",
  });
  for (const key of ["AUTH_TOKEN_SECRET", "SESSION_SECRET", "PAYMENT_SECRET_KEY", "ESCROW_API_KEY", "FILE_STORAGE_SECRET_KEY", "DATABASE_URL", "CORS_ALLOWED_ORIGINS"]) {
    assert.ok(readiness.checks.security.missing.includes(key), `${key} should be missing`);
  }
});

test("protected mutation creates audit log", async () => {
  const { app, database } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      headers: { "x-user-role": "supplier", "x-user-id": "supplier-demo" },
      body: {
        owner_id: "supplier-demo",
        title: "Security audit asset",
        category: "cars",
        listing_type: "rental",
        availability_status: "available",
      },
    });
    assert.equal(created.response.status, 201);
    assert.ok(database.table("audit_logs").some((entry) => entry.action === "assets.created"));
  });
});
