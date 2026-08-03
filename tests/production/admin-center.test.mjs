import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY, SEED_BOOKINGS } from "../../src/lib/bookingService.js";
import { INSPECTION_STORAGE_KEY } from "../../src/lib/inspectionService.js";
import { LEDGER_STORAGE_KEY } from "../../src/lib/paymentLedger.js";
import { THREAD_STORAGE_KEY } from "../../src/lib/messagingService.js";
import { NOTIFICATION_STORAGE_KEY, getUserNotifications } from "../../src/lib/notificationService.js";
import { canAccessRole } from "../../src/lib/rbac.js";
import { SUPPLIER_PROFILE_STORAGE_KEY } from "../../src/lib/supplierProfile.js";
import {
  adminModerateListing,
  adminOverrideBookingStatus,
  adminSetUserAccountStatus,
  canAccessAdminCenter,
  createAdminSnapshot,
  adminSimulateVerification,
} from "../../src/lib/adminCenter.js";

const root = process.cwd();

function storage() {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(SEED_LISTINGS)],
    [BOOKING_STORAGE_KEY, JSON.stringify(SEED_BOOKINGS)],
    [INSPECTION_STORAGE_KEY, JSON.stringify([{ id: "inspection-flag", assetTitle: "Flagged asset", supplierReview: { status: "flagged" } }])],
    [LEDGER_STORAGE_KEY, JSON.stringify([{ id: "txn-admin", type: "payment", status: "simulated_paid", total: 1000, supplierEarnings: 900 }])],
    [THREAD_STORAGE_KEY, JSON.stringify([{ id: "thread-admin", assetTitle: "Thread asset", lastMessage: "Summary only", status: "open" }])],
    [SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify([{ supplierId: "review-supplier", businessName: "Review Rentals", supplierType: "company", verificationStatus: "pending" }])],
    [NOTIFICATION_STORAGE_KEY, JSON.stringify([])],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("admin routes are wired and admin-only", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/admin", "/admin/users", "/admin/listings", "/admin/bookings", "/admin/verifications", "/admin/payments", "/admin/messages", "/admin/reports", "/admin/settings", "/admin/compliance", "/admin/revenue"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["admin"\]}/);
  assert.match(app, /Navigate to="\/admin"/);
  assert.equal(canAccessAdminCenter("admin"), true);
  for (const role of ["customer", "guest", "user", "supplier", "vendor", "broker", "", null]) {
    assert.equal(canAccessAdminCenter(role), false);
    assert.equal(canAccessRole(role, ["admin"]), false);
  }
});

