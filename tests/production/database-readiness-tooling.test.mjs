import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REQUIRED_A4_MIGRATIONS,
  buildDatabaseLaunchBlockerReport,
  buildDatabaseReadinessReport,
  buildMigrationDependencyGraph,
  buildMigrationRollbackChecklists,
  buildRlsTableCoverageDashboard,
  buildSeedDataEvidenceChecklist,
  checkSeedDataReadiness,
  renderDatabaseBackupRestoreEvidenceTemplate,
  renderDatabaseLaunchBlockerReport,
  renderMigrationDependencyGraphReport,
  renderMigrationExecutionEvidenceTemplate,
  renderMigrationRollbackChecklistReport,
  renderRlsTableCoverageDashboard,
  renderSeedDataEvidenceChecklist,
  renderBackupRestoreEvidenceTemplate,
  renderSupabaseMigrationEvidenceTemplate,
  validateMigrationOrder,
  validatePostgresUrl,
  validateRollbackPlan,
} from "../../scripts/database-readiness-tooling.mjs";

test("migration order validator confirms sequential migration order and A4 sequence", () => {
  const result = validateMigrationOrder();
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.a4Sequence.map((item) => item.file), REQUIRED_A4_MIGRATIONS);
  assert.ok(result.a4Sequence.every((item) => item.present));
  assert.equal(result.productionHold, true);
});

test("PostgreSQL URL format validator accepts shaped Supabase URLs and rejects placeholders", () => {
  const valid = validatePostgresUrl("postgresql://postgres.projectref:secret-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres");
  assert.equal(valid.status, "PASS");
  assert.equal(valid.supabaseHostLikely, true);
  assert.equal(valid.valuePrinted, false);

  const invalid = validatePostgresUrl("postgresql://postgres.<project-ref>:<password>@example.com/postgres");
  assert.equal(invalid.status, "FAIL");
  assert.ok(invalid.blockers.some((blocker) => /placeholder/i.test(blocker)));
});

test("seed-data readiness checker covers A4 required roles and core tables", () => {
  const result = checkSeedDataReadiness();
  assert.equal(result.status, "PASS");
  for (const role of ["customer", "supplier", "dealer", "inspector", "transport_provider", "financing_partner", "admin"]) {
    assert.ok(result.requiredRoles.includes(role));
  }
});

test("rollback plan validator finds backup restore production hold and signoff language", () => {
  const result = validateRollbackPlan();
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.missing, []);
});

test("Supabase migration and backup restore evidence templates avoid secrets", () => {
  const migration = renderSupabaseMigrationEvidenceTemplate();
  const backup = renderBackupRestoreEvidenceTemplate();
  assert.match(migration, /004_supabase_activation_architecture\.sql/);
  assert.match(migration, /Do not include passwords/);
  assert.match(backup, /RPO observed/);
  assert.match(backup, /RTO observed/);
  const forbiddenSecretLabels = ["SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"];
  for (const label of forbiddenSecretLabels) {
    assert.doesNotMatch(`${migration}\n${backup}`, new RegExp(`${label}\\s*=`));
  }
});

test("database readiness report combines validators without printing secret values", () => {
  const report = buildDatabaseReadinessReport({
    databaseUrl: "postgresql://postgres.projectref:secret-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  });
  assert.equal(report.status, "CREDENTIAL_READY");
  assert.equal(report.valuePrinted, false);
  assert.equal(report.blockers.length, 0);
});

test("migration dependency graph visual report covers all migrations without executing SQL", () => {
  const graph = buildMigrationDependencyGraph();
  const report = renderMigrationDependencyGraphReport(graph);
  assert.equal(graph.status, "PASS");
  assert.equal(graph.productionHold, true);
  assert.ok(graph.nodes.length >= REQUIRED_A4_MIGRATIONS.length);
  assert.match(report, /```mermaid/);
  assert.match(report, /004_supabase_activation_architecture\.sql/);
  assert.doesNotMatch(report, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
});

test("migration rollback checklist generator creates one checklist per SQL file", () => {
  const checklists = buildMigrationRollbackChecklists();
  const report = renderMigrationRollbackChecklistReport(checklists);
  assert.ok(checklists.length >= REQUIRED_A4_MIGRATIONS.length);
  assert.ok(checklists.every((item) => item.requiredChecks.includes("Pre-migration backup confirmed")));
  assert.match(report, /Rollback Checklist Generator/);
  assert.match(report, /007_audit_logging_activation\.sql/);
});

test("migration execution evidence template is environment-scoped and redacted", () => {
  const template = renderMigrationExecutionEvidenceTemplate({ environment: "UAT" });
  assert.match(template, /Migration Execution Evidence Template - UAT/);
  assert.match(template, /Production untouched/);
  for (const migration of REQUIRED_A4_MIGRATIONS) assert.match(template, new RegExp(migration.replaceAll(".", "\\.")));
  assert.doesNotMatch(template, /DATABASE_URL=/);
  assert.doesNotMatch(template, new RegExp(["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_") + "="));
});

test("seed-data evidence checklist reports required role and table coverage", () => {
  const checklist = buildSeedDataEvidenceChecklist();
  const report = renderSeedDataEvidenceChecklist(checklist);
  assert.equal(checklist.status, "PASS");
  assert.ok(checklist.requiredRoles.some((item) => item.role === "admin" && item.seedUserPresent));
  assert.ok(checklist.requiredTables.some((item) => item.table === "audit_logs" && item.present));
  assert.match(report, /Seed Data Evidence Checklist/);
});

test("database backup restore evidence template includes RPO RTO and integrity validation", () => {
  const template = renderDatabaseBackupRestoreEvidenceTemplate();
  assert.match(template, /Database Backup and Restore Evidence Template/);
  assert.match(template, /RPO Observed/);
  assert.match(template, /RTO Observed/);
  assert.match(template, /RLS\/RBAC spot checks repeated/);
  assert.doesNotMatch(template, /postgresql:\/\/postgres:/);
});

test("RLS table coverage dashboard is static and exposes review blockers without runtime claims", () => {
  const dashboard = buildRlsTableCoverageDashboard();
  const report = renderRlsTableCoverageDashboard(dashboard);
  assert.equal(dashboard.status, "REVIEW_REQUIRED");
  assert.ok(dashboard.totalTables > 0);
  assert.match(report, /Static SQL analysis cannot prove runtime enforcement/);
  assert.ok(dashboard.coverage.some((item) => item.table === "users"));
});

test("database launch blocker report keeps RC-0.6A blocked until real A4 evidence exists", () => {
  const report = buildDatabaseLaunchBlockerReport({
    databaseUrl: "postgresql://postgres.projectref:secret-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  });
  const rendered = renderDatabaseLaunchBlockerReport(report);
  assert.equal(report.status, "BLOCKED_PENDING_A4_EVIDENCE");
  assert.match(report.recommendation, /Remain RC-0\.6A/);
  assert.ok(report.blockers.some((blocker) => /actual Development, UAT\/Staging, and Production Supabase project IDs/.test(blocker)));
  assert.match(rendered, /Production migrations remain blocked/);
});
