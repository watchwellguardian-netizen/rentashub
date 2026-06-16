import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { REQUIRED_A4_MIGRATIONS, validateMigrationOrder } from "./database-readiness-tooling.mjs";

const root = process.cwd();
const migrationsDir = join(root, "server", "migrations");

const ROLLBACK_SOURCES = [
  "docs/project-a4-live-supabase-activation-certification.md",
  "docs/supabase-persistence-certification-checklist.md",
  "docs/backup-restore-runbook.md",
  "docs/disaster-recovery-plan.md",
  "docs/environment-provisioning-checklist.md",
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function migrationFiles({ directory = migrationsDir } = {}) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({
      file,
      path: join(directory, file),
      text: readText(join(directory, file)),
    }));
}

function stripSqlComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function lineFindings(text, predicate) {
  return text.split(/\r?\n/).flatMap((line, index) => {
    const result = predicate(line, index + 1);
    return result ? [result] : [];
  });
}

export function validateSqlLintStyle({ directory = migrationsDir } = {}) {
  const files = migrationFiles({ directory });
  const findings = [];

  for (const migration of files) {
    const lines = migration.text.split(/\r?\n/);
    if (!migration.text.trim()) {
      findings.push({ file: migration.file, line: 1, severity: "high", message: "Migration file is empty." });
    }
    if (/\r?\n<<<<<<<|=======|>>>>>>>/.test(migration.text)) {
      findings.push({ file: migration.file, line: 1, severity: "high", message: "Merge conflict marker found." });
    }
    if (!stripSqlComments(migration.text).trimEnd().endsWith(";")) {
      findings.push({ file: migration.file, line: lines.length, severity: "medium", message: "Migration should end with a semicolon." });
    }
    findings.push(
      ...lineFindings(migration.text, (line, number) => {
        if (line.length > 180 && !/https?:\/\//i.test(line)) {
          return { file: migration.file, line: number, severity: "low", message: "Very long SQL line; review readability." };
        }
        if (/\bTODO\b|\bFIXME\b/i.test(line)) {
          return { file: migration.file, line: number, severity: "medium", message: "Unresolved TODO/FIXME in migration." };
        }
        return null;
      }),
    );
  }

  return {
    status: findings.some((finding) => ["high", "medium"].includes(finding.severity)) ? "FAIL" : "PASS",
    scannedFiles: files.length,
    findings,
    blockers: findings.filter((finding) => ["high", "medium"].includes(finding.severity)).map((finding) => `${finding.file}:${finding.line} ${finding.message}`),
  };
}

export function detectDestructiveSql({ directory = migrationsDir } = {}) {
  const files = migrationFiles({ directory });
  const findings = [];
  const destructivePatterns = [
    { rule: "drop_table", pattern: /\bDROP\s+TABLE\b/i, severity: "critical" },
    { rule: "drop_schema", pattern: /\bDROP\s+SCHEMA\b/i, severity: "critical" },
    { rule: "drop_database", pattern: /\bDROP\s+DATABASE\b/i, severity: "critical" },
    { rule: "truncate", pattern: /\bTRUNCATE\b/i, severity: "critical" },
    { rule: "delete_from", pattern: /^\s*DELETE\s+FROM\b/i, severity: "high" },
    { rule: "drop_column", pattern: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i, severity: "high" },
    { rule: "drop_extension", pattern: /\bDROP\s+EXTENSION\b/i, severity: "high" },
  ];

  for (const migration of files) {
    const uncommented = stripSqlComments(migration.text);
    const lines = uncommented.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const rule of destructivePatterns) {
        if (rule.pattern.test(line)) {
          findings.push({
            file: migration.file,
            line: index + 1,
            rule: rule.rule,
            severity: rule.severity,
            message: "Potentially destructive SQL requires explicit remediation review.",
          });
        }
      }
    }
  }

  return {
    status: findings.length ? "FAIL" : "PASS",
    scannedFiles: files.length,
    findings,
    blockers: findings.map((finding) => `${finding.file}:${finding.line} ${finding.rule}`),
  };
}

export function enforceProductionMigrationGuard({ directory = migrationsDir } = {}) {
  const files = migrationFiles({ directory });
  const findings = [];

  for (const migration of files.filter((item) => REQUIRED_A4_MIGRATIONS.includes(item.file))) {
    const text = migration.text;
    const hasProductionHold = /production hold|do not apply to production|do not apply.*production/i.test(text);
    const hasBackupLanguage = /backup/i.test(text);
    const hasRollbackLanguage = /rollback/i.test(text);
    if (!hasProductionHold) findings.push({ file: migration.file, severity: "high", message: "Missing production-hold language." });
    if (!hasBackupLanguage) findings.push({ file: migration.file, severity: "medium", message: "Missing backup prerequisite language." });
    if (!hasRollbackLanguage) findings.push({ file: migration.file, severity: "medium", message: "Missing rollback prerequisite language." });
  }

  return {
    status: findings.length ? "FAIL" : "PASS",
    productionTouched: false,
    requiredMigrationsChecked: REQUIRED_A4_MIGRATIONS.length,
    findings,
    blockers: findings.map((finding) => `${finding.file} ${finding.message}`),
  };
}

