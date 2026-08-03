import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");

const APP_ROUTE_FILE = "src/App.jsx";

const journeys = [
  {
    id: "public_marketplace_discovery",
    name: "Public marketplace discovery",
    userJourney: "Visitor searches, filters, opens marketplace/category/asset pages, and sees truthful provider-independent copy.",
    type: "critical_user_journey",
    routes: ["/", "/search", "/marketplace", "/assets", "/category/:categorySlug", "/asset/:id"],
    apiRoutes: ["/api/assets", "/api/assets/:id"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/resourceRoutes.js"],
    tests: ["tests/production/search-discovery.test.mjs", "tests/production/asset-listing.test.mjs"],
    blockers: [],
  },
  {
    id: "supplier_asset_listing",
    name: "Supplier asset listing management",
    userJourney: "Supplier lists, edits, verifies, publishes, and manages asset listings with role protection.",
    type: "critical_user_journey",
    routes: ["/list-asset", "/my-listings", "/asset/:id/edit", "/supplier-profile", "/verification/status"],
    apiRoutes: ["/api/assets", "/api/v1/rentals/assets", "/api/v1/rentals/listings/:id/:action"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/resourceRoutes.js", "server/src/routes/coreRentalRoutes.js"],
    tests: ["tests/production/asset-listing.test.mjs", "tests/production/supplier-profile-verification.test.mjs", "server/tests/core-rental-api.test.mjs"],
    blockers: ["Live KYC evidence still required before production trust certification."],
  },
  {
    id: "core_rental_booking_lifecycle",
    name: "Core rental booking lifecycle",
    userJourney: "Customer requests booking; supplier accepts; payment marker, contract trigger, check-in, activation, extension, check-out, settlement, review eligibility, and dispute paths execute locally.",
    type: "critical_user_journey",
    routes: ["/asset/:id/book", "/booking/:id", "/booking/:id/payment", "/booking/:id/check-in", "/booking/:id/check-out", "/reviews/write/:bookingId"],
    apiRoutes: ["/api/v1/rentals/bookings", "/api/v1/rentals/bookings/:id", "/api/v1/rentals/bookings/:id/:action", "/api/v1/rentals/quote", "/api/v1/rentals/availability"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/coreRentalRoutes.js", "server/src/controllers/coreRentalController.js"],
    tests: ["server/tests/core-rental-api.test.mjs", "server/tests/core-rental-service.test.mjs", "tests/production/core-rental-api-adapter.test.mjs"],
    blockers: ["PostgreSQL runtime execution and RLS evidence are pending."],
  },
  {
    id: "auth_rbac_access",
    name: "Authentication and authorization access",
    userJourney: "Users register, log in locally, navigate role-protected routes, and receive controlled denial for unauthorized role access.",
    type: "critical_user_journey",
    routes: ["/login", "/customer-dashboard", "/supplier-dashboard", "/admin"],
    apiRoutes: ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/refresh"],
    routeFiles: [APP_ROUTE_FILE, "src/components/ProtectedRoute.jsx"],
    apiFiles: ["server/src/routes/authRoutes.js", "server/src/middleware/auth.js"],
    tests: ["server/tests/auth.test.mjs", "tests/production/auth-rbac.test.mjs", "tests/production/s5-s3f-auth-authorization-readiness.test.mjs"],
    blockers: ["Live OIDC or Supabase Auth provider evidence remains pending."],
  },
  {
    id: "reviews_trust_reputation",
    name: "Reviews, trust, and reputation",
    userJourney: "Completed rentals can create reviews, supplier responses are scoped, and trust signals render for assets, suppliers, and customers.",
    type: "core_module_workflow",
    routes: ["/reviews", "/asset/:id/reviews", "/supplier/:supplierId/reviews", "/trust", "/trust/supplier/:supplierId", "/trust/asset/:assetId"],
    apiRoutes: ["/api/reviews", "/api/reviews/:id", "/api/trust", "/api/trust/:entityType/:entityId"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/reviewApiRoutes.js", "server/src/routes/trustApiRoutes.js"],
    tests: ["tests/production/reviews-ratings.test.mjs", "tests/production/trust-engine.test.mjs"],
    blockers: [],
  },
  {
    id: "claims_disputes_protection",
    name: "Claims, disputes, and protection",
    userJourney: "Customer/supplier create claims and disputes, admin reviews queues, and protection selections remain provider-safe.",
    type: "core_module_workflow",
    routes: ["/claims", "/claims/new/:bookingId", "/claim/:id", "/disputes", "/disputes/new/:bookingId", "/dispute/:id", "/protection"],
    apiRoutes: ["/api/claims", "/api/claims/:id", "/api/disputes", "/api/disputes/:id", "/api/protection"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/protectionClaimsApiRoutes.js", "server/src/routes/disputeApiRoutes.js"],
    tests: ["tests/production/protection-framework.test.mjs"],
    blockers: ["Legal/provider evidence required before production claim or insurance certification."],
  },
  {
    id: "auction_buyer_supplier_admin",
    name: "Auction buyer, supplier, dealer, and admin journeys",
    userJourney: "Auction discovery, lot detail, local bid controls, supplier auction surfaces, dealer surfaces, and admin queues remain locally controlled.",
    type: "critical_user_journey",
    routes: ["/auctions", "/auction/:auctionId", "/auction/:auctionId/bid", "/supplier/auctions", "/dealer/auction-dashboard", "/admin/auctions"],
    apiRoutes: [],
    routeFiles: [APP_ROUTE_FILE, "src/pages/AuctionPages.jsx"],
    apiFiles: ["src/lib/auctionService.js"],
    tests: ["tests/production/auction-module.test.mjs", "tests/production/auction-analytics.test.mjs", "tests/production/auction-document-engine.test.mjs"],
    blockers: ["Live auction exchange, payment, escrow, and legal transfer evidence remain pending."],
  },
  {
    id: "inspection_transport_financing",
    name: "Inspection, transport, and financing marketplace support",
    userJourney: "Users discover providers, suppliers/register providers, and provider-independent requests/referrals are recorded locally.",
    type: "core_module_workflow",
    routes: ["/inspectors", "/inspectors/register", "/transport", "/transport/register", "/financing", "/financing/register", "/financing/products"],
    apiRoutes: ["/api/inspections", "/api/inspections/:id"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/resourceRoutes.js", "src/lib/inspectionMarketplaceService.js", "src/lib/transportMarketplaceService.js", "src/lib/financingMarketplaceService.js"],
    tests: ["tests/production/inspection-marketplace.test.mjs", "tests/production/inspection-engine.test.mjs", "tests/production/transport-marketplace.test.mjs", "tests/production/financing-marketplace.test.mjs"],
    blockers: ["External provider onboarding and operational evidence remain pending."],
  },
  {
    id: "payments_wallet_revenue",
    name: "Payments, wallet, revenue, and payout readiness",
    userJourney: "Customer payment intent and supplier payout surfaces use provider-ready placeholders without live money movement.",
    type: "critical_user_journey",
    routes: ["/payments", "/wallet", "/booking/:id/payment", "/earnings", "/payouts", "/admin/revenue"],
    apiRoutes: ["/api/payments", "/api/payments/intent", "/api/wallet", "/api/earnings", "/api/payouts", "/api/payouts/request"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/paymentApiRoutes.js"],
    tests: ["tests/production/payment-ledger.test.mjs", "tests/production/revenue-readiness-tooling.test.mjs"],
    blockers: ["Payment provider sandbox evidence, webhook evidence, payout validation, and Tax/GCT signoff remain pending."],
  },
  {
    id: "files_storage_documents",
    name: "Files, storage, and document evidence",
    userJourney: "File metadata, upload intent, auction documents, and storage readiness remain credential-safe and provider-independent.",
    type: "core_module_workflow",
    routes: ["/auction/:auctionId/documents", "/auction/:auctionId/document-engine"],
    apiRoutes: ["/api/files/upload-intent", "/api/files/metadata", "/api/files", "/api/files/:id"],
    routeFiles: [APP_ROUTE_FILE, "src/pages/AuctionDocumentEnginePages.jsx"],
    apiFiles: ["server/src/routes/fileRoutes.js"],
    tests: ["server/tests/files.test.mjs", "tests/production/storage-readiness-tooling.test.mjs", "tests/production/auction-document-engine.test.mjs"],
    blockers: ["Live object storage, signed URL, bucket policy, and unauthorized access evidence remain pending."],
  },
  {
    id: "communications_notifications",
    name: "Messages and notifications",
    userJourney: "Customer, supplier, dealer, and admin notification/message surfaces are role-scoped and local-delivery safe.",
    type: "core_module_workflow",
    routes: ["/messages", "/messages/:threadId", "/booking/:id/messages", "/notifications"],
    apiRoutes: ["/api/messages", "/api/messages/:threadId", "/api/notifications", "/api/notifications/:id"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/messageNotificationRoutes.js"],
    tests: ["tests/production/messaging-notifications.test.mjs", "tests/production/notification-framework.test.mjs"],
    blockers: ["Live email/SMS/push delivery provider evidence remains pending."],
  },
  {
    id: "ai_documentation_workflows",
    name: "AI assistant, documentation, and workflow guides",
    userJourney: "Role-aware assistant, AI tools, documentation, workflow guides, and system status remain inside the canonical app.",
    type: "supporting_feature",
    routes: ["/ai", "/ai/search", "/ai/listing-assistant", "/ai/valuation", "/documentation", "/workflows", "/admin/system-status"],
    apiRoutes: [],
    routeFiles: [APP_ROUTE_FILE, "src/pages/AiStudioConsolidationPages.jsx", "src/pages/AiAssistant.jsx"],
    apiFiles: [],
    tests: ["tests/production/ai-studio-consolidation.test.mjs", "tests/production/ai-assistant.test.mjs", "tests/production/ai-listing-assistant-foundation.test.mjs", "tests/production/ai-valuation-engine-foundation.test.mjs"],
    blockers: ["No live external AI model certification is claimed."],
  },
  {
    id: "operations_security_release",
    name: "Operations, security, release, and readiness evidence",
    userJourney: "Operators can inspect health/readiness/security/release evidence while certification remains blocked pending runtime and owner evidence.",
    type: "supporting_feature",
    routes: ["/admin/system-status", "/admin/compliance", "/admin/revenue"],
    apiRoutes: ["/api/health", "/api/health/readiness", "/api/health/liveness", "/api/health/operations", "/api/health/observability", "/api/audit/readiness"],
    routeFiles: [APP_ROUTE_FILE],
    apiFiles: ["server/src/routes/healthRoutes.js", "server/src/routes/monitoringRoutes.js", "server/src/routes/auditRoutes.js"],
    tests: ["tests/production/s5-s3g-observability-operations-readiness.test.mjs", "tests/production/s5-lrw-001-release-readiness.test.mjs", "tests/production/s5-lrw-002-security-compliance.test.mjs", "tests/production/security-readiness-tooling.test.mjs"],
    blockers: ["Runtime evidence wave, live telemetry, security certification, and production signoff remain pending."],
  },
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function exists(path) {
  return existsSync(join(ROOT, path));
}

function normalizeRoute(route) {
  return route.replace(/:[A-Za-z0-9_]+/g, "");
}

function fileContainsAny(path, token) {
  if (!exists(path)) return false;
  const content = read(path);
  const normalized = normalizeRoute(token);
  return content.includes(token) || (normalized && content.includes(normalized));
}

function assertNoSecretLikeValues(payload) {
  const text = JSON.stringify(payload);
  const forbidden = [
    /sb_service_[a-z0-9_]+/i,
    /sb_secret_[a-z0-9_]+/i,
    /postgresql:\/\/[^"\s]+:[^"\s]+@/i,
    /SUPABASE_SERVICE_ROLE_KEY\s*=/,
    /JWT_SECRET\s*=/,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`Secret-like value detected in S5-ABW-002 output: ${pattern}`);
  }
}

export function verifyProductJourneys() {
  const verifiedAt = new Date().toISOString();
  const results = journeys.map((journey) => {
    const routeChecks = journey.routes.map((route) => ({
      route,
      present: journey.routeFiles.some((file) => fileContainsAny(file, route)),
    }));
    const apiChecks = journey.apiRoutes.map((route) => ({
      route,
      present: journey.apiFiles.some((file) => fileContainsAny(file, route)),
    }));
    const testChecks = journey.tests.map((path) => ({ path, present: exists(path) }));
    const optionalTestChecks = (journey.optionalTests || []).map((path) => ({ path, present: exists(path) }));
    const sourceChecks = [...journey.routeFiles, ...journey.apiFiles].map((path) => ({ path, present: exists(path) }));
    const missing = [
      ...routeChecks.filter((item) => !item.present).map((item) => `route:${item.route}`),
      ...apiChecks.filter((item) => !item.present).map((item) => `api:${item.route}`),
      ...testChecks.filter((item) => !item.present).map((item) => `test:${item.path}`),
      ...sourceChecks.filter((item) => !item.present).map((item) => `source:${item.path}`),
    ];
    const repositoryStatus = missing.length === 0 ? "PASS" : "FAIL";
    const runtimeStatus = journey.blockers.length ? "BLOCKED_EXTERNAL_EVIDENCE" : "PROVIDER_INDEPENDENT_VERIFIED";
    return {
      ...journey,
      verifiedAt,
      repositoryStatus,
      runtimeStatus,
      routeChecks,
      apiChecks,
      testChecks,
      optionalTestChecks,
      sourceChecks,
      missing,
    };
  });
  const total = results.length;
  const repositoryPass = results.filter((item) => item.repositoryStatus === "PASS").length;
  const runtimeBlocked = results.filter((item) => item.runtimeStatus === "BLOCKED_EXTERNAL_EVIDENCE").length;
  const failed = results.filter((item) => item.repositoryStatus === "FAIL").length;
  const weighted = results.reduce((acc, item) => {
    const weight = item.type === "critical_user_journey" ? 5 : item.type === "core_module_workflow" ? 3 : 2;
    acc.total += weight;
    if (item.repositoryStatus === "PASS") acc.repositoryVerified += weight;
    if (item.repositoryStatus === "PASS" && item.runtimeStatus === "PROVIDER_INDEPENDENT_VERIFIED") acc.providerIndependentVerified += weight;
    return acc;
  }, { total: 0, repositoryVerified: 0, providerIndependentVerified: 0 });
  const summary = {
    sprint: "S5-ABW-002",
    status: failed ? "FAIL_REPOSITORY_JOURNEY_EVIDENCE" : "PASS_REPOSITORY_JOURNEY_EVIDENCE",
    currentRelease: "RC-0.6A",
    a4Status: "A4-01 open",
    productionReady: false,
    liveProviderActivation: false,
    totalJourneys: total,
    repositoryPass,
    runtimeBlocked,
    failed,
    repositoryJourneyCoveragePercent: Number(((weighted.repositoryVerified / weighted.total) * 100).toFixed(1)),
    providerIndependentCoveragePercent: Number(((weighted.providerIndependentVerified / weighted.total) * 100).toFixed(1)),
    weighted,
  };
  const report = { generatedAt: verifiedAt, summary, journeys: results };
  assertNoSecretLikeValues(report);
  return report;
}

function renderMarkdown(report) {
  const lines = [
    "# S5-ABW-002 Product Journey Verification Report",
    "",
    `Status: ${report.summary.status}`,
    `Current release: ${report.summary.currentRelease}`,
    `A4 status: ${report.summary.a4Status}`,
    `Production ready: ${report.summary.productionReady ? "Yes" : "No"}`,
    `Repository journey coverage: ${report.summary.repositoryJourneyCoveragePercent}%`,
    `Provider-independent coverage: ${report.summary.providerIndependentCoveragePercent}%`,
    "",
    "| Journey | Repository status | Runtime status | Blockers |",
    "| --- | --- | --- | --- |",
  ];
  for (const journey of report.journeys) {
    lines.push(`| ${journey.name} | ${journey.repositoryStatus} | ${journey.runtimeStatus} | ${journey.blockers.join("; ") || "None"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

export function writeProductJourneyOutputs() {
  const report = verifyProductJourneys();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "product-journey-verification-manifest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "product-journey-verification-report.md"), renderMarkdown(report));
  return report;
}

function printReport(report) {
  console.log(`SPRINT: ${report.summary.sprint}`);
  console.log(`STATUS: ${report.summary.status}`);
  console.log(`JOURNEYS: ${report.summary.repositoryPass}/${report.summary.totalJourneys}`);
  console.log(`REPOSITORY JOURNEY COVERAGE: ${report.summary.repositoryJourneyCoveragePercent}%`);
  console.log(`PROVIDER-INDEPENDENT COVERAGE: ${report.summary.providerIndependentCoveragePercent}%`);
  console.log(`RUNTIME BLOCKED: ${report.summary.runtimeBlocked}`);
  console.log("PRODUCTION READY: NO");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] || "report";
  if (command === "generate") {
    const report = writeProductJourneyOutputs();
    console.log(`Generated S5-ABW-002 product journey artifacts. Repository journey coverage: ${report.summary.repositoryJourneyCoveragePercent}%.`);
  } else if (command === "json") {
    console.log(JSON.stringify(verifyProductJourneys(), null, 2));
  } else if (command === "report") {
    printReport(verifyProductJourneys());
  } else {
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
  }
}
