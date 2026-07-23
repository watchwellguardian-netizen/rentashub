export const STATUS_LABELS = [
  "Active",
  "Partial",
  "Simulated",
  "Specified Only",
  "Credential Required",
  "Infrastructure Required",
  "Deferred",
  "Not Certified",
  "Local/Simulated",
  "Configured but inactive",
  "Not implemented",
];

export const AI_PROVIDER_STATUS = {
  status: "Credential Required",
  summary: "External AI provider credentials are not configured. The assistant uses deterministic RentasHub documentation fallback only.",
};

export const ROLE_GUIDANCE = {
  customer: {
    title: "Customer marketplace guidance",
    summary: "Search assets, compare trust signals, request bookings, message suppliers, track simulated payments, and submit reviews only where workflow status allows.",
    allowedTopics: ["Marketplace search", "Bookings", "Messaging", "Reviews", "Trust", "Protection"],
  },
  supplier: {
    title: "Supplier operating guidance",
    summary: "Create listings, manage rental requests, prepare auction listings, review inspection/transport/financing referrals, and use local AI readiness tools without live provider claims.",
    allowedTopics: ["Listings", "Supplier dashboard", "Auctions", "Inspections", "Transport", "Financing"],
  },
  broker: {
    title: "Brokerage guidance",
    summary: "Review brokerage leads, marketplace matches, dealer auction views, and role-scoped trust signals. Broker workflows remain controlled by existing RBAC.",
    allowedTopics: ["Brokerage", "Wanted requests", "Trades", "Dealer auctions", "Market insights"],
  },
  admin: {
    title: "Administrator operational guidance",
    summary: "Review platform status, local moderation queues, readiness gates, simulated workflows, and evidence requirements. Production gates remain blocked without real infrastructure evidence.",
    allowedTopics: ["Admin center", "A4 gates", "Readiness", "Compliance", "Security", "Revenue"],
  },
  developer: {
    title: "Technical guidance",
    summary: "Technical implementation guidance is limited to administrator/developer roles and must follow AGENTS.md plus docs/program-state.md.",
    allowedTopics: ["Repository governance", "Tests", "Build", "Evidence", "Architecture reuse"],
  },
};

export const DOCUMENTATION_SUBJECTS = [
  ["marketplace", "Marketplace", "Search, browse, compare, and route asset demand across rental, sale, trade, swap, brokerage, and auction surfaces.", "Partial"],
  ["listings", "Listings", "Supplier-owned asset listing creation, edit, local validation, photo-readiness, and trust signal surfaces.", "Partial"],
  ["rentals", "Rentals", "Booking request, supplier approval, check-in, check-out, review, and simulated ledger paths.", "Simulated"],
  ["sales", "Sales", "Buy/sell marketplace surfaces and offer workflow placeholders without live settlement.", "Partial"],
  ["trades", "Trades", "Trade requests and exchange workflows using local state and role-scoped visibility.", "Simulated"],
  ["swaps", "Swaps", "Swap demand is represented in exchange listings and wanted workflows.", "Specified Only"],
  ["brokerage", "Brokerage", "Broker and dealer views for leads, matching, and controlled marketplace opportunities.", "Partial"],
  ["bookings", "Bookings", "Customer bookings, supplier requests, booking detail, and local status transitions.", "Partial"],
  ["inspections", "Inspections", "Inspection marketplace, reports, check-in/check-out, and auction inspection request surfaces.", "Simulated"],
  ["messaging", "Messaging", "Role-scoped thread views and booking-linked conversations.", "Partial"],
  ["reviews", "Reviews", "Completed-booking review submission, supplier response, public summaries, and admin moderation placeholders.", "Partial"],
  ["trust", "Trust and verification", "Trust scores, risk queues, verification readiness, and local trust indicators.", "Simulated"],
  ["disputes", "Disputes", "Damage/transaction dispute surfaces, admin review placeholders, and no legal adjudication claim.", "Simulated"],
  ["payments", "Payments", "Payment pages, wallet, earnings, payout placeholders, and simulated ledger only.", "Credential Required"],
  ["escrow", "Escrow", "Escrow state and ledger readiness without real funds, trust accounts, or legal activation.", "Credential Required"],
  ["roles", "Roles and permissions", "Customer, supplier, broker/dealer, inspector, transport, financing partner, admin, and super-admin-ready role model.", "Partial"],
  ["security", "Security", "Security hardening, secret safety, RBAC, rate-limit, and certification readiness tooling.", "Credential Required"],
  ["database", "Database", "JSON/local fallback and Supabase/PostgreSQL credential-readiness migrations and evidence tooling.", "Infrastructure Required"],
  ["apis", "APIs", "Node backend API foundations, auth guards, route contracts, and readiness endpoints.", "Partial"],
  ["testing", "Testing", "Production and backend test suites plus readiness, security, artifact, and evidence tooling.", "Active"],
  ["infrastructure", "Infrastructure", "A4 environment, migration, storage, backup/restore, and certification gates.", "Infrastructure Required"],
  ["release", "Release gates", "RC-0.6A is blocked at A4-01 until Supabase project names/IDs and ownership evidence are complete.", "Not Certified"],
].map(([id, module, summary, status]) => ({ id, module, summary, status }));