export function validateRollbackCoverage() {
  const docs = ROLLBACK_SOURCES
    .filter((path) => existsSync(join(root, path)))
    .map((path) => ({ path, text: readFileSync(join(root, path), "utf8") }));
  const combined = docs.map((doc) => doc.text).join("\n");
  const requiredPhrases = ["rollback", "backup", "restore", "UAT", "production", "signoff"];
  const missingPhrases = requiredPhrases.filter((phrase) => !new RegExp(phrase, "i").test(combined));
  const missingDocs = ROLLBACK_SOURCES.filter((path) => !existsSync(join(root, path)));
  const a4MigrationCoverage = REQUIRED_A4_MIGRATIONS.map((file) => ({
    file,
    mentionedInDocs: new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(combined),
    hasProductionHold: enforceProductionMigrationGuard().findings.every((finding) => finding.file !== file),
  }));
  const uncoveredMigrations = a4MigrationCoverage.filter((item) => !item.mentionedInDocs);
  const blockers = [
    ...missingDocs.map((path) => `Rollback coverage source missing: ${path}`),
    ...missingPhrases.map((phrase) => `Rollback coverage missing phrase: ${phrase}`),
    ...uncoveredMigrations.map((item) => `Rollback coverage docs do not mention migration: ${item.file}`),
  ];

  return {
    status: blockers.length ? "FAIL" : "PASS",
    sources: docs.map((doc) => doc.path),
    missingDocs,
    requiredPhrases,
    missingPhrases,
    a4MigrationCoverage,
    blockers,
  };
}

export function buildMigrationEvidenceReport({ directory = migrationsDir } = {}) {
  const order = validateMigrationOrder({ directory });
  const lint = validateSqlLintStyle({ directory });
  const destructiveSql = detectDestructiveSql({ directory });
  const productionGuard = enforceProductionMigrationGuard({ directory });
  const rollbackCoverage = validateRollbackCoverage();
  const checks = [
    { name: "migration_order", status: order.status, blockers: order.blockers },
    { name: "sql_lint_style", status: lint.status, blockers: lint.blockers },
    { name: "destructive_sql", status: destructiveSql.status, blockers: destructiveSql.blockers },
    { name: "production_migration_guard", status: productionGuard.status, blockers: productionGuard.blockers },
    { name: "rollback_coverage", status: rollbackCoverage.status, blockers: rollbackCoverage.blockers },
  ];
  const blockers = checks.flatMap((check) => check.blockers.map((blocker) => `${check.name}: ${blocker}`));

  return {
    status: blockers.length ? "FAIL" : "PASS",
    generatedAt: new Date().toISOString(),
    liveDatabaseTouched: false,
    productionTouched: false,
    migrationFiles: migrationFiles({ directory }).map((migration) => basename(migration.file)),
    checks,
    order,
    lint,
    destructiveSql,
    productionGuard,
    rollbackCoverage,
    blockers,
  };
}

export function renderMigrationEvidenceReport(report = buildMigrationEvidenceReport()) {
  const lines = [
    "# Migration Safety Evidence Report",
    "",
    `Status: ${report.status}`,
    `Generated At: ${report.generatedAt}`,
    `Live Database Touched: ${report.liveDatabaseTouched ? "YES" : "NO"}`,
    `Production Touched: ${report.productionTouched ? "YES" : "NO"}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- ${check.name}: ${check.status}`),
  ];
  if (report.blockers.length) {
    lines.push("", "## Blockers", ...report.blockers.map((blocker) => `- ${blocker}`));
  }
  return lines.join("\n");
}

function printResult(result, { json = false } = {}) {
  if (json) console.log(JSON.stringify(result, null, 2));
  else if (typeof result === "string") console.log(result);
  else console.log(renderMigrationEvidenceReport(result));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const command = args[0] || "report";
  const json = args.includes("--json");
  let result;
  if (command === "lint") result = validateSqlLintStyle();
  else if (command === "destructive") result = detectDestructiveSql();
  else if (command === "production-guard") result = enforceProductionMigrationGuard();
  else if (command === "rollback-coverage") result = validateRollbackCoverage();
  else result = buildMigrationEvidenceReport();
  printResult(result, { json });
  process.exit(result.status === "PASS" ? 0 : 1);
}
