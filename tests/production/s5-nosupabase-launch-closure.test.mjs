import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import {
  buildNonSupabaseLaunchClosureReport,
  NON_SUPABASE_CLOSURE_ITEMS,
  renderNonSupabaseLaunchClosureReport,
  writeNonSupabaseLaunchClosureArtifacts,
} from "../../scripts/s5-nosupabase-launch-closure.mjs";

const secretPatterns = [
  /DATABASE_URL\s*=/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /postgresql:\/\/[^:\s]+:[^@\s]+@/i,
  /sk_live_/i,
  /whsec_/i,
  /JWT_SECRET\s*=/i,
  /ESCROW_API_KEY\s*=/i,
  /PAYMENT_SECRET_KEY\s*=/i,
];

function assertNoSecrets(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  for (const pattern of secretPatterns) assert.doesNotMatch(text, pattern);
}

test("non-Supabase closure register covers every remaining non-Supabase launch blocker", () => {
  const ids = NON_SUPABASE_CLOSURE_ITEMS.map((item) => item.id);
  for (const required of [
    "production-auth",
    "production-storage",
    "payments",
    "escrow",
    "dns-tls-hosting",
    "monitoring-secrets",
    "legal-compliance-security",
    "uat-signoff",
  ]) {
    assert.ok(ids.includes(required), `${required} should be covered`);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("non-Supabase closure report reaches credential readiness without production claims", () => {
  const report = buildNonSupabaseLaunchClosureReport({ generatedAt: "2026-08-03T00:00:00.000Z" });
  assert.equal(report.status, "NON_SUPABASE_CREDENTIAL_READINESS_COMPLETE");
  assert.equal(report.productionReady, false);
  assert.equal(report.liveProviderActivation, false);
  assert.equal(report.supabaseDeferred, true);
  assert.equal(report.safety.connectsToSupabase, false);
  assert.equal(report.safety.readsSecretValues, false);
  assert.equal(report.scores.engineeringControlledCompletion, 100);
  assert.equal(report.scores.credentialReadiness, 100);
  assert.equal(report.scores.externalCompletion, 0);
  assertNoSecrets(report);
});

test("non-Supabase closure markdown renders owner actions and manual evidence requirements", () => {
  const rendered = renderNonSupabaseLaunchClosureReport(buildNonSupabaseLaunchClosureReport({ generatedAt: "2026-08-03T00:00:00.000Z" }));
  assert.match(rendered, /Non-Supabase Launch-Blocker Closure/);
  assert.match(rendered, /Real production auth not certified/);
  assert.match(rendered, /Payment provider not activated or certified/);
  assert.match(rendered, /Legal, compliance, security certification/);
  assert.match(rendered, /UAT and operational signoff/);
  assert.match(rendered, /Production Ready: NO/);
  assertNoSecrets(rendered);
});

test("non-Supabase closure artifact generation writes markdown and JSON evidence", () => {
  const markdownPath = "docs/launch-readiness/non-supabase-launch-closure.md";
  const jsonPath = "artifacts/runtime-evidence/non-supabase-launch-closure.json";
  rmSync(markdownPath, { force: true });
  rmSync(jsonPath, { force: true });
  const paths = writeNonSupabaseLaunchClosureArtifacts(buildNonSupabaseLaunchClosureReport({ generatedAt: "2026-08-03T00:00:00.000Z" }));
  assert.ok(existsSync(paths.markdownPath));
  assert.ok(existsSync(paths.jsonPath));
  assert.match(readFileSync(paths.markdownPath, "utf8"), /NON_SUPABASE_CREDENTIAL_READINESS_COMPLETE/);
  const parsed = JSON.parse(readFileSync(paths.jsonPath, "utf8"));
  assert.equal(parsed.status, "NON_SUPABASE_CREDENTIAL_READINESS_COMPLETE");
  assertNoSecrets(readFileSync(paths.markdownPath, "utf8"));
  assertNoSecrets(parsed);
});

test("non-Supabase closure package scripts are wired", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts["launch:nosupabase-closure"], "node scripts/s5-nosupabase-launch-closure.mjs report");
  assert.equal(pkg.scripts["launch:nosupabase-closure:json"], "node scripts/s5-nosupabase-launch-closure.mjs json");
  assert.equal(pkg.scripts["launch:nosupabase-closure:generate"], "node scripts/s5-nosupabase-launch-closure.mjs generate");
  const output = execFileSync(process.execPath, ["scripts/s5-nosupabase-launch-closure.mjs", "json"], { encoding: "utf8" });
  assert.equal(JSON.parse(output).status, "NON_SUPABASE_CREDENTIAL_READINESS_COMPLETE");
});
