import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("package metadata and verification scripts are valid", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.name, "rentashub");
  assert.equal(pkg.type, "module");
  for (const script of ["test", "test:server", "build", "preview", "verify", "readiness", "zip:check", "db:migrate", "db:seed", "db:reset"]) {
    assert.ok(pkg.scripts[script], `${script} script should exist`);
  }
  assert.match(pkg.scripts.verify, /scripts\/verify\.mjs|scripts\\verify\.mjs/);
});

test("CI workflow runs clean install, tests, backend tests, and build on Node LTS", () => {
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /actions\/setup-node@v4/);
  assert.match(ci, /node-version:\s*22/);
  assert.match(ci, /npm install|npm ci/);
  assert.match(ci, /npm run test/);
  assert.match(ci, /npm run test:server/);
  assert.match(ci, /npm run readiness/);
  assert.match(ci, /npm run build/);
  assert.match(ci, /npm run zip:check/);
});

test("Node version, env example, README, and docs exist", () => {
  assert.equal(read(".nvmrc").trim(), "22");
  assert.equal(existsSync(join(root, ".env.example")), true);
  assert.equal(existsSync(join(root, "README.md")), true);
  assert.equal(existsSync(join(root, "docs/backend-api-blueprint.md")), true);
  assert.equal(existsSync(join(root, "docs/localstorage-to-backend-migration.md")), true);
  assert.equal(existsSync(join(root, "server/README.md")), true);
  assert.equal(existsSync(join(root, "server/docs/openapi-placeholder.md")), true);
  assert.equal(existsSync(join(root, "server/docs/database-persistence.md")), true);
  assert.equal(existsSync(join(root, "server/docs/auth-security.md")), true);
  assert.equal(existsSync(join(root, "server/docs/file-storage-security.md")), true);
  assert.equal(existsSync(join(root, "docs/frontend-api-adapter-layer.md")), true);
  assert.equal(existsSync(join(root, "src/lib/adapters/index.js")), true);
  assert.equal(existsSync(join(root, "server/src/db/connection.js")), true);
  assert.equal(existsSync(join(root, "server/src/db/databaseProvider.js")), true);
  assert.equal(existsSync(join(root, "server/src/db/adapters/jsonAdapter.js")), true);
  assert.equal(existsSync(join(root, "server/src/db/adapters/sqliteAdapter.js")), true);
  assert.equal(existsSync(join(root, "server/src/db/adapters/postgresAdapter.js")), true);
  assert.equal(existsSync(join(root, ".env.staging.example")), true);
  assert.equal(existsSync(join(root, ".env.production.example")), true);
  assert.equal(existsSync(join(root, "server/.env.staging.example")), true);
  assert.equal(existsSync(join(root, "server/.env.production.example")), true);
  assert.equal(existsSync(join(root, "Dockerfile")), true);
  assert.equal(existsSync(join(root, "docker-compose.example.yml")), true);
  assert.equal(existsSync(join(root, "server/src/repositories/index.js")), true);
  assert.equal(existsSync(join(root, "server/migrations/001_initial_schema.sql")), true);
  assert.equal(existsSync(join(root, "server/seeds/demoData.js")), true);
  const readme = read("README.md");
  for (const text of ["Node.js 22 LTS", "npm install", "npm run test", "npm run test:server", "npm run build", "npm run preview", "npm run verify", "npm run readiness", "npm run db:migrate", "npm run db:seed", "npm run db:reset", "VITE_DATA_MODE=local", "RentasHub-Standalone-Web-App.zip", "current local sandbox does not provide a working normal npm clean-install path", "CI is required before production approval", "Backend Scaffold", "Frontend Adapter Layer"]) {
    assert.match(readme, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(read("server/.env.example"), /AUTH_TOKEN_SECRET=/);
  assert.match(read("server/.env.example"), /DATABASE_PROVIDER=json/);
});

test("Tailwind warning is safely fixed by local PostCSS override", () => {
  const postcss = read("postcss.config.js");
  const styles = read("src/styles.css");
  assert.match(postcss, /plugins:\s*\{\}/);
  assert.doesNotMatch(styles, /@tailwind/i);
  assert.match(read("README.md"), /prevent inherited parent Tailwind configuration/);
});

test("CI readiness has no retired user-facing branding or production-ready claims", () => {
  for (const file of ["README.md", "package.json", ".env.example", ".github/workflows/ci.yml", "scripts/verify.mjs", "src/lib/apiClient.js"]) {
    const source = read(file);
    assert.doesNotMatch(source, /PlannasHub|RentBroker|\/rentbroker|guest-marketplace|ai-travel-planner/i, file);
    assert.doesNotMatch(source, /production-ready/i, file);
  }
});
