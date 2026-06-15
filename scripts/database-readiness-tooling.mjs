import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedData } from "../server/seeds/demoData.js";

const root = process.cwd();
const migrationsDir = join(root, "server", "migrations");

export const REQUIRED_A4_MIGRATIONS = [
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
];

export const REQUIRED_SEED_ROLES = [
  "customer",
  "supplier",
  "broker",
  "dealer",
  "inspector",
  "transport_provider",
  "financing_partner",
  "admin",
];

function safeText(value = "") {
  return String(value || "").trim();
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

export function validateMigrationOrder({ directory = migrationsDir } = {}) {
  const files = existsSync(directory) ? readdirSync(directory).filter((file) => file.endsWith(".sql")).sort() : [];
  const parsed = files.map((file) => {
    const match = file.match(/^(\d{3})_(.+)\.sql$/);
    return {
      file,
      validName: Boolean(match),
      number: match ? Number(match[1]) : null,
    };
  });

  const blockers = [];
  parsed.forEach((item, index) => {
    if (!item.validName) blockers.push(`${item.file} does not follow 000_name.sql naming.`);
    if (item.number !== index + 1) blockers.push(`${item.file} is out of order; expected prefix ${String(index + 1).padStart(3, "0")}.`);
  });

  for (const file of REQUIRED_A4_MIGRATIONS) {
    if (!files.includes(file)) blockers.push(`Missing A4 migration: ${file}`);
  }

  return {
    status: blockers.length ? "FAIL" : "PASS",
    files,
    parsed,
    a4Sequence: REQUIRED_A4_MIGRATIONS.map((file) => ({ file, present: files.includes(file) })),
    productionHold: true,
    blockers,
  };
}

export function validatePostgresUrl(url = "") {
  const value = safeText(url);
  const blockers = [];
  if (!value) blockers.push("DATABASE_URL is required.");
  if (/placeholder|<|>|your_|REPLACE_/i.test(value)) blockers.push("DATABASE_URL contains placeholder text.");

  let parsed = null;
  try {
    parsed = value ? new URL(value) : null;
  } catch {
    blockers.push("DATABASE_URL is not a valid URL.");
  }

  if (parsed) {
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) blockers.push("DATABASE_URL must use postgres:// or postgresql://.");
    if (!parsed.hostname) blockers.push("DATABASE_URL hostname is required.");
    if (!parsed.username) blockers.push("DATABASE_URL username is required.");
    if (!parsed.password) blockers.push("DATABASE_URL password must be present in the secret store value.");
    if (!parsed.pathname || parsed.pathname === "/") blockers.push("DATABASE_URL database name is required.");
  }

  return {
    status: blockers.length ? "FAIL" : "PASS",
    provider: parsed ? parsed.protocol.replace(":", "") : null,
    hostPresent: Boolean(parsed?.hostname),
    supabaseHostLikely: Boolean(parsed?.hostname && /supabase\.com$|pooler\.supabase\.com$/i.test(parsed.hostname)),
    passwordPresent: Boolean(parsed?.password),
    valuePrinted: false,
    blockers,
  };
}

export function checkSeedDataReadiness(data = seedData) {
  const users = Array.isArray(data.users) ? data.users : [];
  const roles = Array.isArray(data.roles) ? data.roles : [];
  const userRoles = new Set(users.map((user) => user.role));
  const roleNames = new Set(roles.map((role) => role.name));
  const missingUsers = REQUIRED_SEED_ROLES.filter((role) => !userRoles.has(role));
  const missingRoles = REQUIRED_SEED_ROLES.filter((role) => !roleNames.has(role));
  const requiredTables = ["users", "roles", "assets", "bookings", "audit_logs"];
  const missingTables = requiredTables.filter((table) => !Array.isArray(data[table]) || !data[table].length);

  const blockers = [
    ...missingUsers.map((role) => `Missing seed user for role: ${role}`),
    ...missingRoles.map((role) => `Missing seed role: ${role}`),
    ...missingTables.map((table) => `Missing seed records for table: ${table}`),
  ];

  return {
    status: blockers.length ? "FAIL" : "PASS",
    userCount: users.length,
    roleCount: roles.length,
    requiredRoles: REQUIRED_SEED_ROLES,
    missingUsers,
    missingRoles,
    missingTables,
    blockers,
  };
}

