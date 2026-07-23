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

function listMigrationFiles({ directory = migrationsDir } = {}) {
  return existsSync(directory) ? readdirSync(directory).filter((file) => file.endsWith(".sql")).sort() : [];
}

function readMigration(file, { directory = migrationsDir } = {}) {
  return readFileSync(join(directory, file), "utf8");
}

function extractCreatedTables(sql = "") {
  return [...sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)].map((match) => match[1]);
}

function extractAlteredTables(sql = "") {
  return [...sql.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:(?:public)\.)?([a-zA-Z0-9_]+)/gi)]
    .map((match) => match[1])
    .filter((table) => table !== "public");
}

function extractRlsEnabledTables(sql = "") {
  const direct = [...sql.matchAll(/ALTER\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)].map((match) => match[1]);
  const loopTargets = [...sql.matchAll(/ARRAY\[(.*?)\]/gis)]
    .flatMap((match) => [...match[1].matchAll(/'([a-zA-Z0-9_]+)'/g)].map((item) => item[1]));
  return [...new Set([...direct, ...loopTargets])];
}

function extractPolicyTables(sql = "") {
  return [...sql.matchAll(/CREATE\s+POLICY\s+[\s\S]*?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)].map((match) => match[1]);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function migrationSummary(file, { directory = migrationsDir } = {}) {
  const sql = readMigration(file, { directory });
  return {
    file,
    createdTables: unique(extractCreatedTables(sql)),
    alteredTables: unique(extractAlteredTables(sql)),
    rlsEnabledTables: unique(extractRlsEnabledTables(sql)),
    policyTables: unique(extractPolicyTables(sql)),
    hasRollbackLanguage: /rollback|restore|backup|signoff/i.test(sql),
    destructiveStatements: [...sql.matchAll(/\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+[^;]+\s+DROP\s+COLUMN)\b/gi)].map((match) => match[1].replace(/\s+/g, " ").toUpperCase()),
  };
}

