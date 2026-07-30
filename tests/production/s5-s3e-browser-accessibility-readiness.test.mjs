import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { REQUIRED_JOURNEYS, collectBrowserAccessibilityReadiness } from "../../scripts/s5-s3e-browser-accessibility-readiness.mjs";

test("Playwright config defines Chromium Firefox WebKit mobile projects and evidence reporters", () => {
  const config = readFileSync("playwright.config.mjs", "utf8");
  for (const required of ["chromium", "firefox", "webkit", "mobile-chromium", "html", "json", "junit", "trace", "screenshot", "video"]) {
    assert.match(config, new RegExp(required));
  }
});

test("browser spec covers all required journeys and auth states", () => {
  const spec = readFileSync("tests/browser/s5-s3e-browser-accessibility.spec.mjs", "utf8");
  for (const journey of REQUIRED_JOURNEYS) assert.match(spec, new RegExp(journey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const required of ["rentashub_review_user", "unauthenticated protected route", "unauthorized role", "keyboard.press(\"Tab\")", "missingButtonNames", "setViewportSize"]) {
    assert.match(spec, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("browser accessibility workflow prepares runtime execution and artifact retention", () => {
  const workflow = readFileSync(".github/workflows/browser-accessibility-runtime-validation.yml", "utf8");
  for (const required of [
    "npx playwright install --with-deps",
    "npm run build",
    "npx playwright test",
    "actions/upload-artifact",
    "browser-accessibility-runtime-evidence",
    "artifacts/runtime-evidence/browser-accessibility-s5-s3e.json",
    "PLAYWRIGHT_BASE_URL: http://127.0.0.1:4174",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|https:\/\/.*rentashub|production/i);
});

test("S5-S3E readiness evidence is complete but runtime execution remains pending", () => {
  const evidence = collectBrowserAccessibilityReadiness();
  assert.equal(evidence.status, "BROWSER_TEST_ENGINEERING_COMPLETE");
  assert.equal(evidence.accessibilityStatus, "ACCESSIBILITY_TEST_ENGINEERING_COMPLETE");
  assert.equal(evidence.playwrightCiStatus, "PLAYWRIGHT_CI_PREPARED");
  assert.equal(evidence.runtimeStatus, "CI_RUNTIME_EXECUTION_PENDING");
  assert.equal(evidence.coverage.journeyCount, REQUIRED_JOURNEYS.length);
  assert.equal(evidence.productionTouched, false);
});