export const WORKFLOW_GUIDES = [
  workflow("rental", "Rental", ["Customer", "Supplier", "Admin"], ["Search asset", "Request booking", "Supplier approves", "Simulated payment", "Check-in", "Check-out", "Review"], ["draft -> pending", "pending -> approved", "approved -> active", "active -> completed"], ["Customer cancellation before approval", "Supplier decline", "Inspection flag creates claim/dispute path"], ["Customer owns request", "Supplier owns listing", "Admin can review"], "Simulated"),
  workflow("purchase", "Purchase", ["Buyer", "Supplier", "Admin"], ["Open listing", "Submit offer", "Supplier review", "Local confirmation placeholder"], ["draft -> submitted", "submitted -> under review", "under review -> accepted/declined"], ["Offer withdrawal", "Supplier decline", "No settlement without revenue activation"], ["Buyer may submit", "Supplier may review owned listings", "Admin may observe"], "Partial"),
  workflow("sale", "Sale", ["Supplier", "Buyer", "Admin"], ["Create sale listing", "Receive inquiry", "Negotiate", "Document placeholder"], ["draft -> published", "published -> inquiry", "inquiry -> local agreement placeholder"], ["Listing suspended", "Inquiry closed", "Payment blocked"], ["Supplier creates owned listing", "Buyer submits inquiry", "Admin moderation placeholder"], "Partial"),
  workflow("trade", "Trade", ["Customer", "Supplier", "Broker"], ["Open trade listing", "Submit trade request", "Broker/supplier review", "Local decision"], ["available -> requested", "requested -> under review", "under review -> accepted/declined"], ["Mismatch rejection", "Request withdrawal"], ["Requester owns request", "Broker can review brokerage opportunities"], "Simulated"),
  workflow("swap", "Swap", ["Customer", "Supplier"], ["Create wanted/swap intent", "Match listing", "Message counterparty", "Close placeholder"], ["intent -> matched", "matched -> messaging", "messaging -> closed"], ["No match", "Counterparty decline"], ["Participants only; admin review if flagged"], "Specified Only"),
  workflow("brokerage", "Brokerage", ["Broker", "Customer", "Supplier", "Admin"], ["Lead created", "Broker reviews", "Mark under review", "Accept or decline"], ["new -> under review", "under review -> accepted/declined"], ["Lead stale", "Owner withdraws"], ["Broker/admin only for lead management"], "Partial"),
  workflow("booking", "Booking", ["Customer", "Supplier", "Admin"], ["Create request", "Approve/decline", "Payment placeholder", "Manage detail"], ["pending -> approved", "pending -> declined", "approved -> active/completed"], ["Invalid date rejection", "Overlap rejection"], ["Customer and owning supplier access; admin review"], "Partial"),
  workflow("inspection", "Inspection", ["Customer", "Supplier", "Inspector", "Admin"], ["Request inspection", "Assign/review", "Upload report placeholder", "Display badge"], ["requested -> booked", "booked -> report submitted", "submitted -> published placeholder"], ["No inspector", "Report rejected", "Damage flag"], ["Related parties only; admin approval"], "Simulated"),
  workflow("review", "Review", ["Customer", "Supplier", "Admin"], ["Completed booking", "Customer posts review", "Supplier responds", "Admin moderates"], ["eligible -> submitted", "submitted -> published/hidden/flagged"], ["Duplicate review rejected", "Ineligible booking blocked"], ["Customer owns review; supplier owns response; admin moderates"], "Partial"),
  workflow("dispute", "Dispute", ["Customer", "Supplier", "Admin"], ["Open dispute", "Admin review", "Evidence placeholder", "Resolution placeholder"], ["open -> under review", "under review -> resolved/closed"], ["Insufficient evidence", "Escrow decision deferred"], ["Related parties and admin only"], "Simulated"),
];

