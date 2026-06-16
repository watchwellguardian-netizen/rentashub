import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseArtifacts } from "./validate-release-artifacts.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const SECRET_PATTERNS = [
  { name: "supabase-service-role-key-assignment", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+/i, severity: "critical" },
  { name: "supabase-service-role-token", pattern: /sb_service_[a-z0-9_]{12,}/i, severity: "critical" },
  { name: "database-url", pattern: /(?:DATABASE_URL\s*[:=]\s*['"]?)?(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/)[^\s'",}]+/i, severity: "critical" },
  { name: "jwt-token", pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/, severity: "high" },
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, severity: "critical" },
  { name: "payment-or-escrow-secret", pattern: /(STRIPE_SECRET_KEY|PAYMENT_SECRET_KEY|ESCROW_API_KEY)\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+/i, severity: "critical" },
  { name: "monitoring-dsn", pattern: /SENTRY_DSN\s*[:=]\s*['"]?https:\/\/[^@\s]+@[^/\s]+\/\d+/i, severity: "medium" },
  { name: "generic-provider-key", pattern: /(SUPABASE_ANON_KEY|SUPABASE_JWT_SECRET|AUTH_TOKEN_SECRET|SESSION_SECRET|FILE_STORAGE_SECRET_KEY)\s*[:=]\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'",}]+/i, severity: "high" },
];

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".log",
  ".md",
  ".mjs",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yml",
]);

const DEFAULT_EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", ".cache", ".vite", "coverage"]);

function normalize(path) {
  return path.replace(/\\/g, "/");
}

function extensionOf(path) {
  return extname(path).toLowerCase();
}

function isTextPath(path) {
  const extension = extensionOf(path);
  return TEXT_EXTENSIONS.has(extension) || path.endsWith(".env.example") || path.endsWith(".dockerignore") || path.includes(".github/workflows");
}

function isPlaceholderLine(line = "") {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  return (
    !trimmed ||
    trimmed.startsWith("#") ||
    lower.includes("<password>") ||
    lower.includes("<project-ref>") ||
    lower.includes("<required>") ||
    lower.includes("placeholder") ||
    lower.includes("example") ||
    lower.includes("fake") ||
    lower.includes("mock") ||
    lower.includes("sample") ||
    lower.includes("test") ||
    lower.includes("localhost") ||
    lower.includes("present") ||
    lower.includes("missing") ||
    lower.includes("configured") ||
    lower.includes("redacted") ||
    lower.includes("readiness") ||
    lower.includes("should-never-print") ||
    lower.includes("actual-secret-value") ||
    lower.includes("change-this") ||
    lower.includes("@example") ||
    lower.includes("user:password") ||
    lower.includes("user:pass@host") ||
    lower.includes("projectref:secret") ||
    lower.includes("strong-secret") ||
    lower.includes("cookie-secret") ||
    lower.includes("abc123@o123") ||
    lower.includes("should_not_appear") ||
    lower.includes("should_not_log") ||
    lower.includes("should-not-log") ||
    lower.includes("secret_value") ||
    lower.includes("-key-value") ||
    lower.includes("must use") ||
    lower.includes("uses `postgres://") ||
    lower.includes("includes username") ||
    lower.includes("parsed.protocol") ||
    lower.includes("doesnotmatch") ||
    lower.includes("assert.") ||
    trimmed.includes("REPLACE_") ||
    trimmed.includes("your_") ||
    trimmed.includes("__")
  );
}

function isSafeServiceRoleReference(line = "") {
  const trimmed = line.trim();
  if (!/SUPABASE_SERVICE_ROLE_KEY/i.test(trimmed)) return true;
  if (/sb_service_[a-z0-9_]{12,}/i.test(trimmed)) return false;
  if (!/[=:]/.test(trimmed)) return true;
  const assignmentValue = (trimmed.match(/SUPABASE_SERVICE_ROLE_KEY["']?\s*[:=]\s*["']?([^"',}\s]+)/i) || [])[1] || "";
  if (!assignmentValue) return true;
  return /^(present|missing|configured|true|false|placeholder|your_|REPLACE_|__|<)/i.test(assignmentValue);
}

function walk(dir, {
  root = ROOT,
  include = () => true,
  excludedDirectories = DEFAULT_EXCLUDED_DIRECTORIES,
  maxBytes = 1024 * 1024,
} = {}, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = normalize(relative(root, full));
    const parts = rel.split("/");
    if (parts.some((part) => excludedDirectories.has(part))) continue;
    if (entry.isDirectory()) {
      walk(full, { root, include, excludedDirectories, maxBytes }, files);
    } else if (include(rel) && statSync(full).size <= maxBytes) {
      files.push(rel);
    }
  }
  return files;
}

function scanTextFile(relPath, root = ROOT) {
  const full = join(root, relPath);
  const text = readFileSync(full, "utf8");
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (isPlaceholderLine(line)) return;
    for (const rule of SECRET_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({
          file: relPath,
          line: index + 1,
          rule: rule.name,
          severity: rule.severity,
          sample: "REDACTED",
        });
      }
    }
  });
  return findings;
}

function scanPaths(paths, root = ROOT) {
  const findings = [];
  for (const relPath of paths.filter(isTextPath)) {
    findings.push(...scanTextFile(relPath, root));
  }
  return {
    status: findings.length ? "FAIL" : "PASS",
    scannedFiles: paths.filter(isTextPath).length,
    findings,
  };
}

