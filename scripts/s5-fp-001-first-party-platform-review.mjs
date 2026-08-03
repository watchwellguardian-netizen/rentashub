import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSupabaseReplacementReadiness } from "../server/src/platform/supabaseReplacementArchitecture.js";
import { buildNonSupabaseLaunchClosureReport } from "./s5-nosupabase-launch-closure.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const FIRST_PARTY_FOUNDATION_AREAS = [
  {
    id: "database",
    firstPartyTarget: "PostgreSQL-compatible persistence with repository and migration contracts",
    runtimeEvidence: "PostgreSQL Runtime Validation #2, run 30852377942",
    status: "RUNTIME_EVIDENCE_AVAILABLE",
  },
  {
    id: "authorization",
    firstPartyTarget: "Application policy plus PostgreSQL RLS-compatible authorization boundary",
    runtimeEvidence: "PostgreSQL Runtime Validation #2, run 30852377942",
    status: "RUNTIME_EVIDENCE_AVAILABLE",
  },
  {
    id: "authentication",
    firstPartyTarget: "Provider-neutral OIDC/JWKS authentication boundary with local/mock validation",
    runtimeEvidence: "Auth Authorization Runtime Validation #2, run 30860501050",
    status: "CREDENTIAL_READY_LIVE_PROVIDER_PENDING",
  },
  {
    id: "object-storage",
    firstPartyTarget: "S3-compatible storage and signed URL boundary",
    runtimeEvidence: "Object Storage Export Runtime Validation #1, run 30853267031",
    status: "RUNTIME_EVIDENCE_AVAILABLE",
  },
  {
    id: "queues-workers",
    firstPartyTarget: "Redis/BullMQ queue, worker, retry and dead-letter boundary",
    runtimeEvidence: "Redis BullMQ Runtime Validation #2, run 30852924640",
    status: "RUNTIME_EVIDENCE_AVAILABLE",
  },
  {
    id: "browser-accessibility",
    firstPartyTarget: "Browser journey and accessibility validation harness",
    runtimeEvidence: "Browser Accessibility Runtime Validation #5, run 30856875705",
    status: "RUNTIME_EVIDENCE_AVAILABLE",
  },
  {
    id: "observability-operations",
    firstPartyTarget: "Structured health, readiness, logging, evidence and operations boundary",
    runtimeEvidence: "Observability Operations Runtime Validation #1, run 30860610674",
    status: "RUNTIME_EVIDENCE_AVAILABLE",
  },
  {
    id: "payments-escrow",
    firstPartyTarget: "Provider-neutral payment and escrow contracts only; money movement remains external-provider certified",
    runtimeEvidence: "Credential-readiness package only",
    status: "CREDENTIAL_READY_PROVIDER_PENDING",
  },
];

function createManualDependencyRegister(closure) {
  return closure.manualInterventionStillRequired.map((item) => ({
    id: item.id,
    blocker: item.blocker,
    ownerAction: item.ownerAction,
    requiredEvidence: item.requiredEvidence,
    status: "OWNER_ACTION_PENDING",
  }));
}

export function buildFirstPartyPlatformFoundationReview({
  generatedAt = new Date().toISOString(),
  env = process.env,
} = {}) {
  const replacement = buildSupabaseReplacementReadiness(env);
  const closure = buildNonSupabaseLaunchClosureReport({ generatedAt, env });
  const areasWithRuntimeEvidence = FIRST_PARTY_FOUNDATION_AREAS.filter((area) => area.status === "RUNTIME_EVIDENCE_AVAILABLE").length;
  const areasCredentialReady = FIRST_PARTY_FOUNDATION_AREAS.filter((area) => /CREDENTIAL_READY|RUNTIME_EVIDENCE/.test(area.status)).length;
  return {
    sprint: "S5-FP-001",
    generatedAt,
    platform: "RentasHub Marketplace",
    classification: "RC-0.6A",
    status: "FIRST_PARTY_PLATFORM_FOUNDATION_REVIEW_COMPLETE",
    objective: "Review the provider-neutral first-party platform foundation while deferring Supabase-specific activation until owner review is complete.",
    productionReady: false,
    paidPilotReady: false,
    publicLaunchReady: false,
    a4Status: "A4-01_OPEN",
    supabaseDeferred: true,
    liveSupabaseRequiredForEngineering: false,
    liveProviderActivation: false,
    readsSecretValues: false,
    printsSecretValues: false,
    firstPartyAreasTotal: FIRST_PARTY_FOUNDATION_AREAS.length,
    firstPartyAreasWithRuntimeEvidence: areasWithRuntimeEvidence,
    firstPartyAreasCredentialReady: areasCredentialReady,
    firstPartyEvidenceCoveragePercent: Math.round((areasWithRuntimeEvidence / FIRST_PARTY_FOUNDATION_AREAS.length) * 100),
    firstPartyCredentialReadinessPercent: Math.round((areasCredentialReady / FIRST_PARTY_FOUNDATION_AREAS.length) * 100),
    supabaseReplacementFoundation: {
      status: replacement.status,
      componentsTotal: replacement.componentsTotal,
      localReady: replacement.localReady,
      credentialReady: replacement.credentialReady,
      blockedCredentials: replacement.blockedCredentials,
      invalidModeCount: replacement.invalidModeCount,
      liveSupabaseRequired: replacement.liveSupabaseRequired,
      productionReady: replacement.productionReady,
    },
    areas: FIRST_PARTY_FOUNDATION_AREAS,
    manualDependencies: createManualDependencyRegister(closure),
    decision: "First-party foundation is engineering-reviewed and usable as the preferred platform direction; production certification still requires provider credentials, owner approvals, legal/security/compliance signoff, UAT and deployment evidence.",
    nextSprint: "S5-STAGE5-BINDER - Final Stage 5 runtime evidence binder consolidation",
  };
}

