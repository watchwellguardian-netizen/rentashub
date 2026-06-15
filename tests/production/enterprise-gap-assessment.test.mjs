import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("enterprise gap assessment artifacts exist", () => {
  for (const file of [
    "docs/enterprise-gap-assessment.md",
    "docs/phase-2-prioritized-gap-register.md",
    "docs/phase-2-production-readiness-review.md",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("enterprise gap assessment covers required audit areas and domain findings", () => {
  const report = read("docs/enterprise-gap-assessment.md");
  for (const section of [
    "Product Audit",
    "Technical Audit",
    "Security Audit",
    "Compliance Audit",
    "Operational Readiness Review",
    "Production Readiness Assessment",
    "Domain Findings",
    "Recommended Decision",
  ]) {
    assert.match(report, new RegExp(`## ${section}`), `${section} should be present`);
  }
  for (const domain of [
    "Auctions",
    "Inspection Marketplace",
    "Transport Marketplace",
    "Financing Marketplace",
    "Analytics",
    "Documents",
    "Notifications",
    "AI Listing Assistant",
    "AI Valuation Engine",
    "Security",
    "Infrastructure",
  ]) {
    assert.match(report, new RegExp(domain), `${domain} should be reviewed`);
  }
  assert.match(report, /RentasHub Marketplace RC-0\.5/);
  assert.match(report, /Public Launch: No-Go/);
});

test("prioritized gap register lists critical blockers and recommended sequence", () => {
  const register = read("docs/phase-2-prioritized-gap-register.md");
  for (const gap of [
    "EGA-001",
    "EGA-002",
    "EGA-003",
    "EGA-004",
    "EGA-005",
    "EGA-006",
    "EGA-007",
    "EGA-008",
  ]) {
    assert.match(register, new RegExp(gap), `${gap} should be listed`);
  }
  for (const blocker of [
    "Supabase PostgreSQL",
    "Supabase Auth",
    "Supabase Storage",
    "Monitoring",
    "Backup and restore validation",
    "Payment provider sandbox activation",
    "Escrow legal/provider activation",
    "Security certification",
  ]) {
    assert.match(register, new RegExp(blocker), `${blocker} should be prioritized`);
  }
  assert.match(register, /Project A - Supabase Activation/);
  assert.match(register, /Project D - Monitoring Activation/);
});

test("production readiness review defines go no-go decisions and phase 3 limits", () => {
  const review = read("docs/phase-2-production-readiness-review.md");
  for (const phrase of [
    "RentasHub Marketplace RC-0.5",
    "Demo",
    "Investor demo",
    "Internal testing",
    "Supplier pilot",
    "Closed Beta",
    "Paid Pilot",
    "Public Launch",
    "Phase 3 Entry Criteria",
    "Project A - Supabase Activation",
    "Real payment processing",
    "Real escrow movement",
    "External AI providers",
  ]) {
    assert.match(review, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(review, /Paid Pilot \| No-Go/);
  assert.match(review, /Public Launch \| No-Go/);
});

test("enterprise review docs preserve provider-ready boundary and no live launch claim", () => {
  const combined = [
    read("docs/enterprise-gap-assessment.md"),
    read("docs/phase-2-prioritized-gap-register.md"),
    read("docs/phase-2-production-readiness-review.md"),
  ].join("\n");
  for (const risk of [
    "Real provider integrations remain inactive",
    "Supabase PostgreSQL activation remains credential-ready only",
    "No external penetration test",
    "No legal auctioneer workflow activation",
    "No-Go",
  ]) {
    assert.match(combined, new RegExp(risk, "i"), `${risk} should remain explicit`);
  }
  assert.doesNotMatch(combined, /is production ready|certified for public production|authorized for public launch/i);
});
