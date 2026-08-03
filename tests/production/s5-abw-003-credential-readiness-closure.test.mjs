import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildCredentialReadinessClosure,
  writeCredentialReadinessClosure,
} from "../../scripts/s5-abw-003-credential-readiness-closure.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_DIR = join(ROOT, "docs", "build-readiness");

const SECRET_VALUE_PATTERNS = [
  /sb_secret_/i,
  /service[_-]?role[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{12,}/i,
  /postgresql:\/\/[^:\s]+:[^@\s]+@/i,
  /jwt[_-]?secret\s*[:=]\s*[^,\s]+/i,
  /sk_live_[A-Za-z0-9]+/i,
  /whsec_[A-Za-z0-9]+/i,
];

test("S5-ABW-003 maps every runtime-blocked feature to a credential-readiness domain", () => {
  const report = buildCredentialReadinessClosure({ generatedAt: "2026-08-03T00:00:00.000Z" });
  assert.equal(report.status, "PASS_CREDENTIAL_READINESS_CLOSURE_READY");
  assert.equal(report.productionReady, false);
  assert.equal(report.allRuntimeBlockedFeaturesMapped, true);
  assert.equal(report.unmappedRuntimeBlockedFeatures.length, 0);
  assert.ok(report.runtimeBlockedFeatureCount > 0);
});

test("S5-ABW-003 domains include owner, env-name-only contract, command, evidence, and manual intervention", () => {
  const report = buildCredentialReadinessClosure({ generatedAt: "2026-08-03T00:00:00.000Z" });
  assert.ok(report.credentialReadinessDomainCount >= 10);
  for (const domain of report.domains) {
    assert.match(domain.status, /CREDENTIAL_READY_MANUAL_EVIDENCE_PENDING/);
    assert.ok(domain.owner);
    assert.ok(domain.validationCommand.startsWith("npm run "));
    assert.ok(domain.requiredEnvNames.length > 0);
    assert.ok(domain.requiredEnvNames.every((name) => /^[A-Z0-9_]+$/.test(name)));
    assert.ok(domain.evidenceRequired.length > 0);
    assert.ok(domain.manualIntervention);
    assert.equal(domain.credentialValuesRequiredInRepository, false);
    assert.equal(domain.credentialValuesPrinted, false);
    assert.equal(domain.liveProviderActive, false);
  }
});

test("S5-ABW-003 output remains secret-safe and does not include credential values", () => {
  const report = buildCredentialReadinessClosure({ generatedAt: "2026-08-03T00:00:00.000Z" });
  const serialized = JSON.stringify(report);
  for (const pattern of SECRET_VALUE_PATTERNS) {
    assert.equal(pattern.test(serialized), false, `secret-like output matched ${pattern}`);
  }
  assert.equal(report.noSecretValuesPrinted, true);
  assert.equal(report.noLiveProviderCalls, true);
});

test("S5-ABW-003 generates register, report, and manual intervention artifacts", () => {
  const report = writeCredentialReadinessClosure();
  const files = [
    "credential-readiness-closure-register.json",
    "credential-readiness-closure-report.md",
    "manual-intervention-register.md",
  ];
  for (const file of files) {
    const path = join(OUT_DIR, file);
    assert.equal(existsSync(path), true, `${file} should exist`);
    const text = readFileSync(path, "utf8");
    assert.match(text, /A4-01|Credential|Manual|PASS_CREDENTIAL_READINESS_CLOSURE_READY/i);
  }
  assert.equal(report.productionReady, false);
});
