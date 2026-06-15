import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { createRepositories } from "../src/repositories/index.js";
import { createApp } from "../src/main/app.js";
import { classifyAuditAction, createAuditRecord, getAuditActivationReadiness } from "../src/audit/auditEventModel.js";

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

const adminHeaders = { "x-user-role": "admin", "x-user-id": "admin-demo" };
const customerHeaders = { "x-user-role": "customer", "x-user-id": "customer-demo" };

test("audit repository writes immutable-style records with hash chain", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const repos = createRepositories(database);
  const first = await repos.audit_logs.record("auth.login_failed", "auth_session", {
    actor_id: "user-demo",
    entity_id: "session-demo",
    request_id: "req-1",
    authorization: "Bearer should-not-persist",
  });
  const second = await repos.audit_logs.record("payments.simulated", "payment", {
    actor_id: "customer-demo",
    entity_id: "payment-demo",
    request_id: "req-2",
  });
  assert.equal(first.category, "auth");
  assert.equal(first.severity, "high");
  assert.ok(first.immutable_hash);
  assert.equal(second.previous_hash, first.immutable_hash);
  assert.doesNotMatch(first.metadata_json, /should-not-persist/);
});

test("audit search and export helpers filter by category", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const repos = createRepositories(database);
  await repos.audit_logs.record("claims.created", "claim", { actor_id: "admin-demo", entity_id: "claim-demo" });
  await repos.audit_logs.record("assets.created", "asset", { actor_id: "supplier-demo", entity_id: "asset-demo" });
  const trustSafety = await repos.audit_logs.search({ category: "trustSafety" });
  assert.equal(trustSafety.length, 1);
  assert.equal(trustSafety[0].action, "claims.created");
  const exported = await repos.audit_logs.export({ category: "trustSafety" }, { format: "json" });
  assert.equal(exported.liveExternalExport, false);
  assert.match(exported.body, /claims.created/);
});

test("audit API readiness search and export are admin protected", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const app = createApp({ database });
  await withServer(app.handler, async (baseUrl) => {
    const unauthorized = await requestJson(baseUrl, "/api/audit/readiness", { headers: customerHeaders });
    assert.equal(unauthorized.response.status, 403);

    const readiness = await requestJson(baseUrl, "/api/audit/readiness", { headers: adminHeaders });
    assert.equal(readiness.response.status, 200);
    assert.equal(readiness.body.audit.liveSiemActive, false);
    assert.equal(readiness.body.audit.searchReady, true);

    const created = await requestJson(baseUrl, "/api/assets", {
      method: "POST",
      headers: { "x-user-role": "supplier", "x-user-id": "supplier-demo" },
      body: {
        owner_id: "supplier-demo",
        title: "Audit API asset",
        category: "cars",
        listing_type: "rental",
        availability_status: "available",
      },
    });
    assert.equal(created.response.status, 201);

    const events = await requestJson(baseUrl, "/api/audit/events?category=marketplace", { headers: adminHeaders });
    assert.equal(events.response.status, 200);
    assert.ok(events.body.count >= 1);
    assert.equal(events.body.externalSiemActive, false);

    const exported = await requestJson(baseUrl, "/api/audit/export?category=marketplace&format=csv_placeholder", { headers: adminHeaders });
    assert.equal(exported.response.status, 200);
    assert.equal(exported.body.liveExternalExport, false);
    assert.match(exported.body.body, /assets.created/);
  });
});

test("audit activation readiness reports missing live SIEM and retention inputs", () => {
  const readiness = getAuditActivationReadiness({});
  assert.equal(readiness.status, "provider_ready_only");
  assert.ok(readiness.missing.includes("SIEM_PROVIDER"));
  assert.ok(readiness.missing.includes("AUDIT_RETENTION_POLICY_URL"));
  assert.ok(readiness.categories.includes("payments"));
  assert.equal(classifyAuditAction("ai.listing.recommendation_recorded"), "intelligence");
});

test("audit record factory classifies action and marks export placeholder", () => {
  const record = createAuditRecord("rbac.permission_denied", "route", { actor_id: "customer-demo", entity_id: "/api/admin" });
  assert.equal(record.category, "rbac");
  assert.equal(record.severity, "high");
  assert.equal(record.export_status, "export_ready_placeholder");
  assert.equal(record.immutable_style, true);
});
