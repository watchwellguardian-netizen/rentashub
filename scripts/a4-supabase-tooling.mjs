import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
];

const EVIDENCE_SECTIONS = [
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
];

const EVIDENCE_ROLES = [
  "Customer",
  "Supplier",
  "Dealer/Broker",
  "Inspector",
  "Transport Provider",
  "Financing Partner",
  "Admin",
];

const STORAGE_BUCKETS = [
  { name: "public-assets", visibility: "Public" },
  { name: "supplier-logos", visibility: "Public or signed" },
  { name: "private-verification", visibility: "Private" },
  { name: "private-inspections", visibility: "Private" },
  { name: "private-claims", visibility: "Private" },
  { name: "private-disputes", visibility: "Private" },
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

function countMatches(text, pattern) {
  return Array.from(String(text).matchAll(pattern)).length;
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
  const packageData = buildA4EvidencePackageData({ intake, generatedAt });
  const intakeResult = packageData.intake;
  const migrationChecklist = packageData.migrationChecklist;
  const environmentRows = packageData.a4_01.environments.map((item) => {
    return `| ${item.label} | ${item.projectName || ""} | ${item.projectId || ""} | Pending | |`;
  }).join("\n");
  const ownerRows = packageData.a4_01.owners.map((item) => {
    return `| ${item.label} | ${item.owner || ""} | Pending | |`;
  }).join("\n");
  const migrationRows = packageData.a4_03.migrations.flatMap((migration) => [
    `| Development | ${migration.name} | ${migration.filePresent ? "Found" : "Missing"} | Pending | |`,
    `| UAT/Staging | ${migration.name} | ${migration.filePresent ? "Found" : "Missing"} | Pending | |`,
  ]).join("\n");

  return `# A4 Execution Verification Evidence Package

Generated: ${generatedAt}

This package is an evidence collection template. It does not activate Supabase, run migrations, create credentials, certify production, or authorize closed beta. Do not include secrets, tokens, passwords, service-role keys, database URLs, JWT secrets, provider keys, customer private data, KYC documents, or screenshots containing credential material.

## Package Status

- Current classification: ${packageData.classification}
- Current gate: ${packageData.currentGate}
- Intake format status: ${intakeResult.ready ? "A4-01 format ready" : "A4-01 evidence incomplete"}
- Production migration status: HOLD
- Next possible state after full evidence approval: ${packageData.nextStateIfApproved}

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
${packageData.a4_02.checks.map((check) => `| ${check.check} | ${check.development} | ${check.uat} | ${check.production} | |`).join("\n")}

## A4-03 Migration Execution Evidence

Production must remain untouched until UAT signoff.

| Environment | Migration | File Present Locally | Execution Result | Evidence Location |
| --- | --- | --- | --- | --- |
${migrationRows}
| Production | 004-007 | Hold | Not executed | Production hold evidence |

## A4-04 Persistence Certification Evidence

| Role / Entity | Create | Read | Update | Delete | Soft Delete | Restore | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- | --- |
${packageData.a4_04.persistence.map((item) => `| ${item.entity} | ${item.create} | ${item.read} | ${item.update} | ${item.delete} | ${item.softDelete} | ${item.restore} | |`).join("\n")}

## A4-04 RLS / RBAC Certification Evidence

| Scenario | Expected Result | Actual Result | Evidence Location |
| --- | --- | --- | --- |
${packageData.a4_04.rlsRbac.map((item) => `| ${item.scenario} | ${item.expectedResult} | ${item.actualResult} | |`).join("\n")}

## A4-04 Supabase Auth Evidence

| Flow | Development | UAT/Staging | Evidence Location |
| --- | --- | --- | --- |
${packageData.a4_04.auth.map((item) => `| ${item.flow} | ${item.development} | ${item.uat} | |`).join("\n")}

## A4-04 Supabase Storage Evidence

| Bucket | Visibility | Upload | Download | Signed URL | Unauthorized Access Denied | Evidence Location |
| --- | --- | --- | --- | --- | --- | --- |
${packageData.a4_04.storage.map((item) => `| ${item.bucket} | ${item.visibility} | ${item.upload} | ${item.download} | ${item.signedUrl} | ${item.unauthorizedAccessDenied} | |`).join("\n")}

## A4-04 Backup / Restore Evidence

| Check | Development | UAT/Staging | Evidence Location |
| --- | --- | --- | --- |
${packageData.a4_04.backupRestore.map((item) => `| ${item.check} | ${item.development} | ${item.uat} | |`).join("\n")}

## A4-04 Secrets Exposure Certification

| Location | SUPABASE_SERVICE_ROLE_KEY Absent | Other Secret Values Absent | Evidence Location |
| --- | --- | --- | --- |
${packageData.a4_04.secretsExposure.map((item) => `| ${item.location} | ${item.serviceRoleKeyAbsent} | ${item.otherSecretValuesAbsent} | |`).join("\n")}

## A4-05 Execution Verification Decision

| Decision Item | Result |
| --- | --- |
${packageData.a4_05.decisionItems.map((item) => `| ${item.item} | ${item.result} |`).join("\n")}
| Recommendation | PASS to RC-0.6B / FAIL remain RC-0.6A |

## Final Notes

- No secrets are required in this package.
- Project IDs are allowed; keys, passwords, tokens, URLs containing credentials, and service-role keys are not allowed.
- Production remains untouched until UAT signoff and explicit release approval.
`;
}

export function buildA4EvidencePackageData({ intake = {}, generatedAt = new Date().toISOString() } = {}) {
  const intakeResult = validateProjectIntake(intake);
  const migrationChecklist = buildMigrationDryRunChecklist();
  return {
    generatedAt,
    classification: "RC-0.6A Infrastructure Activation Hold",
    currentGate: "A4-01 Infrastructure Ownership Confirmation",
    nextStateIfApproved: "RC-0.6B Infrastructure Certified",
    warning: "Do not include secrets, tokens, passwords, service-role keys, database URLs, JWT secrets, provider keys, private customer data, KYC documents, or screenshots containing credential material.",
    intake: intakeResult,
    migrationChecklist,
    a4_01: {
      environments: ENVIRONMENTS.map((environment) => {
    const item = intake[environment.key] || {};
        return {
          key: environment.key,
          label: environment.label,
          projectName: item.projectName || "",
          projectId: item.projectId || "",
          evidenceResult: "Pending",
          notes: "",
        };
      }),
      owners: [
        { key: "infrastructureOwner", label: "Infrastructure Owner", owner: intake.owners?.infrastructureOwner || "", evidenceResult: "Pending", notes: "" },
        { key: "billingOwner", label: "Billing Owner", owner: intake.owners?.billingOwner || "", evidenceResult: "Pending", notes: "" },
        { key: "accessOwner", label: "Access Owner", owner: intake.owners?.accessOwner || "", evidenceResult: "Pending", notes: "" },
      ],
      blockers: intakeResult.blockers,
    },
    a4_02: {
      checks: [
        { check: "Project accessible", development: "Pending", uat: "Pending", production: "Pending" },
        { check: "Secrets stored in approved secret store", development: "Pending", uat: "Pending", production: "Pending" },
        { check: "Separate database confirmed", development: "Pending", uat: "Pending", production: "Pending" },
        { check: "Separate auth configuration confirmed", development: "Pending", uat: "Pending", production: "Pending" },
        { check: "Separate storage buckets confirmed", development: "Pending", uat: "Pending", production: "Pending" },
        { check: "Environment variables mapped", development: "Pending", uat: "Pending", production: "Pending" },
        { check: "Production isolated from migration execution", development: "N/A", uat: "N/A", production: "Pending" },
      ],
    },
    a4_03: {
      productionHold: true,
      migrations: migrationChecklist.migrations.map((migration) => ({
        name: migration.name,
        filePresent: migration.exists,
        developmentResult: "Pending",
        uatResult: "Pending",
        productionResult: "Not executed",
      })),
    },
    a4_04: {
      persistence: EVIDENCE_ROLES.map((entity) => ({
        entity,
        create: "Pending",
        read: "Pending",
        update: "Pending",
        delete: "Pending",
        softDelete: "Pending",
        restore: "Pending",
      })),
      rlsRbac: [
        { scenario: "Customer cannot access supplier records", expectedResult: "Denied", actualResult: "Pending" },
        { scenario: "Supplier cannot access dealer records", expectedResult: "Denied", actualResult: "Pending" },
        { scenario: "Dealer cannot access admin records", expectedResult: "Denied", actualResult: "Pending" },
        { scenario: "Cross-tenant access denied", expectedResult: "Denied", actualResult: "Pending" },
        { scenario: "Admin access works through approved role", expectedResult: "Allowed", actualResult: "Pending" },
      ],
      auth: ["Registration", "Login", "Logout", "Password reset", "Email verification", "Session refresh", "Session revocation"].map((flow) => ({
        flow,
        development: "Pending",
        uat: "Pending",
      })),
      storage: STORAGE_BUCKETS.map((bucket) => ({
        bucket: bucket.name,
        visibility: bucket.visibility,
        upload: "Pending",
        download: "Pending",
        signedUrl: bucket.name === "public-assets" ? "N/A / Pending" : "Pending",
        unauthorizedAccessDenied: "Pending",
      })),
      backupRestore: ["Backup created", "Restore executed", "Restored data integrity verified", "RPO documented", "RTO documented"].map((check) => ({
        check,
        development: "Pending",
        uat: "Pending",
      })),
      secretsExposure: ["Source control", "Frontend bundle", "ZIP artifacts", "Documentation", "Logs", "Chat/screenshots"].map((location) => ({
        location,
        serviceRoleKeyAbsent: "Pending",
        otherSecretValuesAbsent: "Pending",
      })),
    },
    a4_05: {
      decisionItems: [
        "Environment evidence complete",
        "Migration evidence complete",
        "Persistence evidence complete",
        "RLS/RBAC evidence complete",
        "Auth evidence complete",
        "Storage evidence complete",
        "Backup/restore evidence complete",
        "Secrets exposure certification complete",
      ].map((item) => ({ item, result: "Pending" })),
      recommendation: "PASS to RC-0.6B / FAIL remain RC-0.6A",
    },
  };
}

export function validateEvidenceRedaction(content = "") {
  const text = String(content);
  const findings = SECRET_VALUE_PATTERNS.flatMap((pattern) => {
    const matches = text.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) || [];
    return matches.map((match) => ({
      type: "secret_like_value",
      sample: `${match.slice(0, 6)}...REDACTED`,
    }));
  });

  return {
    status: findings.length ? "FAIL" : "PASS",
    findings,
    scannedCharacters: text.length,
    note: "Findings are redacted and never print complete suspected secret values.",
  };
}

