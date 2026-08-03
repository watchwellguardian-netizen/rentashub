import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { NOTIFICATION_STORAGE_KEY, getUserNotifications } from "../../src/lib/notificationService.js";
import {
  SUPPORT_CASE_STORAGE_KEY,
  addSupportCaseNote,
  createSupportCase,
  getSupportCaseById,
  getSupportOperationsSummary,
  getVisibleSupportCases,
  updateSupportCaseStatus,
} from "../../src/lib/supportService.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };

function storage({ cases = [], notifications = [] } = {}) {
  const store = new Map([
    [SUPPORT_CASE_STORAGE_KEY, JSON.stringify(cases)],
    [NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("support routes are wired for users and admins", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const shell = readFileSync(join(root, "src/components/AppShell.jsx"), "utf8");
  const admin = readFileSync(join(root, "src/lib/adminCenter.js"), "utf8");

  assert.match(app, /path="\/support"/);
  assert.match(app, /path="\/admin\/support"/);
  assert.match(app, /AdminSupportPage/);
  assert.match(shell, /LifeBuoy/);
  assert.match(shell, /Support/);
  assert.match(admin, /supportCases/);
  assert.match(admin, /supportSlaAttention/);
});

test("customer can open local support case and receives notifications", () => {
  const local = storage();
  const result = createSupportCase(local, {
    title: "Booking pickup issue",
    description: "I need help confirming the supplier pickup window.",
    category: "booking",
    priority: "high",
  }, customer);

  assert.equal(result.valid, true);
  assert.equal(result.case.status, "open");
  assert.equal(result.case.sla.slaHours, 24);
  assert.equal(getVisibleSupportCases(local, customer).length, 1);
  assert.equal(getUserNotifications(local, "review-customer").some((note) => note.type === "support_case_opened"), true);
  assert.equal(getUserNotifications(local, "review-admin").some((note) => note.type === "support_case_assigned"), true);
});

test("support cases are role scoped and admins can see all", () => {
  const local = storage();
  const opened = createSupportCase(local, {
    title: "Verification document question",
    description: "I need support with a supplier verification document.",
    category: "verification",
    priority: "normal",
  }, supplier);

  assert.equal(opened.valid, true);
  assert.equal(getVisibleSupportCases(local, customer).length, 0);
  assert.equal(getSupportCaseById(local, opened.case.id, customer), null);
  assert.equal(getVisibleSupportCases(local, supplier).length, 1);
  assert.equal(getVisibleSupportCases(local, admin).length, 1);
});

test("admin-only status updates support escalation and resolution", () => {
  const local = storage();
  const opened = createSupportCase(local, {
    title: "Payment readiness question",
    description: "I need support understanding the payment readiness status.",
    category: "payment-readiness",
    priority: "urgent",
  }, customer);

  assert.equal(updateSupportCaseStatus(local, opened.case.id, "escalated", customer).valid, false);
  const escalated = updateSupportCaseStatus(local, opened.case.id, "escalated", admin, { escalationReason: "Needs operations review." });
  assert.equal(escalated.valid, true);
  assert.equal(escalated.case.status, "escalated");
  assert.equal(escalated.case.escalationReason, "Needs operations review.");
  assert.equal(getSupportOperationsSummary(local).escalated, 1);

  const resolved = updateSupportCaseStatus(local, opened.case.id, "resolved", admin, { resolutionSummary: "Answered locally." });
  assert.equal(resolved.valid, true);
  assert.equal(resolved.case.status, "resolved");
  assert.equal(resolved.case.resolutionSummary, "Answered locally.");
  assert.equal(getUserNotifications(local, "review-customer").some((note) => note.type === "support_case_status_changed"), true);
});

test("support notes preserve participant visibility and notify the other side", () => {
  const local = storage();
  const opened = createSupportCase(local, {
    title: "Technical issue",
    description: "The page needs support triage for a local issue.",
    category: "technical",
    priority: "normal",
  }, customer);

  const adminNote = addSupportCaseNote(local, opened.case.id, "Please try refreshing the local app.", admin);
  assert.equal(adminNote.valid, true);
  assert.equal(adminNote.case.notes.at(-1).visibility, "participants");
  assert.equal(getUserNotifications(local, "review-customer").some((note) => note.type === "support_case_note_added"), true);

  const customerNote = addSupportCaseNote(local, opened.case.id, "That worked, thank you.", customer);
  assert.equal(customerNote.valid, true);
  assert.equal(getUserNotifications(local, "review-admin").some((note) => note.type === "support_case_note_added"), true);
});

test("support page copy preserves local-only provider boundary", () => {
  const source = readFileSync(join(root, "src/pages/SupportPage.jsx"), "utf8");
  assert.match(source, /No live helpdesk, email, SMS, or call-center provider is active/);
  assert.match(source, /Create local support case/);
  assert.match(source, /Resolve local/);
  assert.doesNotMatch(source, /production ready|live helpdesk active|sent by email/i);
});
