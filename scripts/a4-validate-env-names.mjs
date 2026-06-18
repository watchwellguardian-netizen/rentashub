import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CHECKLIST_PATH = "docs/a4-env-variable-checklist.md";

export const A4_ENV_VARIABLE_GROUPS = {
  frontend: [
    "VITE_AUTH_MODE",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_APP_ENV",
  ],
  backend: [
    "APP_ENV",
    "NODE_ENV",
    "PORT",
    "CORS_ALLOWED_ORIGINS",
    "AUTH_TOKEN_SECRET",
    "SESSION_SECRET",
    "APP_ENCRYPTION_KEY",
  ],
  supabase: [
    "DATABASE_PROVIDER",
    "DATABASE_POSTGRES_VENDOR",
    "DATABASE_URL",
    "AUTH_PROVIDER",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
  ],
  storage: [
    "FILE_STORAGE_PROVIDER",
    "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
    "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
    "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
    "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
    "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
    "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
    "FILE_STORAGE_SIGNED_URL_TTL_SECONDS",
    "FILE_UPLOAD_MAX_MB",
    "FILE_REQUIRE_VIRUS_SCAN",
  ],
  monitoring: [
    "MONITORING_PROVIDER",
    "SENTRY_DSN",
    "SENTRY_ENVIRONMENT",
    "SENTRY_RELEASE",
    "BETTER_STACK_API_KEY",
    "BETTER_STACK_HEARTBEAT_URL",
    "BETTER_STACK_STATUS_PAGE_ID",
    "LOG_LEVEL",
    "LOG_DRAIN_URL",
    "ALERT_EMAIL",
    "ALERT_SMS",
    "INCIDENT_OWNER_NAME",
    "INCIDENT_OWNER_EMAIL",
  ],
  payment: [
    "PAYMENT_PROVIDER",
    "PAYMENT_MODE",
    "PAYMENT_SANDBOX_ENABLED",
    "PAYMENT_WEBHOOK_SECRET",
    "PAYMENT_SECRET_KEY",
    "PAYMENT_OPERATIONS_OWNER",
    "PAYMENT_COMPLIANCE_OWNER",
  ],
  escrow: [
    "ESCROW_PROVIDER",
    "ESCROW_MODE",
    "ESCROW_API_KEY",
    "ESCROW_OPERATIONS_OWNER",
    "ESCROW_LEGAL_OWNER",
    "ESCROW_DISPUTE_OWNER",
    "ESCROW_RELEASE_POLICY_URL",
    "ESCROW_DISPUTE_POLICY_URL",
    "ESCROW_SETTLEMENT_CURRENCY",
  ],
  security: [
    "AUTH_REQUIRE_EMAIL_VERIFICATION",
    "AUTH_PASSWORD_RESET_ENABLED",
    "AUTH_REFRESH_TOKEN_ROTATION",
    "AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION",
    "SECURITY_MFA_PROVIDER",
    "SECURITY_SESSION_COOKIE_POLICY",
    "SECURITY_SESSION_REVOCATION",
    "SECURITY_CSP_POLICY",
    "SECURITY_RATE_LIMIT_POLICY",
    "SECURITY_ABUSE_PROTECTION_PROVIDER",
    "SECURITY_DEPENDENCY_AUDIT_TOOL",
    "SECURITY_VULNERABILITY_SCAN_PROVIDER",
  ],
};

const REQUIRED_TEMPLATE_FILES = [
  "docs/a4-02-development-environment-template.md",
  "docs/a4-02-staging-environment-template.md",
  "docs/a4-02-production-environment-template.md",
];

const REQUIRED_TEMPLATE_SECTIONS = [
  "Environment Identity",
  "Provisioning Status",
  "Secret Storage Evidence",
  "Environment Separation Evidence",
  "Readiness Endpoint Expected Result",
  "Sign-Off",
];

const FORBIDDEN_VALUE_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s`|]+/i,
  /sb_(?:service|anon)_[a-z0-9_]{12,}/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/,
  /=\s*['"]?(?!Yes|No|Pending|PASS|FAIL|Not|Credential|Variable|UAT|Development|Production|RC-|A4-|\/api\/health\/readiness)[^\s`|]+/,
];

