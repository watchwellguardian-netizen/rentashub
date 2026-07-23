import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { AI_PROVIDER_STATUS, DOCUMENTATION_SUBJECTS, SYSTEM_STATUS_CATEGORIES, WORKFLOW_GUIDES, getA4TruthStatus, getRoleGuidance, searchDocumentation } from "../../src/lib/aiStudioConsolidation.js";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("A3-X governance is installed without passing A4-01", () => {
  const agents = read("AGENTS.md");
  const programState = read("docs/program-state.md");
  assert.match(agents, /RentasHub Repository Governance/);
  assert.match(agents, /sole canonical operational application/);
  assert.match(agents, /Do not create a second application/);
  assert.match(programState, /A3-X - AI Studio Capability Consolidation/);
  assert.match(programState, /Does not satisfy A4-01/);
  assert.match(programState, /Current gate: A4-01 Infrastructure Ownership Confirmation/);
});

test("AI Studio consolidation routes are wired into the existing router and RBAC", () => {
  const app = read("src/App.jsx");
  const shell = read("src/components/AppShell.jsx");
  assert.match(app, /path="\/ai-assistant"/);
  assert.match(app, /path="\/documentation"/);
  assert.match(app, /path="\/workflows"/);
  assert.match(app, /path="\/admin\/system-status"/);
  assert.match(app, /ProtectedRoute allowedRoles=\{\["customer", "supplier", "broker", "admin"\]\}/);
  assert.match(app, /ProtectedRoute allowedRoles=\{\["admin"\]\}/);
  assert.match(shell, /\/ai-assistant/);
  assert.match(shell, /\/admin\/system-status/);
});

test("role-aware assistant provides scoped guidance and credential-required fallback", () => {
  assert.match(getRoleGuidance({ role: "customer" }).summary, /Search assets/);
  assert.match(getRoleGuidance({ role: "supplier" }).summary, /Create listings/);
  assert.match(getRoleGuidance({ role: "broker" }).summary, /Brokerage guidance|brokerage leads/i);
  const admin = getRoleGuidance({ role: "admin" });
  assert.match(admin.summary, /Production gates remain blocked/);
  assert.equal(admin.technical.title, "Technical guidance");
  assert.equal(AI_PROVIDER_STATUS.status, "Credential Required");
  assert.match(AI_PROVIDER_STATUS.summary, /deterministic RentasHub documentation fallback/);
});

test("searchable documentation covers every required subject with implementation-status labels", () => {
  const required = ["Marketplace", "Listings", "Rentals", "Sales", "Trades", "Swaps", "Brokerage", "Bookings", "Inspections", "Messaging", "Reviews", "Trust and verification", "Disputes", "Payments", "Escrow", "Roles and permissions", "Security", "Database", "APIs", "Testing", "Infrastructure", "Release gates"];
  const modules = DOCUMENTATION_SUBJECTS.map((item) => item.module);
  for (const item of required) assert.ok(modules.includes(item), `${item} should be documented`);
  for (const item of DOCUMENTATION_SUBJECTS) assert.ok(item.status, `${item.module} should have status`);
  const paymentResults = searchDocumentation({ query: "payment" });
  assert.ok(paymentResults.some((item) => item.module === "Payments"));
});

test("workflow guides cover required workflows and remain read-only", () => {
  const required = ["rental", "purchase", "sale", "trade", "swap", "brokerage", "booking", "inspection", "review", "dispute"];
  const ids = WORKFLOW_GUIDES.map((workflow) => workflow.id);
  for (const item of required) assert.ok(ids.includes(item), `${item} workflow should be present`);
  for (const workflow of WORKFLOW_GUIDES) {
    assert.ok(workflow.actors.length, `${workflow.id} actors should be present`);
    assert.ok(workflow.stages.length, `${workflow.id} stages should be present`);
    assert.ok(workflow.transitions.length, `${workflow.id} transitions should be present`);
    assert.ok(workflow.failures.length, `${workflow.id} failure paths should be present`);
    assert.ok(workflow.permissions.length, `${workflow.id} permissions should be present`);
    assert.equal(workflow.createsTransactions, false, `${workflow.id} must not create transactions`);
  }
});

test("admin system status covers required categories and truthfully blocks A4-01", () => {
  const required = ["Application version", "Frontend", "Backend", "Persistence", "Database", "Authentication", "Server-side authorization", "Storage", "Payments", "Escrow", "Email", "SMS", "WhatsApp", "AI provider", "Monitoring", "Backups", "Test status", "Security review", "Infrastructure ownership", "Deployment", "Production certification"];
  const categories = SYSTEM_STATUS_CATEGORIES.map((item) => item.category);
  for (const item of required) assert.ok(categories.includes(item), `${item} should be in system status`);
  const a4 = getA4TruthStatus();
  assert.equal(a4.status, "Infrastructure Required");
  assert.match(a4.message, /A4-01 remains open\/blocked/);
});

test("consolidation does not import mock transaction backend or alternate app architecture", () => {
  const page = read("src/pages/AiStudioConsolidationPages.jsx");
  const lib = read("src/lib/aiStudioConsolidation.js");
  const app = read("src/App.jsx");
  assert.doesNotMatch(`${page}\n${lib}`, /express\(|createServer|mock Express|commission|91\.5|8\.5|Gemini|KMS|DMV/i);
  assert.doesNotMatch(app, /createBrowserRouter|RouterProvider/);
  assert.match(page, /does not activate infrastructure/);
  assert.match(page, /This page does not activate infrastructure/);
});
