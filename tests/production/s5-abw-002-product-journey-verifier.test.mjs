import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { verifyProductJourneys, writeProductJourneyOutputs } from "../../scripts/s5-abw-002-product-journey-verifier.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");

test("S5-ABW-002 verifies canonical product journeys from real source evidence", () => {
  const report = verifyProductJourneys();
  assert.equal(report.summary.sprint, "S5-ABW-002");
  assert.equal(report.summary.status, "PASS_REPOSITORY_JOURNEY_EVIDENCE");
  assert.equal(report.summary.productionReady, false);
  assert.equal(report.summary.liveProviderActivation, false);
  assert.ok(report.summary.totalJourneys >= 12);
  assert.equal(report.summary.repositoryPass, report.summary.totalJourneys);
  assert.equal(report.summary.failed, 0);
});

test("S5-ABW-002 keeps runtime blockers explicit instead of claiming production readiness", () => {
  const report = verifyProductJourneys();
  const blocked = report.journeys.filter((journey) => journey.runtimeStatus === "BLOCKED_EXTERNAL_EVIDENCE");
  assert.ok(blocked.length >= 8);
  assert.ok(blocked.some((journey) => journey.id === "core_rental_booking_lifecycle"));
  assert.ok(blocked.some((journey) => journey.id === "payments_wallet_revenue"));
  assert.ok(blocked.some((journey) => journey.id === "files_storage_documents"));
  assert.ok(blocked.every((journey) => journey.blockers.length > 0));
});

test("S5-ABW-002 generated artifacts exist and are credential safe", () => {
  const report = writeProductJourneyOutputs();
  const manifestPath = join(OUT_DIR, "product-journey-verification-manifest.json");
  const reportPath = join(OUT_DIR, "product-journey-verification-report.md");
  assert.ok(existsSync(manifestPath));
  assert.ok(existsSync(reportPath));

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const markdown = readFileSync(reportPath, "utf8");
  assert.equal(manifest.summary.repositoryJourneyCoveragePercent, report.summary.repositoryJourneyCoveragePercent);
  assert.match(markdown, /Product Journey Verification Report/);
  assert.doesNotMatch(JSON.stringify(manifest), /sb_service_|sb_secret_|postgresql:\/\/[^"\s]+:[^"\s]+@|SUPABASE_SERVICE_ROLE_KEY\s*=|JWT_SECRET\s*=/i);
  assert.doesNotMatch(markdown, /sb_service_|sb_secret_|postgresql:\/\/[^"\s]+:[^"\s]+@|SUPABASE_SERVICE_ROLE_KEY\s*=|JWT_SECRET\s*=/i);
});

test("S5-ABW-002 journey evidence includes required route API and test checks", () => {
  const report = verifyProductJourneys();
  for (const journey of report.journeys) {
    assert.ok(journey.routeChecks.length + journey.apiChecks.length > 0, `${journey.id} should check routes or APIs`);
    assert.ok(journey.testChecks.length > 0, `${journey.id} should reference tests`);
    assert.equal(journey.missing.length, 0, `${journey.id} has missing evidence: ${journey.missing.join(", ")}`);
  }
});
