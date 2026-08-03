import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { test } from "node:test";

import {
  buildStage5RuntimeEvidenceBinder,
  renderStage5RuntimeEvidenceBinder,
  STAGE5_RUNTIME_RESULTS,
  writeStage5RuntimeEvidenceBinderArtifacts,
} from "../../scripts/s5-stage5-runtime-evidence-binder.mjs";

const expectedRunIds = ["30852377942", "30852924640", "30853267031", "30856875705", "30860501050", "30860610674"];

test("Stage 5 binder inventories the six accepted runtime workflow results", () => {
  assert.equal(STAGE5_RUNTIME_RESULTS.length, 6);
  assert.deepEqual(STAGE5_RUNTIME_RESULTS.map((result) => result.runId), expectedRunIds);
  assert.equal(STAGE5_RUNTIME_RESULTS.every((result) => result.result === "PASS"), true);
  assert.equal(STAGE5_RUNTIME_RESULTS.every((result) => result.artifactCount === 1), true);
});

test("Stage 5 binder completes runtime evidence consolidation without production certification", () => {
  const report = buildStage5RuntimeEvidenceBinder({ generatedAt: "2026-08-03T00:00:00.000Z" });
  assert.equal(report.status, "STAGE5_RUNTIME_EVIDENCE_BINDER_COMPLETE");
  assert.equal(report.runtimeEvidenceStatus, "ALL_PREPARED_RUNTIME_WORKFLOWS_PASSED");
  assert.equal(report.productionReady, false);
  assert.equal(report.paidPilotReady, false);
  assert.equal(report.publicLaunchReady, false);
  assert.equal(report.a4Status, "A4-01_OPEN");
  assert.equal(report.passedWorkflowCount, 6);
  assert.equal(report.runtimeEvidenceCoveragePercent, 100);
  assert.equal(report.readinessEstimate.engineeringBuilt, 90);
  assert.equal(report.readinessEstimate.controlledStagingReady, 80);
  assert.equal(report.readinessEstimate.publicLaunchReady, 60);
});

test("Stage 5 binder markdown renders workflow run evidence and blockers", () => {
  const markdown = renderStage5RuntimeEvidenceBinder(
    buildStage5RuntimeEvidenceBinder({ generatedAt: "2026-08-03T00:00:00.000Z" }),
  );
  assert.match(markdown, /Stage 5 Runtime Evidence Binder/);
  for (const runId of expectedRunIds) assert.match(markdown, new RegExp(runId));
  assert.match(markdown, /Production Ready: NO/);
  assert.match(markdown, /A4-01 Infrastructure Ownership Confirmation remains open/);
});

test("Stage 5 binder artifact generation writes markdown and JSON", () => {
  const markdownPath = "docs/launch-readiness/stage-5-runtime-evidence-binder.md";
  const jsonPath = "artifacts/runtime-evidence/stage-5-runtime-evidence-binder.json";
  rmSync(markdownPath, { force: true });
  rmSync(jsonPath, { force: true });
  const paths = writeStage5RuntimeEvidenceBinderArtifacts(
    buildStage5RuntimeEvidenceBinder({ generatedAt: "2026-08-03T00:00:00.000Z" }),
  );
  assert.ok(existsSync(paths.markdownPath));
  assert.ok(existsSync(paths.jsonPath));
  assert.match(readFileSync(paths.markdownPath, "utf8"), /STAGE5_RUNTIME_EVIDENCE_BINDER_COMPLETE/);
  const parsed = JSON.parse(readFileSync(paths.jsonPath, "utf8"));
  assert.equal(parsed.status, "STAGE5_RUNTIME_EVIDENCE_BINDER_COMPLETE");
  assert.equal(parsed.passedWorkflowCount, 6);
});

test("Stage 5 binder package scripts are wired", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts["launch:stage5-binder"], "node scripts/s5-stage5-runtime-evidence-binder.mjs report");
  assert.equal(pkg.scripts["launch:stage5-binder:json"], "node scripts/s5-stage5-runtime-evidence-binder.mjs json");
  assert.equal(pkg.scripts["launch:stage5-binder:generate"], "node scripts/s5-stage5-runtime-evidence-binder.mjs generate");
  const output = execFileSync(process.execPath, ["scripts/s5-stage5-runtime-evidence-binder.mjs", "json"], { encoding: "utf8" });
  assert.equal(JSON.parse(output).status, "STAGE5_RUNTIME_EVIDENCE_BINDER_COMPLETE");
});
