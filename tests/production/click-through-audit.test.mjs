import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ADMIN_NAV } from "../../src/lib/adminCenter.js";
import { ACTIONS as CUSTOMER_ACTIONS } from "../../src/lib/customerDashboard.js";
import { EXCHANGE_NAV } from "../../src/lib/marketplaceExchange.js";
import { canAccessRole } from "../../src/lib/rbac.js";
import { SUPPLIER_ACTIONS } from "../../src/lib/supplierDashboard.js";

const root = process.cwd();
const appSource = readFileSync(join(root, "src/App.jsx"), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routePatternToRegExp(route) {
  const pattern = route
    .split("/")
    .map((part) => (part.startsWith(":") ? "[^/]+" : escapeRegExp(part)))
    .join("/");
  return new RegExp(`^${pattern}$`);
}

const appRoutes = [...appSource.matchAll(/path="([^"]+)"/g)].map((match) => match[1]).filter((route) => route !== "*");

function assertRouteExists(target) {
  assert.ok(
    appRoutes.some((route) => routePatternToRegExp(route).test(target)),
    `Expected ${target} to be registered in App.jsx routes`,
  );
}

test("all primary menu and dashboard action targets resolve to registered routes", () => {
  const appShellRoutes = [
    "/landing",
    "/customer-dashboard",
    "/search",
    "/bookings",
    "/wallet",
    "/messages",
    "/notifications",
    "/trust",
    "/ai",
    "/admin",
    "/admin/users",
    "/admin/listings",
    "/admin/verifications",
    "/admin/risk",
    "/brokerage/leads",
    "/brokerage",
    "/marketplace",
    "/supplier-dashboard",
    "/my-listings",
    "/rental-requests",
    "/earnings",
    "/supplier-profile",
  ];

  const aiRoutes = ["/ai", "/ai/search", "/ai/listing-assistant", "/ai/rental-advisor", "/ai/broker-assistant", "/ai/market-insights"];
  const dynamicExamples = [
    "/asset/demo-asset",
    "/assets/demo-asset",
    "/asset/demo-asset/book",
    "/asset/demo-asset/edit",
    "/asset/demo-asset/reviews",
    "/booking/demo-booking",
    "/booking/demo-booking/manage",
    "/booking/demo-booking/payment",
    "/booking/demo-booking/check-in",
    "/booking/demo-booking/check-out",
    "/booking/demo-booking/messages",
    "/inspection/demo-inspection",
    "/inspection/demo-inspection/review",
    "/reviews/write/demo-booking",
    "/listing/demo-asset/offer",
    "/trade-request/demo-trade",
    "/trust/supplier/demo-supplier",
    "/trust/customer/demo-customer",
    "/trust/asset/demo-asset",
    "/protection/booking/demo-booking",
    "/protection/asset/demo-asset",
    "/claims/new/demo-booking",
    "/claim/demo-claim",
    "/disputes/new/demo-booking",
    "/dispute/demo-dispute",
    "/transaction/demo-transaction",
    "/category/cars",
    "/supplier/demo-supplier/reviews",
  ];

  const targets = [
    "/",
    "/login",
    "/dashboard",
    "/assets",
    "/marketplace/cars",
    "/marketplace/trucks",
    "/marketplace/heavy-equipment",
    "/marketplace/small-tools-machines",
    "/marketplace/event-spaces",
    "/marketplace/real-estate",
    "/marketplace/storage-containers",
    "/marketplace/specialty-assets",
    "/buy",
    "/sell",
    "/trade",
    "/swap",
    "/wanted",
    "/protection",
    "/protection/plans",
    "/reviews",
    "/payments",
    "/payouts",
    "/supplier-info",
    "/supplier-profile/edit",
    "/verification",
    "/verification/status",
    "/admin/payments",
    "/admin/messages",
    "/admin/reviews",
    "/admin/claims",
    "/admin/disputes",
    "/admin/reports",
    "/admin/settings",
    ...appShellRoutes,
    ...aiRoutes,
    ...CUSTOMER_ACTIONS.map((action) => action.route),
    ...SUPPLIER_ACTIONS.map((action) => action.route),
    ...ADMIN_NAV.map((item) => item.route),
    ...EXCHANGE_NAV.map((item) => item.route),
    ...dynamicExamples,
  ];

  for (const target of [...new Set(targets)]) {
    assertRouteExists(target);
  }
});

test("role-specific click-through destinations are protected for the intended roles", () => {
  const roleMatrix = [
    { route: "/customer-dashboard", allowed: ["customer"], blocked: ["supplier", "broker", "admin"] },
    { route: "/bookings", allowed: ["customer"], blocked: ["supplier", "broker", "admin"] },
    { route: "/wallet", allowed: ["customer"], blocked: ["supplier", "broker", "admin"] },
    { route: "/supplier-dashboard", allowed: ["supplier"], blocked: ["customer", "broker", "admin"] },
    { route: "/list-asset", allowed: ["supplier"], blocked: ["customer", "broker", "admin"] },
    { route: "/my-listings", allowed: ["supplier"], blocked: ["customer", "broker", "admin"] },
    { route: "/earnings", allowed: ["supplier"], blocked: ["customer", "broker", "admin"] },
    { route: "/brokerage/leads", allowed: ["broker", "admin"], blocked: ["customer", "supplier"] },
    { route: "/admin", allowed: ["admin"], blocked: ["customer", "supplier", "broker"] },
    { route: "/admin/disputes", allowed: ["admin"], blocked: ["customer", "supplier", "broker"] },
  ];

  for (const entry of roleMatrix) {
    for (const role of entry.allowed) assert.equal(canAccessRole(role, entry.allowed), true, `${role} should access ${entry.route}`);
    for (const role of entry.blocked) assert.equal(canAccessRole(role, entry.allowed), false, `${role} should be blocked from ${entry.route}`);
  }

  assert.match(appSource, /<Route element={<ProtectedRoute allowedRoles={\["admin"\]} \/>}>/);
  assert.match(appSource, /path="\/admin\/disputes"/);
  assert.match(appSource, /path="\/supplier-info" element={<ModulePlaceholder moduleKey="supplier-info" \/>}/);
});

test("placeholder and unfinished admin actions are controlled instead of dead active buttons", () => {
  const adminPage = readFileSync(join(root, "src/pages/AdminCenter.jsx"), "utf8");
  for (const label of [
    "Suspend/activate placeholder",
    "Approve/reject/suspend placeholder",
    "Admin override placeholder",
  ]) {
    const openingTag = new RegExp(`<Button[^>]*(?:disabled|onClick=)[^>]*>${escapeRegExp(label)}</Button>`);
    assert.match(adminPage, openingTag, `${label} must be disabled or have an explicit controlled handler`);
  }

  const pageFiles = [
    "src/pages/AdminCenter.jsx",
    "src/pages/AssetDetail.jsx",
    "src/pages/BookingDetail.jsx",
    "src/pages/BookingPayment.jsx",
    "src/pages/CustomerDashboard.jsx",
    "src/pages/SupplierDashboard.jsx",
    "src/pages/ExchangeMarketplace.jsx",
    "src/pages/ProtectionPages.jsx",
    "src/pages/DisputePages.jsx",
    "src/pages/AiAssistant.jsx",
  ];

  for (const file of pageFiles) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /href=["']#["']|javascript:/i, `${file} must not contain dead href actions`);
  }
});

test("audit report exists and records launch-impact decisions without false live claims", () => {
  const report = readFileSync(join(root, "docs/full-click-through-operational-audit.md"), "utf8");
  for (const section of [
    "Unauthenticated Visitor",
    "Customer/User",
    "Supplier/Vendor",
    "Broker",
    "Admin",
    "Mobile Navigation",
    "Issues Found And Fixed",
    "Release Safety Decision",
  ]) {
    assert.match(report, new RegExp(escapeRegExp(section)));
  }
  assert.match(report, /No live payments, live escrow, live insurance, or public launch approval was claimed/);
  assert.doesNotMatch(report, /PlannasHub/);
});
