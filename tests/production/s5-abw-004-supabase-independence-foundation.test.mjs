import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertProviderModeReady,
  buildSupabaseReplacementReadiness,
  SUPABASE_REPLACEMENT_COMPONENTS,
} from "../../server/src/platform/supabaseReplacementArchitecture.js";
import { writeSupabaseIndependenceArtifacts } from "../../scripts/s5-abw-004-supabase-independence-foundation.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");

const REQUIRED_COMPONENTS = [
  "database",
  "authorization",
  "authentication",
  "object-storage",
  "realtime-events",
  "edge-functions",
  "observability",
];

test("S5-ABW-004 defines a full Supabase replacement component map", () => {
  const ids = SUPABASE_REPLACEMENT_COMPONENTS.map((component) => component.id);
  for (const id of REQUIRED_COMPONENTS) assert.ok(ids.includes(id), `${id} should be present`);
  for (const component of SUPABASE_REPLACEMENT_COMPONENTS) {
    assert.ok(component.replaces.length > 0);
    assert.ok(component.requiredTechnologies.length > 0);
    assert.ok(component.credentialEnvNames.length > 0);
    assert.ok(component.validationCommands.length > 0);
    assert.ok(component.failClosedRule);
    assert.ok(component.manualIntervention);
  }
});

test("S5-ABW-004 defaults to local/provider-neutral modes without requiring Supabase", () => {
  const report = buildSupabaseReplacementReadiness({});
  assert.equal(report.status, "SUPABASE_REPLACEMENT_FOUNDATION_READY");
  assert.equal(report.liveSupabaseRequired, false);
  assert.equal(report.productionReady, false);
  assert.equal(report.liveProviderActivation, false);
  assert.equal(report.componentsTotal, REQUIRED_COMPONENTS.length);
  assert.equal(report.blockedCredentials, 0);
  assert.ok(report.localReady >= 6);
});

test("S5-ABW-004 fails closed when production providers are selected without credentials", () => {
  const report = buildSupabaseReplacementReadiness({
    DATABASE_PROVIDER: "postgres",
    AUTH_PROVIDER: "oidc",
    FILE_STORAGE_PROVIDER: "s3",
    EVENT_BUS_PROVIDER: "redis_streams_or_websocket_gateway",
    BACKGROUND_WORKER_PROVIDER: "bullmq",
    MONITORING_PROVIDER: "sentry_better_stack",
  });
  assert.ok(report.blockedCredentials >= 5);
  const database = report.components.find((component) => component.id === "database");
  assert.equal(database.status, "BLOCKED_CREDENTIALS");
  assert.ok(database.missingCredentials.includes("DATABASE_URL"));
  assert.throws(() => assertProviderModeReady("database", { DATABASE_PROVIDER: "postgres" }), /DATABASE_URL/);
});

test("S5-ABW-004 marks production-like modes credential-ready only by variable presence, not production certification", () => {
  const report = buildSupabaseReplacementReadiness({
    DATABASE_PROVIDER: "postgres",
    DATABASE_URL: "postgresql://user:password@localhost:5432/rentashub_test",
    DATABASE_SSL_MODE: "require",
    MIGRATION_TARGET_ENV: "uat",
  });
  const database = report.components.find((component) => component.id === "database");
  assert.equal(database.status, "CREDENTIAL_READY");
  assert.equal(database.productionReady, false);
  assert.equal(report.productionReady, false);
});

test("S5-ABW-004 generated artifacts are credential-name-only and audit-ready", () => {
  const report = writeSupabaseIndependenceArtifacts({ env: {} });
  const files = [
    "supabase-independence-readiness.json",
    "supabase-independence-architecture.md",
    "provider-neutral-credential-contract.md",
  ];
  for (const file of files) {
    const path = join(OUT_DIR, file);
    assert.equal(existsSync(path), true, `${file} should exist`);
    const text = readFileSync(path, "utf8");
    assert.match(text, /PostgreSQL|OIDC|S3|Supabase/i);
    assert.doesNotMatch(text, /postgresql:\/\/[^:\s]+:[^@\s]+@/i);
    assert.doesNotMatch(text, /sb_secret_/i);
    assert.doesNotMatch(text, /sk_live_/i);
  }
  assert.equal(report.productionReady, false);
});
