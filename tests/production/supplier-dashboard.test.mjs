import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { canAccessRole } from "../../src/lib/rbac.js";
import {
  SUPPLIER_ACTIONS,
  canAccessSupplierDashboard,
  createSupplierDashboardModel,
} from "../../src/lib/supplierDashboard.js";

const root = process.cwd();

test("supplier and vendor can access Supplier Dashboard while other roles cannot", () => {
  assert.equal(canAccessSupplierDashboard("supplier"), true);
  assert.equal(canAccessSupplierDashboard("vendor"), true);
  assert.equal(canAccessSupplierDashboard("customer"), false);
  assert.equal(canAccessSupplierDashboard("guest"), false);
  assert.equal(canAccessSupplierDashboard("user"), false);
  assert.equal(canAccessSupplierDashboard("admin"), false);
  assert.equal(canAccessSupplierDashboard("broker"), false);
  assert.equal(canAccessSupplierDashboard(null), false);
});

test("supplier route protection and dashboard redirect are wired correctly", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.match(app, /path="\/supplier-dashboard"/);
  assert.match(app, /<SupplierDashboard \/>/);
  assert.match(app, /Navigate to="\/supplier-dashboard"/);
  assert.equal(canAccessRole("customer", ["supplier"]), false);
  assert.equal(canAccessRole("broker", ["supplier"]), false);
  assert.equal(canAccessRole("admin", ["supplier"]), false);
});

test("supplier dashboard model renders safely with empty states", () => {
  const model = createSupplierDashboardModel({
    user: { full_name: "Review Supplier", role: "supplier" },
  });

  assert.equal(model.productName, "RentasHub");
  assert.equal(model.userName, "Review Supplier");
  assert.equal(model.allowed, true);
  assert.equal(model.emptyStates.listings, true);
  assert.equal(model.emptyStates.rentalRequests, true);
  assert.equal(model.emptyStates.pendingApprovals, true);
  assert.equal(model.emptyStates.messages, true);
  assert.equal(model.emptyStates.maintenanceReminders, true);
  assert.deepEqual(model.responsiveSections, ["welcome", "profile", "listings", "requests", "approvals", "earnings", "messages", "maintenance", "quick-actions"]);
});

test("supplier quick actions use standalone routes and controlled placeholders", () => {
  const expected = ["/list-asset", "/my-listings", "/rental-requests", "/supplier-profile", "/messages", "/earnings", "/ai/listing-assistant"];
  assert.deepEqual(SUPPLIER_ACTIONS.map((action) => action.route), expected);

  for (const action of SUPPLIER_ACTIONS) {
    assert.match(action.route, /^\//);
    assert.doesNotMatch(action.route, new RegExp("^/" + "rent" + "broker"));
    assert.doesNotMatch(action.route, /guest-marketplace|ai-travel-planner/i);
  }

  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/my-listings", "/rental-requests", "/earnings"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("supplier dashboard page includes required states and sections", () => {
  const page = readFileSync(join(root, "src/pages/SupplierDashboard.jsx"), "utf8");
  for (const text of [
    "Welcome,",
    "Supplier quick actions",
    "Business profile",
    "Asset listing summary",
    "Active rental requests",
    "Pending approvals",
    "Earnings",
    "Messages",
    "Maintenance and inspections",
    "AI listing help",
    "No listings yet",
    "No active rental requests",
    "No pending approvals",
    "No supplier messages",
    "No maintenance reminders",
    "Loading supplier dashboard",
    "Supplier dashboard needs a refresh",
  ]) {
    assert.match(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("supplier dashboard remains mobile-first and standalone-branded", () => {
  const page = readFileSync(join(root, "src/pages/SupplierDashboard.jsx"), "utf8");
  const css = readFileSync(join(root, "src/styles.css"), "utf8");
  assert.match(page, /RentasHub/);
  assert.doesNotMatch(page, new RegExp("Plannas" + "Hub"));
  assert.match(css, /supplier-actions/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1040px\)/);
});