export function scanFrontendBundleSecrets({ root = ROOT } = {}) {
  const distDir = join(root, "dist");
  const paths = walk(distDir, {
    root,
    include: (path) => path.startsWith("dist/") && [".html", ".js", ".css", ".json", ".svg"].includes(extensionOf(path)),
  });
  return {
    surface: "frontend_bundle",
    note: "Scans built frontend bundle files only. Run npm run build before using this as release evidence.",
    ...scanPaths(paths, root),
  };
}

export function scanZipArtifactSecrets({ root = ROOT } = {}) {
  const artifactValidation = validateReleaseArtifacts();
  const forbiddenDirectories = new Set([".git", "node_modules", "server/.data", ".cache"]);
  const paths = walk(root, {
    root,
    excludedDirectories: DEFAULT_EXCLUDED_DIRECTORIES,
    include: (path) => {
      const parts = path.split("/");
      if (parts.some((part) => forbiddenDirectories.has(part))) return false;
      if (path.startsWith("server/.data/")) return false;
      if (path.startsWith("dist/")) return true;
      return isTextPath(path);
    },
  });
  const scan = scanPaths(paths, root);
  return {
    surface: "zip_artifact_packageable_files",
    artifactValidationStatus: artifactValidation.status,
    artifactBlockers: artifactValidation.blockers,
    note: "Scans packageable text files that would be eligible for review artifacts; ZIP binary extraction is not required.",
    ...scan,
    status: artifactValidation.status === "PASS" && scan.status === "PASS" ? "PASS" : "FAIL",
  };
}

export function scanDocumentationSecrets({ root = ROOT } = {}) {
  const paths = walk(join(root, "docs"), {
    root,
    include: (path) => path.startsWith("docs/") && [".md", ".txt", ".json", ".yml"].includes(extensionOf(path)),
  });
  return {
    surface: "documentation",
    note: "Scans documentation for pasted secrets while allowing documented placeholders.",
    ...scanPaths(paths, root),
  };
}

export function scanLogPatternSecrets({ root = ROOT } = {}) {
  const paths = walk(root, {
    root,
    include: (path) => path.includes(".preview-logs/") || path.startsWith("logs/") || path.endsWith(".log"),
  });
  return {
    surface: "logs",
    note: "Scans local log-like files for credential leakage. Runtime logs should never contain provider keys.",
    ...scanPaths(paths, root),
  };
}

export function detectServiceRoleExposure({ root = ROOT } = {}) {
  const paths = walk(root, {
    root,
    include: (path) => isTextPath(path),
  });
  const findings = [];
  for (const relPath of paths) {
    const text = readFileSync(join(root, relPath), "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (isPlaceholderLine(line)) return;
      if (/SUPABASE_SERVICE_ROLE_KEY/i.test(line) || /sb_service_[a-z0-9_]{12,}/i.test(line)) {
        if (!isSafeServiceRoleReference(line)) {
          findings.push({
            file: relPath,
            line: index + 1,
            rule: "service-role-key-exposure",
            severity: "critical",
            sample: "REDACTED",
          });
        }
      }
    });
  }
  return {
    surface: "service_role_key_exposure",
    status: findings.length ? "FAIL" : "PASS",
    scannedFiles: paths.length,
    findings,
    note: "Detects Supabase service-role assignment or token exposure. Safe label-only documentation is allowed.",
  };
}

export function buildSecretSafetyReport({ root = ROOT } = {}) {
  const checks = [
    scanFrontendBundleSecrets({ root }),
    scanZipArtifactSecrets({ root }),
    scanDocumentationSecrets({ root }),
    scanLogPatternSecrets({ root }),
    detectServiceRoleExposure({ root }),
  ];
  const findings = checks.flatMap((check) => check.findings.map((finding) => ({ ...finding, surface: check.surface })));
  return {
    status: checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
    generatedAt: new Date().toISOString(),
    note: "Secret safety report does not print secret values. Findings include file, line, rule, severity, and redacted sample only.",
    checks,
    findings,
  };
}

export function renderSecretSafetyReport(report) {
  return [
    "# Secret Safety Report",
    "",
    `Status: ${report.status}`,
    `Generated: ${report.generatedAt}`,
    "",
    report.note,
    "",
    "## Checks",
    "",
    ...report.checks.map((check) => `- ${check.surface}: ${check.status}; scanned ${check.scannedFiles}; findings ${check.findings.length}`),
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.surface}: ${finding.file}:${finding.line} ${finding.rule} (${finding.severity}) ${finding.sample}`)
      : ["- None."]),
    "",
  ].join("\n");
}

function parseArgs(argv) {
  return {
    command: argv[2] || "report",
    json: argv.includes("--json"),
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs(process.argv);
  const commands = {
    bundle: scanFrontendBundleSecrets,
    zip: scanZipArtifactSecrets,
    docs: scanDocumentationSecrets,
    logs: scanLogPatternSecrets,
    "service-role": detectServiceRoleExposure,
    report: buildSecretSafetyReport,
  };
  const runner = commands[args.command] || buildSecretSafetyReport;
  const result = runner({ root: ROOT });
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else if (args.command === "report" || !commands[args.command]) console.log(renderSecretSafetyReport(result));
  else {
    console.log(`[secret-safety] ${result.surface} ${result.status}: ${result.scannedFiles} files scanned.`);
    for (const finding of result.findings) {
      console.log(`[secret-safety] ${finding.file}:${finding.line} ${finding.rule} ${finding.severity} ${finding.sample}`);
    }
  }
  process.exit(result.status === "PASS" ? 0 : 1);
}
