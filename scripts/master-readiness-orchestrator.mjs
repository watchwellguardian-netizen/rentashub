import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildA4EvidencePackageData,
  buildA4MasterEvidenceIndex,
  renderA4EvidencePackage,
} from "./a4-supabase-tooling.mjs";
import {
  buildArtifactIntegrityReport,
  validateRepositoryReleaseReadiness,
} from "./repository-release-readiness-tooling.mjs";
import {
  buildLaunchBlockerDashboard,
  buildLaunchReadinessReport,
} from "./launch-readiness-tooling.mjs";
import { getIntegrationReadiness } from "../server/src/config/integrationReadiness.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROGRAM_STATE_PATH = "docs/program-state.md";

export const MASTER_READINESS_DOMAINS = [
  {
    key: "a4Supabase",
    label: "A4 / Supabase Evidence",
    command: "npm run a4:evidence-package",
    blocker: "A4-01 project names, real project IDs, and owner evidence remain required.",
    nextEvidence: "A4-01 Infrastructure Ownership Confirmation Submitted",
  },
  {
    key: "database",
    label: "Database",
    command: "npm run database:readiness",
    blocker: "Real PostgreSQL credentials, migration execution, seed validation, RLS proof, and backup/restore evidence remain required.",
    nextEvidence: "A4-03 migration evidence and A4-04 persistence certification.",
  },
  {
    key: "authRbac",
    label: "Auth / RBAC",
    command: "npm run auth-rbac:readiness",
    blocker: "Real Supabase Auth registration, login, logout, password reset, email verification, MFA, session refresh, and revocation evidence remain required.",
    nextEvidence: "A4-04 real Supabase Auth and RLS/RBAC evidence.",
  },
  {
    key: "storage",
    label: "Storage",
    command: "npm run storage:readiness",
    blocker: "Real buckets, upload/download, signed URL, private access denial, and storage policy evidence remain required.",
    nextEvidence: "A4-04 storage certification evidence.",
  },
  {
    key: "monitoring",
    label: "Monitoring",
    command: "npm run monitoring:readiness",
    blocker: "Live Sentry, Better Stack, alert routing, uptime checks, log drain, and incident notification evidence remain required.",
    nextEvidence: "B3 Monitoring Production Activation after A4 passes.",
  },
  {
    key: "security",
    label: "Security",
    command: "npm run security:readiness",
    blocker: "Live MFA, security hardening evidence, OWASP review, vulnerability scan, penetration testing, and security certification remain required.",
    nextEvidence: "C2 Security Operationalization after A4 and monitoring.",
  },
  {
    key: "compliance",
    label: "Compliance",
    command: "npm run compliance:readiness",
    blocker: "Legal review, Jamaica DPA/GDPR approval, live consent, DSAR, retention/deletion, KYC, and policy approval evidence remain required.",
    nextEvidence: "D2 Compliance Operationalization after security.",
  },
  {
    key: "revenue",
    label: "Revenue",
    command: "npm run revenue:readiness",
    blocker: "Payment provider sandbox, webhook, refund, chargeback, payout, settlement, Tax/GCT, and revenue operations evidence remain required.",
    nextEvidence: "E2 Revenue Sandbox Activation after compliance.",
  },
  {
    key: "escrow",
    label: "Escrow",
    command: "npm run escrow:readiness",
    blocker: "Escrow provider/legal trust account, deposit hold/release, partial release, refund, dispute, and ledger evidence remain required.",
    nextEvidence: "Escrow legal and operational certification before paid pilot.",
  },
  {
    key: "infrastructure",
    label: "Deployment / Infrastructure",
    command: "npm run infrastructure:readiness",
    blocker: "DNS, TLS, hosting, CDN, rollback, disaster recovery, backup validation, and production launch infrastructure evidence remain required.",
    nextEvidence: "Production infrastructure evidence after A4 certification.",
  },
  {
    key: "operations",
    label: "Operational Readiness",
    command: "npm run operations:readiness",
    blocker: "Live UAT execution, support staffing, escalation drills, supplier onboarding evidence, and closed beta operations evidence remain required.",
    nextEvidence: "Closed beta operations evidence package.",
  },
  {
    key: "repositoryCi",
    label: "Repository / CI",
    command: "npm run release:readiness",
    blocker: "Real CI run evidence, branch protection evidence, PR approval evidence, artifact integrity evidence, and release tag evidence must be collected from the repository host.",
    nextEvidence: "Repository/CI evidence package from real CI and branch controls.",
  },
  {
    key: "launch",
    label: "Release / Launch",
    command: "npm run launch:readiness",
    blocker: "Closed beta remains conditional, paid pilot remains NO-GO, and public launch remains NO-GO until activation evidence is accepted.",
    nextEvidence: "A4, monitoring, security, compliance, revenue, escrow, and production certification evidence.",
  },
];

