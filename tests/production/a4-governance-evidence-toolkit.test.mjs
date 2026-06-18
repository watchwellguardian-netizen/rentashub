import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  checkMigrationReadiness,
  checkRlsRbacSqlStaticReadiness,
  generateA4EvidenceManifest,
  parseA4EvidenceInput,
  scanGovernanceSecrets,
  scoreA4GovernanceEvidence,
  validateA4EvidenceIntake,
  validateSupabaseProjectId,
} from "../../scripts/a4-governance-evidence-toolkit.mjs";

const completeA401 = {
  organization: "Graphene Rock Capital Limited",
  infrastructureOwner: "Richard Kildare",
  billingOwner: "Graphene Rock Capital Limited",
  accessOwner: "Richard Kildare",
  developmentProjectName: "RentasHub-Development",
  developmentProjectId: "abcdefghijklmnopqrst",
  uatProjectName: "RentasHub-Staging",
  uatProjectId: "bcdefghijklmnopqrstu",
  productionProjectName: "RentasHub-Production",
  productionProjectId: "cdefghijklmnopqrstuv",
};

test("A4-01 intake validator fails missing project IDs while preserving owner evidence", () => {
  const result = validateA4EvidenceIntake({
    parsed: {
      organization: "Graphene Rock Capital Limited",
      infrastructureOwner: "Richard Kildare",
      billingOwner: "Graphene Rock Capital Limited",
      accessOwner: "Richard Kildare",
      developmentProjectName: "RentasHub-Development",
      uatProjectName: "RentasHub-Staging",
      productionProjectName: "RentasHub-Production",
    },
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.fields.find((field) => field.key === "infrastructureOwner").present, true);
  assert.ok(result.blockers.some((blocker) => blocker.includes("developmentProjectId")));
  assert.equal(result.nextAuthorizedGate, "A4-01 Infrastructure Ownership Confirmation Submitted");
});

test("A4-01 intake validator rejects placeholder and secret-like project IDs", () => {
  assert.equal(validateSupabaseProjectId("<actual Supabase ID>").code, "placeholder_project_id");
  assert.equal(validateSupabaseProjectId("pending creation").code, "placeholder_project_id");
  assert.equal(validateSupabaseProjectId("https://project.supabase.co").code, "url_not_project_id");
  assert.equal(validateSupabaseProjectId("postgresql://user:pass@host/db").code, "secret_like_project_id");
});

test("A4-01 accepted owners without real project IDs remain partial in scoring", () => {
  const score = scoreA4GovernanceEvidence({
    parsed: {
      organization: "Graphene Rock Capital Limited",
      infrastructureOwner: "Richard Kildare",
      billingOwner: "Graphene Rock Capital Limited",
      accessOwner: "Richard Kildare",
    },
  });
  assert.equal(score.status, "PARTIAL");
  assert.equal(score.gates.find((gate) => gate.id === "A4-01").status, "PARTIAL");
  assert.ok(score.blockers.some((blocker) => blocker.includes("Development Project ID")));
});

test("A4-01 complete evidence advances only to A4-02 and does not claim live activation", () => {
  const result = validateA4EvidenceIntake({ parsed: completeA401 });
  assert.equal(result.status, "PASS");
  assert.equal(result.noSecretsDetected, true);
  assert.equal(result.nextAuthorizedGate, "A4-02 Environment Provisioning Verification");

  const score = scoreA4GovernanceEvidence({ parsed: completeA401 });
  assert.ok(score.gates.some((gate) => gate.id === "A4-02" && gate.manualInterventionRequired));
  assert.match(score.note, /Credential-readiness scoring only/);
});

test("loose text parser extracts A4-01 owner and project evidence", () => {
  const parsed = parseA4EvidenceInput(`
Organization:
Graphene Rock Capital Limited

Infrastructure Owner:
Richard Kildare

Billing Owner:
Graphene Rock Capital Limited

Access Owner:
Richard Kildare

Development
Project Name:
RentasHub-Development
Project ID:
abcdefghijklmnopqrst
`);
  assert.equal(parsed.organization, "Graphene Rock Capital Limited");
  assert.equal(parsed.developmentProjectName, "RentasHub-Development");
  assert.equal(parsed.developmentProjectId, "abcdefghijklmnopqrst");
});

test("secret detection reports redacted finding metadata only", () => {
  const serviceRoleLabel = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const serviceRoleValue = ["sb", "service", "supersecretvalue12345"].join("_");
  const result = validateA4EvidenceIntake({
    content: `${serviceRoleLabel}=${serviceRoleValue}`,
    source: "submitted-evidence.md",
  });
  assert.equal(result.status, "FAIL");
  assert.ok(result.findings.some((finding) => finding.field === "secrets"));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(serviceRoleValue));
});

test("manifest generation writes an evidence manifest without secrets", () => {
  const temp = mkdtempSync(join(tmpdir(), "rentashub-a4-"));
  try {
    const output = join(temp, "a4-evidence-manifest.md");
    const result = generateA4EvidenceManifest({
      content: "# A4 Evidence\n\nNo secrets here.",
      output,
    });
    assert.equal(result.status, "PASS");
    assert.equal(existsSync(output), true);
    const text = readFileSync(output, "utf8");
    assert.match(text, /A4 Evidence Manifest/);
    assert.match(text, /No-Secrets Confirmation/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("migration readiness works without requiring a live DATABASE_URL", () => {
  const result = checkMigrationReadiness();
  assert.equal(result.liveDatabaseTouched, false);
  assert.equal(result.databaseUrlRequired, false);
  assert.ok(result.required.every((migration) => migration.exists));
});

test("RLS/RBAC static analyzer reports SQL coverage without claiming live enforcement", () => {
  const result = checkRlsRbacSqlStaticReadiness();
  assert.equal(result.liveRlsClaimed, false);
  assert.ok(["PASS", "NEEDS_REVIEW"].includes(result.status));
  assert.ok(result.referenceCoverage.some((item) => item.reference === "tenant"));
});

test("governance secret scanner can scan fixture roots and redact values", () => {
  const temp = mkdtempSync(join(tmpdir(), "rentashub-secrets-"));
  try {
    const scriptsDir = join(temp, "scripts");
    // The scanner's configured surfaces are src/server/docs/tests/scripts/dist.
    // Put the secret under docs so fixture behavior matches production scan surfaces.
    const docsDir = join(temp, "docs");
    mkdirSync(docsDir, { recursive: true });
    mkdirSync(scriptsDir, { recursive: true });
    const serviceRoleLabel = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
    const serviceRoleValue = ["sb", "service", "supersecretvalue12345"].join("_");
    writeFileSync(join(docsDir, "secret.md"), `${serviceRoleLabel}=${serviceRoleValue}`);
    const result = scanGovernanceSecrets({ root: temp });
    assert.equal(result.status, "FAIL");
    assert.equal(result.findings[0].sample, "REDACTED");
    assert.doesNotMatch(JSON.stringify(result), new RegExp(serviceRoleValue));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
