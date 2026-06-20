import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  checkMigrationReadiness,
  checkRlsRbacSqlStaticReadiness,
  checkSupabaseProjectReferenceConsistency,
  detectDuplicateProjectIds,
  generateA4EvidenceManifest,
  generateA403MigrationEvidenceChecklist,
  buildA404InfrastructureCertificationEvidenceIndex,
  buildA405FinalInfrastructureReviewReport,
  parseA4EvidenceInput,
  scanGovernanceSecrets,
  scoreA402EnvironmentEvidence,
  scoreA4GovernanceEvidence,
  validateA4EvidenceIntake,
  validateSupabaseProjectId,
  verifySupabaseCredentialRedactionForReports,
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

test("A4-01 duplicate environment project ID detector blocks reused refs", () => {
  const result = detectDuplicateProjectIds({
    developmentProjectId: "abcdefghijklmnopqrst",
    uatProjectId: "abcdefghijklmnopqrst",
    productionProjectId: "cdefghijklmnopqrstuv",
  });
  assert.equal(result.status, "FAIL");
  assert.ok(result.duplicates.some((duplicate) => duplicate.fields.includes("developmentProjectId") && duplicate.fields.includes("uatProjectId")));

  const intake = validateA4EvidenceIntake({
    parsed: {
      ...completeA401,
      uatProjectId: completeA401.developmentProjectId,
    },
  });
  assert.equal(intake.status, "FAIL");
  assert.ok(intake.blockers.some((blocker) => /same project ID/.test(blocker)));
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

test("A4-02 environment evidence scorer keeps provisioning blocked without filled evidence", () => {
  const score = scoreA402EnvironmentEvidence();
  assert.equal(score.status, "BLOCKED");
  assert.equal(score.liveProvisioningClaimed, false);
  assert.equal(score.valuesPrinted, false);
  assert.equal(score.templates.length, 3);
  assert.ok(score.blockers.some((blocker) => /pending|not-submitted|blocked/i.test(blocker)));
});

test("A4-03 migration evidence checklist covers development UAT rollback and production hold", () => {
  const checklist = generateA403MigrationEvidenceChecklist();
  assert.equal(checklist.status, "GENERATED");
  assert.equal(checklist.liveDatabaseTouched, false);
  assert.equal(checklist.databaseUrlRequired, false);
  assert.equal(checklist.migrations.length, 8);
  assert.equal(checklist.rollbackEvidence.length, 4);
  assert.match(checklist.productionHold.requiredEvidence, /Production untouched/);
});

test("A4-04 infrastructure certification evidence index remains blocked pending manual evidence", () => {
  const index = buildA404InfrastructureCertificationEvidenceIndex();
  assert.equal(index.status, "BLOCKED_PENDING_MANUAL_EVIDENCE");
  assert.equal(index.liveInfrastructureClaimed, false);
  assert.ok(index.sections.some((section) => /Supabase Auth lifecycle/.test(section.section)));
  assert.ok(index.blockers.some((blocker) => /Backup\/restore/.test(blocker)));
});

test("A4-05 final infrastructure review report remains no-go without full evidence", () => {
  const report = buildA405FinalInfrastructureReviewReport({ a401: completeA401 });
  assert.equal(report.status, "NO_GO_REMAIN_RC_0_6A");
  assert.equal(report.liveInfrastructureClaimed, false);
  assert.equal(report.a401Status, "PASS");
  assert.ok(report.blockers.some((blocker) => /A4-02/.test(blocker)));
  assert.equal(report.nextAuthorizedGate, "A4-01 Infrastructure Ownership Confirmation Submitted");
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

test("Supabase project reference consistency checker is static and reports refs without connecting", () => {
  const temp = mkdtempSync(join(tmpdir(), "rentashub-project-refs-"));
  try {
    const docsDir = join(temp, "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "supabase.md"), "Project URL: https://abcdefghijklmnopqrst.supabase.co\nMCP: project_ref=abcdefghijklmnopqrst");
    const result = checkSupabaseProjectReferenceConsistency({
      root: temp,
      expectedProjectIds: ["abcdefghijklmnopqrst"],
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.liveConnectionAttempted, false);
    assert.deepEqual(result.uniqueRefs, ["abcdefghijklmnopqrst"]);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("Supabase credential redaction verifier catches unredacted report values", () => {
  const serviceRoleLabel = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const serviceRoleValue = ["sb", "service", "supersecretvalue12345"].join("_");
  const failed = verifySupabaseCredentialRedactionForReports({
    contents: [`${serviceRoleLabel}=${serviceRoleValue}`],
  });
  assert.equal(failed.status, "FAIL");
  assert.equal(failed.valuesPrinted, false);
  assert.doesNotMatch(JSON.stringify(failed), new RegExp(serviceRoleValue));

  const passed = verifySupabaseCredentialRedactionForReports({
    contents: ["No credential values included. SUPABASE_SERVICE_ROLE_KEY: REDACTED"],
  });
  assert.equal(passed.status, "PASS");
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
