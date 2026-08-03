import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const sourceRequired = [
  "docs/deployment-readiness.md",
  "docs/monitoring-observability-readiness.md",
  "docs/pilot-operations-playbook.md",
  "docs/supplier-onboarding-playbook.md",
  "docs/customer-support-playbook.md",
  "docs/admin-moderation-playbook.md",
  "docs/payment-provider-activation-readiness.md",
  "docs/payment-operations-playbook.md",
  "docs/escrow-activation-readiness.md",
  "docs/escrow-operations-playbook.md",
  "docs/escrow-dispute-playbook.md",
  "docs/infrastructure-activation-readiness.md",
  "docs/disaster-recovery-plan.md",
  "docs/backup-recovery-playbook.md",
  "docs/deployment-runbook.md",
  "docs/environment-promotion-guide.md",
  "docs/phase-2-production-activation-roadmap.md",
  "docs/supabase-auth-activation.md",
  "docs/production-launch-checklist.md",
  "docs/security-hardening-baseline.md",
  "docs/security-certification-readiness.md",
  "docs/owasp-review-checklist.md",
  "docs/security-audit-checklist.md",
  "docs/incident-response-plan.md",
  "docs/vulnerability-management-plan.md",
  "docs/secrets-management-guide.md",
  "docs/closed-beta-readiness-report.md",
  "docs/closed-beta-checklist.md",
  "docs/beta-risk-register.md",
  "docs/beta-success-metrics.md",
  "docs/paid-pilot-readiness-report.md",
  "docs/revenue-operations-playbook.md",
  "docs/pilot-sla-framework.md",
  "docs/commercial-risk-register.md",
  "docs/public-launch-certification-report.md",
  "docs/final-launch-gap-register.md",
  "docs/public-launch-risk-register.md",
  "docs/executive-launch-report.md",
  "docs/board-launch-readiness-report.md",
  "docs/phase-3-production-activation-program.md",
  "docs/project-a-supabase-activation-intake.md",
  "docs/full-click-through-operational-audit.md",
  "docs/operational-simulation-report.md",
  "docs/operational-simulation-defect-register.md",
  "docs/operational-simulation-critical-issues.md",
  "docs/paid-pilot-operational-recommendation.md",
  "docs/public-launch-operational-recommendation.md",
  "docs/ai-review-gap-closeout.md",
  "docs/beta-uat-execution-plan.md",
  "docs/performance-load-test-plan.md",
  "server/src/security/securityCertificationReadiness.js",
  "server/docs/supabase-postgres-activation.md",
  "server/docs/supabase-storage-activation.md",
  ".env.staging.example",
  ".env.production.example",
  "server/.env.staging.example",
  "server/.env.production.example",
  "Dockerfile",
  "docker-compose.example.yml",
];
const buildRequired = ["dist/index.html"];

const forbiddenSegments = new Set(["node_modules", ".git"]);
const forbiddenPatterns = [/^server[\\/]\.data[\\/]/, /rentashub-dev-db\.json$/];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);
    if (parts.some((part) => forbiddenSegments.has(part))) continue;
    if (parts.length >= 2 && parts[0] === "server" && parts[1] === ".data") continue;
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(rel);
  }
  return files;
}

export function validateZipArtifactInclusionExclusion({ requireBuild = true } = {}) {
  const required = requireBuild ? [...sourceRequired, ...buildRequired] : sourceRequired;
  const missing = required.filter((file) => !existsSync(join(root, file)));
  const files = walk(root);
  const forbidden = files.filter((file) => forbiddenPatterns.some((pattern) => pattern.test(file)));
  const blockers = [
    ...missing.map((file) => `Missing required artifact file: ${file}`),
    ...forbidden.map((file) => `Generated runtime data would be included: ${file}`),
  ];
  return {
    status: blockers.length ? "FAIL" : "PASS",
    checkedFiles: files.length,
    requiredFiles: required,
    missing,
    forbidden,
    excludedSegments: [...forbiddenSegments],
    blockers,
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = validateZipArtifactInclusionExclusion();
  if (result.status === "FAIL") {
    for (const blocker of result.blockers) console.error(`[zip-check] ${blocker}`);
    process.exit(1);
  }

  console.log(`[zip-check] PASS: ${result.checkedFiles} packageable files checked. Required deployment artifacts exist and runtime data is excluded.`);
}
