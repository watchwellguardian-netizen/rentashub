import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildRuntimeExecutionMatrix,
  createRuntimeEvidenceOrchestrationReport,
  RUNTIME_WORKFLOWS,
} from "../../scripts/s5-s3h-runtime-evidence-orchestrator.mjs";

test("runtime evidence matrix inventories every prepared Stage 5 workflow", () => {
  const matrix = buildRuntimeExecutionMatrix();
  assert.equal(matrix.length, 6);
  assert.deepEqual(matrix.map((entry) => entry.workflow), RUNTIME_WORKFLOWS.map((entry) => entry.workflow));
  assert.equal(matrix.every((entry) => entry.exists), true);
  assert.equal(matrix.every((entry) => entry.evidenceFile.startsWith("artifacts/runtime-evidence/")), true);
});

test("runtime workflows have production guards timeout concurrency and artifact retention", () => {
  const matrix = buildRuntimeExecutionMatrix();
  assert.equal(matrix.every((entry) => entry.productionGuard), true);
  assert.equal(matrix.every((entry) => entry.timeoutConfigured), true);
  assert.equal(matrix.every((entry) => entry.concurrencyConfigured), true);
  assert.equal(matrix.every((entry) => entry.artifact.retentionDays === 14), true);
  assert.equal(matrix.every((entry) => entry.readyForOwnerExecution), true);
});

test("runtime workflows write machine-readable evidence to consistent artifact paths", () => {
  const matrix = buildRuntimeExecutionMatrix();
  for (const entry of matrix) {
    const source = readFileSync(entry.path, "utf8");
    assert.match(source, new RegExp(entry.evidenceFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, /actions\/upload-artifact@v6/);
    assert.match(source, /artifacts\/runtime-evidence/);
  }
});

test("orchestration report produces owner execution commands and pending runtime classification", () => {
  const report = createRuntimeEvidenceOrchestrationReport();
  assert.equal(report.status, "CI_RUNTIME_EXECUTION_FRAMEWORK_COMPLETE");
  assert.equal(report.evidenceStatus, "EVIDENCE_ORCHESTRATION_COMPLETE");
  assert.equal(report.ownerActionRegister, "OWNER_ACTION_REGISTER_FINALIZED");
  assert.equal(report.runtimeExecution, "LIVE_RUNTIME_EXECUTION_PENDING");
  assert.equal(report.workflowCount, 6);
  assert.equal(report.readyWorkflowCount, 6);
  assert.equal(report.productionTargetsBlocked, true);
  assert.equal(report.productionTouched, false);
  assert.equal(report.liveProvidersTouched, false);
  assert.equal(report.executionOrder.every((entry) => entry.command.startsWith("gh workflow run ")), true);
});

test("orchestrator script avoids secret names and production activation commands", () => {
  const source = readFileSync("scripts/s5-s3h-runtime-evidence-orchestrator.mjs", "utf8");
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|SENTRY_DSN|DATABASE_PASSWORD|stripe_secret|supabase\s+link|supabase\s+db\s+push/i);
  assert.match(source, /LIVE_RUNTIME_EXECUTION_PENDING/);
  assert.match(source, /manual_rerun_after_log_review/);
});
