import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REQUIRED_A4_MIGRATIONS,
  buildDatabaseReadinessReport,
  checkSeedDataReadiness,
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
