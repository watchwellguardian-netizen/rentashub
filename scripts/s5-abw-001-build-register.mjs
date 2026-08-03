import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");

const VALID_CLASSIFICATIONS = new Set([
  "production-ready",
  "staging-validated",
  "sandbox-integrated",
  "backend-implemented",
  "locally-functional",
  "simulated",
  "ui-only",
  "documented-only",
  "blocked-externally",
  "not-started",
]);

const BLOCKED_CLASSIFICATIONS = new Set(["simulated", "ui-only", "documented-only", "blocked-externally", "not-started"]);

const featureRegister = [
  {
    id: "ux-public-marketplace",
    module: "Marketplace",
    feature: "Public landing, search, categories, and asset discovery",
    weight: 5,
    completion: 0.9,
    frontendStatus: "Active",
    backendStatus: "Partial",
    databaseStatus: "Local/demo data and repository paths",
    apiStatus: "Assets API present",
    integrationStatus: "Provider independent",
    testStatus: "Verified by production frontend tests",
    classification: "locally-functional",
    evidenceFiles: ["src/App.jsx", "src/pages/LandingPage.jsx", "tests/production/search-discovery.test.mjs", "tests/production/asset-listing.test.mjs"],
  },
  {
    id: "auth-local-session",
    module: "Authentication",
    feature: "Local authentication routes and session readiness",
    weight: 5,
    completion: 0.55,
    frontendStatus: "Active local login flow",
    backendStatus: "Implemented local auth API",
    databaseStatus: "Local repository only",
    apiStatus: "Auth API routes present",
    integrationStatus: "Live identity provider pending",
    testStatus: "Backend and readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["server/src/routes/authRoutes.js", "server/tests/auth.test.mjs", "tests/production/s5-s3f-auth-authorization-readiness.test.mjs"],
  },
  {
    id: "rbac-route-guards",
    module: "Authorization",
    feature: "Protected routes, API role guards, and role-aware access controls",
    weight: 5,
    completion: 0.75,
    frontendStatus: "ProtectedRoute and role shell active",
    backendStatus: "Role middleware active",
    databaseStatus: "RLS runtime not yet executed",
    apiStatus: "Role-protected API routes present",
    integrationStatus: "Provider independent",
    testStatus: "Auth/RBAC and core rental authorization tests pass",
    classification: "backend-implemented",
    evidenceFiles: ["src/components/ProtectedRoute.jsx", "server/src/middleware/auth.js", "server/tests/core-rental-api.test.mjs", "tests/production/auth-rbac.test.mjs"],
  },
  {
    id: "supplier-verification",
    module: "Supplier",
    feature: "Supplier profile, verification workflow, and status evidence",
    weight: 3,
    completion: 0.75,
    frontendStatus: "Active supplier profile and verification pages",
    backendStatus: "Provider-independent validation path",
    databaseStatus: "Local persistence",
    apiStatus: "Core rental supplier validation endpoint present",
    integrationStatus: "KYC provider pending",
    testStatus: "Supplier profile tests pass",
    classification: "locally-functional",
    evidenceFiles: ["src/pages/SupplierProfile.jsx", "server/src/routes/coreRentalRoutes.js", "tests/production/supplier-profile-verification.test.mjs"],
  },
  {
    id: "asset-listing-management",
    module: "Listings",
    feature: "Asset and listing create, edit, publish, moderate, and browse",
    weight: 5,
    completion: 0.85,
    frontendStatus: "Active list/edit/my listings pages",
    backendStatus: "Resource and core rental asset endpoints implemented",
    databaseStatus: "Local repository; PostgreSQL adapter static-ready",
    apiStatus: "Assets and rental listing routes present",
    integrationStatus: "Provider independent",
    testStatus: "Listing and core rental API tests pass",
    classification: "locally-functional",
    evidenceFiles: ["src/pages/ListAsset.jsx", "src/pages/MyListings.jsx", "server/src/routes/resourceRoutes.js", "server/src/routes/coreRentalRoutes.js", "tests/production/asset-listing.test.mjs"],
  },
  {
    id: "core-rental-lifecycle",
    module: "Core Rental",
    feature: "Booking request through review eligibility provider-independent lifecycle",
    weight: 5,
    completion: 0.85,
    frontendStatus: "API adapter and dashboard paths present",
    backendStatus: "Core rental state machine implemented",
    databaseStatus: "Local transaction strategy; PostgreSQL runtime pending",
    apiStatus: "Versioned rental API present",
    integrationStatus: "Provider independent",
    testStatus: "Core rental service/API/adapter tests pass",
    classification: "locally-functional",
    evidenceFiles: ["server/src/services/coreRentalService.js", "server/src/controllers/coreRentalController.js", "server/tests/core-rental-api.test.mjs", "tests/production/core-rental-api-adapter.test.mjs"],
  },
  {
    id: "availability-pricing",
    module: "Core Rental",
    feature: "Availability checks, deterministic pricing, and booking quote",
    weight: 5,
    completion: 0.8,
    frontendStatus: "Adapter-supported",
    backendStatus: "Implemented",
    databaseStatus: "Local repository",
    apiStatus: "Availability and quote endpoints present",
    integrationStatus: "Provider independent",
    testStatus: "Core rental API tests pass",
    classification: "backend-implemented",
    evidenceFiles: ["server/src/services/coreRentalService.js", "server/tests/core-rental-api.test.mjs"],
  },
  {
    id: "booking-integrity",
    module: "Core Rental",
    feature: "Idempotency, optimistic versioning, overlap prevention, and audit participation",
    weight: 5,
    completion: 0.75,
    frontendStatus: "Adapter conveys idempotent requests",
    backendStatus: "Implemented in repository/service contracts",
    databaseStatus: "PostgreSQL execution pending",
    apiStatus: "Core rental endpoints present",
    integrationStatus: "Provider independent local",
    testStatus: "Static adapter and local API tests pass",
    classification: "backend-implemented",
    evidenceFiles: ["server/src/repositories/coreRentalPostgresRepositoryAdapter.js", "server/tests/core-rental-postgres-repository-adapter.test.mjs", "server/tests/core-rental-api.test.mjs"],
  },
  {
    id: "postgres-runtime-readiness",
    module: "Database",
    feature: "PostgreSQL adapter, migrations, and execution harness",
    weight: 5,
    completion: 0.6,
    frontendStatus: "Not applicable",
    backendStatus: "Adapter and harness implemented",
    databaseStatus: "Static-ready; no executable PostgreSQL available",
    apiStatus: "Repository contract aligned",
    integrationStatus: "Runtime execution blocked",
    testStatus: "Focused static harness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["server/src/repositories/coreRentalPostgresRepositoryAdapter.js", "scripts/accel-micro-pg-005-postgres-harness.mjs", "tests/production/accel-micro-pg-005-postgres-harness.test.mjs"],
  },
  {
    id: "rls-policy-readiness",
    module: "Database Security",
    feature: "RLS/RBAC policy preparation and cross-tenant evidence harness",
    weight: 5,
    completion: 0.45,
    frontendStatus: "Not applicable",
    backendStatus: "Policy checks and tests prepared",
    databaseStatus: "RLS runtime blocked",
    apiStatus: "Authorization contracts present",
    integrationStatus: "Runtime PostgreSQL required",
    testStatus: "Static readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["scripts/check-rls-rbac-sql.mjs", "tests/production/s5-s3h-runtime-evidence-orchestrator.test.mjs"],
  },
  {
    id: "reviews-ratings",
    module: "Trust",
    feature: "Reviews, ratings, eligibility, and moderation",
    weight: 3,
    completion: 0.75,
    frontendStatus: "Active customer/supplier review pages",
    backendStatus: "Review API implemented",
    databaseStatus: "Local repository",
    apiStatus: "Review routes present",
    integrationStatus: "Provider independent",
    testStatus: "Review tests pass",
    classification: "locally-functional",
    evidenceFiles: ["server/src/routes/reviewApiRoutes.js", "src/pages/ReviewsPage.jsx", "tests/production/reviews-ratings.test.mjs"],
  },
  {
    id: "messaging-notifications",
    module: "Communications",
    feature: "Messages, notifications, local support delivery, and audit framework",
    weight: 3,
    completion: 0.8,
    frontendStatus: "Active message, notification, and support pages",
    backendStatus: "Message/notification API and local support workflow implemented",
    databaseStatus: "Local repository",
    apiStatus: "Routes present",
    integrationStatus: "Live delivery provider pending",
    testStatus: "Messaging, notification, and support operations tests pass",
    classification: "backend-implemented",
    evidenceFiles: ["server/src/routes/messageNotificationRoutes.js", "src/pages/MessagesPage.jsx", "src/pages/NotificationsPage.jsx", "src/pages/SupportPage.jsx", "src/lib/supportService.js", "tests/production/messaging-notifications.test.mjs", "tests/production/support-operations.test.mjs"],
  },
  {
    id: "claims-disputes",
    module: "Claims and Disputes",
    feature: "Claims, disputes, admin queues, and local workflow transitions",
    weight: 3,
    completion: 0.65,
    frontendStatus: "Active pages",
    backendStatus: "Claims/disputes APIs implemented",
    databaseStatus: "Local repository",
    apiStatus: "Routes present",
    integrationStatus: "Legal/provider evidence pending",
    testStatus: "Protection/dispute tests pass",
    classification: "backend-implemented",
    evidenceFiles: ["server/src/routes/protectionClaimsApiRoutes.js", "server/src/routes/disputeApiRoutes.js", "tests/production/protection-framework.test.mjs"],
  },
  {
    id: "payments-wallet-payouts",
    module: "Revenue",
    feature: "Payment intent, wallet, earnings, payout, refund placeholder workflow",
    weight: 5,
    completion: 0.45,
    frontendStatus: "Active pages",
    backendStatus: "Provider-ready API placeholders",
    databaseStatus: "Local ledger only",
    apiStatus: "Payment routes present",
    integrationStatus: "Payment provider blocked",
    testStatus: "Payment ledger and revenue readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["server/src/routes/paymentApiRoutes.js", "src/pages/PaymentsPage.jsx", "src/pages/WalletPage.jsx", "tests/production/payment-ledger.test.mjs", "tests/production/revenue-readiness-tooling.test.mjs"],
  },
  {
    id: "escrow-ledger",
    module: "Escrow",
    feature: "Escrow intake, ledger, release, refund, and dispute readiness",
    weight: 5,
    completion: 0.4,
    frontendStatus: "Auction escrow surfaces present",
    backendStatus: "Provider-ready escrow API",
    databaseStatus: "Local ledger only",
    apiStatus: "Escrow routes present",
    integrationStatus: "Legal trust/provider blocked",
    testStatus: "Escrow readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["server/src/routes/escrowRoutes.js", "server/tests/escrow.test.mjs", "tests/production/escrow-readiness-tooling.test.mjs"],
  },
  {
    id: "auction-platform",
    module: "Auctions",
    feature: "Auction landing, lots, bidding UI, supplier/admin/dealer surfaces",
    weight: 5,
    completion: 0.55,
    frontendStatus: "Active route surface",
    backendStatus: "Mostly frontend/local service",
    databaseStatus: "Local/simulated data",
    apiStatus: "No live auction exchange API certified",
    integrationStatus: "Provider independent and simulated",
    testStatus: "Auction tests pass",
    classification: "simulated",
    evidenceFiles: ["src/pages/AuctionPages.jsx", "src/lib/auctionService.js", "tests/production/auction-module.test.mjs"],
  },
  {
    id: "inspection-marketplace",
    module: "Inspections",
    feature: "Inspector directory, registration, quote, booking, report workflow",
    weight: 3,
    completion: 0.65,
    frontendStatus: "Active pages",
    backendStatus: "Local/service implementation",
    databaseStatus: "Local",
    apiStatus: "Inspection resource API present",
    integrationStatus: "Provider independent",
    testStatus: "Inspection tests pass",
    classification: "locally-functional",
    evidenceFiles: ["src/pages/InspectionMarketplacePages.jsx", "server/src/routes/resourceRoutes.js", "tests/production/inspection-marketplace.test.mjs", "tests/production/inspection-engine.test.mjs"],
  },
  {
    id: "transport-marketplace",
    module: "Transport",
    feature: "Transport directory, provider registration, quote and booking readiness",
    weight: 3,
    completion: 0.65,
    frontendStatus: "Active pages",
    backendStatus: "Local/service implementation",
    databaseStatus: "Local",
    apiStatus: "Provider-independent",
    integrationStatus: "Provider blocked",
    testStatus: "Transport tests pass",
    classification: "locally-functional",
    evidenceFiles: ["src/pages/TransportMarketplacePages.jsx", "src/lib/transportMarketplaceService.js", "tests/production/transport-marketplace.test.mjs"],
  },
  {
    id: "financing-marketplace",
    module: "Financing",
    feature: "Financing directory, partner registration, referral readiness",
    weight: 3,
    completion: 0.6,
    frontendStatus: "Active pages",
    backendStatus: "Local/service implementation",
    databaseStatus: "Local",
    apiStatus: "Provider-independent",
    integrationStatus: "Lender/provider blocked",
    testStatus: "Financing tests pass",
    classification: "locally-functional",
    evidenceFiles: ["src/pages/FinancingMarketplacePages.jsx", "src/lib/financingMarketplaceService.js", "tests/production/financing-marketplace.test.mjs"],
  },
  {
    id: "ai-assistant-docs-workflows",
    module: "AI Studio Consolidation",
    feature: "Role-aware AI assistant, documentation, workflow guides, and admin system status",
    weight: 3,
    completion: 0.65,
    frontendStatus: "Active pages",
    backendStatus: "Provider-independent knowledge features",
    databaseStatus: "Local/static content",
    apiStatus: "No external AI provider required",
    integrationStatus: "Provider independent",
    testStatus: "AI Studio consolidation tests pass",
    classification: "locally-functional",
    evidenceFiles: ["src/pages/AiStudioConsolidationPages.jsx", "tests/production/ai-studio-consolidation.test.mjs"],
  },
  {
    id: "ai-listing-valuation",
    module: "AI",
    feature: "AI listing assistant, valuation engine, rental advisor, market insights",
    weight: 3,
    completion: 0.55,
    frontendStatus: "Active pages",
    backendStatus: "Deterministic/provider-independent logic",
    databaseStatus: "Local/static",
    apiStatus: "No live AI provider certified",
    integrationStatus: "Simulated/readiness",
    testStatus: "AI foundation tests pass",
    classification: "simulated",
    evidenceFiles: ["src/pages/AiAssistant.jsx", "tests/production/ai-listing-assistant-foundation.test.mjs", "tests/production/ai-valuation-engine-foundation.test.mjs"],
  },
  {
    id: "file-storage-readiness",
    module: "Files and Storage",
    feature: "File metadata, upload intent, signed URL and bucket readiness",
    weight: 5,
    completion: 0.45,
    frontendStatus: "Document/file surfaces present",
    backendStatus: "File API and storage readiness tooling",
    databaseStatus: "Local metadata repository",
    apiStatus: "File routes present",
    integrationStatus: "Live object storage blocked",
    testStatus: "File and storage readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["server/src/routes/fileRoutes.js", "server/tests/files.test.mjs", "tests/production/storage-readiness-tooling.test.mjs"],
  },
  {
    id: "security-hardening",
    module: "Security",
    feature: "Security headers, secret scanning, dependency/security readiness evidence",
    weight: 5,
    completion: 0.65,
    frontendStatus: "Headers and UI practices present",
    backendStatus: "Security middleware and scanners present",
    databaseStatus: "RLS runtime pending",
    apiStatus: "Middleware active",
    integrationStatus: "WAF/MFA/live cert pending",
    testStatus: "Security tests and scan pass",
    classification: "backend-implemented",
    evidenceFiles: ["server/src/main/app.js", "server/src/middleware/securityHeaders.js", "scripts/secret-scan.mjs", "tests/production/security-hardening-program.test.mjs"],
  },
  {
    id: "compliance-readiness",
    module: "Compliance",
    feature: "Privacy, DSAR, retention, KYC, DPA/GDPR evidence readiness",
    weight: 3,
    completion: 0.55,
    frontendStatus: "Admin compliance dashboard present",
    backendStatus: "Compliance readiness tooling",
    databaseStatus: "Persistence evidence pending",
    apiStatus: "Readiness/reporting only",
    integrationStatus: "Legal and KYC provider blocked",
    testStatus: "Compliance tests pass",
    classification: "documented-only",
    evidenceFiles: ["scripts/compliance-readiness-tooling.mjs", "tests/production/compliance-readiness-tooling.test.mjs", "tests/production/compliance-activation.test.mjs"],
  },
  {
    id: "observability-operations",
    module: "Operations",
    feature: "Health, readiness, liveness, observability, support operations, and operator evidence",
    weight: 3,
    completion: 0.8,
    frontendStatus: "Admin system status and support operations pages present",
    backendStatus: "Health, observability, and local support operations controls",
    databaseStatus: "Dependency checks prepared",
    apiStatus: "Health routes present",
    integrationStatus: "Telemetry destination blocked",
    testStatus: "Operations readiness and support operations tests pass",
    classification: "backend-implemented",
    evidenceFiles: ["server/src/routes/healthRoutes.js", "server/src/routes/monitoringRoutes.js", "src/pages/SupportPage.jsx", "src/lib/supportService.js", "tests/production/s5-s3g-observability-operations-readiness.test.mjs", "tests/production/support-operations.test.mjs"],
  },
  {
    id: "redis-bullmq-readiness",
    module: "Queues",
    feature: "Redis and BullMQ queue readiness, retries, DLQ and metrics contracts",
    weight: 3,
    completion: 0.45,
    frontendStatus: "Not applicable",
    backendStatus: "Engineering complete",
    databaseStatus: "Redis runtime pending",
    apiStatus: "Queue diagnostics prepared",
    integrationStatus: "CI/live execution pending",
    testStatus: "Focused readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["tests/production/s5-s3c-redis-bullmq-readiness.test.mjs"],
  },
  {
    id: "release-governance",
    module: "Release",
    feature: "Release governance, launch dashboard, evidence indexes and owner action register",
    weight: 2,
    completion: 0.85,
    frontendStatus: "Not applicable",
    backendStatus: "Tooling complete",
    databaseStatus: "Not applicable",
    apiStatus: "Not applicable",
    integrationStatus: "Runtime evidence pending",
    testStatus: "Release readiness tests pass",
    classification: "documented-only",
    evidenceFiles: ["scripts/s5-lrw-001-release-readiness.mjs", "scripts/s5-lrw-002-security-compliance.mjs", "tests/production/s5-lrw-001-release-readiness.test.mjs", "tests/production/s5-lrw-002-security-compliance.test.mjs"],
  },
  {
    id: "browser-accessibility-readiness",
    module: "Browser and Accessibility",
    feature: "Playwright browser journey and accessibility runtime suite",
    weight: 3,
    completion: 0.5,
    frontendStatus: "Suite prepared",
    backendStatus: "Not applicable",
    databaseStatus: "Not applicable",
    apiStatus: "Not applicable",
    integrationStatus: "CI runtime pending",
    testStatus: "Focused readiness tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["tests/browser/s5-s3e-browser-accessibility.spec.mjs", "tests/production/s5-s3e-browser-accessibility-readiness.test.mjs"],
  },
  {
    id: "runtime-evidence-wave",
    module: "Runtime Evidence",
    feature: "CI workflow orchestration for PostgreSQL, Redis, storage, browser, auth and operations",
    weight: 5,
    completion: 0.4,
    frontendStatus: "Not applicable",
    backendStatus: "Orchestrator complete",
    databaseStatus: "Runtime evidence pending",
    apiStatus: "Not applicable",
    integrationStatus: "GitHub/runtime environment blocked",
    testStatus: "Orchestrator tests pass",
    classification: "blocked-externally",
    evidenceFiles: ["scripts/s5-s3h-runtime-evidence-orchestrator.mjs", "tests/production/s5-s3h-runtime-evidence-orchestrator.test.mjs"],
  },
  {
    id: "mobile-apps",
    module: "Mobile",
    feature: "Native mobile applications",
    weight: 2,
    completion: 0,
    frontendStatus: "Not started",
    backendStatus: "Not started",
    databaseStatus: "Not started",
    apiStatus: "Not started",
    integrationStatus: "Blocked by roadmap",
    testStatus: "No tests",
    classification: "not-started",
    evidenceFiles: ["docs/program-state.md"],
  },
  {
    id: "government-integrations",
    module: "External Integrations",
    feature: "Government, customs, court and public-sector integrations",
    weight: 2,
    completion: 0,
    frontendStatus: "Deferred",
    backendStatus: "Deferred",
    databaseStatus: "Deferred",
    apiStatus: "Deferred",
    integrationStatus: "Blocked by governance",
    testStatus: "No tests",
    classification: "not-started",
    evidenceFiles: ["docs/program-state.md"],
  },
];

