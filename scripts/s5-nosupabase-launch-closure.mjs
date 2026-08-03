import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildLaunchBlockerDashboard } from "./launch-readiness-tooling.mjs";
import { getIntegrationReadiness } from "../server/src/config/integrationReadiness.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const NON_SUPABASE_CLOSURE_ITEMS = [
  {
    id: "production-auth",
    blocker: "Real production auth not certified",
    engineeringState: "AUTHORIZATION_ENGINEERING_COMPLETE",
    credentialReadiness: "OIDC_CREDENTIAL_READY",
    completionState: "LIVE_IDENTITY_PROVIDER_PENDING",
    requiredEvidence: [
      "Issuer URL",
      "Client ID and approved audience",
      "JWKS URL",
      "Redirect and logout URI approvals",
      "Secret-storage location confirmation",
      "Live registration/login/logout/session/refresh/revocation evidence",
    ],
    ownerAction: "Configure approved identity provider or first-party OIDC service and run the auth authorization runtime workflow with live non-production credentials.",
  },
  {
    id: "production-storage",
    blocker: "Real storage provider not certified",
    engineeringState: "OBJECT_STORAGE_ENGINEERING_COMPLETE",
    credentialReadiness: "S3_CREDENTIAL_READY",
    completionState: "LIVE_STORAGE_PROVIDER_PENDING",
    requiredEvidence: [
      "Provider endpoint and bucket inventory",
      "Secret-storage location confirmation",
      "Upload/download/delete proof",
      "Signed URL expiry proof",
      "Private access denial proof",
      "Retention and cleanup evidence",
    ],
    ownerAction: "Configure S3-compatible storage in Development/UAT and run object-storage export runtime validation with provider-safe credentials.",
  },
  {
    id: "payments",
    blocker: "Payment provider not activated or certified",
    engineeringState: "PAYMENT_CONTRACTS_AND_EVIDENCE_READY",
    credentialReadiness: "PAYMENT_SANDBOX_CREDENTIAL_READY",
    completionState: "PAYMENT_PROVIDER_APPROVAL_PENDING",
    requiredEvidence: [
      "Provider account owner",
      "Sandbox credential location",
      "Webhook verification proof",
      "Authorization/capture/refund evidence",
      "Chargeback/dispute handling evidence",
      "Payout, settlement, and Tax/GCT approval",
    ],
    ownerAction: "Select and approve payment provider, store sandbox credentials securely, and execute sandbox payment evidence package.",
  },
  {
    id: "escrow",
    blocker: "Escrow provider and protected-funds controls not certified",
    engineeringState: "ESCROW_CONTRACTS_AND_LEDGER_EVIDENCE_READY",
    credentialReadiness: "ESCROW_PROVIDER_CREDENTIAL_READY",
    completionState: "LEGAL_TRUST_ACCOUNT_AND_PROVIDER_PENDING",
    requiredEvidence: [
      "Escrow provider approval",
      "Legal trust account approval",
      "Deposit hold/release proof",
      "Partial release proof",
      "Refund/dispute proof",
      "Ledger reconciliation evidence",
    ],
    ownerAction: "Complete legal trust account review, provider approval, and sandbox evidence before paid pilot.",
  },
  {
    id: "dns-tls-hosting",
    blocker: "DNS, TLS, hosting, and deployment evidence not complete",
    engineeringState: "DEPLOYMENT_READINESS_COMPLETE",
    credentialReadiness: "HOSTING_DNS_TLS_CREDENTIAL_READY",
    completionState: "PRODUCTION_INFRASTRUCTURE_OWNER_ACTION_PENDING",
    requiredEvidence: [
      "Domain ownership",
      "DNS zone owner and records",
      "TLS certificate proof",
      "Hosting project/environment mapping",
      "Rollback and emergency deployment proof",
      "Production launch infrastructure checklist",
    ],
    ownerAction: "Configure hosting, DNS, TLS, environment variables, and deployment ownership, then capture deployment evidence.",
  },
  {
    id: "monitoring-secrets",
    blocker: "Monitoring and secret-management production evidence not complete",
    engineeringState: "OBSERVABILITY_ENGINEERING_COMPLETE",
    credentialReadiness: "ALERTING_AND_SECRET_STORE_CREDENTIAL_READY",
    completionState: "LIVE_TELEMETRY_AND_SECRET_STORE_EVIDENCE_PENDING",
    requiredEvidence: [
      "Sentry or equivalent project",
      "Uptime monitor and alert route proof",
      "Log drain proof",
      "Incident notification test",
      "Secret store owner and access control proof",
      "Secret exposure scan evidence",
    ],
    ownerAction: "Configure live telemetry destinations and approved secret storage, then run monitoring and secret-safety evidence checks.",
  },
  {
    id: "legal-compliance-security",
    blocker: "Legal, compliance, security certification, and privacy signoff not complete",
    engineeringState: "CERTIFICATION_PACKAGE_COMPLETE",
    credentialReadiness: "LEGAL_SECURITY_COMPLIANCE_REVIEW_READY",
    completionState: "OWNER_SIGNOFF_PENDING",
    requiredEvidence: [
      "Privacy policy legal approval",
      "Terms of use legal approval",
      "Jamaica DPA/GDPR readiness signoff",
      "KYC/vendor review",
      "OWASP/security review",
      "Penetration-test execution and remediation evidence",
    ],
    ownerAction: "Route the prepared evidence package to legal, privacy, compliance, and security owners for approval.",
  },
  {
    id: "uat-signoff",
    blocker: "UAT and operational signoff not complete",
    engineeringState: "OPERATIONS_ENGINEERING_COMPLETE",
    credentialReadiness: "UAT_EXECUTION_READY",
    completionState: "UAT_OWNER_EXECUTION_PENDING",
    requiredEvidence: [
      "UAT test plan",
      "Supplier/customer/admin test accounts",
      "Support escalation drill",
      "Closed beta acceptance scorecard",
      "Known defects register",
      "UAT go/no-go signoff",
    ],
    ownerAction: "Execute UAT in approved non-production environments and submit operational acceptance evidence.",
  },
];

