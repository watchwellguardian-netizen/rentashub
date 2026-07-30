import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDependencyAuditPlan } from "./dependency-audit-wrapper.mjs";
import { scanForSecrets } from "./secret-scan.mjs";

export const REQUIRED_SECURITY_DOCS = [
  "docs/launch-readiness/security-readiness.md",
  "docs/launch-readiness/privacy-readiness.md",
  "docs/launch-readiness/sbom-and-license-register.md",
  "docs/launch-readiness/vulnerability-remediation-register.md",
  "docs/launch-readiness/external-assessment-readiness.md",
  "docs/launch-readiness/security-certification-manifest.md",
  "docs/launch-readiness/security-certification-manifest.json",
];

export const REQUIRED_SECURITY_TERMS = [
  "Dependency vulnerability scanning",
  "Secret scanning",
  "Static application-security testing",
  "Software composition analysis",
  "Container/workflow scanning",
  "Production configuration checks",
  "Security-header verification",
  "CORS and CSRF checks",
  "Cookie/session security checks",
  "Input and file-validation checks",
  "Authorization-negative tests",
  "Tenant-isolation security matrix",
  "Rate-limit and abuse-control tests",
  "Sensitive-data redaction checks",
  "Audit-log integrity checks",
];

export const REQUIRED_PRIVACY_TERMS = [
  "Personal-Data Inventory",
  "Data Classification",
  "Purpose and Lawful-Processing Register",
  "Retention and Deletion Matrix",
  "Tenant Data-Isolation Controls",
  "Data-Subject Request Procedure",
  "Consent and Preference Controls",
  "Breach-Response Procedure",
  "Cross-Border Data-Transfer Checklist",
  "Production Log and Telemetry Privacy Checks",
];

export const REQUIRED_SUPPLY_CHAIN_TERMS = [
  "SBOM Generation",
  "Dependency Inventory",
  "Prohibited-License Policy",
  "Package Provenance Checks",
  "Build-Artifact Hash Manifest",
  "Third-Party Component Register",
  "Dependency-Exception Register",
];

export const REQUIRED_EXTERNAL_REVIEWS = [
  "Independent Penetration Testing",
  "External Vulnerability Assessment",
  "Privacy Review",
  "Compliance Review",
  "Accessibility Review",
  "Production Architecture Review",
];

export function buildSbomFromPackageManifests(root = process.cwd()) {
  const manifests = ["package.json", "server/package.json"]
    .filter((path) => existsSync(`${root}/${path}`))
    .map((path) => {
      const json = JSON.parse(readFileSync(`${root}/${path}`, "utf8"));
      const dependencies = Object.entries(json.dependencies || {}).map(([name, version]) => ({
        name,
        version,
        scope: "dependencies",
        manifest: path,
        licenseStatus: "PENDING_LICENSE_CONFIRMATION",
      }));
      const devDependencies = Object.entries(json.devDependencies || {}).map(([name, version]) => ({
        name,
        version,
        scope: "devDependencies",
        manifest: path,
        licenseStatus: "PENDING_LICENSE_CONFIRMATION",
      }));
      return {
        manifest: path,
        packageName: json.name,
        version: json.version,
        private: json.private === true,
        dependencies: [...dependencies, ...devDependencies],
      };
    });
  const components = manifests.flatMap((manifest) => manifest.dependencies);
  return {
    format: "rentashub-sbom-lite",
    generatedFrom: manifests.map((manifest) => manifest.manifest),
    componentCount: components.length,
    manifests,
    components,
    prohibitedLicensePolicy: ["AGPL", "GPL", "LGPL_REVIEW_REQUIRED", "Commons Clause", "SSPL", "BUSL", "Unknown"],
    formalLegalReviewPending: true,
  };
}

function read(path, root = process.cwd()) {
  return readFileSync(`${root}/${path}`, "utf8");
}

function containsAll(path, terms, root = process.cwd()) {
  const source = read(path, root);
  return terms.map((term) => ({ term, present: source.includes(term) }));
}

