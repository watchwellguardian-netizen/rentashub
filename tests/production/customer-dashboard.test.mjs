import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ACTIONS, canAccessCustomerDashboard, createCustomerDashboardModel } from "../../src/lib/customerDashboard.js";

const root = process.cwd();

test("customer can access dashboard and supplier/admin/broker cannot", () => {
  assert.equal(canAccessCustomerDashboard("customer"), true);
  assert.equal(canAccessCustomerDashboard("guest"), true);
  assert.equal(canAccessCustomerDashboard("supplier"), false);
  assert.equal(canAccessCustomerDashboard("broker"), false);
  assert.equal(canAccessCustomerDashboard("admin"), false);
});

test("customer dashboard renders empty-state model safely", () => {
  const model = createCustomerDashboardModel({ user: { full_name: "Review Customer", role: "customer" } });
  assert.equal(model.productName, "RentasHub");
  assert.equal(model.userName, "Review Customer");
  assert.equal(model.emptyStates.activeBookings, true);
  assert.equal(model.emptyStates.favorites, true);
  assert.equal(model.emptyStates.messages, true);
  assert.equal(model.emptyStates.recentActivity, true);
});

test("quick actions use clean standalone routes only", () => {
  for (const action of ACTIONS) {
    assert.match(action.route, /^\//);
    assert.doesNotMatch(action.route, new RegExp("^/" + "rent" + "broker"));
    assert.doesNotMatch(action.route, /guest-marketplace|ai-travel-planner/i);
  }
});

test("customer dashboard includes required states and mobile structure", () => {
  const page = readFileSync(join(root, "src/pages/CustomerDashboard.jsx"), "utf8");
  for (const text of [
    "Welcome,",
    "Search rentals and brokerage assets",
    "AI Help",
    "Active bookings",
    "Saved assets",
    "Messages and notifications",
    "Wallet summary",
    "No active bookings yet",
    "No saved assets yet",
    "No messages yet",
    "No recent activity",
    "Loading your dashboard",
    "Dashboard needs a refresh",
  ]) {
    assert.match(page, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const css = readFileSync(join(root, "src/styles.css"), "utf8");
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1040px\)/);
});
