import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const qualityScript = readFileSync('scripts/a3-y-quality-tooling.mjs', 'utf8');

test('A3-Y quality tooling exposes lint and bundle report scripts', () => {
  assert.equal(packageJson.scripts.lint, 'node scripts/a3-y-quality-tooling.mjs lint');
  assert.equal(packageJson.scripts['lint:check'], 'node scripts/a3-y-quality-tooling.mjs lint-check');
  assert.equal(packageJson.scripts['bundle:report'], 'node scripts/a3-y-quality-tooling.mjs bundle-report');
  assert.equal(packageJson.scripts['build:report'], 'npm run build && npm run bundle:report');
});

test('A3-Y lint tooling checks syntax, governance branding, and secret-like values', () => {
  assert.match(qualityScript, /node-syntax-check/);
  assert.match(qualityScript, /retired-product-branding/);
  assert.match(qualityScript, /secret-like-value/);
  assert.match(qualityScript, /merge-conflict-marker/);
  assert.match(qualityScript, /!\s*rel\.startsWith\('tests\/'\)/);
});

test('A3-Y bundle report writes JSON and Markdown artifacts without adding dependencies', () => {
  assert.match(qualityScript, /bundle-report\.json/);
  assert.match(qualityScript, /bundle-report\.md/);
  assert.match(qualityScript, /mainJsOverViteWarningThreshold/);
  assert.doesNotMatch(qualityScript, /import\s+.*eslint/);
});
