import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createAdminSnapshot } from "../../src/lib/adminCenter.js";
import {
  COMPLIANCE_ACTIVATION_READINESS_CHECKS,
  getComplianceActivationReadiness,
  getCredentialReadinessSummary,
} from "../../src/lib/credentialReadiness.js";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function emptyStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("Project D1 compliance docs exist and include required sections", () => {
  for (const file of [
    "docs/project-d-privacy-compliance-activation.md",
    "docs/compliance-gap-report.md",
    "docs/compliance-remediation-roadmap.md",
  ]) {
    const contents = read(file);
    assert.match(contents, /compliance|Compliance|privacy|Privacy/);
    assert.doesNotMatch(contents, /Production Ready:\s*Yes|production-ready:\s*yes/i);
  }
  const architecture = read("docs/project-d-privacy-compliance-activation.md");
  for (const phrase of [
    "Privacy Architecture",
    "Compliance Architecture",
    "KYC Readiness",
    "Jamaica Data Protection Act readiness",
    "GDPR readiness framework",
    "Live KYC vendors",
  ]) {
    assert.match(architecture, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("frontend compliance readiness defaults to provider-ready inactive state", () => {
  const readiness = getComplianceActivationReadiness({});
  assert.equal(readiness.status, "privacy_compliance_inputs_missing");
  assert.equal(readiness.score, 0);
  assert.equal(readiness.liveKycVendorActive, false);
  assert.equal(readiness.realIdentityVerificationActive, false);
  assert.equal(readiness.sanctionsScreeningActive, false);
  assert.equal(readiness.amlMonitoringActive, false);
  assert.equal(readiness.documentVerificationProviderActive, false);
  assert.ok(readiness.missing.includes("PRIVACY_OWNER_NAME"));
  assert.ok(COMPLIANCE_ACTIVATION_READINESS_CHECKS.some((item) => item.id === "jamaica_dpa"));

  const summary = getCredentialReadinessSummary();
  assert.equal(summary.complianceActivation.status, "privacy_compliance_inputs_missing");
  assert.ok(summary.complianceActivationReadiness.some((item) => item.id === "kyc_readiness"));
});

test("admin dashboard and route expose compliance readiness", () => {
  const snapshot = createAdminSnapshot(emptyStorage());
  assert.equal(snapshot.overview.complianceReadinessScore, 0);
  assert.equal(snapshot.settings.complianceActivation, "0% privacy and compliance readiness score");
  assert.equal(snapshot.credentialReadiness.complianceActivation.missing.includes("JAMAICA_DPA_REVIEW_OWNER"), true);

  const admin = read("src/pages/AdminCenter.jsx");
  for (const text of [
    "Privacy and compliance activation",
    "Jamaica DPA",
    "GDPR framework",
    "Marketplace compliance",
    "Audit retention",
    "KYC readiness",
    "Live KYC vendor",
    "Sanctions / AML",
  ]) {
    assert.match(admin, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const app = read("src/App.jsx");
  assert.match(app, /path="\/admin\/compliance"/);
  const nav = read("src/lib/adminCenter.js");
  assert.match(nav, /\/admin\/compliance/);
});

test("server env template contains Project D1 compliance controls", () => {
  const env = read("server/.env.example");
  for (const key of [
    "PRIVACY_OWNER_NAME",
    "PRIVACY_OWNER_EMAIL",
    "CONSENT_MANAGEMENT_STRATEGY",
    "DATA_RETENTION_POLICY_URL",
    "DATA_DELETION_POLICY_URL",
    "DATA_EXPORT_POLICY_URL",
    "DSAR_WORKFLOW_OWNER",
    "JAMAICA_DPA_REVIEW_OWNER",
    "GDPR_REVIEW_OWNER",
    "MARKETPLACE_COMPLIANCE_OWNER",
    "LEGAL_DOCUMENT_OWNER",
    "KYC_POLICY_OWNER",
    "KYC_DATA_SHARING_POLICY_URL",
  ]) {
    assert.match(env, new RegExp(`^${key}=`, "m"));
  }
});

test("backend readiness source references compliance readiness without live provider activation", () => {
  const integration = read("server/src/config/integrationReadiness.js");
  const model = read("server/src/compliance/complianceReadiness.js");
  assert.match(integration, /getComplianceReadiness/);
  assert.match(integration, /complianceActivation/);
  for (const marker of [
    "liveKycVendorActive: false",
    "realIdentityVerificationActive: false",
    "sanctionsScreeningActive: false",
    "amlMonitoringActive: false",
    "documentVerificationProviderActive: false",
  ]) {
    assert.match(model, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