test("admin data aggregation includes overview, reports, activity, and risk queue", () => {
  const snapshot = createAdminSnapshot(storage());
  assert.equal(snapshot.overview.users >= 4, true);
  assert.equal(snapshot.overview.listings, 2);
  assert.equal(snapshot.overview.bookings, 1);
  assert.equal(snapshot.overview.payments, 1);
  assert.equal(snapshot.overview.pendingVerifications, 1);
  assert.equal(snapshot.overview.openInspectionFlags, 1);
  assert.equal(snapshot.reports.simulatedPaymentTotal, 1000);
  assert.equal(snapshot.reports.supplierEarningsTotal, 900);
  assert.equal(snapshot.riskQueue.length >= 1, true);
  assert.equal(snapshot.overview.credentialReadinessItems, 13);
  assert.equal(snapshot.overview.securityBaselineItems, 8);
  assert.equal(snapshot.overview.deploymentReadinessItems, 8);
  assert.equal(snapshot.overview.pilotReadinessScore, 0);
  assert.equal(snapshot.overview.paymentReadinessScore >= 0, true);
  assert.equal(snapshot.overview.escrowReadinessScore >= 0, true);
  assert.equal(snapshot.overview.infrastructureReadinessScore >= 0, true);
  assert.equal(snapshot.overview.securityHardeningScore >= 0, true);
  assert.equal(snapshot.overview.complianceReadinessScore >= 0, true);
  assert.equal(snapshot.overview.revenueReadinessScore >= 0, true);
  assert.equal(snapshot.overview.securityCertificationScore >= 0, true);
  assert.equal(snapshot.credentialReadiness.workstreams.some((item) => item.id === "payments" && item.status === "simulated_ledger"), true);
  assert.equal(snapshot.credentialReadiness.workstreams.some((item) => item.id === "monitoring" && item.credentialStage === "sentry_better_stack_credentials_required"), true);
  assert.equal(snapshot.credentialReadiness.workstreams.some((item) => item.id === "pilot_operations" && item.credentialStage === "operational_owners_required"), true);
  assert.equal(snapshot.credentialReadiness.workstreams.some((item) => item.id === "admin_moderation" && item.credentialStage === "operational_policy_required"), true);
  assert.equal(snapshot.credentialReadiness.securityBaseline.some((item) => item.id === "rate_limiting" && item.status === "development_in_memory"), true);
  assert.equal(snapshot.credentialReadiness.deploymentReadiness.some((item) => item.id === "ci_cd" && item.status === "gates_defined"), true);
  assert.equal(snapshot.credentialReadiness.monitoringReadiness.some((item) => item.id === "sentry" && item.status === "credentials_required"), true);
  assert.equal(snapshot.credentialReadiness.paymentActivationReadiness.some((item) => item.id === "webhooks" && item.status === "webhook_secret_required"), true);
  assert.equal(snapshot.credentialReadiness.paymentActivation.missing.includes("PAYMENT_WEBHOOK_URL"), true);
  assert.equal(snapshot.credentialReadiness.escrowActivationReadiness.some((item) => item.id === "trust_account" && item.status === "legal_finance_review_required"), true);
  assert.equal(snapshot.credentialReadiness.escrowActivation.missing.includes("ESCROW_PROVIDER"), true);
  assert.equal(snapshot.credentialReadiness.infrastructureActivationReadiness.some((item) => item.id === "dns" && item.status === "domain_plan_required"), true);
  assert.equal(snapshot.credentialReadiness.infrastructureActivation.missing.includes("PRODUCTION_DOMAIN"), true);
  assert.equal(snapshot.credentialReadiness.securityHardeningProgramReadiness.some((item) => item.id === "api_security" && item.status === "abuse_protection_required"), true);
  assert.equal(snapshot.credentialReadiness.securityHardening.missing.includes("SECURITY_MFA_PROVIDER"), true);
  assert.equal(snapshot.credentialReadiness.complianceActivationReadiness.some((item) => item.id === "jamaica_dpa" && item.status === "legal_review_required"), true);
  assert.equal(snapshot.credentialReadiness.complianceActivation.missing.includes("PRIVACY_OWNER_NAME"), true);
  assert.equal(snapshot.credentialReadiness.revenueActivationReadiness.some((item) => item.id === "tax_gct" && item.status === "tax_policy_required"), true);
  assert.equal(snapshot.credentialReadiness.revenueActivation.missing.includes("REVENUE_OWNER_NAME"), true);
  assert.equal(snapshot.credentialReadiness.revenueActivation.liveMoneyMovementActive, false);
  assert.equal(snapshot.credentialReadiness.securityCertificationReadiness.some((item) => item.id === "owasp" && item.status === "review_required"), true);
  assert.equal(snapshot.credentialReadiness.securityCertification.missing.includes("SECURITY_OWNER_NAME"), true);
  assert.equal(snapshot.credentialReadiness.pilotOperationsReadiness.some((item) => item.id === "support_owner" && item.status === "owner_required"), true);
  assert.equal(snapshot.credentialReadiness.pilotOperations.missing.includes("PILOT_OWNER_NAME"), true);
});

test("admin can simulate verification status and supplier receives notification", () => {
  const local = storage();
  const approved = adminSimulateVerification(local, "review-supplier", "verified");
  assert.equal(approved.valid, true);
  assert.equal(approved.profile.verificationStatus, "verified");
  const rejected = adminSimulateVerification(local, "review-supplier", "rejected");
  assert.equal(rejected.valid, true);
  const needsInfo = adminSimulateVerification(local, "review-supplier", "needs_more_info");
  assert.equal(needsInfo.valid, true);
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "verification_status_changed"), true);
});