function noSecretPolicy() {
  return [
    "Do not include database URLs, service-role keys, JWT secrets, payment secrets, escrow secrets, private keys, passwords, tokens, or screenshots containing credentials.",
    "Evidence may name the approved secret store and variable names, but must not include values.",
  ];
}

function calculateScores(items = NON_SUPABASE_CLOSURE_ITEMS) {
  const engineeringComplete = items.filter((item) => /COMPLETE|READY/.test(item.engineeringState)).length;
  const credentialReady = items.filter((item) => /READY/.test(item.credentialReadiness)).length;
  const externallyPending = items.filter((item) => /PENDING/.test(item.completionState)).length;
  return {
    engineeringControlledCompletion: Math.round((engineeringComplete / items.length) * 100),
    credentialReadiness: Math.round((credentialReady / items.length) * 100),
    externalCompletion: Math.round(((items.length - externallyPending) / items.length) * 100),
    launchCertification: 0,
  };
}

export function buildNonSupabaseLaunchClosureReport({ generatedAt = new Date().toISOString(), env = process.env } = {}) {
  const integration = getIntegrationReadiness(env);
  const launch = buildLaunchBlockerDashboard();
  const scores = calculateScores();
  return {
    sprint: "S5-NOSUP-001",
    generatedAt,
    platform: "RentasHub Marketplace",
    classification: "RC-0.6A",
    scope: "Non-Supabase launch-blocker credential-readiness closure",
    status: "NON_SUPABASE_CREDENTIAL_READINESS_COMPLETE",
    productionReady: false,
    paidPilotReady: false,
    publicLaunchReady: false,
    supabaseDeferred: true,
    liveProviderActivation: false,
    launchStatus: launch.status,
    integrationSummary: {
      productionReady: integration.productionReady,
      paymentReady: integration.checks.paymentActivation?.ready === true,
      escrowReady: integration.checks.escrow?.ready === true,
      monitoringReady: integration.checks.monitoring?.ready === true,
      complianceReady: integration.checks.compliance?.ready === true,
    },
    scores,
    items: NON_SUPABASE_CLOSURE_ITEMS,
    manualInterventionStillRequired: NON_SUPABASE_CLOSURE_ITEMS.map((item) => ({
      id: item.id,
      blocker: item.blocker,
      ownerAction: item.ownerAction,
      requiredEvidence: item.requiredEvidence,
    })),
    noSecretPolicy: noSecretPolicy(),
    safety: {
      connectsToSupabase: false,
      activatesLiveProviders: false,
      readsSecretValues: false,
      printsSecretValues: false,
      claimsProductionReady: false,
    },
    nextRecommendedSprint: "S5-FP-001 - First-party platform foundation review or S5-REW evidence consolidation",
  };
}

