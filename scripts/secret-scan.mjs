import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const excludedDirectories = new Set([".git", "node_modules", "dist", ".cache", ".vite", "coverage"]);
const excludedFiles = new Set(["package-lock.json"]);
const textExtensions = new Set([".css", ".env", ".example", ".html", ".js", ".json", ".md", ".mjs", ".sql", ".svg", ".ts", ".tsx", ".txt", ".xml", ".yml"]);

const secretPatterns = [
  { name: "supabase-service-role", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'"]+/i },
  { name: "database-url", pattern: /DATABASE_URL\s*=\s*['"]?(postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/)[^\s'"]+/i },
  { name: "jwt-token", pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/ },
  { name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: "payment-secret", pattern: /(STRIPE_SECRET_KEY|PAYMENT_SECRET_KEY|ESCROW_API_KEY)\s*=\s*['"]?(?!<|$|placeholder|your_|REPLACE_|__)[^\s'"]+/i },
  { name: "monitoring-dsn", pattern: /SENTRY_DSN\s*=\s*['"]?https:\/\/[^@\s]+@[^/\s]+\/\d+/i },
];

function extensionOf(path) {
  const match = path.match(/(\.[^.\\/]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function isScannable(path) {
  if (excludedFiles.has(path.replace(/\\/g, "/"))) return false;
  const extension = extensionOf(path);
  if (textExtensions.has(extension)) return true;
  return path.endsWith(".env.example") || path.endsWith(".dockerignore") || path.includes(".github/workflows");
}

function isDocumentedPlaceholder(line) {
  const trimmed = line.trim();
  return (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.includes("<password>") ||
    trimmed.includes("<project-ref>") ||
    trimmed.includes("<required>") ||
    trimmed.includes("placeholder") ||
    trimmed.includes("REPLACE_") ||
    trimmed.includes("your_")
  );
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full);
    const parts = rel.split(/[\\/]/);
    if (parts.some((part) => excludedDirectories.has(part))) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (isScannable(rel) && statSync(full).size <= 1024 * 1024) files.push(rel);
  }
  return files;
}

export function scanForSecrets() {
  const findings = [];
  const files = walk(root);

  for (const file of files) {
    const text = readFileSync(join(root, file), "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isDocumentedPlaceholder(line)) return;
      for (const rule of secretPatterns) {
        if (rule.pattern.test(line)) {
          findings.push({ file, line: index + 1, rule: rule.name });
        }
      }
    });
  }

  return {
    status: findings.length ? "FAIL" : "PASS",
    scannedFiles: files.length,
    findings,
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const json = process.argv.includes("--json");
  const result = scanForSecrets();
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[secret-scan] ${result.status}: ${result.scannedFiles} files scanned.`);
    for (const finding of result.findings) {
      console.log(`[secret-scan] ${finding.file}:${finding.line} ${finding.rule}`);
    }
  }
  process.exit(result.status === "PASS" ? 0 : 1);
}
