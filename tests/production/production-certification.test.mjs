import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("production certification documents exist", () => {
  for (const file of [
    "docs/production-certification-report.md",
    "docs/final-gap-register.md",
    "docs/release-decision-matrix.md",
    "docs/phase-2-production-activation-roadmap.md",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("certification report includes required readiness sections and status model", () => {
  const report = read("docs/production-certification-report.md");
  for (const section of [
    "Product Completeness",
    "Frontend Readiness",
    "Backend Readiness",
    "Auth Readiness",
    "Database Readiness",
    "Object Storage Readiness",
    "Payment Readiness",
    "Escrow Readiness",
    "KYC/Insurance Readiness",
    "Security Readiness",
    "Deployment Readiness",
    "Monitoring Readiness",
    "Backup Readiness",
    "Legal/Compliance Readiness",
    "Data/Privacy Readiness",
    "Accessibility Readiness",
    "Performance Readiness",
    "Mobile/PWA Readiness",
    "Admin Readiness",
    "Marketplace Trust/Safety Readiness",
    "Revenue Engine Readiness",
    "AI Assistant Readiness",
  ]) {
    assert.match(report, new RegExp(`## ${section}`), `${section} should be present`);
  }
  for (const field of ["Status:", "Evidence:", "Remaining gaps:", "Required owner:", "Required action:", "Launch blocker:"]) {
    assert.match(report, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${field} should be used`);
  }
  assert.match(report, /Overall readiness percentage: 82%/);
  assert.match(report, /Public production: No-Go/);
  assert.match(report, /Phase 2 Production Activation Handoff/);
  assert.match(report, /Module 44 - Production Database Activation/);
  assert.match(report, /Module 50 - Pilot Launch Readiness/);
});

test("final gap register includes required columns and live blockers", () => {
  const register = read("docs/final-gap-register.md");
  for (const heading of [
    "Gap ID",
    "Gap title",
    "Severity",
    "Module affected",
    "Business impact",
    "Technical impact",
    "Required fix",
    "Manual intervention required",
    "Credential required",
    "Launch blocker",
    "Recommended sequence",
  ]) {
    assert.match(register, new RegExp(heading), `${heading} should be present`);
  }
  for (const gap of ["GAP-001", "GAP-002", "GAP-003", "GAP-009", "GAP-010"]) {
    assert.match(register, new RegExp(gap), `${gap} should be listed`);
  }
  assert.match(register, /Real database not active/);
  assert.match(register, /Object storage not active/);
  assert.match(register, /Payment processor not active/);
  assert.match(register, /Supabase PostgreSQL/);
  assert.match(register, /Stripe Connect/);
  assert.match(register, /Sentry/);
});

test("release decision matrix defines release stages and go no-go recommendations", () => {
  const matrix = read("docs/release-decision-matrix.md");
  for (const section of [
    "Demo Release Criteria",
    "Internal Team Testing Criteria",
    "Supplier Pilot Criteria",
    "Customer Pilot Criteria",
    "Paid Beta Criteria",
    "Public Launch Criteria",
  ]) {
    assert.match(matrix, new RegExp(`## ${section}`), `${section} should be present`);
  }
  assert.match(matrix, /Demo release: Go/);
  assert.match(matrix, /Supplier pilot: Conditional Go/);
  assert.match(matrix, /Paid beta: No-Go/);
  assert.match(matrix, /Public launch: No-Go/);
  assert.match(matrix, /Phase 2 Gate Mapping/);
  assert.match(matrix, /Module 46 - Frontend Authentication Migration/);
});

test("phase 2 activation roadmap captures credential-level blockers and provider recommendations", () => {
  const roadmap = read("docs/phase-2-production-activation-roadmap.md");
  for (const phrase of [
    "Real database",
    "Object storage",
    "Authentication",
    "Payment infrastructure",
    "Escrow",
    "Monitoring",
    "Supabase PostgreSQL",
    "Neon",
    "Amazon RDS",
    "Supabase Storage",
    "Amazon S3-compatible storage",
    "JWT",
    "refresh tokens",
    "password reset",
    "email verification",
    "session revocation",
    "WiPay",
    "Lynk Business",
    "NCB payment APIs",
    "Stripe Connect",
    "Sentry",
    "Better Stack",
    "Module 44 - Production Database Activation",
    "Module 45 - Object Storage Activation",
    "Module 46 - Frontend Authentication Migration",
    "Module 47 - Payment Provider Activation",
    "Module 48 - Monitoring & Observability",
    "Module 49 - Production Security Certification",
    "Module 50 - Pilot Launch Readiness",
  ]) {
    assert.match(roadmap, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(roadmap, /Manual\/external intervention still required/);
  assert.doesNotMatch(roadmap, /is production ready|production-ready platform|certified for public production/i);
});

test("certification docs explicitly list remaining live risks without unconditional production-ready claims", () => {
  const combined = [
    read("docs/production-certification-report.md"),
    read("docs/final-gap-register.md"),
    read("docs/release-decision-matrix.md"),
    read("docs/phase-2-production-activation-roadmap.md"),
  ].join("\n");
  for (const risk of [
    "No real database server",
    "No real payment processor",
    "No escrow provider",
    "No monitoring provider",
    "No hosting",
    "No legal review",
    "No production security certification",
  ]) {
    assert.match(combined, new RegExp(risk, "i"), `${risk} should be explicit`);
  }
  assert.doesNotMatch(combined, /is production ready|production-ready platform|certified for public production/i);
});
