import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { getFeatureRegister, summarizeRegister, writeOutputs } from "../../scripts/s5-abw-001-build-register.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");
const blockedClassifications = new Set(["simulated", "ui-only", "documented-only", "blocked-externally", "not-started"]);

test("S5-ABW-001 build register has required fields and unique feature ids", () => {
  const register = getFeatureRegister();
  assert.ok(register.length >= 25);
  const ids = new Set(register.map((item) => item.id));
  assert.equal(ids.size, register.length);

  for (const item of register) {
    assert.ok(item.module);
    assert.ok(item.feature);
    assert.ok(item.frontendStatus);
    assert.ok(item.backendStatus);
    assert.ok(item.databaseStatus);
    assert.ok(item.apiStatus);
    assert.ok(item.integrationStatus);
    assert.ok(item.testStatus);
    assert.ok(item.classification);
    assert.ok(Array.isArray(item.evidenceFiles));
    assert.ok(item.evidenceFiles.length > 0);
    assert.ok(Number.isFinite(item.weight));
    assert.ok(Number.isFinite(item.completion));
  }
});

test("S5-ABW-001 completion scoring does not fully count blocked or placeholder work", () => {
  const register = getFeatureRegister();
  for (const item of register) {
    if (blockedClassifications.has(item.classification)) {
      assert.ok(item.completion < 1, `${item.id} must remain incomplete while ${item.classification}`);
      assert.equal(item.verified, false);
    }
  }
});

test("S5-ABW-001 summary uses weighted completion formula", () => {
  const register = getFeatureRegister();
  const summary = summarizeRegister(register);
  const total = register.reduce((sum, item) => sum + item.weight, 0);
  const points = register.reduce((sum, item) => sum + item.verifiedPoints, 0);
  assert.equal(summary.totalWeightedPoints, total);
  assert.equal(summary.verifiedWeightedPoints, Number(points.toFixed(2)));
  assert.equal(summary.completedPercent, Number(((points / total) * 100).toFixed(1)));
  assert.equal(summary.productionReady, false);
  assert.equal(summary.a4Status, "A4-01 open");
});

test("S5-ABW-001 generated artifacts exist and include required governance sections", () => {
  const { summary } = writeOutputs();
  const expected = [
    "authoritative-build-register.json",
    "module-completion-matrix.md",
    "feature-verification-manifest.json",
    "remaining-build-gap-register.md",
  ];
  for (const filename of expected) {
    assert.ok(existsSync(join(OUT_DIR, filename)), `${filename} should be generated`);
  }

  const register = JSON.parse(readFileSync(join(OUT_DIR, "authoritative-build-register.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(OUT_DIR, "feature-verification-manifest.json"), "utf8"));
  const gaps = readFileSync(join(OUT_DIR, "remaining-build-gap-register.md"), "utf8");
  const matrix = readFileSync(join(OUT_DIR, "module-completion-matrix.md"), "utf8");

  assert.equal(register.summary.completedPercent, summary.completedPercent);
  assert.equal(manifest.summary.currentRelease, "RC-0.6A");
  assert.match(matrix, /Module Completion Matrix/);
  assert.match(matrix, /Production ready: No/);
  assert.match(gaps, /Remaining Build Gap Register/);
});

test("S5-ABW-001 register distinguishes local product build from runtime certification", () => {
  const summary = summarizeRegister();
  assert.ok(summary.completedPercent >= 60);
  assert.ok(summary.completedPercent < 75);
  assert.ok(summary.runtimeBlockedItems.includes("postgres-runtime-readiness"));
  assert.ok(summary.runtimeBlockedItems.includes("runtime-evidence-wave"));
  assert.ok(summary.credentialReadyItems.includes("payments-wallet-payouts"));
});
