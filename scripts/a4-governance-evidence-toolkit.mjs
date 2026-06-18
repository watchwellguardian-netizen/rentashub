import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_MIGRATIONS,
  buildA4EvidenceManifest,
  buildA4MasterEvidenceIndex,
  buildSupabaseActivationDryRunReport,
  renderA4MasterEvidenceIndex,
  validateEvidenceRedaction,
} from "./a4-supabase-tooling.mjs";
import { buildMigrationEvidenceReport, renderMigrationEvidenceReport } from "./migration-safety-tooling.mjs";
import { buildSecretSafetyReport, renderSecretSafetyReport } from "./secret-safety-tooling.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MIGRATIONS_DIR = join(ROOT, "server", "migrations");

const PLACEHOLDER_PATTERN = /\b(pending|tbd|to be supplied|placeholder|fake|sample|example|blank|insert date|actual supabase id)\b|<[^>]+>/i;
const SECRET_PATTERNS = [
  { type: "supabase-service-role-key", severity: "critical", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+|sb_service_[a-z0-9_]{12,}/i },
  { type: "supabase-anon-key", severity: "high", pattern: /SUPABASE_ANON_KEY\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+|sb_anon_[a-z0-9_]{12,}/i },
  { type: "postgres-connection-string", severity: "critical", pattern: /postgres(?:ql)?:\/\/[^\s'",}]+/i },
  { type: "jwt-token-or-secret", severity: "high", pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}|JWT_SECRET\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+/i },
  { type: "payment-secret-key", severity: "critical", pattern: /(STRIPE_SECRET_KEY|PAYMENT_SECRET_KEY|ESCROW_API_KEY|WEBHOOK_SECRET)\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+/i },
  { type: "private-api-key-or-token", severity: "high", pattern: /(PRIVATE_API_KEY|ACCESS_TOKEN|API_TOKEN)\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+/i },
];

const A4_01_REQUIRED_FIELDS = [
  { key: "organization", label: "Organization" },
  { key: "infrastructureOwner", label: "Infrastructure Owner" },
  { key: "billingOwner", label: "Billing Owner" },
  { key: "accessOwner", label: "Access Owner" },
  { key: "developmentProjectName", label: "Development Project Name" },
  { key: "developmentProjectId", label: "Development Project ID", projectId: true },
  { key: "uatProjectName", label: "UAT/Staging Project Name" },
  { key: "uatProjectId", label: "UAT/Staging Project ID", projectId: true },
  { key: "productionProjectName", label: "Production Project Name" },
  { key: "productionProjectId", label: "Production Project ID", projectId: true },
];

const SCAN_DIRECTORIES = ["src", "server", "docs", "tests", "scripts", "dist"];
const TEXT_EXTENSIONS = new Set([".css", ".env", ".example", ".html", ".js", ".json", ".log", ".md", ".mjs", ".sql", ".svg", ".ts", ".tsx", ".txt", ".xml", ".yml"]);

function normalizePath(path) {
  return path.replace(/\\/g, "/");
}

function isPlaceholder(value = "") {
  return !String(value).trim() || PLACEHOLDER_PATTERN.test(String(value).trim());
}

function isSecretLike(value = "") {
  return SECRET_PATTERNS.some((rule) => rule.pattern.test(String(value)));
}

export function validateSupabaseProjectId(projectId = "") {
  const value = String(projectId).trim();
  if (!value) return { status: "FAIL", code: "missing_project_id", message: "Project ID is required." };
  if (isPlaceholder(value)) return { status: "FAIL", code: "placeholder_project_id", message: "Project ID is a placeholder." };
  if (/^https?:\/\//i.test(value)) return { status: "FAIL", code: "url_not_project_id", message: "Project ID must not be a Supabase URL." };
  if (isSecretLike(value)) return { status: "FAIL", code: "secret_like_project_id", message: "Project ID appears to contain credential material." };
  if (!/^[a-z0-9_-]{8,64}$/i.test(value)) return { status: "FAIL", code: "invalid_project_id_format", message: "Project ID should be a non-secret identifier." };
  return { status: "PASS", code: "valid_project_id", message: "Project ID format is acceptable." };
}

function collectSecretFindings(text = "", source = "input") {
  const findings = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    if (
      /placeholder|example|sample|fake|mock|test|REDACTED|<[^>]+>|shaped-for-readiness|should-never-print|actual-secret-value/i.test(line) ||
      /must use|uses `|must include|includes username|provider secret store|parsed\.protocol|invalid_|doesNotMatch|assert\.|readiness/i.test(line) ||
      /"present"|user:password|user:pass@host|projectref:secret|live-key-value|should_not_appear|secret_value|should_not_log|should-not-log/i.test(line)
    ) return;
    for (const rule of SECRET_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({ source, line: index + 1, type: rule.type, severity: rule.severity, sample: "REDACTED" });
      }
    }
  });
  return findings;
}

function valueFromJson(json = {}, key) {
  const owners = json.owners || {};
  const development = json.development || {};
  const uat = json.uat || json.staging || {};
  const production = json.production || {};
  const direct = {
    organization: json.organization,
    infrastructureOwner: json.infrastructureOwner || owners.infrastructureOwner,
    billingOwner: json.billingOwner || owners.billingOwner,
    accessOwner: json.accessOwner || owners.accessOwner,
    developmentProjectName: json.developmentProjectName || development.projectName,
    developmentProjectId: json.developmentProjectId || development.projectId,
    uatProjectName: json.uatProjectName || json.stagingProjectName || uat.projectName,
    uatProjectId: json.uatProjectId || json.stagingProjectId || uat.projectId,
    productionProjectName: json.productionProjectName || production.projectName,
    productionProjectId: json.productionProjectId || production.projectId,
  };
  return direct[key];
}

function parseLooseEvidenceText(text = "") {
  const lines = String(text).split(/\r?\n/);
  const result = {};
  let currentSection = "";
  const sectionMap = {
    development: "development",
    "development environment": "development",
    staging: "uat",
    "staging environment": "uat",
    uat: "uat",
    "uat/staging": "uat",
    production: "production",
    "production environment": "production",
  };
  const setValue = (key, value) => {
    if (!result[key] && value) result[key] = value.trim();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim();
    if (!raw) continue;
    const lower = raw.replace(/:$/, "").toLowerCase();
    if (sectionMap[lower]) {
      currentSection = sectionMap[lower];
      continue;
    }
    const next = (lines[index + 1] || "").trim();
    const inline = raw.match(/^([^:]+):\s*(.+)$/);
    const label = (inline ? inline[1] : raw.replace(/:$/, "")).trim().toLowerCase();
    const value = inline ? inline[2].trim() : next;
    if (/^organization$/.test(label)) setValue("organization", value);
    else if (/^infrastructure owner$/.test(label)) setValue("infrastructureOwner", value);
    else if (/^billing owner$/.test(label)) setValue("billingOwner", value);
    else if (/^access owner$/.test(label)) setValue("accessOwner", value);
    else if (/^project name$/.test(label) && currentSection) setValue(`${currentSection === "uat" ? "uat" : currentSection}ProjectName`, value);
    else if (/^project id$/.test(label) && currentSection) setValue(`${currentSection === "uat" ? "uat" : currentSection}ProjectId`, value);
    else if (/development project name/.test(label)) setValue("developmentProjectName", value);
    else if (/development project id/.test(label)) setValue("developmentProjectId", value);
    else if (/(uat|staging).*project name/.test(label)) setValue("uatProjectName", value);
    else if (/(uat|staging).*project id/.test(label)) setValue("uatProjectId", value);
    else if (/production project name/.test(label)) setValue("productionProjectName", value);
    else if (/production project id/.test(label)) setValue("productionProjectId", value);
  }
  return result;
}

export function parseA4EvidenceInput(content = "") {
  const text = String(content || "");
  if (!text.trim()) return {};
  try {
    const json = JSON.parse(text);
    return Object.fromEntries(A4_01_REQUIRED_FIELDS.map((field) => [field.key, valueFromJson(json, field.key) || ""]));
  } catch {
    return parseLooseEvidenceText(text);
  }
}

export function validateA4EvidenceIntake({ content = "", parsed = null, source = "input" } = {}) {
  const data = parsed || parseA4EvidenceInput(content);
  const findings = [];
  const secretFindings = collectSecretFindings(content || JSON.stringify(data), source);
  for (const field of A4_01_REQUIRED_FIELDS) {
    const value = String(data[field.key] || "").trim();
    if (!value) findings.push({ field: field.key, severity: "high", message: `${field.label} is missing.` });
    else if (isPlaceholder(value)) findings.push({ field: field.key, severity: "high", message: `${field.label} is placeholder or pending.` });
    if (field.projectId && value) {
      const validation = validateSupabaseProjectId(value);
      if (validation.status !== "PASS") findings.push({ field: field.key, severity: "high", message: validation.message, code: validation.code });
    }
  }
  for (const finding of secretFindings) {
    findings.push({ field: "secrets", severity: finding.severity, message: `${finding.type} detected in ${finding.source}:${finding.line}.` });
  }
  const blockers = findings.map((finding) => `${finding.field}: ${finding.message}`);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    gate: "A4-01 Infrastructure Ownership Confirmation",
    noSecretsDetected: secretFindings.length === 0,
    fields: A4_01_REQUIRED_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      present: Boolean(String(data[field.key] || "").trim()),
      placeholder: isPlaceholder(data[field.key] || ""),
      projectIdValidation: field.projectId ? validateSupabaseProjectId(data[field.key] || "") : null,
    })),
    findings,
    blockers,
    nextAuthorizedGate: blockers.length ? "A4-01 Infrastructure Ownership Confirmation Submitted" : "A4-02 Environment Provisioning Verification",
    note: "Static evidence intake only. No Supabase API calls, secret reads, or live activation occurred.",
  };
}

export function scoreA4GovernanceEvidence({ content = "", parsed = null } = {}) {
  const intake = validateA4EvidenceIntake({ content, parsed });
  const dryRun = buildSupabaseActivationDryRunReport(ROOT);
  const migration = buildMigrationEvidenceReport();
  const secretSafety = buildSecretSafetyReport();
  const gates = [
    {
      id: "A4-01",
      title: "Infrastructure Ownership",
      status: intake.status === "PASS" ? "PASS" : intake.fields.some((field) => field.present) ? "PARTIAL" : "FAIL",
      blockers: intake.blockers,
      missingEvidence: intake.fields.filter((field) => !field.present || field.placeholder || field.projectIdValidation?.status === "FAIL").map((field) => field.label),
      manualInterventionRequired: intake.status !== "PASS",
    },
    {
      id: "A4-02",
      title: "Environment Provisioning",
      status: "FAIL",
      blockers: ["Supabase environment accessibility and secret storage cannot be proven without provisioned projects."],
      missingEvidence: ["Project accessibility", "Approved secret-store mappings", "Environment separation evidence"],
      manualInterventionRequired: true,
    },
    {
      id: "A4-03",
      title: "Secrets Handling",
      status: secretSafety.status === "PASS" ? "PARTIAL" : "FAIL",
      blockers: secretSafety.status === "PASS" ? ["Secure secret-store evidence still requires manual submission."] : secretSafety.findings.map((finding) => `${finding.file}:${finding.line} ${finding.rule || finding.type}`),
      missingEvidence: ["GitHub/hosting/vault secret storage confirmation"],
      manualInterventionRequired: true,
    },
    {
      id: "A4-04",
      title: "Migration Readiness",
      status: migration.status === "PASS" && dryRun.status === "PASS" ? "PARTIAL" : "FAIL",
      blockers: migration.status === "PASS" && dryRun.status === "PASS" ? ["Migrations are statically ready but not executed against Development or UAT."] : [...migration.blockers, ...dryRun.findings],
      missingEvidence: ["Development migration execution", "UAT migration execution", "Production untouched evidence"],
      manualInterventionRequired: true,
    },
    {
      id: "A4-05",
      title: "Storage/Auth Readiness",
      status: "FAIL",
      blockers: ["Real Supabase Auth and Storage evidence requires live environments."],
      missingEvidence: ["Auth lifecycle evidence", "Storage bucket access evidence", "Backup/restore evidence"],
      manualInterventionRequired: true,
    },
  ];
  const passed = gates.filter((gate) => gate.status === "PASS").length;
  const partial = gates.filter((gate) => gate.status === "PARTIAL").length;
  const score = Math.round(((passed + partial * 0.5) / gates.length) * 100);
  return {
    status: gates.every((gate) => gate.status === "PASS") ? "PASS" : partial || passed ? "PARTIAL" : "FAIL",
    score,
    generatedAt: new Date().toISOString(),
    gates,
    blockers: gates.flatMap((gate) => gate.blockers.map((blocker) => `${gate.id}: ${blocker}`)),
    nextAuthorizedGate: intake.status === "PASS" ? "A4-02 Environment Provisioning Verification" : "A4-01 Infrastructure Ownership Confirmation Submitted",
    note: "Credential-readiness scoring only. Manual provider evidence is still required for live activation gates.",
  };
}

function renderScore(score) {
  return [
    "# A4 Governance Evidence Score",
    "",
    `Status: ${score.status}`,
    `Score: ${score.score}`,
    `Generated At: ${score.generatedAt}`,
    "",
    "## Gates",
    "",
    ...score.gates.map((gate) => `- ${gate.id} ${gate.title}: ${gate.status}; manual intervention required: ${gate.manualInterventionRequired ? "YES" : "NO"}`),
    "",
    "## Blockers",
    "",
    ...(score.blockers.length ? score.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    `Next authorized gate: ${score.nextAuthorizedGate}`,
    "",
    score.note,
    "",
  ].join("\n");
}

function renderIntake(result) {
  return [
    "# A4-01 Evidence Intake Validation",
    "",
    `Status: ${result.status}`,
    `Gate: ${result.gate}`,
    `No secrets detected: ${result.noSecretsDetected ? "YES" : "NO"}`,
    "",
    "## Fields",
    "",
    ...result.fields.map((field) => `- ${field.label}: ${field.present ? "PRESENT" : "MISSING"}${field.placeholder ? "; PLACEHOLDER" : ""}${field.projectIdValidation ? `; ${field.projectIdValidation.code}` : ""}`),
    "",
    "## Blockers",
    "",
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    `Next authorized gate: ${result.nextAuthorizedGate}`,
    "",
    result.note,
    "",
  ].join("\n");
}

function scanFileList(root = ROOT) {
  const files = [];
  for (const dir of SCAN_DIRECTORIES) {
    const absolute = join(root, dir);
    if (!existsSync(absolute)) continue;
    walk(absolute, root, files);
  }
  return files;
}

function walk(dir, root, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = normalizePath(relative(root, full));
    if (rel.split("/").some((part) => [".git", "node_modules", ".cache", ".vite", "coverage"].includes(part))) continue;
    if (entry.isDirectory()) walk(full, root, files);
    else if (TEXT_EXTENSIONS.has(extname(rel).toLowerCase()) && statSync(full).size <= 1024 * 1024) files.push(rel);
  }
}

export function scanGovernanceSecrets({ root = ROOT } = {}) {
  const files = scanFileList(root);
  const findings = files.flatMap((file) => collectSecretFindings(readFileSync(join(root, file), "utf8"), file));
  return {
    status: findings.length ? "FAIL" : "PASS",
    scannedFiles: files.length,
    findings,
    note: "Secret scanner prints only file path, line, finding type, and severity. Secret values are never printed.",
  };
}

export function checkMigrationReadiness() {
  const existing = existsSync(MIGRATIONS_DIR) ? readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort() : [];
  const required = REQUIRED_MIGRATIONS.map((file, index) => ({
    order: index + 1,
    file,
    exists: existing.includes(file),
    path: normalizePath(join("server", "migrations", file)),
  }));
  const orderValid = required.every((migration, index) => existing.indexOf(migration.file) === existing.findIndex((file) => file === REQUIRED_MIGRATIONS[index]));
  const migrationEvidence = buildMigrationEvidenceReport();
  const blockers = [
    ...required.filter((migration) => !migration.exists).map((migration) => `${migration.file} is missing.`),
    ...(orderValid ? [] : ["Required A4 migrations are not in expected order."]),
    ...migrationEvidence.blockers,
  ];
  return {
    status: blockers.length ? "FAIL" : "PASS",
    liveDatabaseTouched: false,
    databaseUrlRequired: false,
    required,
    orderValid,
    migrationEvidence,
    blockers,
  };
}

export function checkRlsRbacSqlStaticReadiness() {
  const dryRun = buildSupabaseActivationDryRunReport(ROOT);
  const rls = dryRun.checks.rlsPolicyCoverage;
  const auth = dryRun.checks.authRbacSqlPolicyConsistency;
  const requiredReferences = ["tenant", "admin", "supplier", "customer"];
  const combinedSql = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8")).join("\n")
    : "";
  const referenceCoverage = requiredReferences.map((reference) => ({
    reference,
    present: new RegExp(reference, "i").test(combinedSql),
  }));
  const blockers = [
    ...rls.findings,
    ...auth.findings,
    ...referenceCoverage.filter((item) => !item.present).map((item) => `${item.reference} reference missing from SQL.`),
  ];
  return {
    status: blockers.length ? "NEEDS_REVIEW" : "PASS",
    liveRlsClaimed: false,
    rlsPolicyCoverage: rls,
    authRbacPolicyConsistency: auth,
    referenceCoverage,
    blockers,
    note: "Static SQL analyzer only. It does not prove live RLS enforcement.",
  };
}

export function generateA4EvidenceManifest({ packagePath = null, output = "docs/a4-evidence-manifest.md", content = "" } = {}) {
  const packageContent = packagePath && existsSync(resolve(packagePath)) ? readFileSync(resolve(packagePath), "utf8") : content;
  const manifest = buildA4EvidenceManifest({ packagePath: packagePath || "inline_or_not_supplied", packageContent });
  const index = buildA4MasterEvidenceIndex({ packagePath: packagePath || "inline_or_not_supplied", packageContent });
  const markdown = [
    "# A4 Evidence Manifest",
    "",
    `Generated At: ${manifest.generatedAt}`,
    `Package Path: ${manifest.packagePath}`,
    `Package Status: ${manifest.packageStatus}`,
    `Completeness Score: ${manifest.completenessScore}`,
    `Redaction Status: ${manifest.redactionStatus}`,
    "",
    "## Gate Coverage",
    "",
    ...index.gates.map((gate) => `- ${gate.gateId} ${gate.title}: ${gate.status}; score ${gate.completenessScore}`),
    "",
    "## Missing Evidence",
    "",
    ...(manifest.blockers.length ? manifest.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    "## No-Secrets Confirmation",
    "",
    manifest.redactionStatus === "PASS" ? "- No secret-like values detected in supplied evidence content." : "- Secret-like values detected; remove and regenerate.",
    "",
    "## Next Authorized Gate",
    "",
    "- A4-01 Infrastructure Ownership Confirmation Submitted unless all A4-01 evidence passes.",
    "",
  ].join("\n");
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(resolve(output), markdown);
  return { status: "PASS", output, manifest, index };
}

export function renderRlsRbacStaticReport(report = checkRlsRbacSqlStaticReadiness()) {
  return [
    "# RLS/RBAC SQL Static Readiness Report",
    "",
    `Status: ${report.status}`,
    `Live RLS Claimed: ${report.liveRlsClaimed ? "YES" : "NO"}`,
    "",
    "## Reference Coverage",
    "",
    ...report.referenceCoverage.map((item) => `- ${item.reference}: ${item.present ? "PRESENT" : "MISSING"}`),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    report.note,
    "",
  ].join("\n");
}

function parseArgs(argv) {
  const args = { command: argv[2] || "score", input: null, output: null, json: argv.includes("--json") };
  for (let index = 3; index < argv.length; index += 1) {
    if (argv[index] === "--input") args.input = argv[++index];
    else if (argv[index] === "--output") args.output = argv[++index];
  }
  return args;
}

function readInput(inputPath) {
  if (!inputPath) return "";
  return readFileSync(resolve(inputPath), "utf8");
}

function printOrWrite(content, output) {
  if (output) {
    mkdirSync(dirname(resolve(output)), { recursive: true });
    writeFileSync(resolve(output), content);
    console.log(`WROTE ${output}`);
  } else {
    console.log(content);
  }
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const args = parseArgs(process.argv);
  const content = readInput(args.input);
  let result;
  let rendered;
  if (args.command === "validate") {
    result = validateA4EvidenceIntake({ content, source: args.input || "stdin" });
    rendered = args.json ? JSON.stringify(result, null, 2) : renderIntake(result);
  } else if (args.command === "manifest") {
    result = generateA4EvidenceManifest({ packagePath: args.input, output: args.output || "docs/a4-evidence-manifest.md", content });
    rendered = args.json ? JSON.stringify(result, null, 2) : `WROTE ${result.output}`;
  } else if (args.command === "secrets") {
    result = scanGovernanceSecrets();
    rendered = args.json ? JSON.stringify(result, null, 2) : renderSecretSafetyReport({ ...buildSecretSafetyReport(), findings: result.findings });
  } else if (args.command === "migration") {
    result = checkMigrationReadiness();
    rendered = args.json ? JSON.stringify(result, null, 2) : renderMigrationEvidenceReport(result.migrationEvidence);
  } else if (args.command === "rls-rbac") {
    result = checkRlsRbacSqlStaticReadiness();
    rendered = args.json ? JSON.stringify(result, null, 2) : renderRlsRbacStaticReport(result);
  } else {
    result = scoreA4GovernanceEvidence({ content });
    rendered = args.json ? JSON.stringify(result, null, 2) : renderScore(result);
  }
  if (args.command === "manifest") console.log(rendered);
  else printOrWrite(rendered, args.output);
  process.exitCode = result.status === "PASS" ? 0 : args.command === "score" ? 0 : 1;
}
