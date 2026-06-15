import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { app } from "../src/main/app.js";
import { createRouter } from "../src/main/router.js";
import { errorHandler, notFound } from "../src/middleware/errorHandler.js";
import { API_GROUPS } from "../src/routes/contractRoutes.js";

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

async function getJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { response, body: await response.json() };
}

test("backend health route responds with implemented health payload", async () => {
  await withServer(app.handler, async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, "/api/health");
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "rentashub-api");
    assert.equal(body.module, "backend-scaffold");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");

    const readiness = await getJson(baseUrl, "/api/health/readiness");
    assert.equal(readiness.response.status, 200);
    assert.equal(readiness.body.module, "credential-readiness");
    assert.equal(readiness.body.readiness.stage, "credential_level_readiness");
    assert.equal(readiness.body.readiness.checks.monitoring.provider, "none");

    const database = await getJson(baseUrl, "/api/health/database");
    assert.equal(database.response.status, 200);
    assert.equal(database.body.module, "database-readiness");
    assert.equal(database.body.database.activeProvider, "json");

    const observability = await getJson(baseUrl, "/api/health/observability");
    assert.equal(observability.response.status, 200);
    assert.equal(observability.body.module, "observability-readiness");
    assert.equal(observability.body.monitoring.provider, "none");
    assert.ok(observability.body.requestId);
  });
});

test("all required API route groups are registered", async () => {
  const registered = app.routes().map((route) => route.path);
  assert.ok(registered.includes("/api/health"));
  assert.ok(registered.includes("/api/health/database"));
  assert.ok(registered.includes("/api/health/observability"));
  assert.ok(registered.includes("/api/monitoring/test-event"));
  for (const group of API_GROUPS) {
    if (group === "auth") {
      assert.ok(registered.includes("/api/auth/login"), "auth login route should be registered");
      assert.ok(registered.includes("/api/auth/register"), "auth register route should be registered");
      continue;
    }
    assert.ok(registered.includes(`/api/${group}`), `${group} route should be registered`);
  }
  await withServer(app.handler, async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, "/api/assets");
    assert.equal(response.status, 200);
    assert.equal(body.resource, "assets");
    assert.ok(Array.isArray(body.data));
  });
});

test("unknown route returns controlled 404", async () => {
  await withServer(app.handler, async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, "/api/not-a-route");
    assert.equal(response.status, 404);
    assert.equal(body.error, "not_found");
    assert.match(body.message, /not found/i);
  });
});

test("error handler returns controlled error response", async () => {
  const router = createRouter({ errorHandler, notFound });
  router.get("/api/boom", () => {
    throw new Error("internal stack detail");
  });
  await withServer(router.handler, async (baseUrl) => {
    const { response, body } = await getJson(baseUrl, "/api/boom");
    assert.equal(response.status, 500);
    assert.equal(body.error, "server_error");
    assert.equal(body.message, "A controlled server error occurred.");
  });
});

test("RBAC middleware skeleton blocks unauthorized protected route", async () => {
  await withServer(app.handler, async (baseUrl) => {
    const unauthorized = await getJson(baseUrl, "/api/admin");
    assert.equal(unauthorized.response.status, 401);
    assert.equal(unauthorized.body.error, "unauthorized");

    const forbidden = await getJson(baseUrl, "/api/admin", { headers: { "x-user-role": "customer", "x-user-id": "review-customer" } });
    assert.equal(forbidden.response.status, 403);
    assert.equal(forbidden.body.error, "forbidden");

    const allowed = await getJson(baseUrl, "/api/admin", { headers: { "x-user-role": "admin", "x-user-id": "review-admin" } });
    assert.equal(allowed.response.status, 200);
    assert.equal(allowed.body.group, "admin");
  });
});
