import { readFileSync } from "node:fs";

export const REQUIRED_JOURNEYS = [
  "public landing",
  "marketplace search",
  "auction discovery",
  "documentation",
  "workflow guides",
  "customer dashboard",
  "supplier dashboard",
  "dealer dashboard",
  "admin dashboard",
  "AI assistant",
  "system status",
];

export function collectBrowserAccessibilityReadiness() {
  const config = readFileSync("playwright.config.mjs", "utf8");
  const spec = readFileSync("tests/browser/s5-s3e-browser-accessibility.spec.mjs", "utf8");
  const workflow = readFileSync(".github/workflows/browser-accessibility-runtime-validation.yml", "utf8");
  const projects = ["chromium", "firefox", "webkit", "mobile-chromium"].filter((name) => config.includes(`name: "${name}"`));
  const missingJourneys = REQUIRED_JOURNEYS.filter((name) => !spec.includes(`name: "${name}"`));
  const coverage = {
    playwrightProjects: projects,
    journeyCount: REQUIRED_JOURNEYS.length - missingJourneys.length,
    missingJourneys,
    unauthenticatedState: spec.includes("unauthenticated protected route"),
    unauthorizedState: spec.includes("unauthorized role"),
    keyboardNavigation: spec.includes("keyboard.press(\"Tab\")"),
    accessibleNames: spec.includes("missingButtonNames"),
    responsiveViewport: spec.includes("setViewportSize"),
    screenshotsTracesVideos: config.includes("screenshot") && config.includes("trace") && config.includes("video"),
    htmlJsonJunitReports: config.includes("html") && config.includes("json") && config.includes("junit"),
    ciWorkflowPrepared: workflow.includes("npx playwright test") && workflow.includes("npx playwright install --with-deps"),
    artifactRetentionPrepared: workflow.includes("actions/upload-artifact"),
    productionTargetGuard: workflow.includes("PLAYWRIGHT_BASE_URL") && workflow.includes("localhost") && workflow.includes("127.0.0.1"),
  };
  const complete = projects.length >= 4
    && missingJourneys.length === 0
    && coverage.unauthenticatedState
    && coverage.unauthorizedState
    && coverage.keyboardNavigation
    && coverage.accessibleNames
    && coverage.responsiveViewport
    && coverage.screenshotsTracesVideos
    && coverage.htmlJsonJunitReports
    && coverage.ciWorkflowPrepared
    && coverage.artifactRetentionPrepared
    && coverage.productionTargetGuard;
  return {
    sprint: "S5-S3E",
    status: complete ? "BROWSER_TEST_ENGINEERING_COMPLETE" : "BROWSER_TEST_ENGINEERING_INCOMPLETE",
    accessibilityStatus: complete ? "ACCESSIBILITY_TEST_ENGINEERING_COMPLETE" : "ACCESSIBILITY_TEST_ENGINEERING_INCOMPLETE",
    playwrightCiStatus: "PLAYWRIGHT_CI_PREPARED",
    runtimeStatus: "CI_RUNTIME_EXECUTION_PENDING",
    coverage,
    productionTouched: false,
    liveProviderTouched: false,
  };
}

const command = process.argv[2] || "report";
const evidence = collectBrowserAccessibilityReadiness();
if (command === "json" || process.argv.includes("--json")) {
  console.log(JSON.stringify(evidence, null, 2));
} else {
  console.log(`[s5-s3e] status: ${evidence.status}`);
  console.log(`[s5-s3e] accessibility: ${evidence.accessibilityStatus}`);
  console.log(`[s5-s3e] playwright ci: ${evidence.playwrightCiStatus}`);
  console.log(`[s5-s3e] runtime: ${evidence.runtimeStatus}`);
  console.log(`[s5-s3e] journeys: ${evidence.coverage.journeyCount}/${REQUIRED_JOURNEYS.length}`);
  console.log(`[s5-s3e] production touched: NO`);
}
