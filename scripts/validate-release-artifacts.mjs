import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();

const requiredPaths = [
  ".github/workflows/ci.yml",
  ".github/workflows/build.yml",
  ".github/workflows/test.yml",
  ".github/workflows/security.yml",
  "docs/program-state.md",
  "docs/repository-standards.md",
  "docs/branch-protection.md",
  "docs/release-management-policy.md",
  "docs/environment-provisioning-checklist.md",
  "docs/csp-policy-draft.md",
  "docs/rate-limit-configuration-matrix.md",
  "docs/mfa-readiness-checklist.md",
  "docs/session-hardening-validation-checklist.md",
  "docs/security-evidence-report-template.md",
  "scripts/check-readiness.mjs",
  "scripts/check-zip-artifact.mjs",
  "scripts/a4-supabase-tooling.mjs",
  "scripts/secret-scan.mjs",
  "scripts/dependency-audit-wrapper.mjs",
  "scripts/database-readiness-tooling.mjs",
  "scripts/storage-readiness-tooling.mjs",
  "scripts/auth-rbac-readiness-tooling.mjs",
  "scripts/release-candidate-tag-helper.mjs",
  "package.json",
];

const buildPaths = ["dist/index.html"];
const forbiddenDirectories = new Set([".git", "node_modules", "dist", ".cache", ".data"]);
const forbiddenPathPatterns = [
  /^server[\\/]\.data(?:[\\/]|$)/,
  /\.env$/,
  /\.env\.(local|development|staging|production)$/,
  /rentashub-dev-db\.json$/,
  /\.sqlite$/,
  /\.db$/,
];
const allowedExtensions = new Set([
  ".css",
  ".csv",
  ".dockerignore",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".png",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yml",
]);

function fileExists(path) {
  return existsSync(join(root, path));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full);
    const parts = rel.split(/[\\/]/);
    if (parts.some((part) => forbiddenDirectories.has(part))) continue;
    if (entry.isDirectory()) walk(full, files);
    else files.push(rel);
  }
  return files;
}

export function validateReleaseArtifacts({ requireBuild = false } = {}) {
  const requiredMissing = requiredPaths.filter((path) => !fileExists(path));
  const buildMissing = requireBuild ? buildPaths.filter((path) => !fileExists(path)) : [];
  const files = walk(root);
  const forbidden = files.filter((path) => forbiddenPathPatterns.some((pattern) => pattern.test(path)));
  const oversized = files
    .filter((path) => {
      const extension = extname(path).toLowerCase();
      const isTextLike = allowedExtensions.has(extension) || path.endsWith(".env.example") || path.endsWith(".dockerignore");
      return !isTextLike && statSync(join(root, path)).size > 5 * 1024 * 1024;
    })
    .map((path) => `${path} (${statSync(join(root, path)).size} bytes)`);

  const blockers = [
    ...requiredMissing.map((path) => `Missing required release artifact: ${path}`),
    ...buildMissing.map((path) => `Missing build artifact: ${path}`),
    ...forbidden.map((path) => `Forbidden runtime or secret path would be packaged: ${path}`),
    ...oversized.map((path) => `Unexpected large binary artifact: ${path}`),
  ];

  return {
    status: blockers.length ? "FAIL" : "PASS",
    checkedFiles: files.length,
    requiredMissing,
    buildMissing,
    forbidden,
    oversized,
    blockers,
  };
}

function parseArgs(argv) {
  return {
    requireBuild: argv.includes("--require-build"),
    json: argv.includes("--json"),
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const options = parseArgs(process.argv.slice(2));
  const result = validateReleaseArtifacts(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[artifact-validation] ${result.status}: ${result.checkedFiles} packageable files checked.`);
    for (const blocker of result.blockers) console.log(`[artifact-validation] blocker: ${blocker}`);
  }
  process.exit(result.status === "PASS" ? 0 : 1);
}