export const MANUAL_INTERVENTION_BLOCKERS = [
  "Real Supabase Development, UAT/Staging, and Production project IDs.",
  "Real Supabase credentials stored only in approved secret stores.",
  "Real database migration execution in Development and UAT.",
  "Real persistence, RLS/RBAC, Auth, Storage, and backup/restore certification.",
  "Real monitoring activation and alert routing verification.",
  "Real security certification, OWASP review, vulnerability scan, and penetration test.",
  "Legal/compliance approval for privacy, DPA/GDPR, consent, DSAR, retention, and KYC.",
  "Real payment sandbox and escrow provider/legal trust account certification.",
  "Production deployment, DNS, TLS, hosting, CDN, rollback, and DR evidence.",
];

function readProgramState() {
  return readFileSync(resolve(ROOT, PROGRAM_STATE_PATH), "utf8");
}

function readinessStatus(check) {
  if (!check) return "EVIDENCE_REQUIRED";
  if (check.ready || check.status === "PASS") return "LOCAL_OR_TOOLING_READY";
  return "MANUAL_EVIDENCE_REQUIRED";
}

function areaStatus(domain, integration, repository, artifact, launch, a4Index) {
  if (domain.key === "repositoryCi") {
    return repository.status === "PASS" && artifact.status === "PASS" ? "TOOLING_PASS_EVIDENCE_PENDING" : "NEEDS_REVIEW";
  }
  if (domain.key === "launch") return launch.productionReady ? "READY" : "BLOCKED_PENDING_ACTIVATION";
  if (domain.key === "a4Supabase") return a4Index.status === "PASS" ? "READY_FOR_A4_REVIEW" : "BLOCKED_PENDING_A4_EVIDENCE";

  const map = {
    database: "database",
    authRbac: "auth",
    storage: "fileStorage",
    monitoring: "monitoring",
    security: "securityCertification",
    compliance: "compliance",
    revenue: "revenue",
    escrow: "escrow",
    infrastructure: "infrastructure",
    operations: "pilotOperations",
  };
  return readinessStatus(integration.checks[map[domain.key]]);
}

export function buildMasterReadinessReport({ generatedAt = new Date().toISOString(), env = process.env } = {}) {
  const programState = readProgramState();
  const integration = getIntegrationReadiness(env);
  const repository = validateRepositoryReleaseReadiness();
  const artifact = buildArtifactIntegrityReport();
  const launch = buildLaunchReadinessReport();
  const launchBlockers = buildLaunchBlockerDashboard();
  const a4Package = renderA4EvidencePackage({ generatedAt });
  const a4Data = buildA4EvidencePackageData({ generatedAt });
  const a4Index = buildA4MasterEvidenceIndex({
    packagePath: "generated-in-memory",
    packageContent: a4Package,
    generatedAt,
  });

  const areas = MASTER_READINESS_DOMAINS.map((domain) => ({
    ...domain,
    toolingOperational: true,
    status: areaStatus(domain, integration, repository, artifact, launch, a4Index),
    productionReady: false,
    liveProviderActive: false,
  }));

  const toolingCoverageScore = Math.round((areas.filter((area) => area.toolingOperational).length / areas.length) * 100);
  const evidenceReadyAreas = areas.filter((area) => !/BLOCKED|MANUAL|PENDING|NEEDS_REVIEW/.test(area.status)).length;
  const evidenceCompletenessScore = Math.round((evidenceReadyAreas / areas.length) * 100);

  return {
    generatedAt,
    platform: "RentasHub Marketplace",
    classification: "RC-0.6A",
    state: "Infrastructure Activation Hold",
    currentGate: "A4-01 Infrastructure Ownership Confirmation",
    nextAuthorizedGate: "A4-01 Infrastructure Ownership Confirmation Submitted",
    productionReady: false,
    liveProviderActivation: false,
    paidPilotReady: false,
    publicLaunchReady: false,
    closedBetaDecision: "CONDITIONAL GO AFTER A4 AND MONITORING EVIDENCE",
    paidPilotDecision: "NO-GO",
    publicLaunchDecision: "NO-GO",
    toolingCoverageScore,
    evidenceCompletenessScore,
    programStatePath: PROGRAM_STATE_PATH,
    programStateRead: programState.includes("RC-0.6A") && programState.includes("A4-01 Infrastructure Ownership Confirmation"),
    a4Status: a4Index.status,
    a4CompletenessScore: a4Index.completenessScore,
    a4PendingEvidenceItems: a4Index.manifest.sections.reduce((sum, section) => sum + section.pendingEvidenceItems, 0),
    repositoryStatus: repository.status,
    artifactStatus: artifact.status,
    launchStatus: launch.status,
    launchBlockerCount: launchBlockers.blockers.length,
    credentialValuePrinted: false,
    noLiveProviderCalls: true,
    areas,
    launchDecisions: launch.decisions,
    manualInterventionBlockers: MANUAL_INTERVENTION_BLOCKERS,
    a4ManualEvidenceStillRequired: a4Index.manifest.manualEvidenceStillRequired,
    a4EvidencePackageShape: {
      a4_01_environments: a4Data.a4_01.environments.length,
      a4_02_checks: a4Data.a4_02.checks.length,
      a4_03_migrations: a4Data.a4_03.migrations.length,
      a4_04_auth_flows: a4Data.a4_04.auth.length,
      a4_04_storage_buckets: a4Data.a4_04.storage.length,
      a4_05_decision_items: a4Data.a4_05.decisionItems.length,
    },
  };
}

