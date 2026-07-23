import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'a3-y');

const SOURCE_DIRS = ['src', 'server/src', 'scripts', 'tests/production', 'server/tests'];
const JS_SYNTAX_DIRS = ['server/src', 'scripts', 'tests/production', 'server/tests'];
const TEXT_SCAN_DIRS = ['src', 'server/src', 'scripts', 'tests', 'docs/evidence/a3-y'];
const SECRET_VALUE_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/i,
  /sb_secret_[A-Za-z0-9_-]{20,}/i,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /postgresql:\/\/[^:\s]+:[^@\s]+@/i,
];

const walkFiles = (dir, predicate = () => true) => {
  const absolute = path.join(ROOT, dir);
  if (!existsSync(absolute)) return [];
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current)) {
      const fullPath = path.join(current, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (['node_modules', 'dist', '.git', '.preview-logs'].includes(entry)) continue;
        visit(fullPath);
      } else if (predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  };
  visit(absolute);
  return files;
};

const relative = (file) => path.relative(ROOT, file).replaceAll(path.sep, '/');

const collectTextFiles = () => {
  const seen = new Set();
  return TEXT_SCAN_DIRS.flatMap((dir) =>
    walkFiles(dir, (file) => /\.(js|jsx|mjs|json|md|css|html)$/.test(file)).filter((file) => {
      const rel = relative(file);
      if (seen.has(rel)) return false;
      seen.add(rel);
      return true;
    }),
  );
};

const runLint = ({ json = false } = {}) => {
  const findings = [];
  const warnings = [];

  for (const dir of JS_SYNTAX_DIRS) {
    for (const file of walkFiles(dir, (candidate) => /\.(js|mjs)$/.test(candidate))) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) {
        findings.push({
          rule: 'node-syntax-check',
          file: relative(file),
          message: (result.stderr || result.stdout || '').trim().split('\n')[0],
        });
      }
    }
  }

  for (const file of collectTextFiles()) {
    const rel = relative(file);
    const content = readFileSync(file, 'utf8');

    if (/^(<<<<<<<|=======|>>>>>>>)\s?/m.test(content)) {
      findings.push({ rule: 'merge-conflict-marker', file: rel, message: 'Merge conflict marker found.' });
    }

    if (rel.startsWith('src/') && /VibeForge|PlannasHub|StayFlow Nexus|Graphene AI Core/i.test(content)) {
      findings.push({ rule: 'retired-product-branding', file: rel, message: 'Non-RentasHub product branding found in source.' });
    }

    if (rel.startsWith('src/') && /production[- ]ready|public launch ready|paid pilot ready/i.test(content)) {
      warnings.push({ rule: 'production-claim-review', file: rel, message: 'Review source copy for production-readiness claim context.' });
    }

    if (!rel.startsWith('tests/')) {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(content)) {
          findings.push({ rule: 'secret-like-value', file: rel, message: 'Secret-like value found; only labels/placeholders are allowed.' });
          break;
        }
      }
    }
  }

  const report = {
    status: findings.length === 0 ? 'PASS' : 'FAIL',
    checkedDirectories: SOURCE_DIRS,
    syntaxCheckedDirectories: JS_SYNTAX_DIRS,
    filesScanned: collectTextFiles().length,
    findings,
    warnings,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[a3-y:lint] status: ${report.status}`);
    console.log(`[a3-y:lint] files scanned: ${report.filesScanned}`);
    console.log(`[a3-y:lint] findings: ${findings.length}`);
    console.log(`[a3-y:lint] warnings: ${warnings.length}`);
    for (const finding of findings) {
      console.log(`[a3-y:lint] ${finding.rule}: ${finding.file} - ${finding.message}`);
    }
  }

  return report;
};

const byteFormat = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const runBundleReport = ({ json = false } = {}) => {
  const distDir = path.join(ROOT, 'dist');
  if (!existsSync(distDir)) {
    const report = { status: 'FAIL', message: 'dist/ does not exist. Run npm run build first.' };
    console.log(json ? JSON.stringify(report, null, 2) : `[a3-y:bundle] ${report.message}`);
    return report;
  }

  const assetsDir = path.join(distDir, 'assets');
  const files = existsSync(assetsDir)
    ? readdirSync(assetsDir).map((name) => path.join(assetsDir, name)).filter((file) => statSync(file).isFile())
    : [];

  const assets = files.map((file) => ({
    file: relative(file),
    type: path.extname(file).replace('.', '') || 'unknown',
    bytes: statSync(file).size,
  })).sort((a, b) => b.bytes - a.bytes);

  const jsAssets = assets.filter((asset) => asset.type === 'js');
  const cssAssets = assets.filter((asset) => asset.type === 'css');
  const mainJs = jsAssets[0] || null;
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const warningThresholdBytes = 500 * 1024;

  const report = {
    status: 'PASS',
    generatedAt: new Date().toISOString(),
    totalBytes,
    totalFormatted: byteFormat(totalBytes),
    mainJs,
    mainJsOverViteWarningThreshold: Boolean(mainJs && mainJs.bytes > warningThresholdBytes),
    jsAssetCount: jsAssets.length,
    cssAssetCount: cssAssets.length,
    lazyChunkCount: Math.max(0, jsAssets.length - 1),
    largestAssets: assets.slice(0, 10),
  };

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(path.join(ARTIFACT_DIR, 'bundle-report.json'), JSON.stringify(report, null, 2));
  writeFileSync(path.join(ARTIFACT_DIR, 'bundle-report.md'), [
    '# A3-Y Bundle Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Status: ${report.status}`,
    '',
    `Total asset size: ${report.totalFormatted}`,
    `Main JS: ${mainJs ? `${mainJs.file} (${byteFormat(mainJs.bytes)})` : 'none'}`,
    `Main JS over Vite 500 kB warning threshold: ${report.mainJsOverViteWarningThreshold ? 'Yes' : 'No'}`,
    `JS assets: ${report.jsAssetCount}`,
    `CSS assets: ${report.cssAssetCount}`,
    `Lazy chunk count estimate: ${report.lazyChunkCount}`,
    '',
    '## Largest Assets',
    '',
    '| File | Type | Size |',
    '| --- | --- | ---: |',
    ...report.largestAssets.map((asset) => `| \`${asset.file}\` | ${asset.type} | ${byteFormat(asset.bytes)} |`),
    '',
  ].join('\n'));

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[a3-y:bundle] status: ${report.status}`);
    console.log(`[a3-y:bundle] total: ${report.totalFormatted}`);
    if (mainJs) console.log(`[a3-y:bundle] main JS: ${mainJs.file} (${byteFormat(mainJs.bytes)})`);
    console.log(`[a3-y:bundle] main JS over 500 kB: ${report.mainJsOverViteWarningThreshold ? 'yes' : 'no'}`);
  }

  return report;
};

const command = process.argv[2] || 'lint';
const json = process.argv.includes('--json');

if (command === 'lint' || command === 'lint-check') {
  const report = runLint({ json });
  process.exit(report.status === 'PASS' ? 0 : 1);
}

if (command === 'bundle-report') {
  const report = runBundleReport({ json });
  process.exit(report.status === 'PASS' ? 0 : 1);
}

console.error(`Unknown A3-Y quality command: ${command}`);
process.exit(1);