export function validateMigrationOrder({ directory = migrationsDir } = {}) {
  const files = listMigrationFiles({ directory });
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

export function buildMigrationDependencyGraph({ directory = migrationsDir } = {}) {
  const files = listMigrationFiles({ directory });
  const summaries = files.map((file) => migrationSummary(file, { directory }));
  const createdByTable = new Map();
  summaries.forEach((summary) => {
    summary.createdTables.forEach((table) => createdByTable.set(table, summary.file));
  });

  const nodes = summaries.map((summary, index) => ({
    id: summary.file,
    order: index + 1,
    creates: summary.createdTables,
    alters: summary.alteredTables,
    rlsEnabled: summary.rlsEnabledTables,
    policies: summary.policyTables,
    rollbackLanguage: summary.hasRollbackLanguage,
    destructiveStatements: summary.destructiveStatements,
  }));

  const edges = [];
  summaries.forEach((summary) => {
    unique([...summary.alteredTables, ...summary.policyTables, ...summary.rlsEnabledTables]).forEach((table) => {
      const source = createdByTable.get(table);
      if (source && source !== summary.file) {
        edges.push({ from: source, to: summary.file, table, reason: "table referenced after creation" });
      }
    });
  });

  const blockers = [
    ...nodes.flatMap((node) => node.destructiveStatements.map((statement) => `${node.id} contains potentially destructive SQL: ${statement}`)),
    ...REQUIRED_A4_MIGRATIONS.filter((file) => !files.includes(file)).map((file) => `Missing A4 migration: ${file}`),
  ];

  return {
    status: blockers.length ? "REVIEW_REQUIRED" : "PASS",
    nodes,
    edges,
    blockers,
    productionHold: true,
  };
}

export function renderMigrationDependencyGraphReport(graph = buildMigrationDependencyGraph()) {
  return `# Migration Dependency Graph Visual Report

Credential-readiness only. This report is generated by static SQL analysis and does not connect to Supabase or execute migrations.

Status: ${graph.status}
Production hold: ${graph.productionHold ? "YES" : "NO"}

## Mermaid Graph

\`\`\`mermaid
flowchart TD
${graph.nodes.map((node) => `  ${node.id.replace(/[^a-zA-Z0-9]/g, "_")}["${node.order}. ${node.id}"]`).join("\n")}
${graph.edges.map((edge) => `  ${edge.from.replace(/[^a-zA-Z0-9]/g, "_")} -->|${edge.table}| ${edge.to.replace(/[^a-zA-Z0-9]/g, "_")}`).join("\n") || "  no_dependencies[\"No cross-file dependencies detected\"]"}
\`\`\`

## Migration Nodes

| Migration | Creates | Alters | RLS Enabled | Policy Tables | Rollback Language | Destructive SQL |
| --- | ---: | ---: | ---: | ---: | --- | --- |
${graph.nodes.map((node) => `| ${node.id} | ${node.creates.length} | ${node.alters.length} | ${node.rlsEnabled.length} | ${node.policies.length} | ${node.rollbackLanguage ? "Yes" : "No"} | ${node.destructiveStatements.length ? node.destructiveStatements.join(", ") : "None detected"} |`).join("\n")}

## Blockers

${graph.blockers.length ? graph.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None detected by static analysis."}
`;
}

export function buildMigrationRollbackChecklists({ directory = migrationsDir } = {}) {
  return listMigrationFiles({ directory }).map((file) => {
    const summary = migrationSummary(file, { directory });
    return {
      file,
      status: summary.hasRollbackLanguage ? "CHECKLIST_READY" : "ROLLBACK_LANGUAGE_MISSING",
      requiredChecks: [
        "Pre-migration backup confirmed",
        "Migration owner identified",
        "UAT signoff captured before production",
        "Rollback decision owner identified",
        "Rollback validation query listed",
        "Post-rollback data integrity check listed",
      ],
      staticSignals: {
        rollbackLanguagePresent: summary.hasRollbackLanguage,
        destructiveStatements: summary.destructiveStatements,
        createdTables: summary.createdTables,
        alteredTables: summary.alteredTables,
      },
    };
  });
}

export function renderMigrationRollbackChecklistReport(checklists = buildMigrationRollbackChecklists()) {
  return `# Migration Rollback Checklist Generator

Credential-readiness only. Fill one checklist per SQL file before live execution.

${checklists.map((item) => `## ${item.file}

Status: ${item.status}

Static signals:
- Rollback language present: ${item.staticSignals.rollbackLanguagePresent ? "Yes" : "No"}
- Created tables: ${item.staticSignals.createdTables.join(", ") || "None"}
- Altered tables: ${item.staticSignals.alteredTables.join(", ") || "None"}
- Destructive SQL detected: ${item.staticSignals.destructiveStatements.join(", ") || "None"}

Checklist:
${item.requiredChecks.map((check) => `- [ ] ${check}`).join("\n")}
`).join("\n")}
`;
}

export function renderMigrationExecutionEvidenceTemplate({ environment = "Development / UAT" } = {}) {
  return `# Migration Execution Evidence Template - ${environment}

Do not include database passwords, full DATABASE_URL values, Supabase service-role keys, JWT secrets, or screenshots containing credentials.

## Environment Evidence

- Environment:
- Supabase Project Name:
- Supabase Project ID:
- Migration Operator:
- Migration Approval Reference:
- Backup Reference:
- Start Time:
- Completion Time:

## Execution Matrix

| Migration | Dry-Run Status | Execution Status | Schema Validation | RLS Validation | Rollback Checklist | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- |
${REQUIRED_A4_MIGRATIONS.map((file) => `| ${file} | Pending | Pending | Pending | Pending | Pending |  |`).join("\n")}

## Production Hold

- Production untouched: Yes / No
- UAT signoff captured: Yes / No
- Release approval captured: Yes / No

## Decision

- Result: PASS / FAIL
- Blockers:
- Remediation Owner:
- Next Gate:
`;
}

export function buildSeedDataEvidenceChecklist(data = seedData) {
  const readiness = checkSeedDataReadiness(data);
  return {
    status: readiness.status,
    requiredRoles: readiness.requiredRoles.map((role) => ({
      role,
      seedUserPresent: !readiness.missingUsers.includes(role),
      roleRecordPresent: !readiness.missingRoles.includes(role),
    })),
    requiredTables: ["users", "roles", "assets", "bookings", "audit_logs"].map((table) => ({
      table,
      present: !readiness.missingTables.includes(table),
      count: Array.isArray(data[table]) ? data[table].length : 0,
    })),
    blockers: readiness.blockers,
  };
}

export function renderSeedDataEvidenceChecklist(checklist = buildSeedDataEvidenceChecklist()) {
  return `# Seed Data Evidence Checklist

Credential-readiness only. This validates local seed coverage before Supabase seed execution evidence exists.

Status: ${checklist.status}

## Role Coverage

| Role | Seed User Present | Role Record Present |
| --- | --- | --- |
${checklist.requiredRoles.map((item) => `| ${item.role} | ${item.seedUserPresent ? "Yes" : "No"} | ${item.roleRecordPresent ? "Yes" : "No"} |`).join("\n")}

## Required Table Coverage

| Table | Present | Local Seed Count |
| --- | --- | ---: |
${checklist.requiredTables.map((item) => `| ${item.table} | ${item.present ? "Yes" : "No"} | ${item.count} |`).join("\n")}

## Blockers

${checklist.blockers.length ? checklist.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None detected in local seed contract."}
`;
}

export function renderDatabaseBackupRestoreEvidenceTemplate() {
  return `# Database Backup and Restore Evidence Template

Do not include credentials, unredacted database URLs, service-role keys, raw customer data, or screenshots containing secrets.

## Backup Evidence

- Environment: Development / UAT
- Supabase Project Name:
- Supabase Project ID:
- Backup Owner:
- Backup Method:
- Backup Started:
- Backup Completed:
- Backup Reference:
- Retention Policy:
- Backup Integrity Check:

## Restore Evidence

- Restore Target:
- Restore Owner:
- Restore Started:
- Restore Completed:
- Recovery Duration:
- RPO Observed:
- RTO Observed:
- Restore Reference:

## Data Integrity Validation

- User record counts match:
- Asset record counts match:
- Booking record counts match:
- Audit log continuity verified:
- Referential integrity verified:
- RLS/RBAC spot checks repeated:
- Data loss observed:

## Decision

- Result: PASS / FAIL
- Blockers:
- Remediation Required:
- Sign-off:
`;
}

export function buildRlsTableCoverageDashboard({ directory = migrationsDir } = {}) {
  const files = listMigrationFiles({ directory });
  const summaries = files.map((file) => migrationSummary(file, { directory }));
  const createdTables = unique(summaries.flatMap((summary) => summary.createdTables));
  const alteredTables = unique(summaries.flatMap((summary) => summary.alteredTables));
  const allTables = unique([...createdTables, ...alteredTables]);
  const rlsEnabled = unique(summaries.flatMap((summary) => summary.rlsEnabledTables));
  const policyTables = unique(summaries.flatMap((summary) => summary.policyTables));
  const exemptTables = new Set(["schema_migrations"]);
  const coverage = allTables.map((table) => ({
    table,
    created: createdTables.includes(table),
    altered: alteredTables.includes(table),
    rlsEnabled: rlsEnabled.includes(table),
    policyPresent: policyTables.includes(table),
    exempt: exemptTables.has(table),
    status: exemptTables.has(table) ? "EXEMPT" : (rlsEnabled.includes(table) && policyTables.includes(table) ? "COVERED" : "REVIEW_REQUIRED"),
  }));
  const blockers = coverage.filter((item) => item.status === "REVIEW_REQUIRED").map((item) => `${item.table} needs RLS enablement and/or policy coverage review.`);
  return {
    status: blockers.length ? "REVIEW_REQUIRED" : "PASS",
    totalTables: coverage.length,
    coveredTables: coverage.filter((item) => item.status === "COVERED").length,
    exemptTables: coverage.filter((item) => item.status === "EXEMPT").length,
    coverage,
    blockers,
  };
}

export function renderRlsTableCoverageDashboard(dashboard = buildRlsTableCoverageDashboard()) {
  return `# Database RLS Table Coverage Dashboard

Credential-readiness only. Static SQL analysis cannot prove runtime enforcement; A4-04 must collect real RLS/RBAC evidence after Supabase provisioning.

Status: ${dashboard.status}
Tables reviewed: ${dashboard.totalTables}
Covered tables: ${dashboard.coveredTables}
Exempt tables: ${dashboard.exemptTables}

| Table | Created | Altered | RLS Enabled | Policy Present | Status |
| --- | --- | --- | --- | --- | --- |
${dashboard.coverage.map((item) => `| ${item.table} | ${item.created ? "Yes" : "No"} | ${item.altered ? "Yes" : "No"} | ${item.rlsEnabled ? "Yes" : "No"} | ${item.policyPresent ? "Yes" : "No"} | ${item.status} |`).join("\n")}

## Blockers

${dashboard.blockers.length ? dashboard.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None detected by static SQL coverage analysis."}
`;
}

export function buildDatabaseLaunchBlockerReport({ databaseUrl = process.env.DATABASE_URL || "" } = {}) {
  const readiness = buildDatabaseReadinessReport({ databaseUrl });
  const graph = buildMigrationDependencyGraph();
  const rls = buildRlsTableCoverageDashboard();
  const blockerGroups = [
    {
      area: "A4-01 infrastructure ownership",
      status: "BLOCKED_PENDING_REAL_PROJECT_IDS",
      blockers: [
        "A4-01 requires actual Development, UAT/Staging, and Production Supabase project IDs.",
        "Do not proceed to migration execution until A4-01 passes.",
      ],
    },
    {
      area: "Migration readiness",
      status: readiness.migrationOrder.status,
      blockers: readiness.migrationOrder.blockers,
    },
    {
      area: "Database credential readiness",
      status: readiness.postgresUrl.status,
      blockers: readiness.postgresUrl.blockers.length ? readiness.postgresUrl.blockers : ["DATABASE_URL must remain in secure secret storage and be validated without printing values."],
    },
    {
      area: "Seed readiness",
      status: readiness.seedReadiness.status,
      blockers: readiness.seedReadiness.blockers,
    },
    {
      area: "Rollback readiness",
      status: readiness.rollbackPlan.status,
      blockers: readiness.rollbackPlan.blockers,
    },
    {
      area: "RLS/RBAC static coverage",
      status: rls.status,
      blockers: rls.blockers,
    },
    {
      area: "Production hold",
      status: "ACTIVE",
      blockers: ["Production migrations remain blocked until Development and UAT evidence, backup/restore evidence, and UAT signoff exist."],
    },
  ];
  const blockers = blockerGroups.flatMap((group) => group.blockers.map((blocker) => `${group.area}: ${blocker}`));
  return {
    status: "BLOCKED_PENDING_A4_EVIDENCE",
    recommendation: "Remain RC-0.6A. Do not execute production migrations.",
    readinessStatus: readiness.status,
    migrationGraphStatus: graph.status,
    rlsStatus: rls.status,
    blockerGroups,
    blockers,
  };
}

export function renderDatabaseLaunchBlockerReport(report = buildDatabaseLaunchBlockerReport()) {
  return `# Database Launch Blocker Report

Status: ${report.status}
Recommendation: ${report.recommendation}

## Blocker Groups

| Area | Status | Blocker Count |
| --- | --- | ---: |
${report.blockerGroups.map((group) => `| ${group.area} | ${group.status} | ${group.blockers.length} |`).join("\n")}

## Launch Blockers

${report.blockers.map((blocker) => `- ${blocker}`).join("\n")}
`;
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
  else if (command === "dependency-graph") console.log(renderMigrationDependencyGraphReport());
  else if (command === "rollback-checklists") console.log(renderMigrationRollbackChecklistReport());
  else if (command === "execution-template") console.log(renderMigrationExecutionEvidenceTemplate({ environment: process.argv[3] || "Development / UAT" }));
  else if (command === "seed-checklist") console.log(renderSeedDataEvidenceChecklist());
  else if (command === "backup-restore-template") console.log(renderDatabaseBackupRestoreEvidenceTemplate());
  else if (command === "rls-dashboard") console.log(renderRlsTableCoverageDashboard());
  else if (command === "launch-blockers") console.log(renderDatabaseLaunchBlockerReport());
  else if (command === "json") console.log(JSON.stringify(buildDatabaseReadinessReport(), null, 2));
  else renderReport(buildDatabaseReadinessReport());
}