export function renderFirstPartyPlatformFoundationReview(report = buildFirstPartyPlatformFoundationReview()) {
  return [
    "# S5-FP-001 First-Party Platform Foundation Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Platform: ${report.platform}`,
    `Classification: ${report.classification}`,
    `Status: ${report.status}`,
    `A4 Status: ${report.a4Status}`,
    `Production Ready: ${report.productionReady ? "YES" : "NO"}`,
    `Supabase Deferred: ${report.supabaseDeferred ? "YES" : "NO"}`,
    "",
    "## Review Conclusion",
    "",
    report.decision,
    "",
    "## First-Party Coverage",
    "",
    `- Areas reviewed: ${report.firstPartyAreasTotal}`,
    `- Areas with runtime evidence: ${report.firstPartyAreasWithRuntimeEvidence}`,
    `- Areas credential-ready: ${report.firstPartyAreasCredentialReady}`,
    `- Runtime evidence coverage: ${report.firstPartyEvidenceCoveragePercent}%`,
    `- Credential-readiness coverage: ${report.firstPartyCredentialReadinessPercent}%`,
    "",
    "## Supabase Replacement Foundation",
    "",
    `- Status: ${report.supabaseReplacementFoundation.status}`,
    `- Components total: ${report.supabaseReplacementFoundation.componentsTotal}`,
    `- Local-ready components: ${report.supabaseReplacementFoundation.localReady}`,
    `- Credential-ready components: ${report.supabaseReplacementFoundation.credentialReady}`,
    `- Blocked credentials: ${report.supabaseReplacementFoundation.blockedCredentials}`,
    `- Invalid modes: ${report.supabaseReplacementFoundation.invalidModeCount}`,
    `- Live Supabase required for engineering: ${report.liveSupabaseRequiredForEngineering ? "YES" : "NO"}`,
    "",
    "## First-Party Foundation Matrix",
    "",
    "| Area | First-party target | Runtime evidence | Status |",
    "| --- | --- | --- | --- |",
    ...report.areas.map((area) => `| ${area.id} | ${area.firstPartyTarget} | ${area.runtimeEvidence} | ${area.status} |`),
    "",
    "## Manual Dependencies Still Required",
    "",
    "| Dependency | Blocker | Status |",
    "| --- | --- | --- |",
    ...report.manualDependencies.map((item) => `| ${item.id} | ${item.blocker} | ${item.status} |`),
    "",
    "## Safety Boundary",
    "",
    "- No Supabase project is connected by this review.",
    "- No production provider is activated by this review.",
    "- No secret values are read, printed, or committed.",
    "- No production-readiness certification is claimed.",
  ].join("\n");
}

export function writeFirstPartyPlatformFoundationReviewArtifacts(report = buildFirstPartyPlatformFoundationReview()) {
  const docsDir = resolve(ROOT, "docs", "launch-readiness");
  const artifactsDir = resolve(ROOT, "artifacts", "runtime-evidence");
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });
  const markdownPath = resolve(docsDir, "first-party-platform-foundation-review.md");
  const jsonPath = resolve(artifactsDir, "first-party-platform-foundation-review.json");
  writeFileSync(markdownPath, `${renderFirstPartyPlatformFoundationReview(report)}\n`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return { markdownPath, jsonPath };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  const report = buildFirstPartyPlatformFoundationReview();
  if (command === "json") console.log(JSON.stringify(report, null, 2));
  else if (command === "generate") console.log(JSON.stringify(writeFirstPartyPlatformFoundationReviewArtifacts(report), null, 2));
  else console.log(renderFirstPartyPlatformFoundationReview(report));
}
