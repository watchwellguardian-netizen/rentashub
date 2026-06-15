import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  AUDIT_EVENT_CATEGORIES,
  AUDIT_RETENTION_POLICIES,
  classifyAuditAction,
  createAuditRecord,
  exportAuditRecords,
  getAuditActivationReadiness,
  redactAuditMetadata,
} from "../../server/src/audit/auditEventModel.js";

const root = process.cwd();

test("Project B2 audit logging activation artifacts exist", () => {
  for (const file of [
    "docs/project-b-audit-logging-activation.md",
    "server/src/audit/auditEventModel.js",
    "server/src/controllers/auditController.js",
    "server/src/routes/auditRoutes.js",
    "server/migrations/007_audit_logging_activation.sql",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("audit activation doc covers required enterprise audit areas", () => {
  const doc = readFileSync(join(root, "docs/project-b-audit-logging-activation.md"), "utf8");
  for (const text of [
    "Enterprise Audit Event Model",
    "Immutable-Style Audit Records",
    "Auth",
    "RBAC",
    "Listings/Auctions/Admin",
    "Inspection/Transport/Financing",
    "Notification/Document/AI",
    "Audit Search",
    "Retention Policy",
    "Provider-ready only",
  ]) {
    assert.match(doc, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.doesNotMatch(doc, /production ready/i);
});

test("audit event categories cover core RentasHub domains", () => {
  for (const category of ["auth", "rbac", "marketplace", "operations", "communications", "trustSafety", "payments", "storage", "intelligence"]) {
    assert.ok(Array.isArray(AUDIT_EVENT_CATEGORIES[category]), `${category} should be defined`);
  }
  assert.equal(classifyAuditAction("auth.login_failed"), "auth");
  assert.equal(classifyAuditAction("rbac.permission_denied"), "rbac");
  assert.equal(classifyAuditAction("auctions.created"), "marketplace");
  assert.equal(classifyAuditAction("inspections.created"), "operations");
  assert.equal(classifyAuditAction("notifications.created"), "communications");
  assert.equal(classifyAuditAction("claims.created"), "trustSafety");
  assert.equal(classifyAuditAction("payments.simulated"), "payments");
  assert.equal(classifyAuditAction("files.upload_intent.created"), "storage");
  assert.equal(classifyAuditAction("ai.valuation.recommendation_recorded"), "intelligence");
});

test("audit records are immutable-style and redact secret metadata", () => {
  const record = createAuditRecord("payments.simulated", "payment", {
    actor_id: "admin-demo",
    actor_role: "admin",
    entity_id: "payment-demo",
    request_id: "req-audit",
    PAYMENT_SECRET_KEY: "sk_live_should_not_appear",
    nested: { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_value" },
  });
  assert.equal(record.category, "payments");
  assert.equal(record.severity, "high");
  assert.equal(record.immutable_style, true);
  assert.ok(record.immutable_hash);
  assert.equal(record.request_id, "req-audit");
  assert.doesNotMatch(record.metadata_json, /sk_live_should_not_appear|sb_secret_value/);
  assert.match(record.metadata_json, /\[REDACTED\]/);
});

test("audit readiness reports retention export and SIEM placeholders", () => {
  const readiness = getAuditActivationReadiness({});
  assert.equal(readiness.liveSiemActive, false);
  assert.equal(readiness.searchReady, true);
  assert.equal(readiness.exportReady, true);
  assert.ok(readiness.missing.includes("AUDIT_RETENTION_POLICY_URL"));
  assert.ok(readiness.missing.includes("AUDIT_EXPORT_OWNER_EMAIL"));
  assert.ok(readiness.missing.includes("SIEM_PROVIDER"));
  assert.equal(AUDIT_RETENTION_POLICIES.payments.retentionDays, 2555);
});

test("audit export remains local placeholder and migration prepares search fields", () => {
  const record = createAuditRecord("claims.created", "claim", { actor_id: "admin-demo", entity_id: "claim-demo" });
  const exported = exportAuditRecords([record], { format: "csv_placeholder" });
  assert.equal(exported.liveExternalExport, false);
  assert.match(exported.body, /claims.created/);
  const migration = readFileSync(join(root, "server/migrations/007_audit_logging_activation.sql"), "utf8");
  for (const text of [
    "event_id",
    "category",
    "severity",
    "actor_role",
    "request_id",
    "previous_hash",
    "immutable_hash",
    "audit_event_catalog",
    "audit_retention_policies",
    "ENABLE ROW LEVEL SECURITY",
  ]) {
    assert.match(migration, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("audit redaction protects nested secret-shaped values", () => {
  const redacted = redactAuditMetadata({
    authorization: "Bearer abc123",
    nested: { DATABASE_URL: "postgresql://user:pass@host/db" },
    safe: "visible",
  });
  assert.equal(redacted.authorization, "[REDACTED]");
  assert.equal(redacted.nested.DATABASE_URL, "[REDACTED]");
  assert.equal(redacted.safe, "visible");
});
