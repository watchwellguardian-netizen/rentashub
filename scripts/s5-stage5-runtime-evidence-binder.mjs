import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const STAGE5_RUNTIME_RESULTS = [
  {
    sprint: "S5-REW-001",
    subsystem: "PostgreSQL and RLS",
    workflow: "postgres-runtime-validation.yml",
    runId: "30852377942",
    commit: "8f814fc",
    result: "PASS",
    artifactCount: 1,
    evidenceStatus: "RUNTIME_EVIDENCE_GENERATED",
  },
  {
    sprint: "S5-REW-002",
    subsystem: "Redis and BullMQ",
    workflow: "redis-bullmq-runtime-validation.yml",
    runId: "30852924640",
    commit: "364dfe1",
    result: "PASS",
    artifactCount: 1,
    evidenceStatus: "RUNTIME_EVIDENCE_GENERATED",
  },
  {
    sprint: "S5-REW-003",
    subsystem: "Object Storage and Export",
    workflow: "object-storage-export-runtime-validation.yml",
    runId: "30853267031",
    commit: "0cc056b",
    result: "PASS",
    artifactCount: 1,
    evidenceStatus: "RUNTIME_EVIDENCE_GENERATED",
  },
  {
    sprint: "S5-REW-004",
    subsystem: "Browser Journeys and Accessibility",
    workflow: "browser-accessibility-runtime-validation.yml",
    runId: "30856875705",
    commit: "6bf932f",
    result: "PASS",
    artifactCount: 1,
    evidenceStatus: "RUNTIME_EVIDENCE_GENERATED",
  },
  {
    sprint: "S5-REW-005",
    subsystem: "Authentication and Authorization",
    workflow: "auth-authorization-runtime-validation.yml",
    runId: "30860501050",
    commit: "bbf32be",
    result: "PASS",
    artifactCount: 1,
    evidenceStatus: "RUNTIME_EVIDENCE_GENERATED",
  },
  {
    sprint: "S5-REW-006",
    subsystem: "Observability and Operations",
    workflow: "observability-operations-runtime-validation.yml",
    runId: "30860610674",
    commit: "bbf32be",
    result: "PASS",
    artifactCount: 1,
    evidenceStatus: "RUNTIME_EVIDENCE_GENERATED",
  },
];

export function buildStage5RuntimeEvidenceBinder({ generatedAt = new Date().toISOString() } = {}) {
  const passed = STAGE5_RUNTIME_RESULTS.filter((result) => result.result === "PASS").length;
  const artifacts = STAGE5_RUNTIME_RESULTS.reduce((total, result) => total + result.artifactCount, 0);
  return {
    sprint: "S5-STAGE5-BINDER",
    generatedAt,
    platform: "RentasHub Marketplace",
    classification: "RC-0.6A",
    status: passed === STAGE5_RUNTIME_RESULTS.length ? "STAGE5_RUNTIME_EVIDENCE_BINDER_COMPLETE" : "STAGE5_RUNTIME_EVIDENCE_BINDER_INCOMPLETE",
    runtimeEvidenceStatus: passed === STAGE5_RUNTIME_RESULTS.length ? "ALL_PREPARED_RUNTIME_WORKFLOWS_PASSED" : "RUNTIME_WORKFLOW_FAILURES_PRESENT",
    productionReady: false,
    paidPilotReady: false,
    publicLaunchReady: false,
    a4Status: "A4-01_OPEN",
    liveProviderActivation: false,
    runtimeWorkflowCount: STAGE5_RUNTIME_RESULTS.length,
    passedWorkflowCount: passed,
    failedWorkflowCount: STAGE5_RUNTIME_RESULTS.length - passed,
    artifactCount: artifacts,
    runtimeEvidenceCoveragePercent: Math.round((passed / STAGE5_RUNTIME_RESULTS.length) * 100),
    results: STAGE5_RUNTIME_RESULTS,
    unresolvedLaunchBlockers: [
      "A4-01 Infrastructure Ownership Confirmation remains open.",
      "Live production credentials and provider evidence remain owner-controlled.",
      "Production hosting, DNS, TLS, secrets, monitoring, payment, escrow, legal, compliance, security and UAT signoff remain required.",
      "Supabase-specific review remains deferred until owner review is complete.",
    ],
    stagePromotionRecommendation: "Do not promote to production. Stage 5 prepared-runtime evidence is consolidated; proceed to provider/owner evidence gates and controlled staging only after A4 and live-provider evidence are accepted.",
    readinessEstimate: {
      engineeringBuilt: 90,
      controlledStagingReady: 80,
      publicLaunchReady: 60,
      basis: "Runtime evidence exists for the prepared engineering workflows, while live provider activation, legal/security/compliance signoff, UAT, production infrastructure and A4-01 evidence remain outside this binder.",
    },
  };
}

export function renderStage5RuntimeEvidenceBinder(report = buildStage5RuntimeEvidenceBinder()) {
  return [
    "# Stage 5 Runtime Evidence Binder",
    "",
    `Generated: ${report.generatedAt}`,
    `Platform: ${report.platform}`,
    `Classification: ${report.classification}`,
    `Status: ${report.status}`,
    `Runtime Evidence Status: ${report.runtimeEvidenceStatus}`,
    `A4 Status: ${report.a4Status}`,
    `Production Ready: ${report.productionReady ? "YES" : "NO"}`,
    "",
    "## Runtime Evidence Summary",
    "",
    `- Runtime workflows passed: ${report.passedWorkflowCount}/${report.runtimeWorkflowCount}`,
    `- Artifact count: ${report.artifactCount}`,
    `- Runtime evidence coverage: ${report.runtimeEvidenceCoveragePercent}%`,
    "",
    "## Workflow Evidence Register",
    "",
    "| Sprint | Subsystem | Workflow | Run ID | Commit | Result | Artifacts |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.results.map((item) => `| ${item.sprint} | ${item.subsystem} | ${item.workflow} | ${item.runId} | ${item.commit} | ${item.result} | ${item.artifactCount} |`),
    "",
    "## Readiness Estimate",
    "",
    `- Engineering built: ${report.readinessEstimate.engineeringBuilt}%`,
    `- Controlled staging ready: ${report.readinessEstimate.controlledStagingReady}%`,
    `- Public launch ready: ${report.readinessEstimate.publicLaunchReady}%`,
    "",
    report.readinessEstimate.basis,
    "",
    "## Unresolved Launch Blockers",
    "",
    ...report.unresolvedLaunchBlockers.map((blocker) => `- ${blocker}`),
    "",
    "## Stage Promotion Recommendation",
    "",
    report.stagePromotionRecommendation,
  ].join("\n");
}

export function writeStage5RuntimeEvidenceBinderArtifacts(report = buildStage5RuntimeEvidenceBinder()) {
  const docsDir = resolve(ROOT, "docs", "launch-readiness");
  const artifactsDir = resolve(ROOT, "artifacts", "runtime-evidence");
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });
  const markdownPath = resolve(docsDir, "stage-5-runtime-evidence-binder.md");
  const jsonPath = resolve(artifactsDir, "stage-5-runtime-evidence-binder.json");
  writeFileSync(markdownPath, `${renderStage5RuntimeEvidenceBinder(report)}\n`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return { markdownPath, jsonPath };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  const report = buildStage5RuntimeEvidenceBinder();
  if (command === "json") console.log(JSON.stringify(report, null, 2));
  else if (command === "generate") console.log(JSON.stringify(writeStage5RuntimeEvidenceBinderArtifacts(report), null, 2));
  else console.log(renderStage5RuntimeEvidenceBinder(report));
}