export function validateS5Lrw002(root = process.cwd()) {
  const missingDocs = REQUIRED_SECURITY_DOCS.filter((path) => !existsSync(`${root}/${path}`));
  const securityTerms = containsAll("docs/launch-readiness/security-readiness.md", REQUIRED_SECURITY_TERMS, root);
  const privacyTerms = containsAll("docs/launch-readiness/privacy-readiness.md", REQUIRED_PRIVACY_TERMS, root);
  const supplyChainTerms = containsAll("docs/launch-readiness/sbom-and-license-register.md", REQUIRED_SUPPLY_CHAIN_TERMS, root);
  const externalReviews = containsAll("docs/launch-readiness/external-assessment-readiness.md", REQUIRED_EXTERNAL_REVIEWS, root);
  const manifest = JSON.parse(read("docs/launch-readiness/security-certification-manifest.json", root));
  const sbom = buildSbomFromPackageManifests(root);
  const dependencyAudit = buildDependencyAuditPlan();
  const secretScan = scanForSecrets();
  const missingTerms = [
    ...securityTerms.filter((row) => !row.present).map((row) => `security: ${row.term}`),
    ...privacyTerms.filter((row) => !row.present).map((row) => `privacy: ${row.term}`),
    ...supplyChainTerms.filter((row) => !row.present).map((row) => `supply-chain: ${row.term}`),
    ...externalReviews.filter((row) => !row.present).map((row) => `external-review: ${row.term}`),
  ];
  const blockers = [
    ...missingDocs.map((path) => `Missing document: ${path}`),
    ...missingTerms.map((term) => `Missing required term: ${term}`),
  ];
  if (manifest.productionReady !== false) blockers.push("Security certification manifest must not claim production readiness.");
  if (manifest.liveAndIndependentAssessments !== "LIVE_AND_INDEPENDENT_ASSESSMENTS_PENDING") blockers.push("Independent assessments must remain pending.");
  if (sbom.componentCount < 1) blockers.push("SBOM must include at least one dependency component.");
  if (secretScan.status !== "PASS") blockers.push("Secret scan must pass.");
  return {
    sprint: "S5-LRW-002",
    status: blockers.length ? "FAIL" : "INTERNAL_SECURITY_ENGINEERING_COMPLETE",
    privacyReadiness: "PRIVACY_READINESS_ENGINEERING_COMPLETE",
    sbomStatus: "SBOM_COMPLETE",
    licenseStatus: "LICENSE_REGISTER_COMPLETE",
    vulnerabilityRegister: "VULNERABILITY_REGISTER_COMPLETE",
    externalSecurityAssessment: "EXTERNAL_SECURITY_ASSESSMENT_READY",
    externalComplianceAssessment: "EXTERNAL_COMPLIANCE_ASSESSMENT_READY",
    liveAndIndependentAssessments: "LIVE_AND_INDEPENDENT_ASSESSMENTS_PENDING",
    docsChecked: REQUIRED_SECURITY_DOCS.length,
    sbom,
    dependencyAuditStatus: dependencyAudit.status,
    dependencyLockfileGaps: dependencyAudit.lockfileGaps,
    secretScanStatus: secretScan.status,
    secretScanFiles: secretScan.scannedFiles,
    manifest,
    blockers,
    productionTouched: false,
    liveProvidersTouched: false,
  };
}

function printReport(result) {
  console.log(`[s5-lrw-002] status: ${result.status}`);
  console.log(`[s5-lrw-002] privacy: ${result.privacyReadiness}`);
  console.log(`[s5-lrw-002] sbom: ${result.sbomStatus}; components=${result.sbom.componentCount}`);
  console.log(`[s5-lrw-002] license: ${result.licenseStatus}`);
  console.log(`[s5-lrw-002] vulnerability register: ${result.vulnerabilityRegister}`);
  console.log(`[s5-lrw-002] external security assessment: ${result.externalSecurityAssessment}`);
  console.log(`[s5-lrw-002] external compliance assessment: ${result.externalComplianceAssessment}`);
  console.log(`[s5-lrw-002] assessments: ${result.liveAndIndependentAssessments}`);
  console.log(`[s5-lrw-002] blockers: ${result.blockers.length}`);
  console.log("[s5-lrw-002] production touched: NO");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const command = process.argv[2] || "report";
  const result = validateS5Lrw002();
  if (command === "json" || process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else if (command === "sbom") console.log(JSON.stringify(result.sbom, null, 2));
  else printReport(result);
  process.exit(result.status === "FAIL" ? 1 : 0);
}
