import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("AI review gap closeout documents exist", () => {
  for (const file of [
    "docs/ai-review-gap-closeout.md",
    "docs/beta-uat-execution-plan.md",
    "docs/performance-load-test-plan.md",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("beta UAT execution plan covers supplier customer admin mobile bandwidth and accessibility gaps", () => {
  const plan = read("docs/beta-uat-execution-plan.md");
  for (const phrase of [
    "20 Suppliers",
    "100 Customers",
    "10 Admin Users",
    "Mobile Device Matrix",
    "Low Bandwidth Testing",
    "Accessibility Review",
    "Paid Pilot remains NO-GO",
  ]) {
    assert.match(plan, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
});

test("performance plan captures required concurrent user levels and no-go conditions", () => {
  const plan = read("docs/performance-load-test-plan.md");
  for (const phrase of [
    "1,000",
    "5,000",
    "10,000",
    "P95",
    "Critical Journeys To Test",
    "No-Go Conditions",
    "k6",
    "Artillery",
    "Playwright",
  ]) {
    assert.match(plan, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.match(plan, /must not be treated as paid-pilot or public-launch ready/i);
});

test("AI review closeout preserves infrastructure activation pending status", () => {
  const closeout = read("docs/ai-review-gap-closeout.md");
  for (const phrase of [
    "Infrastructure Activation Pending",
    "Live Supabase PostgreSQL activation",
    "Live Supabase Auth activation",
    "Live Supabase Storage activation",
    "Live Sentry and Better Stack activation",
    "Live payment provider activation",
    "Live escrow/legal trust account activation",
    "Paid Pilot",
    "NO-GO",
    "Public Launch",
  ]) {
    assert.match(closeout, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
  assert.doesNotMatch(closeout, /production ready|certified for public production|live payments active/i);
});