export function renderMasterReadinessReport(report = buildMasterReadinessReport()) {
  return [
    "# Master Readiness Evidence Orchestrator",
    "",
    `Generated: ${report.generatedAt}`,
    `Platform: ${report.platform}`,
    `Classification: ${report.classification}`,
    `State: ${report.state}`,
    `Current Gate: ${report.currentGate}`,
    `Next Authorized Gate: ${report.nextAuthorizedGate}`,
    "",
    "## Decision Boundary",
    "",
    `- Production Ready: ${report.productionReady ? "YES" : "NO"}`,
    `- Live Provider Activation: ${report.liveProviderActivation ? "YES" : "NO"}`,
    `- Closed Beta: ${report.closedBetaDecision}`,
    `- Paid Pilot: ${report.paidPilotDecision}`,
    `- Public Launch: ${report.publicLaunchDecision}`,
    `- Credential values printed: ${report.credentialValuePrinted ? "YES" : "NO"}`,
    "",
    "## Scores",
    "",
    `- Tooling Coverage Score: ${report.toolingCoverageScore}%`,
    `- Evidence Completeness Score: ${report.evidenceCompletenessScore}%`,
    `- A4 Completeness Score: ${report.a4CompletenessScore}%`,
    `- A4 Pending Evidence Items: ${report.a4PendingEvidenceItems}`,
    "",
    "## Evidence Domains",
    "",
    "| Domain | Status | Command | Manual Blocker |",
    "| --- | --- | --- | --- |",
    ...report.areas.map((area) => `| ${area.label} | ${area.status} | \`${area.command}\` | ${area.blocker} |`),
    "",
    "## Manual Intervention Still Required",
    "",
    ...report.manualInterventionBlockers.map((blocker) => `- ${blocker}`),
    "",
    "## Launch Decisions",
    "",
    ...report.launchDecisions.map((decision) => `- ${decision.environment}: ${decision.decision}`),
    "",
    "## Safety Notes",
    "",
    "- This orchestrator does not connect to Supabase.",
    "- This orchestrator does not read, print, or validate secret values.",
    "- This orchestrator does not run migrations, create buckets, test real Auth, move money, activate escrow, deploy production, or certify launch readiness.",
  ].join("\n");
}

export function renderManualBlockers(report = buildMasterReadinessReport()) {
  return [
    "# Master Manual Blocker Report",
    "",
    `Current Gate: ${report.currentGate}`,
    `Next Authorized Gate: ${report.nextAuthorizedGate}`,
    "",
    ...report.manualInterventionBlockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

export function renderExecutiveSummary(report = buildMasterReadinessReport()) {
  return [
    "# Master Readiness Executive Summary",
    "",
    `RentasHub remains ${report.classification} in ${report.state}.`,
    "",
    "Credential-readiness tooling is broadly available across A4, database, Auth/RBAC, storage, monitoring, security, compliance, revenue, escrow, infrastructure, operations, repository/CI, and launch evidence.",
    "",
    "The platform is not production ready because the remaining blockers require real provider and operational evidence, beginning with A4-01 Infrastructure Ownership Confirmation.",
    "",
    `Next Authorized Gate: ${report.nextAuthorizedGate}`,
  ].join("\n");
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  const report = buildMasterReadinessReport();
  if (command === "json") console.log(JSON.stringify(report, null, 2));
  else if (command === "blockers") console.log(renderManualBlockers(report));
  else if (command === "executive-summary") console.log(renderExecutiveSummary(report));
  else console.log(renderMasterReadinessReport(report));
}
