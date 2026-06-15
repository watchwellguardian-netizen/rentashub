import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

const requiredDocs = [
  "docs/rc-0.6-activation-readiness-report.md",
  "docs/rc-0.6-activation-gap-register.md",
  "docs/rc-0.6-go-no-go-matrix.md",
  "docs/rc-0.6-risk-register.md",
  "docs/rc-0.6-prioritized-activation-roadmap.md",
  "docs/rc-0.6-release-recommendations.md",
];

function doc(name) {
  return readFileSync(join(root, name), "utf8");
}

test("RC-0.6 activation readiness deliverables exist", () => {
  for (const file of requiredDocs) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("RC-0.6 readiness report covers required activation areas and production boundary", () => {
  const content = doc("docs/rc-0.6-activation-readiness-report.md");
  for (const text of [
    "Infrastructure Readiness",
    "Monitoring Readiness",
    "Security Readiness",
    "Compliance Readiness",
    "Revenue Readiness",
    "Closed Beta",
    "Paid Pilot",
    "Public Launch",
    "Feature development remains frozen",
  ]) {
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(content, /Production ready: No/i);
  assert.doesNotMatch(content, /Production ready: Yes|Public Launch: GO/i);
});

test("RC-0.6 gap register lists critical live activation blockers", () => {
  const content = doc("docs/rc-0.6-activation-gap-register.md");
  for (const text of [
    "Supabase project not live",
    "PostgreSQL migrations not run",
    "Supabase Auth not activated",
    "Supabase Storage not activated",
    "Monitoring not live",
    "Security review not completed",
    "Payment provider not selected",
    "Escrow legal structure not approved",
    "Tax/GCT validation incomplete",
  ]) {
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("RC-0.6 go/no-go matrix blocks paid pilot and public launch", () => {
  const content = doc("docs/rc-0.6-go-no-go-matrix.md");
  assert.match(content, /Closed beta \| CONDITIONAL GO/i);
  assert.match(content, /Paid pilot \| NO-GO/i);
  assert.match(content, /Public launch \| NO-GO/i);
  assert.doesNotMatch(content, /Paid pilot \| GO|Public launch \| GO/i);
});

test("RC-0.6 roadmap authorizes activation work only", () => {
  const content = doc("docs/rc-0.6-prioritized-activation-roadmap.md");
  for (const text of [
    "Feature development is frozen",
    "Priority 1 - Supabase Activation",
    "Priority 2 - Monitoring Activation",
    "Priority 3 - Security Hardening Activation",
    "Priority 4 - Compliance Activation",
    "Priority 5 - Revenue Activation",
  ]) {
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("RC-0.6 recommendations preserve no-new-feature directive", () => {
  const content = doc("docs/rc-0.6-release-recommendations.md");
  assert.match(content, /Closed Beta Recommendation/);
  assert.match(content, /Decision: Conditional GO/);
  assert.match(content, /Paid Pilot Recommendation/);
  assert.match(content, /Decision: NO-GO/);
  assert.match(content, /Production Launch Recommendation/);
  assert.match(content, /No new product, AI, auction, dashboard, mobile, government, customs, or court integration work should proceed/i);
});
