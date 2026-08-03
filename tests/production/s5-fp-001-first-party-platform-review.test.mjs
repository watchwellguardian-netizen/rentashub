import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { test } from "node:test";

import {
  buildFirstPartyPlatformFoundationReview,
  FIRST_PARTY_FOUNDATION_AREAS,
  renderFirstPartyPlatformFoundationReview,
  writeFirstPartyPlatformFoundationReviewArtifacts,
} from "../../scripts/s5-fp-001-first-party-platform-review.mjs";

const secretPatterns = [
  /postgresql:\/\/[^:\s]+:[^@\s]+@/i,
  /sb_secret_/i,
  /sk_live_/i,
  /whsec_/i,
  /JWT_SECRET\s*=/i,
  /PAYMENT_SECRET_KEY\s*=/i,
];

function assertNoSecrets(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  for (const pattern of secretPatterns) assert.doesNotMatch(text, pattern);
}

test("S5-FP-001 reviews the first-party platform foundation areas", () => {
  const ids = FIRST_PARTY_FOUNDATION_AREAS.map((area) => area.id);
  for (const required of [
    "database",
    "authorization",
    "authentication",
    "object-storage",
    "queues-workers",
    "browser-accessibility",
    "observability-operations",
    "payments-escrow",
  ]) assert.ok(ids.includes(required), `${required} should be reviewed`);
  assert.equal(new Set(ids).size, ids.length);
});

test("S5-FP-001 reaches foundation review completion without production claims", () => {
  const report = buildFirstPartyPlatformFoundationReview({ generatedAt: "2026-08-03T00:00:00.000Z", env: {} });
  assert.equal(report.status, "FIRST_PARTY_PLATFORM_FOUNDATION_REVIEW_COMPLETE");
  assert.equal(report.productionReady, false);
  assert.equal(report.paidPilotReady, false);
  assert.equal(report.publicLaunchReady, false);
  assert.equal(report.a4Status, "A4-01_OPEN");
  assert.equal(report.supabaseDeferred, true);
  assert.equal(report.liveSupabaseRequiredForEngineering, false);
  assert.equal(report.liveProviderActivation, false);
  assert.equal(report.firstPartyAreasTotal, 8);
  assert.equal(report.firstPartyAreasCredentialReady, 8);
  assert.ok(report.firstPartyAreasWithRuntimeEvidence >= 6);
  assertNoSecrets(report);
});

test("S5-FP-001 markdown renders runtime evidence and manual blockers", () => {
  const markdown = renderFirstPartyPlatformFoundationReview(
    buildFirstPartyPlatformFoundationReview({ generatedAt: "2026-08-03T00:00:00.000Z", env: {} }),
  );
  assert.match(markdown, /First-Party Platform Foundation Review/);
  assert.match(markdown, /PostgreSQL Runtime Validation #2/);
  assert.match(markdown, /Auth Authorization Runtime Validation #2/);
  assert.match(markdown, /No production-readiness certification is claimed/);
  assertNoSecrets(markdown);
});

test("S5-FP-001 artifact generation writes markdown and JSON", () => {
  const markdownPath = "docs/launch-readiness/first-party-platform-foundation-review.md";
  const jsonPath = "artifacts/runtime-evidence/first-party-platform-foundation-review.json";
  rmSync(markdownPath, { force: true });
  rmSync(jsonPath, { force: true });
  const paths = writeFirstPartyPlatformFoundationReviewArtifacts(
    buildFirstPartyPlatformFoundationReview({ generatedAt: "2026-08-03T00:00:00.000Z", env: {} }),
  );
  assert.ok(existsSync(paths.markdownPath));
  assert.ok(existsSync(paths.jsonPath));
  assert.match(readFileSync(paths.markdownPath, "utf8"), /FIRST_PARTY_PLATFORM_FOUNDATION_REVIEW_COMPLETE/);
  const parsed = JSON.parse(readFileSync(paths.jsonPath, "utf8"));
  assert.equal(parsed.status, "FIRST_PARTY_PLATFORM_FOUNDATION_REVIEW_COMPLETE");
  assertNoSecrets(parsed);
});

test("S5-FP-001 package scripts are wired", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts["launch:first-party-review"], "node scripts/s5-fp-001-first-party-platform-review.mjs report");
  assert.equal(pkg.scripts["launch:first-party-review:json"], "node scripts/s5-fp-001-first-party-platform-review.mjs json");
  assert.equal(pkg.scripts["launch:first-party-review:generate"], "node scripts/s5-fp-001-first-party-platform-review.mjs generate");
  const output = execFileSync(process.execPath, ["scripts/s5-fp-001-first-party-platform-review.mjs", "json"], { encoding: "utf8" });
  assert.equal(JSON.parse(output).status, "FIRST_PARTY_PLATFORM_FOUNDATION_REVIEW_COMPLETE");
});