test("admin local operations manage user listing and booking state without live providers", () => {
  const local = storage();
  const admin = { id: "review-admin", role: "admin" };
  const supplier = { id: "review-supplier", role: "supplier" };

  const suspended = adminSetUserAccountStatus(local, "review-customer", "suspended", admin);
  assert.equal(suspended.valid, true);
  assert.equal(createAdminSnapshot(local).users.find((user) => user.id === "review-customer").accountStatus, "suspended");
  assert.equal(adminSetUserAccountStatus(local, "review-customer", "suspended", supplier).valid, false);
  assert.equal(adminSetUserAccountStatus(local, "review-admin", "suspended", admin).valid, false);

  const moderated = adminModerateListing(local, "asset-seed-other-supplier", "available", admin);
  assert.equal(moderated.valid, true);
  assert.equal(createAdminSnapshot(local).listings.find((listing) => listing.id === "asset-seed-other-supplier").availabilityStatus, "available");
  assert.equal(adminModerateListing(local, "asset-seed-other-supplier", "deleted", admin).valid, false);
  assert.equal(adminModerateListing(local, "asset-seed-other-supplier", "paused", supplier).valid, false);

  const approved = adminOverrideBookingStatus(local, "booking-seed-pending-1", "approved", admin);
  assert.equal(approved.valid, true);
  assert.equal(createAdminSnapshot(local).bookings.find((booking) => booking.id === "booking-seed-pending-1").adminOverride, true);
  assert.equal(adminOverrideBookingStatus(local, "booking-seed-pending-1", "not_real", admin).valid, false);
  assert.equal(adminOverrideBookingStatus(local, "booking-seed-pending-1", "cancelled", supplier).valid, false);

  const customerNotifications = getUserNotifications(local, "review-customer");
  const supplierNotifications = getUserNotifications(local, "review-supplier");
  const ownerNotifications = getUserNotifications(local, "supplier-two");
  assert.equal(customerNotifications.some((note) => note.type === "admin_account_status_changed"), true);
  assert.equal(customerNotifications.some((note) => note.type === "admin_booking_status_changed"), true);
  assert.equal(ownerNotifications.some((note) => note.type === "admin_listing_moderated"), true);
  assert.equal(supplierNotifications.some((note) => note.type === "admin_booking_status_changed"), true);
});

test("admin pages render required local-management sections", () => {
  const page = readFileSync(join(root, "src/pages/AdminCenter.jsx"), "utf8");
  for (const text of [
    "Admin Control Center",
    "User management",
    "Listing management",
    "Booking management",
    "Verification management",
    "Payments and ledger",
    "Messages overview",
    "Reports",
    "Settings",
    "simulated/local data only",
    "Local account status controls",
    "Activate local",
    "Suspend local",
    "Local listing moderation updates",
    "Approve local",
    "Pause local",
    "Reject local",
    "Local admin overrides",
    "Mark active",
    "Cancel local",
    "Simulated ledger overview",
    "Thread summaries only",
    "Privacy note",
    "Controlled placeholders",
    "Credential-level readiness",
    "Security baseline readiness",
    "Deployment readiness",
    "Monitoring readiness",
    "Payment activation readiness",
    "Merchant onboarding",
    "Chargebacks",
    "Escrow activation readiness",
    "Trust account readiness",
    "Legal readiness",
    "Dispute readiness",
    "Settlement readiness",
    "Release readiness",
    "Infrastructure activation readiness",
    "DNS status",
    "TLS status",
    "CDN status",
    "Backup status",
    "DR status",
    "Hosting status",
    "Monitoring status",
    "Deployment status",
    "Security certification readiness",
    "Security hardening program",
    "Authentication security",
    "Application security",
    "API security",
    "Dependency security",
    "Security monitoring",
    "Live tooling",
    "Privacy and compliance activation",
    "Jamaica DPA",
    "GDPR framework",
    "Marketplace compliance",
    "Audit retention",
    "KYC readiness",
    "Live KYC vendor",
    "Sanctions / AML",
    "Revenue activation readiness",
    "Payment architecture",
    "Escrow architecture",
    "Financial controls",
    "Transaction audit",
    "Tax/GCT readiness",
    "Payout readiness",
    "Reconciliation",
    "Financial reporting",
    "Real money movement",
    "Real settlements",
    "Real escrow account",
    "OWASP status",
    "Dependency audit status",
    "Secrets status",
    "RBAC status",
    "Authentication audit",
    "Storage security audit",
    "Payment security audit",
    "Escrow security audit",
    "Monitoring audit",
    "Incident response status",
    "Pilot operations readiness",
    "Supplier onboarding",
    "Support readiness",
    "Dispute escalation",
    "Credential gates",
  ]) {
    assert.match(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(page, /guest-marketplace|ai-travel-planner/i);
  assert.doesNotMatch(page, new RegExp("real KYC " + "verified|real payment processed", "i"));
});

test("admin navigation appears only for admin role in app shell", () => {
  const shell = readFileSync(join(root, "src/components/AppShell.jsx"), "utf8");
  assert.match(shell, /isAdmin/);
  assert.match(shell, /to: "\/admin"/);
  assert.match(shell, /isSupplier/);
});

test("direct verification access is protected and null user guard prevents refresh crash", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const verification = readFileSync(join(root, "src/pages/VerificationPage.jsx"), "utf8");
  assert.match(app, /path="\/verification"/);
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.match(verification, /if \(!user\?\.id\) return/);
});
