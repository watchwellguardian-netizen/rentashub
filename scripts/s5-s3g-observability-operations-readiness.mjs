import { createObservabilityOperationsEvidence } from "../server/src/monitoring/observabilityOperationsReadiness.js";

const command = process.argv[2] || "report";
const evidence = createObservabilityOperationsEvidence(process.env);

if (command === "json" || process.argv.includes("--json")) {
  console.log(JSON.stringify(evidence, null, 2));
} else {
  console.log(`[s5-s3g] status: ${evidence.status}`);
  console.log(`[s5-s3g] operations: ${evidence.operationsStatus}`);
  console.log(`[s5-s3g] health/readiness: ${evidence.healthStatus}`);
  console.log(`[s5-s3g] alerting: ${evidence.alertingStatus}`);
  console.log(`[s5-s3g] telemetry: ${evidence.telemetryStatus}`);
  console.log(`[s5-s3g] production touched: ${evidence.productionTouched ? "YES" : "NO"}`);
}