function readChecklist(root = ROOT) {
  const path = resolve(root, CHECKLIST_PATH);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function variableNames() {
  return Object.values(A4_ENV_VARIABLE_GROUPS).flat();
}

function containsForbiddenValue(text = "") {
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateA4EnvVariableNames({ root = ROOT, checklistText = null } = {}) {
  const text = checklistText ?? readChecklist(root);
  const missingVariables = variableNames().filter((variable) => !new RegExp(`\\\`${variable}\\\``).test(text));
  const groupCoverage = Object.entries(A4_ENV_VARIABLE_GROUPS).map(([group, variables]) => ({
    group,
    requiredVariables: variables.length,
    presentVariables: variables.filter((variable) => new RegExp(`\\\`${variable}\\\``).test(text)).length,
    missingVariables: variables.filter((variable) => !new RegExp(`\\\`${variable}\\\``).test(text)),
  }));
  const requiredColumns = ["Required Now", "Closed Beta", "Paid Pilot", "Public Launch"];
  const missingColumns = requiredColumns.filter((column) => !new RegExp(column, "i").test(text));
  const forbiddenValueDetected = containsForbiddenValue(text);
  const blockers = [
    ...missingVariables.map((variable) => `${variable} is missing from ${CHECKLIST_PATH}.`),
    ...missingColumns.map((column) => `${column} stage column is missing.`),
    ...(forbiddenValueDetected ? ["Checklist appears to contain a secret-like value or assignment. Use variable names only."] : []),
  ];
  return {
    status: blockers.length ? "FAIL" : "PASS",
    checklistPath: CHECKLIST_PATH,
    valuesLoaded: false,
    valuesPrinted: false,
    variablesExpected: variableNames().length,
    variablesPresent: variableNames().length - missingVariables.length,
    groupCoverage,
    missingColumns,
    forbiddenValueDetected,
    blockers,
    note: "Validates variable names and stage columns only. It does not load .env files, read secret values, or prove provider activation.",
  };
}

export function validateA4EnvironmentTemplates({ root = ROOT } = {}) {
  const templates = REQUIRED_TEMPLATE_FILES.map((path) => {
    const fullPath = resolve(root, path);
    const exists = existsSync(fullPath);
    const text = exists ? readFileSync(fullPath, "utf8") : "";
    const missingSections = REQUIRED_TEMPLATE_SECTIONS.filter((section) => !new RegExp(`## ${section}`).test(text));
    const requiredTerms = [
      "Supabase project name",
      "Supabase project ID",
      "Environment owner",
      "Access owner",
      "Billing owner",
      "Database status",
      "Auth status",
      "Storage status",
      "Backup status",
      "storage location",
      "/api/health/readiness",
      "Sign-Off",
    ];
    const missingTerms = requiredTerms.filter((term) => !new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text));
    const forbiddenValueDetected = containsForbiddenValue(text);
    return {
      path,
      exists,
      missingSections,
      missingTerms,
      forbiddenValueDetected,
      status: exists && !missingSections.length && !missingTerms.length && !forbiddenValueDetected ? "PASS" : "FAIL",
    };
  });
  const blockers = templates.flatMap((template) => [
    ...(template.exists ? [] : [`${template.path} is missing.`]),
    ...template.missingSections.map((section) => `${template.path} missing section ${section}.`),
    ...template.missingTerms.map((term) => `${template.path} missing term ${term}.`),
    ...(template.forbiddenValueDetected ? [`${template.path} appears to contain secret-like values.`] : []),
  ]);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    valuesLoaded: false,
    valuesPrinted: false,
    templates,
    blockers,
    note: "Validates A4-02 evidence template structure only. It does not prove environment provisioning.",
  };
}

export function buildA4EnvNameReadinessReport({ root = ROOT } = {}) {
  const variableNamesResult = validateA4EnvVariableNames({ root });
  const templatesResult = validateA4EnvironmentTemplates({ root });
  const blockers = [...variableNamesResult.blockers, ...templatesResult.blockers];
  return {
    status: blockers.length ? "FAIL" : "PASS",
    a402Status: "BLOCKED_PENDING_ACTUAL_ENVIRONMENT_VALUES",
    valuesLoaded: false,
    valuesPrinted: false,
    liveProvisioningClaimed: false,
    variableNames: variableNamesResult,
    templates: templatesResult,
    blockers,
    nextAuthorizedGate: "A4-01 Infrastructure Ownership Confirmation Submitted",
    note: "This report confirms credential-readiness documentation and variable names only. A4-02 remains blocked until actual environment evidence is submitted after A4-01 passes.",
  };
}

export function renderA4EnvNameReadinessReport(report = buildA4EnvNameReadinessReport()) {
  return [
    "# A4 Environment Provisioning Readiness Report",
    "",
    `Status: ${report.status}`,
    `A4-02 Status: ${report.a402Status}`,
    `Values loaded: ${report.valuesLoaded ? "YES" : "NO"}`,
    `Values printed: ${report.valuesPrinted ? "YES" : "NO"}`,
    `Live provisioning claimed: ${report.liveProvisioningClaimed ? "YES" : "NO"}`,
    "",
    "## Variable Checklist",
    "",
    `- Variables present: ${report.variableNames.variablesPresent}/${report.variableNames.variablesExpected}`,
    ...report.variableNames.groupCoverage.map((group) => `- ${group.group}: ${group.presentVariables}/${group.requiredVariables}`),
    "",
    "## Environment Templates",
    "",
    ...report.templates.templates.map((template) => `- ${template.path}: ${template.status}`),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- None for credential-readiness templates."]),
    "",
    `Next authorized gate: ${report.nextAuthorizedGate}`,
    "",
    report.note,
    "",
  ].join("\n");
}

if (resolve(process.argv[1] || "") === resolve(fileURLToPath(import.meta.url))) {
  const json = process.argv.includes("--json");
  const report = buildA4EnvNameReadinessReport();
  console.log(json ? JSON.stringify(report, null, 2) : renderA4EnvNameReadinessReport(report));
  process.exit(report.status === "PASS" ? 0 : 1);
}
