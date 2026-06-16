import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  REQUIRED_MIGRATIONS,
  buildMigrationDryRunChecklist,
  checkSecretPresence,
  renderA4EvidenceTemplate,
  renderA4EvidencePackage,
  renderReadinessReport,
  validateA4EnvironmentConfig,
  validateProjectId,
  validateProjectIntake,
} from "../../scripts/a4-supabase-tooling.mjs";

const root = process.cwd();

const validIntake = {
  owners: {
    infrastructureOwner: "Operations Lead",
    billingOwner: "Finance Lead",
    accessOwner: "DevOps Lead",
  },
  development: { projectName: "RentasHub Development", projectId: "rentashubdev123" },
  uat: { projectName: "RentasHub UAT", projectId: "rentashubuat123" },
  production: { projectName: "RentasHub Production", projectId: "rentashubprod123" },
};

test("project ID validator accepts identifiers and rejects secret-like values", () => {
  assert.equal(validateProjectId("rentashubdev123").valid, true);
  assert.equal(validateProjectId("https://example.supabase.co").code, "url_not_project_id");
  assert.equal(validateProjectId("postgresql://user:pass@example/db").code, "secret_like_project_id");
  assert.equal(validateProjectId("").code, "missing_project_id");
});

test("project intake validates three environments and owners without credentials", () => {
  const result = validateProjectIntake(validIntake);
  assert.equal(result.ready, true);
  assert.equal(result.noSecretValues, true);
  assert.equal(result.environments.length, 3);
  assert.deepEqual(result.blockers, []);
});

test("project intake blocks missing IDs and wrong environment names", () => {
  const result = validateProjectIntake({
    owners: { infrastructureOwner: "Ops" },
    development: { projectName: "RentasHub Dev", projectId: "" },
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some((blocker) => blocker.includes("Development project name should be RentasHub Development")));
  assert.ok(result.blockers.some((blocker) => blocker.includes("Development project ID is missing")));
  assert.ok(result.blockers.some((blocker) => blocker.includes("Missing billingOwner")));
});

test("secret presence checker reports presence only and never returns values", () => {
  const result = checkSecretPresence({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "should-never-print",
  });
  const serviceRole = result.find((item) => item.key === "SUPABASE_SERVICE_ROLE_KEY");
  assert.equal(serviceRole.present, true);
  assert.equal(serviceRole.valuePrinted, false);
  assert.doesNotMatch(JSON.stringify(result), /should-never-print|example\.supabase\.co/);
});

test("migration dry-run checklist finds required migrations and keeps production on hold", () => {
  const result = buildMigrationDryRunChecklist(root);
  assert.equal(result.ready, true);
  assert.equal(result.environments.production, "hold_until_uat_signoff");
  assert.deepEqual(result.migrations.map((migration) => migration.name), REQUIRED_MIGRATIONS);
  for (const migration of result.migrations) {
    assert.equal(migration.exists, true);
    assert.equal(existsSync(join(root, migration.path)), true);
  }
});

test("environment readiness combines intake, secret presence, and migration checklist", () => {
  const result = validateA4EnvironmentConfig({
    intake: validIntake,
    env: {
      SUPABASE_URL: "present",
      SUPABASE_ANON_KEY: "present",
      SUPABASE_SERVICE_ROLE_KEY: "present",
      DATABASE_URL: "present",
    },
  });
  assert.equal(result.status, "READY_FOR_A4_02_REVIEW");
  assert.ok(result.secretPresence.every((item) => item.present));
  assert.equal(result.migrationChecklist.ready, true);
});

test("template and report include A4 gates without exposing secret values", () => {
  const template = renderA4EvidenceTemplate();
  assert.match(template, /A4-01 Infrastructure Ownership Confirmation/);
  assert.match(template, /A4-05 Execution Verification/);
  assert.doesNotMatch(template, /eyJ|postgresql:\/\/|sb_service/i);

  const result = validateA4EnvironmentConfig({
    intake: validIntake,
    env: {
      SUPABASE_SERVICE_ROLE_KEY: "actual-secret-value",
      DATABASE_URL: "postgresql://user:pass@example/db",
    },
  });
  const report = renderReadinessReport(result);
  assert.match(report, /Secret Presence/);
  assert.match(report, /value not printed/);
  assert.doesNotMatch(report, /actual-secret-value|postgresql:\/\/user:pass/);
});

test("A4 evidence package generator covers all evidence categories without secrets", () => {
  const packageText = renderA4EvidencePackage({ intake: validIntake, generatedAt: "2026-06-16T00:00:00.000Z" });
  for (const heading of [
    "A4-01 Infrastructure Ownership Confirmation",
    "A4-02 Environment Provisioning Verification",
    "A4-03 Migration Execution Evidence",
    "A4-04 Persistence Certification Evidence",
    "A4-04 RLS / RBAC Certification Evidence",
    "A4-04 Supabase Auth Evidence",
    "A4-04 Supabase Storage Evidence",
    "A4-04 Backup / Restore Evidence",
    "A4-04 Secrets Exposure Certification",
    "A4-05 Execution Verification Decision",
  ]) {
    assert.match(packageText, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const role of ["Customer", "Supplier", "Dealer/Broker", "Inspector", "Transport Provider", "Financing Partner", "Admin"]) {
    assert.match(packageText, new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const migration of REQUIRED_MIGRATIONS) {
    assert.match(packageText, new RegExp(migration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(packageText, /Production remains untouched/);
  assert.match(packageText, /SUPABASE_SERVICE_ROLE_KEY Absent/);
  assert.doesNotMatch(packageText, /eyJ|postgresql:\/\/|sb_service|actual-secret-value/i);
});
