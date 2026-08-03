import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { buildSupabaseReplacementReadiness } from "../server/src/platform/supabaseReplacementArchitecture.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");

function renderArchitecture(report) {
  return [
    "# S5-ABW-004 Supabase Independence Foundation",
    "",
    `Status: ${report.status}`,
    `Production ready: ${report.productionReady ? "YES" : "NO"}`,
    `Live Supabase required: ${report.liveSupabaseRequired ? "YES" : "NO"}`,
    "",
    "## Executive Architecture Decision",
    "",
    report.architectureDecision,
    "",
    "RentasHub should treat Supabase as an optional provider implementation, not the platform boundary. The platform boundary is defined by open, replaceable contracts:",
    "",
    "- PostgreSQL-compatible persistence and migration contracts.",
    "- OIDC/JWKS-compatible authentication and session contracts.",
    "- S3-compatible object storage and signed URL contracts.",
    "- Redis/BullMQ-compatible queue and worker contracts.",
    "- Internal domain events, audit logs, and tenant-scoped event fanout contracts.",
    "- Structured observability, health, readiness, and incident-evidence contracts.",
    "",
    "## Replacement Component Matrix",
    "",
    "| Component | Replaces | Default mode | Production mode | Status | Credential env names |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.components.map((component) => `| ${component.id} | ${component.replaces.join(", ")} | ${component.defaultMode} | ${component.productionMode} | ${component.status} | ${component.credentialEnvNames.map((name) => `\`${name}\``).join(", ")} |`),
    "",
    "## Fail-Closed Rules",
    "",
    ...report.components.map((component) => `- ${component.id}: ${component.failClosedRule}`),
    "",
    "## Manual Intervention Still Required",
    "",
    ...report.manualInterventionStillRequired.map((item) => `- ${item}`),
    "",
    "## Boundaries",
    "",
    "- This foundation does not connect to Supabase.",
    "- This foundation does not install provider SDKs or load credentials.",
    "- This foundation does not run migrations against a live database.",
    "- This foundation does not certify production readiness.",
  ].join("\n");
}

function renderCredentialContract(report) {
  return [
    "# S5-ABW-004 Provider-Neutral Credential Contract",
    "",
    "Credential values must be stored only in approved secret stores. This file lists names only.",
    "",
    "| Component | Selected by | Required credential names | Validation commands | Manual action |",
    "| --- | --- | --- | --- | --- |",
    ...report.components.map((component) => `| ${component.id} | \`${component.selectedBy}\` | ${component.credentialEnvNames.map((name) => `\`${name}\``).join(", ")} | ${component.validationCommands.map((command) => `\`${command}\``).join("<br>")} | ${component.manualIntervention} |`),
    "",
  ].join("\n");
}

export function writeSupabaseIndependenceArtifacts({ env = process.env } = {}) {
  const report = buildSupabaseReplacementReadiness(env);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "supabase-independence-readiness.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "supabase-independence-architecture.md"), `${renderArchitecture(report)}\n`);
  writeFileSync(join(OUT_DIR, "provider-neutral-credential-contract.md"), `${renderCredentialContract(report)}\n`);
  return report;
}

function printReport(report) {
  console.log(`SPRINT: ${report.sprint}`);
  console.log(`STATUS: ${report.status}`);
  console.log(`COMPONENTS: ${report.componentsTotal}`);
  console.log(`LOCAL READY: ${report.localReady}`);
  console.log(`CREDENTIAL READY: ${report.credentialReady}`);
  console.log(`BLOCKED CREDENTIALS: ${report.blockedCredentials}`);
  console.log(`LIVE SUPABASE REQUIRED: ${report.liveSupabaseRequired ? "YES" : "NO"}`);
  console.log(`PRODUCTION READY: NO`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] || "report";
  if (command === "generate") {
    const report = writeSupabaseIndependenceArtifacts();
    console.log(`Generated S5-ABW-004 Supabase independence artifacts. Components: ${report.componentsTotal}.`);
  } else if (command === "json") {
    console.log(JSON.stringify(buildSupabaseReplacementReadiness(), null, 2));
  } else if (command === "report") {
    printReport(buildSupabaseReplacementReadiness());
  } else {
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
  }
}
