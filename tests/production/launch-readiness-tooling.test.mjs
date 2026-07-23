import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import {
  buildLaunchBlockerDashboard,
  buildLaunchReadinessReport,
  LAUNCH_BLOCKERS,
  LAUNCH_ENVIRONMENT_DECISIONS,
  RELEASE_CANDIDATE_EVIDENCE_AREAS,
  renderBoardInvestorReadinessEvidenceSummary,
  renderClosedBetaEvidencePackage,
  renderExecutiveLaunchReadinessSummary,
  renderFinalGoNoGoReport,
  renderLaunchApprovalChecklist,
  renderLaunchBlockerDashboard,
  renderPaidPilotEvidencePackage,
  renderPublicLaunchEvidencePackage,
  renderReleaseCandidateEvidenceIndex,
} from "../../scripts/launch-readiness-tooling.mjs";

const secretPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
  /DATABASE_URL\s*=/i,
  /postgresql:\/\/postgres:/i,
  /sk_live_/i,
  /whsec_/i,
  /JWT_SECRET\s*=/i,
];

function assertNoSecretValues(output) {
  for (const pattern of secretPatterns) {
    assert.doesNotMatch(output, pattern);
  }
}

test("launch decisions preserve current release boundaries", () => {
  const decisions = new Map(LAUNCH_ENVIRONMENT_DECISIONS.map((row) => [row.environment, row.decision]));
  assert.equal(decisions.get("Closed Beta"), "CONDITIONAL GO");
  assert.equal(decisions.get("Paid Pilot"), "NO-GO");
  assert.equal(decisions.get("Public Launch"), "NO-GO");
});

test("closed beta paid pilot and public launch evidence packages render required evidence", () => {
  const closedBeta = renderClosedBetaEvidencePackage();
  assert.match(closedBeta, /Closed Beta Evidence Package/);
  assert.match(closedBeta, /CONDITIONAL GO/);
  assert.match(closedBeta, /A4-01/);
  assert.match(closedBeta, /No paid pilot, public launch, or live money movement confirmation/);
  assertNoSecretValues(closedBeta);

  const paidPilot = renderPaidPilotEvidencePackage();
  assert.match(paidPilot, /Paid Pilot Evidence Package/);
  assert.match(paidPilot, /NO-GO/);
  assert.match(paidPilot, /Payment provider sandbox credentials stored securely/);
  assert.match(paidPilot, /Escrow legal structure/);
  assertNoSecretValues(paidPilot);

  const publicLaunch = renderPublicLaunchEvidencePackage();
  assert.match(publicLaunch, /Public Launch Evidence Package/);
  assert.match(publicLaunch, /PUBLIC LAUNCH NO-GO/);
  assert.match(publicLaunch, /Production launch infrastructure checklist complete/);
  assertNoSecretValues(publicLaunch);
});

test("launch blocker dashboard reports material blockers without approving production", () => {
  const dashboard = buildLaunchBlockerDashboard();
  assert.equal(dashboard.status, "BLOCKED_PENDING_ACTIVATION_EVIDENCE");
  assert.equal(dashboard.productionReady, false);
  assert.equal(dashboard.paidPilotDecision, "NO-GO");
  assert.equal(dashboard.publicLaunchDecision, "NO-GO");
  assert.ok(LAUNCH_BLOCKERS.some((row) => row.blocker.includes("A4-01")));

  const rendered = renderLaunchBlockerDashboard();
  assert.match(rendered, /Launch Blocker Dashboard/);
  assert.match(rendered, /Production Ready: NO/);
  assert.match(rendered, /Security certification/);
  assertNoSecretValues(rendered);
});

test("release candidate evidence index covers launch evidence areas", () => {
  assert.ok(RELEASE_CANDIDATE_EVIDENCE_AREAS.includes("A4 infrastructure evidence"));
  assert.ok(RELEASE_CANDIDATE_EVIDENCE_AREAS.includes("Go/no-go approval evidence"));

  const rendered = renderReleaseCandidateEvidenceIndex();
  assert.match(rendered, /Release Candidate Evidence Index/);
  assert.match(rendered, /RC-0.6A/);
  assert.match(rendered, /Infrastructure Activation Hold/);
  assert.match(rendered, /Live Provider Activation \| No/);
  assertNoSecretValues(rendered);
});

test("go no-go report and approval checklist keep launch blocked", () => {
  const report = renderFinalGoNoGoReport();
  assert.match(report, /Final Go\/No-Go Report/);
  assert.match(report, /Closed Beta: CONDITIONAL GO/);
  assert.match(report, /Paid Pilot: NO-GO/);
  assert.match(report, /Public Launch: NO-GO/);
  assert.match(report, /A4-01 Infrastructure Ownership Confirmation Submitted/);
  assertNoSecretValues(report);

  const checklist = renderLaunchApprovalChecklist();
  assert.match(checklist, /Launch Approval Checklist/);
  assert.match(checklist, /Secret exposure certification accepted/);
  assert.match(checklist, /No false production-ready claims introduced/);
  assertNoSecretValues(checklist);
});

test("executive and board investor summaries distinguish provider-ready from production certified", () => {
  const executive = renderExecutiveLaunchReadinessSummary();
  assert.match(executive, /RC-0.6A/);
  assert.match(executive, /Production certification: Not complete/);
  assert.match(executive, /Paid pilot: NO-GO/);
  assertNoSecretValues(executive);

  const board = renderBoardInvestorReadinessEvidenceSummary();
  assert.match(board, /Board \/ Investor Readiness Evidence Summary/);
  assert.match(board, /provider-ready and activation-ready, not production certified/);
  assert.match(board, /A4 execution evidence/);
  assertNoSecretValues(board);
});

test("launch readiness report is credential-ready tooling only", () => {
  const report = buildLaunchReadinessReport();
  assert.equal(report.status, "CREDENTIAL_READY_TOOLING_COMPLETE");
  assert.equal(report.productionReady, false);
  assert.equal(report.liveProviderActivation, false);
  assert.ok(report.artifacts.includes("Final go/no-go report generator"));
});

test("CLI commands render each requested release launch artifact", () => {
  const commands = [
    "closed-beta-package",
    "paid-pilot-package",
    "public-launch-package",
    "blockers",
    "rc-evidence-index",
    "go-no-go",
    "approval-checklist",
    "executive-summary",
    "board-investor-summary",
  ];
  for (const command of commands) {
    const output = execFileSync(process.execPath, ["scripts/launch-readiness-tooling.mjs", command], { encoding: "utf8" });
    assert.ok(output.trim().length > 100, `${command} should produce a useful report`);
    assertNoSecretValues(output);
  }
});