export function scoreA4EvidencePackage(content = "") {
  const text = String(content);
  const redaction = validateEvidenceRedaction(text);
  const sectionResults = EVIDENCE_SECTIONS.map((section) => ({
    section,
    present: text.includes(`## ${section}`),
    pendingCount: countMatches(text, new RegExp(`${section}[\\s\\S]*?(?=\\n## |$)`, "g"))
      ? countMatches((text.match(new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`)) || [""])[0], /\bPending\b/g)
      : 0,
  }));
  const presentCount = sectionResults.filter((section) => section.present).length;
  const totalPending = sectionResults.reduce((sum, section) => sum + section.pendingCount, 0);
  const sectionScore = Math.round((presentCount / EVIDENCE_SECTIONS.length) * 100);
  const completionPenalty = Math.min(60, totalPending);
  const score = redaction.status === "PASS" ? Math.max(0, sectionScore - completionPenalty) : 0;

  return {
    status: score >= 90 && totalPending === 0 && redaction.status === "PASS" ? "PASS" : "INCOMPLETE",
    score,
    sectionScore,
    sectionsPresent: presentCount,
    sectionsRequired: EVIDENCE_SECTIONS.length,
    pendingEvidenceItems: totalPending,
    redactionStatus: redaction.status,
    sections: sectionResults,
    blockers: [
      ...(presentCount === EVIDENCE_SECTIONS.length ? [] : ["Required evidence sections are missing."]),
      ...(totalPending === 0 ? [] : [`${totalPending} evidence items remain pending.`]),
      ...(redaction.status === "PASS" ? [] : ["Secret-like values were detected and must be removed."]),
    ],
  };
}

export function buildA4EvidenceManifest({
  packagePath = "artifacts/a4/a4-execution-verification-evidence-package.md",
  packageContent = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const score = scoreA4EvidencePackage(packageContent);
  return {
    generatedAt,
    classification: "RC-0.6A Infrastructure Activation Hold",
    currentGate: "A4-01 Infrastructure Ownership Confirmation",
    nextStateIfApproved: "RC-0.6B Infrastructure Certified",
    packagePath,
    packageStatus: score.status,
    completenessScore: score.score,
    redactionStatus: score.redactionStatus,
    sections: score.sections.map((section) => ({
      name: section.section,
      present: section.present,
      pendingEvidenceItems: section.pendingCount,
    })),
    blockers: score.blockers,
    manualEvidenceStillRequired: [
      "Supabase Development project name and ID",
      "Supabase UAT/Staging project name and ID",
      "Supabase Production project name and ID",
      "Infrastructure, billing, and access owners",
      "Secure secret storage confirmation",
      "Development and UAT migration execution evidence",
      "Persistence, RLS/RBAC, Auth, Storage, Backup/Restore, and secrets exposure evidence",
    ],
  };
}

export function renderA4EvidenceScore(score) {
  return [
    "# A4 Evidence Completeness Score",
    "",
    `Status: ${score.status}`,
    `Score: ${score.score}`,
    `Sections present: ${score.sectionsPresent}/${score.sectionsRequired}`,
    `Pending evidence items: ${score.pendingEvidenceItems}`,
    `Redaction status: ${score.redactionStatus}`,
    "",
    "## Sections",
    "",
    ...score.sections.map((section) => `- ${section.section}: ${section.present ? "PRESENT" : "MISSING"}; pending items: ${section.pendingCount}`),
    "",
    "## Blockers",
    "",
    ...(score.blockers.length ? score.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
  ].join("\n");
}

export function renderA4RedactionReport(result) {
  return [
    "# A4 Evidence Redaction Validation",
    "",
    `Status: ${result.status}`,
    `Scanned characters: ${result.scannedCharacters}`,
    "",
    "## Findings",
    "",
    ...(result.findings.length ? result.findings.map((finding) => `- ${finding.type}: ${finding.sample}`) : ["- None."]),
    "",
    result.note,
    "",
  ].join("\n");
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
  const parsed = { command: argv[2] || "report", input: null, output: null, package: null, manifestOutput: null, format: "text" };
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--input") parsed.input = argv[++i];
    else if (argv[i] === "--output") parsed.output = argv[++i];
    else if (argv[i] === "--package") parsed.package = argv[++i];
    else if (argv[i] === "--manifest-output") parsed.manifestOutput = argv[++i];
    else if (argv[i] === "--format") parsed.format = argv[++i];
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
    const absolute = resolve(outputPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
    console.log(`WROTE ${outputPath}`);
  } else {
    console.log(content);
  }
}

function loadPackageContent({ packagePath, fallbackContent }) {
  if (!packagePath) return fallbackContent;
  return readFileSync(resolve(packagePath), "utf8");
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function buildTimestampedEvidencePaths({ generatedAt = new Date(), outputDir = "artifacts/a4" } = {}) {
  const slug = timestampSlug(generatedAt);
  return {
    markdown: join(outputDir, `a4-evidence-package-${slug}.md`),
    json: join(outputDir, `a4-evidence-package-${slug}.json`),
    manifest: join(outputDir, `a4-evidence-manifest-${slug}.json`),
  };
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const args = parseArgs(process.argv);
  const intake = loadIntake(args.input);
  const result = validateA4EnvironmentConfig({ env: process.env, intake });

  if (args.command === "template") {
    writeOrPrint(renderA4EvidenceTemplate(), args.output);
  } else if (args.command === "evidence-package") {
    const packageContent = renderA4EvidencePackage({ intake });
    const outputContent = args.format === "json"
      ? JSON.stringify(buildA4EvidencePackageData({ intake }), null, 2)
      : packageContent;
    writeOrPrint(outputContent, args.output);
    if (args.manifestOutput) {
      writeOrPrint(JSON.stringify(buildA4EvidenceManifest({ packagePath: args.output || "stdout", packageContent }), null, 2), args.manifestOutput);
    }
  } else if (args.command === "evidence-bundle") {
    const generatedAt = new Date();
    const paths = buildTimestampedEvidencePaths({ generatedAt });
    const packageContent = renderA4EvidencePackage({ intake, generatedAt: generatedAt.toISOString() });
    const packageData = buildA4EvidencePackageData({ intake, generatedAt: generatedAt.toISOString() });
    const manifest = buildA4EvidenceManifest({ packagePath: paths.markdown, packageContent, generatedAt: generatedAt.toISOString() });
    writeOrPrint(packageContent, paths.markdown);
    writeOrPrint(JSON.stringify(packageData, null, 2), paths.json);
    writeOrPrint(JSON.stringify(manifest, null, 2), paths.manifest);
  } else if (args.command === "evidence-score") {
    const packageContent = loadPackageContent({ packagePath: args.package, fallbackContent: renderA4EvidencePackage({ intake }) });
    const score = scoreA4EvidencePackage(packageContent);
    writeOrPrint(args.format === "json" ? JSON.stringify(score, null, 2) : renderA4EvidenceScore(score), args.output);
  } else if (args.command === "evidence-redaction") {
    const packageContent = loadPackageContent({ packagePath: args.package, fallbackContent: renderA4EvidencePackage({ intake }) });
    const redaction = validateEvidenceRedaction(packageContent);
    writeOrPrint(args.format === "json" ? JSON.stringify(redaction, null, 2) : renderA4RedactionReport(redaction), args.output);
    process.exitCode = redaction.status === "PASS" ? 0 : 1;
  } else if (args.command === "evidence-manifest") {
    const packagePath = args.package || args.input || "artifacts/a4/a4-execution-verification-evidence-package.md";
    const packageContent = loadPackageContent({ packagePath: args.package || args.input, fallbackContent: renderA4EvidencePackage({ intake }) });
    writeOrPrint(JSON.stringify(buildA4EvidenceManifest({ packagePath, packageContent }), null, 2), args.output);
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