export function validateRollbackPlan() {
  const sources = [
    "docs/project-a4-live-supabase-activation-certification.md",
    "docs/supabase-persistence-certification-checklist.md",
    "docs/deployment-runbook.md",
    "docs/backup-restore-runbook.md",
  ];
  const combined = sources.filter((path) => existsSync(join(root, path))).map((path) => read(path)).join("\n");
  const required = [
    "Rollback",
    "Backup",
    "Restore",
    "Production",
    "UAT",
    "signoff",
    "recovery",
  ];
  const missing = required.filter((phrase) => !new RegExp(phrase, "i").test(combined));
  return {
    status: missing.length ? "FAIL" : "PASS",
    sources,
    required,
    missing,
    blockers: missing.map((phrase) => `Rollback plan evidence missing phrase: ${phrase}`),
  };
}

export function renderSupabaseMigrationEvidenceTemplate() {
  return `# Supabase Migration Evidence Template

Do not include passwords, keys, service role tokens, JWT secrets, screenshots containing credentials, or full DATABASE_URL values.

## Environment

- Environment: Development / UAT
- Supabase Project Name:
- Supabase Project ID:
- Migration Operator:
- Date:

## Migration Execution

| Migration | Status | Started At | Completed At | Evidence Location |
| --- | --- | --- | --- | --- |
${REQUIRED_A4_MIGRATIONS.map((file) => `| ${file} | Pending |  |  |  |`).join("\n")}

## Validation

- Tables created:
- Indexes created:
- Constraints valid:
- RLS enabled:
- Audit fields present:
- Migration records written:

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function renderBackupRestoreEvidenceTemplate() {
  return `# Backup Restore Evidence Template

Do not include credentials, raw customer data, passwords, service role keys, or unredacted logs.

## Backup

- Environment: Development / UAT
- Backup method:
- Backup timestamp:
- Backup owner:
- Backup identifier:
- Retention policy:

## Restore

- Restore target:
- Restore started:
- Restore completed:
- Recovery duration:
- RPO observed:
- RTO observed:

## Integrity Validation

- Row counts validated:
- Relationship integrity validated:
- Audit integrity validated:
- RLS/RBAC spot checks repeated:
- Data loss observed:

## Decision

- Result: PASS / FAIL
- Blockers:
- Required remediation:
`;
}

export function buildDatabaseReadinessReport({ databaseUrl = process.env.DATABASE_URL || "" } = {}) {
  const migrationOrder = validateMigrationOrder();
  const postgresUrl = validatePostgresUrl(databaseUrl);
  const seedReadiness = checkSeedDataReadiness();
  const rollbackPlan = validateRollbackPlan();
  const blockers = [
    ...migrationOrder.blockers,
    ...postgresUrl.blockers,
    ...seedReadiness.blockers,
    ...rollbackPlan.blockers,
  ];

  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_REMEDIATION" : "CREDENTIAL_READY",
    migrationOrder,
    postgresUrl,
    seedReadiness,
    rollbackPlan,
    valuePrinted: false,
    blockers,
  };
}

function renderReport(report) {
  console.log(`# Database Readiness Report`);
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- Migration order: ${report.migrationOrder.status}`);
  console.log(`- PostgreSQL URL format: ${report.postgresUrl.status} (value not printed)`);
  console.log(`- Seed-data readiness: ${report.seedReadiness.status}`);
  console.log(`- Rollback plan: ${report.rollbackPlan.status}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2] || "report";
  if (command === "migration-template") console.log(renderSupabaseMigrationEvidenceTemplate());
  else if (command === "backup-template") console.log(renderBackupRestoreEvidenceTemplate());
  else if (command === "json") console.log(JSON.stringify(buildDatabaseReadinessReport(), null, 2));
  else renderReport(buildDatabaseReadinessReport());
}
