import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const ENVIRONMENTS = [
  { key: "development", label: "Development", expectedName: "RentasHub Development" },
  { key: "uat", label: "UAT/Staging", expectedName: "RentasHub UAT" },
  { key: "production", label: "Production", expectedName: "RentasHub Production" },
];

export const REQUIRED_SECRET_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
];

export const REQUIRED_MIGRATIONS = [
  "004_supabase_activation_architecture.sql",
  "005_supabase_auth_rbac_activation.sql",
  "006_supabase_storage_activation.sql",
  "007_audit_logging_activation.sql",
];

const SECRET_VALUE_PATTERNS = [
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^<\s]+/i,
  /sb_(?:service|anon)_[a-z0-9_]{12,}/i,
  /service_role/i,
];

function hasOwn(env, key) {
  return Object.prototype.hasOwnProperty.call(env, key);
}

function safeText(value = "") {
  return String(value).trim();
}

function containsSecretLikeValue(value = "") {
  const text = safeText(value);
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateProjectId(projectId = "") {
  const value = safeText(projectId);
  if (!value) return { valid: false, code: "missing_project_id", message: "Project ID is required." };
  if (containsSecretLikeValue(value)) return { valid: false, code: "secret_like_project_id", message: "Project ID looks like credential material." };
  if (/^https?:\/\//i.test(value)) return { valid: false, code: "url_not_project_id", message: "Project ID must not be a URL." };
  if (!/^[a-z0-9_-]{8,64}$/i.test(value)) return { valid: false, code: "invalid_project_id_format", message: "Project ID must be a non-secret identifier using letters, numbers, underscores, or hyphens." };
  return { valid: true, code: "valid_project_id", message: "Project ID format is acceptable." };
}

export function validateProjectIntake(intake = {}) {
  const owners = intake.owners || {};
  const ownerChecks = ["infrastructureOwner", "billingOwner", "accessOwner"].map((key) => ({
    key,
    present: Boolean(safeText(owners[key])),
  }));

  const environments = ENVIRONMENTS.map((environment) => {
    const item = intake[environment.key] || {};
    const name = safeText(item.projectName);
    const id = safeText(item.projectId);
    const idValidation = validateProjectId(id);
    const nameMatches = name === environment.expectedName;

    return {
      key: environment.key,
      label: environment.label,
      expectedName: environment.expectedName,
      projectName: name || null,
      projectIdPresent: Boolean(id),
      projectIdValid: idValidation.valid,
      projectIdIssue: idValidation.valid ? null : idValidation.code,
      nameMatches,
      ready: Boolean(name) && nameMatches && idValidation.valid,
    };
  });

  const noSecretValues = !JSON.stringify(intake).split(/["{}\[\],:]/).some(containsSecretLikeValue);
  const ready = environments.every((item) => item.ready) && ownerChecks.every((item) => item.present) && noSecretValues;

  return {
    ready,
    noSecretValues,
    owners: ownerChecks,
    environments,
    blockers: [
      ...ownerChecks.filter((item) => !item.present).map((item) => `Missing ${item.key}.`),
      ...environments.flatMap((item) => {
        const issues = [];
        if (!item.projectName) issues.push(`${item.label} project name is missing.`);
        else if (!item.nameMatches) issues.push(`${item.label} project name should be ${item.expectedName}.`);
        if (!item.projectIdPresent) issues.push(`${item.label} project ID is missing.`);
        else if (!item.projectIdValid) issues.push(`${item.label} project ID is invalid: ${item.projectIdIssue}.`);
        return issues;
      }),
      ...(noSecretValues ? [] : ["Input appears to contain credential-like values. Remove secrets before submitting."]),
    ],
  };
}

export function checkSecretPresence(env = process.env, required = REQUIRED_SECRET_KEYS) {
  return required.map((key) => ({
    key,
    present: hasOwn(env, key) && safeText(env[key]).length > 0,
    valuePrinted: false,
  }));
}

export function buildMigrationDryRunChecklist(root = ROOT) {
  const migrationDir = join(root, "server", "migrations");
  const migrations = REQUIRED_MIGRATIONS.map((name, index) => ({
    order: index + 1,
    name,
    path: join("server", "migrations", name),
    exists: existsSync(join(migrationDir, name)),
  }));

  return {
    ready: migrations.every((migration) => migration.exists),
    environments: {
      development: "ready_for_execution_when_credentials_exist",
      uat: "blocked_until_development_passes",
      production: "hold_until_uat_signoff",
    },
    migrations,
  };
}

export function validateA4EnvironmentConfig({ env = process.env, intake = {} } = {}) {
  const intakeResult = validateProjectIntake(intake);
  const secretPresence = checkSecretPresence(env);
  const migrationChecklist = buildMigrationDryRunChecklist();

  return {
    status: intakeResult.ready && migrationChecklist.ready ? "READY_FOR_A4_02_REVIEW" : "NEEDS_A4_01_EVIDENCE",
    intake: intakeResult,
    secretPresence,
    migrationChecklist,
    note: "Secret checks report presence only and never print secret values.",
  };
}

export function renderA4EvidenceTemplate() {
  return `# A4 Execution Verification Evidence Package Template

Do not include secrets, tokens, passwords, service role keys, database URLs, JWT secrets, or screenshots containing credential material.

## A4-01 Infrastructure Ownership Confirmation

STATUS: PASS / FAIL

DEVELOPMENT PROJECT NAME:
DEVELOPMENT PROJECT ID:

UAT PROJECT NAME:
UAT PROJECT ID:

PRODUCTION PROJECT NAME:
PRODUCTION PROJECT ID:

INFRASTRUCTURE OWNER:
BILLING OWNER:
ACCESS OWNER:

BLOCKERS:

NEXT GATE:
A4-02 Environment Provisioning Verification

## A4-02 Environment Provisioning Verification

- Project accessibility confirmed:
- Secrets stored in approved secret store: YES / NO
- Separate database per environment: YES / NO
- Separate auth configuration per environment: YES / NO
- Separate storage buckets per environment: YES / NO
- Production isolated and not migrated: YES / NO

## A4-03 Migration Execution

- Development migration 004: PASS / FAIL
- Development migration 005: PASS / FAIL
- Development migration 006: PASS / FAIL
- Development migration 007: PASS / FAIL
- UAT migration 004: PASS / FAIL
- UAT migration 005: PASS / FAIL
- UAT migration 006: PASS / FAIL
- UAT migration 007: PASS / FAIL
- Production untouched: YES / NO

## A4-04 Infrastructure Certification

- Persistence validation:
- RLS/RBAC validation:
- Supabase Auth validation:
- Storage validation:
- Backup/restore validation:
- Secrets exposure certification:

## A4-05 Execution Verification

STATUS: PASS / FAIL

OPEN DEFECTS:

RECOMMENDATION:
RC-0.6B Infrastructure Certified / Remain RC-0.6A
`;
}

export function renderA4EvidencePackage({ intake = {}, generatedAt = new Date().toISOString() } = {}) {
  const intakeResult = validateProjectIntake(intake);
  const migrationChecklist = buildMigrationDryRunChecklist();
  const environmentRows = ENVIRONMENTS.map((environment) => {
    const item = intake[environment.key] || {};
    return `| ${environment.label} | ${item.projectName || ""} | ${item.projectId || ""} | Pending | |`;
  }).join("\n");
  const ownerRows = [
    ["Infrastructure Owner", intake.owners?.infrastructureOwner || ""],
    ["Billing Owner", intake.owners?.billingOwner || ""],
    ["Access Owner", intake.owners?.accessOwner || ""],
  ].map(([role, owner]) => `| ${role} | ${owner} | Pending | |`).join("\n");
  const migrationRows = migrationChecklist.migrations.flatMap((migration) => [
    `| Development | ${migration.name} | ${migration.exists ? "Found" : "Missing"} | Pending | |`,
    `| UAT/Staging | ${migration.name} | ${migration.exists ? "Found" : "Missing"} | Pending | |`,
  ]).join("\n");

  return `# A4 Execution Verification Evidence Package

Generated: ${generatedAt}

This package is an evidence collection template. It does not activate Supabase, run migrations, create credentials, certify production, or authorize closed beta. Do not include secrets, tokens, passwords, service-role keys, database URLs, JWT secrets, provider keys, customer private data, KYC documents, or screenshots containing credential material.

## Package Status

- Current classification: RC-0.6A Infrastructure Activation Hold
- Current gate: A4-01 Infrastructure Ownership Confirmation
- Intake format status: ${intakeResult.ready ? "A4-01 format ready" : "A4-01 evidence incomplete"}
- Production migration status: HOLD
- Next possible state after full evidence approval: RC-0.6B Infrastructure Certified

## A4-01 Infrastructure Ownership Confirmation

| Environment | Project Name | Project ID | Evidence Result | Notes |
| --- | --- | --- | --- | --- |
${environmentRows}

| Owner Role | Owner | Evidence Result | Notes |
| --- | --- | --- | --- |
${ownerRows}

### A4-01 Blockers

${intakeResult.blockers.length ? intakeResult.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None identified from provided intake format."}

## A4-02 Environment Provisioning Verification

| Check | Development | UAT/Staging | Production | Evidence Location |
| --- | --- | --- | --- | --- |
| Project accessible | Pending | Pending | Pending | |
| Secrets stored in approved secret store | Pending | Pending | Pending | |
| Separate database confirmed | Pending | Pending | Pending | |
| Separate auth configuration confirmed | Pending | Pending | Pending | |
| Separate storage buckets confirmed | Pending | Pending | Pending | |
| Environment variables mapped | Pending | Pending | Pending | |
| Production isolated from migration execution | N/A | N/A | Pending | |

## A4-03 Migration Execution Evidence

Production must remain untouched until UAT signoff.

| Environment | Migration | File Present Locally | Execution Result | Evidence Location |
| --- | --- | --- | --- | --- |
${migrationRows}
| Production | 004-007 | Hold | Not executed | Production hold evidence |

## A4-04 Persistence Certification Evidence

| Role / Entity | Create | Read | Update | Delete | Soft Delete | Restore | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Customer | Pending | Pending | Pending | Pending | Pending | Pending | |
| Supplier | Pending | Pending | Pending | Pending | Pending | Pending | |
| Dealer/Broker | Pending | Pending | Pending | Pending | Pending | Pending | |
| Inspector | Pending | Pending | Pending | Pending | Pending | Pending | |
| Transport Provider | Pending | Pending | Pending | Pending | Pending | Pending | |
| Financing Partner | Pending | Pending | Pending | Pending | Pending | Pending | |
| Admin | Pending | Pending | Pending | Pending | Pending | Pending | |

## A4-04 RLS / RBAC Certification Evidence

| Scenario | Expected Result | Actual Result | Evidence Location |
| --- | --- | --- | --- |
| Customer cannot access supplier records | Denied | Pending | |
| Supplier cannot access dealer records | Denied | Pending | |
| Dealer cannot access admin records | Denied | Pending | |
| Cross-tenant access denied | Denied | Pending | |
| Admin access works through approved role | Allowed | Pending | |

## A4-04 Supabase Auth Evidence

| Flow | Development | UAT/Staging | Evidence Location |
| --- | --- | --- | --- |
| Registration | Pending | Pending | |
| Login | Pending | Pending | |
| Logout | Pending | Pending | |
| Password reset | Pending | Pending | |
| Email verification | Pending | Pending | |
| Session refresh | Pending | Pending | |
| Session revocation | Pending | Pending | |

## A4-04 Supabase Storage Evidence

| Bucket | Visibility | Upload | Download | Signed URL | Unauthorized Access Denied | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- |
| public-assets | Public | Pending | Pending | N/A / Pending | Pending | |
| supplier-logos | Public or signed | Pending | Pending | Pending | Pending | |
| private-verification | Private | Pending | Pending | Pending | Pending | |
| private-inspections | Private | Pending | Pending | Pending | Pending | |
| private-claims | Private | Pending | Pending | Pending | Pending | |
| private-disputes | Private | Pending | Pending | Pending | Pending | |

## A4-04 Backup / Restore Evidence

| Check | Development | UAT/Staging | Evidence Location |
| --- | --- | --- | --- |
| Backup created | Pending | Pending | |
| Restore executed | Pending | Pending | |
| Restored data integrity verified | Pending | Pending | |
| RPO documented | Pending | Pending | |
| RTO documented | Pending | Pending | |

## A4-04 Secrets Exposure Certification

| Location | SUPABASE_SERVICE_ROLE_KEY Absent | Other Secret Values Absent | Evidence Location |
| --- | --- | --- | --- |
| Source control | Pending | Pending | |
| Frontend bundle | Pending | Pending | |
| ZIP artifacts | Pending | Pending | |
| Documentation | Pending | Pending | |
| Logs | Pending | Pending | |
| Chat/screenshots | Pending | Pending | |

## A4-05 Execution Verification Decision

| Decision Item | Result |
| --- | --- |
| Environment evidence complete | Pending |
| Migration evidence complete | Pending |
| Persistence evidence complete | Pending |
| RLS/RBAC evidence complete | Pending |
| Auth evidence complete | Pending |
| Storage evidence complete | Pending |
| Backup/restore evidence complete | Pending |
| Secrets exposure certification complete | Pending |
| Recommendation | PASS to RC-0.6B / FAIL remain RC-0.6A |

## Final Notes

- No secrets are required in this package.
- Project IDs are allowed; keys, passwords, tokens, URLs containing credentials, and service-role keys are not allowed.
- Production remains untouched until UAT signoff and explicit release approval.
`;
}

export function renderReadinessReport(result) {
  const lines = [
    "# A4 Supabase Credential-Readiness Report",
    "",
    `Status: ${result.status}`,
    "",
    "## Project Intake",
    "",
    ...result.intake.environments.map((item) => `- ${item.label}: ${item.ready ? "READY" : "MISSING_OR_INVALID"} (${item.projectName || "no name"}, project ID present: ${item.projectIdPresent ? "YES" : "NO"})`),
    "",
    "## Owners",
    "",
    ...result.intake.owners.map((item) => `- ${item.key}: ${item.present ? "PRESENT" : "MISSING"}`),
    "",
    "## Secret Presence",
    "",
    ...result.secretPresence.map((item) => `- ${item.key}: ${item.present ? "PRESENT" : "MISSING"} (value not printed)`),
    "",
    "## Migration Dry-Run Checklist",
    "",
    ...result.migrationChecklist.migrations.map((migration) => `- ${migration.order}. ${migration.name}: ${migration.exists ? "FOUND" : "MISSING"}`),
    "",
    "## Environment Order",
    "",
    `- Development: ${result.migrationChecklist.environments.development}`,
    `- UAT/Staging: ${result.migrationChecklist.environments.uat}`,
    `- Production: ${result.migrationChecklist.environments.production}`,
    "",
    "## Blockers",
    "",
    ...(result.intake.blockers.length ? result.intake.blockers.map((blocker) => `- ${blocker}`) : ["- None for A4-01 intake format."]),
    "",
    result.note,
    "",
  ];
  return lines.join("\n");
}

function parseArgs(argv) {
  const parsed = { command: argv[2] || "report", input: null, output: null };
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--input") parsed.input = argv[++i];
    else if (argv[i] === "--output") parsed.output = argv[++i];
  }
  return parsed;
}

function loadIntake(inputPath) {
  if (!inputPath) return {};
  const absolute = resolve(inputPath);
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function writeOrPrint(content, outputPath) {
  if (outputPath) {
    writeFileSync(resolve(outputPath), content);
    console.log(`WROTE ${outputPath}`);
  } else {
    console.log(content);
  }
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const args = parseArgs(process.argv);
  const intake = loadIntake(args.input);
  const result = validateA4EnvironmentConfig({ env: process.env, intake });

  if (args.command === "template") {
    writeOrPrint(renderA4EvidenceTemplate(), args.output);
  } else if (args.command === "evidence-package") {
    writeOrPrint(renderA4EvidencePackage({ intake }), args.output);
  } else if (args.command === "validate") {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "READY_FOR_A4_02_REVIEW" ? 0 : 1;
  } else if (args.command === "migrations") {
    console.log(JSON.stringify(buildMigrationDryRunChecklist(), null, 2));
  } else {
    writeOrPrint(renderReadinessReport(result), args.output);
    process.exitCode = 0;
  }
}