function workflow(id, name, actors, stages, transitions, failures, permissions, status) {
  return { id, name, actors, stages, transitions, failures, permissions, status, createsTransactions: false };
}

export const SYSTEM_STATUS_CATEGORIES = [
  ["application-version", "Application version", "Active", "Package version is available from repository metadata."],
  ["frontend", "Frontend", "Active", "React/Vite application builds and routes through the existing router."],
  ["backend", "Backend", "Partial", "Node API foundation and tests exist; live production infrastructure is not active."],
  ["persistence", "Persistence", "Local/Simulated", "Local JSON/localStorage modes remain default until Supabase/PostgreSQL activation."],
  ["database", "Database", "Infrastructure Required", "A4 migrations and evidence tooling exist; live Development/UAT execution remains pending."],
  ["authentication", "Authentication", "Credential Required", "Local/API foundations exist; real Supabase Auth evidence remains pending."],
  ["server-side-authorization", "Server-side authorization", "Partial", "Backend guards and RBAC tests exist; live RLS evidence remains pending."],
  ["storage", "Storage", "Credential Required", "Storage readiness and bucket evidence tooling exist; live bucket tests remain pending."],
  ["payments", "Payments", "Configured but inactive", "Payment ledger is simulated; no real money movement is active."],
  ["escrow", "Escrow", "Configured but inactive", "Escrow workflows are evidence-ready placeholders; no trust account or funds are active."],
  ["email", "Email", "Credential Required", "No live email provider has been activated."],
  ["sms", "SMS", "Not implemented", "No SMS provider is active."],
  ["whatsapp", "WhatsApp", "Not implemented", "No WhatsApp provider is active."],
  ["ai-provider", "AI provider", "Credential Required", "Local deterministic AI assistance exists; external providers are inactive."],
  ["monitoring", "Monitoring", "Credential Required", "Sentry/Better Stack readiness exists; live monitors and alerts are pending."],
  ["backups", "Backups", "Infrastructure Required", "Backup/restore evidence templates exist; real backup and restore have not passed."],
  ["test-status", "Test status", "Active", "Latest baseline: frontend and backend suites passed in this environment."],
  ["security-review", "Security review", "Not Certified", "Security readiness tooling exists; OWASP, pen test, and external certification remain pending."],
  ["infrastructure-ownership", "Infrastructure ownership", "Infrastructure Required", "A4-01 remains open until all Supabase project IDs and owners are submitted."],
  ["deployment", "Deployment", "Infrastructure Required", "Production deployment remains blocked by A4 and downstream activation gates."],
  ["production-certification", "Production certification", "Not Certified", "RC-0.6A is not production certified."],
].map(([id, category, status, evidence]) => ({ id, category, status, evidence }));

export function getRoleGuidance(user) {
  const role = String(user?.role || "customer").toLowerCase();
  if (role === "admin" || role === "super_admin") return { ...ROLE_GUIDANCE.admin, technical: ROLE_GUIDANCE.developer };
  if (role === "supplier" || role === "vendor") return ROLE_GUIDANCE.supplier;
  if (role === "broker" || role === "dealer") return ROLE_GUIDANCE.broker;
  return ROLE_GUIDANCE.customer;
}

export function searchDocumentation({ query = "", module = "all" } = {}) {
  const needle = query.trim().toLowerCase();
  return DOCUMENTATION_SUBJECTS.filter((item) => {
    const moduleMatch = module === "all" || item.id === module;
    const queryMatch = !needle || `${item.module} ${item.summary} ${item.status}`.toLowerCase().includes(needle);
    return moduleMatch && queryMatch;
  });
}

export function getA4TruthStatus() {
  return {
    gate: "A4-01 Infrastructure Ownership Confirmation",
    status: "Infrastructure Required",
    message: "A4-01 remains open/blocked until real Development, UAT/Staging, and Production Supabase project names and project IDs plus ownership evidence are submitted.",
  };
}
