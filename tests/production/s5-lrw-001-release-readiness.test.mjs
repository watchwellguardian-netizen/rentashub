import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  REQUIRED_CERTIFICATION_INDEXES,
  REQUIRED_DEPLOYMENT_TERMS,
  REQUIRED_DOCS,
  REQUIRED_OPERATIONAL_TERMS,
  REQUIRED_OWNER_ACTIONS,
  REQUIRED_RECOVERY_TERMS,
  REQUIRED_RELEASE_GOVERNANCE_TERMS,
  validateS5Lrw001,
} from "../../scripts/s5-lrw-001-release-readiness.mjs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("S5-LRW-001 required launch readiness documents exist", () => {
  const result = validateS5Lrw001();
  assert.equal(result.docsChecked, REQUIRED_DOCS.length);
  assert.equal(result.status, "ENGINEERING_COMPLETE");
  assert.equal(result.blockers.length, 0);
});

test("release governance document covers all required approval artifacts", () => {
  const doc = read("docs/launch-readiness/release-governance.md");
  for (const term of REQUIRED_RELEASE_GOVERNANCE_TERMS) assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(doc, /does not approve production deployment/i);
});

test("deployment readiness document covers manifests inventories configuration SBOM and package evidence", () => {
  const doc = read("docs/launch-readiness/deployment-readiness.md");
  for (const term of REQUIRED_DEPLOYMENT_TERMS) assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(doc, /Do not record secret values/i);
});

test("recovery and operational documents cover procedures and acceptance checks", () => {
  const recovery = read("docs/launch-readiness/recovery-readiness.md");
  const operations = read("docs/launch-readiness/operational-readiness.md");
  for (const term of REQUIRED_RECOVERY_TERMS) assert.match(recovery, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const term of REQUIRED_OPERATIONAL_TERMS) assert.match(operations, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("certification manifest indexes all evidence domains", () => {
  const doc = read("docs/launch-readiness/certification-evidence-manifest.md");
  for (const term of REQUIRED_CERTIFICATION_INDEXES) assert.match(doc, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const artifact of [
    "artifacts/runtime-evidence/postgres-pg006.json",
    "artifacts/runtime-evidence/redis-bullmq-s5-s3c.json",
    "artifacts/runtime-evidence/object-storage-export-s5-s3d.json",
    "artifacts/runtime-evidence/browser-accessibility-s5-s3e.json",
    "artifacts/runtime-evidence/auth-authorization-s5-s3f.json",
    "artifacts/runtime-evidence/observability-operations-s5-s3g.json",
  ]) {
    assert.match(doc, new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("owner action register contains every manual dependency with required columns", () => {
  const doc = read("docs/launch-readiness/owner-action-register.md");
  for (const action of REQUIRED_OWNER_ACTIONS) assert.match(doc, new RegExp(`\\| ${action} \\|`));
  for (const column of ["Prerequisite", "Owner", "Credential Location", "Validation Command", "Expected Evidence", "Completion Status"]) {
    assert.match(doc, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("launch dashboard JSON is valid and preserves pending runtime and certification claims", () => {
  const dashboard = JSON.parse(read("docs/launch-readiness/launch-dashboard.json"));
  assert.equal(dashboard.status, "ENGINEERING_COMPLETE");
  assert.equal(dashboard.releaseGovernance, "RELEASE_GOVERNANCE_COMPLETE");
  assert.equal(dashboard.deploymentReadiness, "DEPLOYMENT_READINESS_COMPLETE");
  assert.equal(dashboard.certificationPackage, "CERTIFICATION_PACKAGE_COMPLETE");
  assert.equal(dashboard.ownerActionRegister, "OWNER_ACTION_REGISTER_COMPLETE");
  assert.equal(dashboard.launchDashboard, "LAUNCH_DASHBOARD_COMPLETE");
  assert.equal(dashboard.runtimeEvidence, "RUNTIME_EVIDENCE_PENDING");
  assert.equal(dashboard.maturity.structuralImplementation, 100);
  assert.equal(dashboard.maturity.engineeringControlledCompletion, 100);
  assert.equal(dashboard.productionReady, false);
  assert.equal(dashboard.publicLaunchReady, false);
  assert.equal(dashboard.paidPilotReady, false);
});

test("validator cross-references runtime orchestration and avoids live-provider claims", () => {
  const result = validateS5Lrw001();
  assert.equal(result.workflowCount, 6);
  assert.equal(result.readyWorkflowCount, 6);
  assert.equal(result.productionTouched, false);
  assert.equal(result.liveProvidersTouched, false);
  assert.equal(result.runtimeEvidence, "RUNTIME_EVIDENCE_PENDING");
  assert.deepEqual(result.ownerActions, REQUIRED_OWNER_ACTIONS);
});

test("S5-LRW-001 files contain no credential values or provider activation commands", () => {
  const combined = REQUIRED_DOCS.map(read).join("\n") + read("scripts/s5-lrw-001-release-readiness.mjs");
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY\s*=|DATABASE_URL\s*=|SENTRY_DSN\s*=|postgresql:\/\/[^:\s]+:[^@\s]+@|supabase\s+link|supabase\s+db\s+push/i);
});