export function renderNonSupabaseLaunchClosureReport(report = buildNonSupabaseLaunchClosureReport()) {
  return [
    "# S5-NOSUP-001 Non-Supabase Launch-Blocker Closure",
    "",
    `Generated: ${report.generatedAt}`,
    `Platform: ${report.platform}`,
    `Classification: ${report.classification}`,
    `Status: ${report.status}`,
    `Production Ready: ${report.productionReady ? "YES" : "NO"}`,
    `Paid Pilot Ready: ${report.paidPilotReady ? "YES" : "NO"}`,
    `Public Launch Ready: ${report.publicLaunchReady ? "YES" : "NO"}`,
    `Supabase Work Deferred: ${report.supabaseDeferred ? "YES" : "NO"}`,
    "",
    "## Scores",
    "",
    `- Engineering-Controlled Completion: ${report.scores.engineeringControlledCompletion}%`,
    `- Credential Readiness: ${report.scores.credentialReadiness}%`,
    `- External Completion: ${report.scores.externalCompletion}%`,
    `- Launch Certification: ${report.scores.launchCertification}%`,
    "",
    "## Safety Boundary",
    "",
    ...report.noSecretPolicy.map((line) => `- ${line}`),
    "- No live provider is activated by this report.",
    "- No production-readiness claim is made by this report.",
    "",
    "## Non-Supabase Launch Closure Register",
    "",
    "| Area | Engineering State | Credential Readiness | Completion State | Owner Action |",
    "| --- | --- | --- | --- | --- |",
    ...report.items.map((item) => `| ${item.blocker} | ${item.engineeringState} | ${item.credentialReadiness} | ${item.completionState} | ${item.ownerAction} |`),
    "",
    "## Required Evidence Still Manual",
    "",
    ...report.manualInterventionStillRequired.flatMap((item) => [
      `### ${item.id}`,
      "",
      `Blocker: ${item.blocker}`,
      "",
      ...item.requiredEvidence.map((evidence) => `- ${evidence}`),
      "",
    ]),
    "## Decision",
    "",
    "Non-Supabase engineering-controlled launch closure is complete at credential-readiness level. Real provider activation, legal/security/compliance approval, UAT signoff, and production deployment evidence remain required before launch certification.",
  ].join("\n");
}

export function writeNonSupabaseLaunchClosureArtifacts(report = buildNonSupabaseLaunchClosureReport()) {
  const docsDir = resolve(ROOT, "docs/launch-readiness");
  const artifactsDir = resolve(ROOT, "artifacts/runtime-evidence");
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });
  const markdownPath = resolve(docsDir, "non-supabase-launch-closure.md");
  const jsonPath = resolve(artifactsDir, "non-supabase-launch-closure.json");
  writeFileSync(markdownPath, `${renderNonSupabaseLaunchClosureReport(report)}\n`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return { markdownPath, jsonPath };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  const report = buildNonSupabaseLaunchClosureReport();
  if (command === "json") console.log(JSON.stringify(report, null, 2));
  else if (command === "generate") console.log(JSON.stringify(writeNonSupabaseLaunchClosureArtifacts(report), null, 2));
  else console.log(renderNonSupabaseLaunchClosureReport(report));
}
