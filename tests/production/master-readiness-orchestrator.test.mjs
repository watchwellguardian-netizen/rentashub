import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import {
  MANUAL_INTERVENTION_BLOCKERS,
  MASTER_READINESS_DOMAINS,
  buildMasterReadinessReport,
  renderExecutiveSummary,
  renderManualBlockers,
  renderMasterReadinessReport,
} from "../../scripts/master-readiness-orchestrator.mjs";

const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /SUPABASE_ANON_KEY\s*=/i,
  /DATABASE_URL\s*=/i,
  /postgresql:\/\/postgres:/i,
  /sb_secret/i,
  /sk_live_/i,
  /whsec_/i,
  /JWT_SECRET\s*=/i,
];

function assertNoSecretValues(output) {
  for (const pattern of secretPatterns) {
    assert.doesNotMatch(output, pattern);
  }
}

test("master readiness report covers every launch-readiness evidence domain", () => {
  const report = buildMasterReadinessReport({ generatedAt: "2026-06-20T00:00:00.000Z", env: {} });
  const domainKeys = new Set(report.areas.map((area) => area.key));

  assert.equal(report.classification, "RC-0.6A");
  assert.equal(report.state, "Infrastructure Activation Hold");
  assert.equal(report.currentGate, "A4-01 Infrastructure Ownership Confirmation");
  assert.equal(report.nextAuthorizedGate, "A4-01 Infrastructure Ownership Confirmation Submitted");
  assert.equal(report.productionReady, false);
  assert.equal(report.liveProviderActivation, false);
  assert.equal(report.paidPilotReady, false);
  assert.equal(report.publicLaunchReady, false);
  assert.equal(report.credentialValuePrinted, false);
  assert.equal(report.noLiveProviderCalls, true);
  assert.equal(report.programStateRead, true);

  for (const domain of MASTER_READINESS_DOMAINS) {
    assert.equal(domainKeys.has(domain.key), true, `${domain.key} should be present`);
  }
});

test("master readiness report keeps A4 and launch decisions blocked pending manual evidence", () => {
  const report = buildMasterReadinessReport({ generatedAt: "2026-06-20T00:00:00.000Z", env: {} });
  assert.equal(report.a4Status, "INCOMPLETE");
  assert.ok(report.a4PendingEvidenceItems > 0);
  assert.equal(report.closedBetaDecision, "CONDITIONAL GO AFTER A4 AND MONITORING EVIDENCE");
  assert.equal(report.paidPilotDecision, "NO-GO");
  assert.equal(report.publicLaunchDecision, "NO-GO");
  assert.ok(report.launchBlockerCount > 0);
  assert.ok(report.manualInterventionBlockers.some((blocker) => blocker.includes("Real Supabase Development")));
  assert.ok(report.manualInterventionBlockers.some((blocker) => blocker.includes("Real monitoring activation")));
  assert.ok(report.manualInterventionBlockers.some((blocker) => blocker.includes("payment sandbox")));
  assert.ok(report.manualInterventionBlockers.some((blocker) => blocker.includes("Production deployment")));
});

test("master readiness orchestrator includes the expected A4 evidence package shape", () => {
  const report = buildMasterReadinessReport({ generatedAt: "2026-06-20T00:00:00.000Z", env: {} });
  assert.equal(report.a4EvidencePackageShape.a4_01_environments, 3);
  assert.equal(report.a4EvidencePackageShape.a4_02_checks, 7);
  assert.equal(report.a4EvidencePackageShape.a4_03_migrations, 4);
  assert.equal(report.a4EvidencePackageShape.a4_04_auth_flows, 7);
  assert.equal(report.a4EvidencePackageShape.a4_04_storage_buckets, 6);
  assert.equal(report.a4EvidencePackageShape.a4_05_decision_items, 8);
});

test("rendered reports do not expose credential values or claim production readiness", () => {
  const serviceRoleKeyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const report = buildMasterReadinessReport({ generatedAt: "2026-06-20T00:00:00.000Z", env: {
    [serviceRoleKeyName]: "do-not-print-this-service-role-key",
    DATABASE_URL: "postgresql://postgres:do-not-print@example.supabase.co/postgres",
  } });

  const rendered = renderMasterReadinessReport(report);
  assert.match(rendered, /Master Readiness Evidence Orchestrator/);
  assert.match(rendered, /Production Ready: NO/);
  assert.match(rendered, /Live Provider Activation: NO/);
  assert.match(rendered, /This orchestrator does not connect to Supabase/);
  assert.doesNotMatch(rendered, /do-not-print/);
  assertNoSecretValues(rendered);

  const blockers = renderManualBlockers(report);
  assert.match(blockers, /Master Manual Blocker Report/);
  assert.match(blockers, /Real Supabase credentials/);
  assertNoSecretValues(blockers);

  const executive = renderExecutiveSummary(report);
  assert.match(executive, /not production ready/i);
  assert.match(executive, /A4-01 Infrastructure Ownership Confirmation/);
  assertNoSecretValues(executive);
});

test("manual blockers list reflects provider and operational work that cannot be automated", () => {
  assert.ok(MANUAL_INTERVENTION_BLOCKERS.some((blocker) => blocker.includes("Supabase credentials")));
  assert.ok(MANUAL_INTERVENTION_BLOCKERS.some((blocker) => blocker.includes("database migration execution")));
  assert.ok(MANUAL_INTERVENTION_BLOCKERS.some((blocker) => blocker.includes("monitoring activation")));
  assert.ok(MANUAL_INTERVENTION_BLOCKERS.some((blocker) => blocker.includes("security certification")));
  assert.ok(MANUAL_INTERVENTION_BLOCKERS.some((blocker) => blocker.includes("Legal/compliance approval")));
  assert.ok(MANUAL_INTERVENTION_BLOCKERS.some((blocker) => blocker.includes("payment sandbox")));
});

test("CLI commands render master readiness reports safely", () => {
  const commands = ["report", "json", "blockers", "executive-summary"];
  for (const command of commands) {
    const output = execFileSync(process.execPath, ["scripts/master-readiness-orchestrator.mjs", command], { encoding: "utf8" });
    assert.ok(output.trim().length > 100, `${command} should produce a useful report`);
    assert.match(output, /A4-01|Infrastructure Activation Hold|Manual Blocker|not production ready/i);
    assertNoSecretValues(output);
  }
});
