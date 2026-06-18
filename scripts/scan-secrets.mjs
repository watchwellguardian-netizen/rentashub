import { scanGovernanceSecrets } from "./a4-governance-evidence-toolkit.mjs";

const json = process.argv.includes("--json");
const result = scanGovernanceSecrets();
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[scan-secrets] ${result.status}: ${result.scannedFiles} files scanned.`);
  for (const finding of result.findings) {
    console.log(`[scan-secrets] ${finding.source}:${finding.line} ${finding.type} ${finding.severity}`);
  }
  console.log("[scan-secrets] Secret values are never printed.");
}
process.exit(result.status === "PASS" ? 0 : 1);
