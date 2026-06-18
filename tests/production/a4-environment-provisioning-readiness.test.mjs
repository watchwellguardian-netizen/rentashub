import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  A4_ENV_VARIABLE_GROUPS,
  buildA4EnvNameReadinessReport,
  renderA4EnvNameReadinessReport,
  validateA4EnvVariableNames,
  validateA4EnvironmentTemplates,
} from "../../scripts/a4-validate-env-names.mjs";

const root = process.cwd();

const templatePaths = [
  "docs/a4-02-development-environment-template.md",
  "docs/a4-02-staging-environment-template.md",
  "docs/a4-02-production-environment-template.md",
];

test("A4-02 environment templates exist", () => {
  for (const path of templatePaths) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
  }
});

test("A4-02 environment templates include required sections and fields", () => {
  const result = validateA4EnvironmentTemplates({ root });
  assert.equal(result.status, "PASS");
  assert.equal(result.valuesLoaded, false);
  assert.equal(result.valuesPrinted, false);
  for (const template of result.templates) {
    assert.equal(template.status, "PASS");
    assert.deepEqual(template.missingSections, []);
    assert.deepEqual(template.missingTerms, []);
  }
});

test("A4 env variable checklist includes every required variable name", () => {
  const checklist = readFileSync(join(root, "docs/a4-env-variable-checklist.md"), "utf8");
  const result = validateA4EnvVariableNames({ root, checklistText: checklist });
  assert.equal(result.status, "PASS");
  assert.equal(result.valuesLoaded, false);
  assert.equal(result.valuesPrinted, false);
  for (const variables of Object.values(A4_ENV_VARIABLE_GROUPS)) {
    for (const variable of variables) {
      assert.match(checklist, new RegExp(`\\\`${variable}\\\``));
    }
  }
});

test("A4 env variable checklist covers launch-stage columns", () => {
  const result = validateA4EnvVariableNames({ root });
  assert.deepEqual(result.missingColumns, []);
  assert.ok(result.groupCoverage.every((group) => group.presentVariables === group.requiredVariables));
});

test("A4 env name validator rejects secret-like values in checklist text", () => {
  const serviceRoleLabel = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  const serviceRoleValue = ["sb", "service", "supersecretvalue12345"].join("_");
  const text = `
# Test Checklist

| Variable | Required Now | Closed Beta | Paid Pilot | Public Launch |
| --- | --- | --- | --- | --- |
| \`${serviceRoleLabel}\` | Yes | Yes | Yes | Yes |
${serviceRoleLabel}=${serviceRoleValue}
`;
  const result = validateA4EnvVariableNames({ checklistText: text });
  assert.equal(result.status, "FAIL");
  assert.equal(result.valuesLoaded, false);
  assert.equal(result.valuesPrinted, false);
  assert.ok(result.blockers.some((blocker) => /secret-like value/.test(blocker)));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(serviceRoleValue));
});

test("A4-02 report remains blocked without actual environment evidence", () => {
  const report = buildA4EnvNameReadinessReport({ root });
  assert.equal(report.status, "PASS");
  assert.equal(report.a402Status, "BLOCKED_PENDING_ACTUAL_ENVIRONMENT_VALUES");
  assert.equal(report.liveProvisioningClaimed, false);
  assert.equal(report.nextAuthorizedGate, "A4-01 Infrastructure Ownership Confirmation Submitted");
  const rendered = renderA4EnvNameReadinessReport(report);
  assert.match(rendered, /A4-02 Status: BLOCKED_PENDING_ACTUAL_ENVIRONMENT_VALUES/);
  assert.match(rendered, /Live provisioning claimed: NO/);
});
