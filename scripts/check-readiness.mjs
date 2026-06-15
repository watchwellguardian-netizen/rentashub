import { getIntegrationReadiness } from "../server/src/config/integrationReadiness.js";

function printCheck(name, check) {
  const marker = check.ready ? "READY" : "NEEDS CREDENTIALS";
  console.log(`[readiness] ${name}: ${marker} (${check.provider})`);
  if (check.missing.length) console.log(`[readiness]   missing: ${check.missing.join(", ")}`);
}

const readiness = getIntegrationReadiness(process.env);
console.log("[readiness] RentasHub credential-level readiness");
console.log(`[readiness] stage: ${readiness.stage}`);
console.log(`[readiness] note: ${readiness.note}`);

for (const [name, check] of Object.entries(readiness.checks)) {
  printCheck(name, check);
}

console.log("[readiness] workstreams:");
for (const [name, value] of Object.entries(readiness.workstreams)) {
  console.log(`[readiness]   ${name}: ${value.status} - ${value.note}`);
}

if (process.env.RENTASHUB_REQUIRE_CREDENTIALS === "1" && !readiness.ok) {
  console.error("[readiness] FAIL: real credential validation was required, but one or more provider credentials are missing.");
  process.exit(1);
}

if (!readiness.ok) {
  console.log("[readiness] PASS: credential-level report generated. Missing real-provider credentials are expected until manual external setup is approved.");
} else {
  console.log("[readiness] PASS: all configured credential variables are present. Provider connectivity still requires separate verification.");
}