function assertRegister() {
  const ids = new Set();
  for (const item of featureRegister) {
    for (const field of ["id", "module", "feature", "frontendStatus", "backendStatus", "databaseStatus", "apiStatus", "integrationStatus", "testStatus", "classification"]) {
      if (!item[field]) throw new Error(`${item.id || "unknown"} is missing ${field}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate feature id: ${item.id}`);
    ids.add(item.id);
    if (!VALID_CLASSIFICATIONS.has(item.classification)) throw new Error(`${item.id} has invalid classification ${item.classification}`);
    if (!Number.isFinite(item.weight) || item.weight < 1 || item.weight > 5) throw new Error(`${item.id} has invalid weight`);
    if (!Number.isFinite(item.completion) || item.completion < 0 || item.completion > 1) throw new Error(`${item.id} has invalid completion`);
    if (BLOCKED_CLASSIFICATIONS.has(item.classification) && item.completion >= 1) {
      throw new Error(`${item.id} cannot be fully complete while classified as ${item.classification}`);
    }
    if (!Array.isArray(item.evidenceFiles) || item.evidenceFiles.length === 0) throw new Error(`${item.id} requires evidence files`);
  }
}

export function getFeatureRegister() {
  assertRegister();
  return featureRegister.map((item) => ({
    ...item,
    verifiedPoints: Number((item.weight * item.completion).toFixed(2)),
    remainingPoints: Number((item.weight * (1 - item.completion)).toFixed(2)),
    verified: item.completion >= 0.75 && !BLOCKED_CLASSIFICATIONS.has(item.classification),
  }));
}

export function summarizeRegister(register = getFeatureRegister()) {
  const totalPoints = register.reduce((sum, item) => sum + item.weight, 0);
  const verifiedPoints = register.reduce((sum, item) => sum + item.verifiedPoints, 0);
  const remainingPoints = Number((totalPoints - verifiedPoints).toFixed(2));
  const completedPercent = Number(((verifiedPoints / totalPoints) * 100).toFixed(1));
  const byClassification = {};
  const byModule = {};
  for (const item of register) {
    byClassification[item.classification] = (byClassification[item.classification] || 0) + 1;
    const module = byModule[item.module] || { totalPoints: 0, verifiedPoints: 0, features: 0 };
    module.totalPoints += item.weight;
    module.verifiedPoints = Number((module.verifiedPoints + item.verifiedPoints).toFixed(2));
    module.features += 1;
    byModule[item.module] = module;
  }
  for (const module of Object.values(byModule)) {
    module.remainingPoints = Number((module.totalPoints - module.verifiedPoints).toFixed(2));
    module.completedPercent = Number(((module.verifiedPoints / module.totalPoints) * 100).toFixed(1));
  }
  return {
    sprint: "S5-ABW-001",
    classification: "provider-independent core product build readiness",
    currentRelease: "RC-0.6A",
    a4Status: "A4-01 open",
    productionReady: false,
    formula: "sum(weight * completion) / sum(weight)",
    totalFeatures: register.length,
    totalWeightedPoints: totalPoints,
    verifiedWeightedPoints: Number(verifiedPoints.toFixed(2)),
    remainingWeightedPoints: remainingPoints,
    completedPercent,
    remainingPercent: Number((100 - completedPercent).toFixed(1)),
    byClassification,
    byModule,
    credentialReadyItems: register.filter((item) => item.classification === "blocked-externally").map((item) => item.id),
    runtimeBlockedItems: register.filter((item) => /pending|blocked|required/i.test(`${item.databaseStatus} ${item.integrationStatus}`)).map((item) => item.id),
  };
}

function renderMatrix(register, summary) {
  const rows = register.map((item) => `| ${item.module} | ${item.feature} | ${item.classification} | ${item.weight} | ${item.completion} | ${item.verifiedPoints} | ${item.testStatus} |`);
  return [
    "# S5-ABW-001 Module Completion Matrix",
    "",
    `Current release: ${summary.currentRelease}`,
    `A4 status: ${summary.a4Status}`,
    `Production ready: ${summary.productionReady ? "Yes" : "No"}`,
    "",
    `Completion formula: ${summary.formula}`,
    `Verified build completion: ${summary.completedPercent}%`,
    `Remaining build scope: ${summary.remainingPercent}%`,
    "",
    "| Module | Feature | Classification | Weight | Completion | Verified points | Test status |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    ...rows,
    "",
  ].join("\n");
}

function renderGaps(register, summary) {
  const gaps = register
    .filter((item) => item.remainingPoints > 0)
    .sort((a, b) => b.remainingPoints - a.remainingPoints)
    .map((item) => [
      `## ${item.module}: ${item.feature}`,
      "",
      `- Priority weight: ${item.weight}`,
      `- Remaining weighted points: ${item.remainingPoints}`,
      `- Classification: ${item.classification}`,
      `- Dependency/blocker: ${item.integrationStatus}`,
      `- Required action: advance from ${item.classification} to verified runtime or production evidence where applicable.`,
      `- Evidence required: ${item.evidenceFiles.join(", ")}`,
      "",
    ].join("\n"));
  return [
    "# S5-ABW-001 Remaining Build Gap Register",
    "",
    `Overall remaining build scope: ${summary.remainingPercent}%`,
    "",
    ...gaps,
  ].join("\n");
}

function buildOutputs() {
  const register = getFeatureRegister();
  const summary = summarizeRegister(register);
  const manifest = {
    sprint: summary.sprint,
    generatedAt: new Date().toISOString(),
    outputs: [
      "docs/build-readiness/authoritative-build-register.json",
      "docs/build-readiness/module-completion-matrix.md",
      "docs/build-readiness/feature-verification-manifest.json",
      "docs/build-readiness/remaining-build-gap-register.md",
    ],
    rules: [
      "No placeholder-only, simulated, credential-blocked, runtime-blocked, or documented-only item may count as fully complete.",
      "Live Supabase, PostgreSQL runtime, payments, escrow, telemetry, storage, and production certification remain blocked until external evidence exists.",
      "RC-0.6A and A4-01 remain unchanged.",
    ],
    summary,
    verifiedFeatures: register.filter((item) => item.verified).map((item) => ({ id: item.id, module: item.module, feature: item.feature, evidenceFiles: item.evidenceFiles })),
    unverifiedFeatures: register.filter((item) => !item.verified).map((item) => ({ id: item.id, module: item.module, feature: item.feature, classification: item.classification, remainingPoints: item.remainingPoints })),
  };
  return { register, summary, manifest };
}

export function writeOutputs() {
  const { register, summary, manifest } = buildOutputs();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "authoritative-build-register.json"), `${JSON.stringify({ summary, features: register }, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "feature-verification-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "module-completion-matrix.md"), renderMatrix(register, summary));
  writeFileSync(join(OUT_DIR, "remaining-build-gap-register.md"), renderGaps(register, summary));
  return { register, summary, manifest };
}

function printReport() {
  const { summary } = buildOutputs();
  console.log(`SPRINT: ${summary.sprint}`);
  console.log(`STATUS: PASS_BUILD_REGISTER_READY`);
  console.log(`FEATURES: ${summary.totalFeatures}`);
  console.log(`VERIFIED BUILD COMPLETION: ${summary.completedPercent}%`);
  console.log(`REMAINING BUILD SCOPE: ${summary.remainingPercent}%`);
  console.log(`A4 STATUS: ${summary.a4Status}`);
  console.log(`PRODUCTION READY: NO`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] || "report";
  if (command === "generate") {
    const { summary } = writeOutputs();
    console.log(`Generated S5-ABW-001 build readiness artifacts. Completion: ${summary.completedPercent}%.`);
  } else if (command === "json") {
    console.log(JSON.stringify(buildOutputs(), null, 2));
  } else if (command === "report") {
    printReport();
  } else {
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
  }
}
