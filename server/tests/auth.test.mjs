import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { createApp } from "../src/main/app.js";

const tokenOptions = { secret: "module-24-test-secret", ttlSeconds: 60 };

async function createTestApp(options = {}) {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  return { database, app: createApp({ database, tokenOptions: { ...tokenOptions, ...(options.tokenOptions || {}) } }) };
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

async function requestJson(baseUrl, path, { method = "GET", body, token, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json() };
}

const validUser = {
  name: "Module Supplier",
  email: "module-supplier@example.test",
  password: "StrongPass!24",
  role: "vendor",
};

test("register creates user with hashed password and token", async () => {
  const { app, database } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.user.email, validUser.email);
    assert.equal(result.body.user.role, "supplier");
    assert.ok(result.body.token);

    const stored = database.table("users")[0];
    assert.equal(stored.password, undefined);
    assert.notEqual(stored.password_hash, validUser.password);
    assert.ok(stored.password_salt);
  });
});

test("register rejects duplicate email and weak password", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const weak = await requestJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: { name: "Weak", email: "weak@example.test", password: "weak", role: "customer" },
    });
    assert.equal(weak.response.status, 400);
    assert.equal(weak.body.error, "validation_error");

    await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    const duplicate = await requestJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: { ...validUser, name: "Duplicate" },
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.body.error, "duplicate_email");
  });
});

test("login accepts valid password and rejects wrong password", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    const good = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: validUser.email, password: validUser.password },
    });
    assert.equal(good.response.status, 200);
    assert.ok(good.body.token);

    const bad = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { email: validUser.email, password: "WrongPass!24" },
    });
    assert.equal(bad.response.status, 401);
    assert.equal(bad.body.error, "invalid_credentials");
  });
});

test("/api/auth/me works with valid token and rejects invalid token", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const registered = await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    const me = await requestJson(baseUrl, "/api/auth/me", { token: registered.body.token });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.user.email, validUser.email);

    const invalid = await requestJson(baseUrl, "/api/auth/me", { token: "not-a-valid-token" });
    assert.equal(invalid.response.status, 401);
  });
});

test("expired token is rejected", async () => {
  const { app } = await createTestApp({ tokenOptions: { ttlSeconds: -1 } });
  await withServer(app.handler, async (baseUrl) => {
    const registered = await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    const me = await requestJson(baseUrl, "/api/auth/me", { token: registered.body.token });
    assert.equal(me.response.status, 401);
    assert.equal(me.body.error, "expired_token");
  });
});

test("logout invalidates session", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const registered = await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    const logout = await requestJson(baseUrl, "/api/auth/logout", { method: "POST", token: registered.body.token });
    assert.equal(logout.response.status, 200);
    assert.equal(logout.body.loggedOut, true);

    const me = await requestJson(baseUrl, "/api/auth/me", { token: registered.body.token });
    assert.equal(me.response.status, 401);
    assert.equal(me.body.error, "inactive_session");
  });
});

test("protected write route accepts valid token and rejects no token", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const registered = await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
    const noToken = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      body: { owner_id: registered.body.user.id, title: "Auth asset", category: "cars", listing_type: "rental" },
    });
    assert.equal(noToken.response.status, 401);

    const withToken = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      token: registered.body.token,
      body: { owner_id: registered.body.user.id, title: "Auth asset", category: "cars", listing_type: "rental" },
    });
    assert.equal(withToken.response.status, 201);
    assert.equal(withToken.body.data.title, "Auth asset");
  });
});

test("protected write route rejects invalid bearer token and wrong bearer role", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const invalid = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      token: "not-a-valid-token",
      body: { owner_id: "customer-demo", title: "Invalid token asset", category: "cars", listing_type: "rental" },
    });
    assert.equal(invalid.response.status, 401);

    const registered = await requestJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: { name: "Module Customer", email: "module-customer@example.test", password: "StrongPass!24", role: "customer" },
    });
    const wrongRole = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      token: registered.body.token,
      body: { owner_id: registered.body.user.id, title: "Customer asset", category: "cars", listing_type: "rental" },
    });
    assert.equal(wrongRole.response.status, 403);
    assert.equal(wrongRole.body.error, "forbidden");
  });
});

test("production dev-header lockdown requires bearer token for protected writes", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLock = process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION;
  process.env.NODE_ENV = "production";
  process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION = "true";
  try {
    const { app } = await createTestApp();
    await withServer(app.handler, async (baseUrl) => {
      const devHeaderAttempt = await requestJson(baseUrl, "/api/assets", {
        method: "POST",
        headers: { "x-user-role": "supplier", "x-user-id": "supplier-demo" },
        body: { owner_id: "supplier-demo", title: "Header asset", category: "cars", listing_type: "rental" },
      });
      assert.equal(devHeaderAttempt.response.status, 401);

      const registered = await requestJson(baseUrl, "/api/auth/register", { method: "POST", body: validUser });
      const bearerAttempt = await requestJson(baseUrl, "/api/assets", {
        method: "POST",
        token: registered.body.token,
        body: { owner_id: registered.body.user.id, title: "Bearer asset", category: "cars", listing_type: "rental" },
      });
      assert.equal(bearerAttempt.response.status, 201);
    });
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION = previousLock;
  }
});
