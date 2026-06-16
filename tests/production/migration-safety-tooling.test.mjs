import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import {
  buildMigrationEvidenceReport,
  detectDestructiveSql,
  enforceProductionMigrationGuard,
  renderMigrationEvidenceReport,
  validateRollbackCoverage,
  validateSqlLintStyle,
} from "../../scripts/migration-safety-tooling.mjs";

function tempMigrationDir(files) {
  const dir = mkdtempSync(join(tmpdir(), "rentashub-migrations-"));
  for (const [file, text] of Object.entries(files)) {
    writeFileSync(join(dir, file), text);
  }
  return dir;
}

test("SQL lint-style validator passes current migration files", () => {
  const result = validateSqlLintStyle();
  assert.equal(result.status, "PASS");
  assert.ok(result.scannedFiles >= 7);
  assert.deepEqual(result.blockers, []);
});

test("SQL lint-style validator catches empty files, conflict markers, and missing semicolon", () => {
  const directory = tempMigrationDir({
    "001_bad.sql": "CREATE TABLE example (\n<<<<<<< HEAD\n id uuid\n=======\n name text\n>>>>>>> branch\n)",
    "002_empty.sql": "",
  });
  const result = validateSqlLintStyle({ directory });
  assert.equal(result.status, "FAIL");
  assert.ok(result.blockers.some((blocker) => /semicolon|Merge conflict|empty/i.test(blocker)));
});

test("destructive SQL detector blocks dangerous migration statements", () => {
  const directory = tempMigrationDir({
    "001_safe.sql": "CREATE TABLE IF NOT EXISTS public.safe_table (id uuid PRIMARY KEY);",
    "002_unsafe.sql": "DROP TABLE public.users;\nTRUNCATE public.audit_logs;\nDELETE FROM public.assets;",
  });
  const result = detectDestructiveSql({ directory });
  assert.equal(result.status, "FAIL");
  assert.ok(result.findings.some((finding) => finding.rule === "drop_table"));
  assert.ok(result.findings.some((finding) => finding.rule === "truncate"));
  assert.ok(result.findings.some((finding) => finding.rule === "delete_from"));
});

test("destructive SQL detector permits idempotent policy and trigger replacement in current migrations", () => {
  const result = detectDestructiveSql();
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.findings, []);
});

test("production migration guard confirms A4 migrations are held from production", () => {
  const result = enforceProductionMigrationGuard();
  assert.equal(result.status, "PASS");
  assert.equal(result.productionTouched, false);
  assert.equal(result.requiredMigrationsChecked, 4);
});

test("rollback coverage validator confirms operational rollback evidence exists", () => {
  const result = validateRollbackCoverage();
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.blockers, []);
  assert.ok(result.a4MigrationCoverage.every((item) => item.mentionedInDocs));
});

test("migration evidence report combines all checks without touching live databases", () => {
  const report = buildMigrationEvidenceReport();
  assert.equal(report.status, "PASS");
  assert.equal(report.liveDatabaseTouched, false);
  assert.equal(report.productionTouched, false);
  assert.ok(report.checks.some((check) => check.name === "destructive_sql"));

  const rendered = renderMigrationEvidenceReport(report);
  assert.match(rendered, /Migration Safety Evidence Report/);
  assert.match(rendered, /Production Touched: NO/);
});
