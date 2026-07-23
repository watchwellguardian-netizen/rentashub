import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "docs/program/accelerated-delivery-status.json";
const outputPath = "docs/program/RENTASHUB_ACCELERATED_DELIVERY_DASHBOARD.md";

function pct(complete, total) {
  if (!total) return 0;
  return Math.round((complete / total) * 100);
}

function render(data) {
  const rows = data.workstreams
    .map((item) => `| ${item.domain} | ${item.totalFeatures} | ${item.complete} | ${item.partial} | ${item.notStarted} | ${item.blocked} | ${pct(item.complete, item.totalFeatures)}% | ${item.owner} | ${item.currentGate} |`)
    .join("\n");

  return `# RentasHub Accelerated Delivery Dashboard

Generated from: \`${sourcePath}\`

## Programme Status

| Field | Value |
| --- | --- |
| Platform | ${data.platform} |
| Classification | ${data.classification} |
| State | ${data.state} |
| Current Gate | ${data.currentGate} |
| Next Authorized Gate | ${data.nextAuthorizedGate} |
| Production Ready | ${data.productionReady ? "Yes" : "No"} |
| Provider Activation | ${data.providerActivation ? "Yes" : "No"} |

## Workstream Summary

| Domain | Total Features | Complete | Partial | Not Started | Blocked | Completion % | Owner | Current Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${rows}

## Aggregate Metrics

| Metric | Value |
| --- | ---: |
| Total requirements | ${data.metrics.totalRequirements} |
| Completed requirements | ${data.metrics.completedRequirements} |
| Accepted tests | ${data.metrics.acceptedTests} |
| Failing tests | ${data.metrics.failingTests} |
| Open P0 defects | ${data.metrics.openP0Defects} |
| Open P1 defects | ${data.metrics.openP1Defects} |
| Closed-beta completion | ${data.metrics.closedBetaCompletion}% |
| Paid-pilot completion | ${data.metrics.paidPilotCompletion}% |
| Production completion | ${data.metrics.productionCompletion}% |

## Status Notes

- Database migration status: ${data.metrics.databaseMigrationStatus.replace(/_/g, " ")}.
- Provider activation status: ${data.metrics.providerActivationStatus.replace(/_/g, " ")}.
- Environment status: ${data.metrics.environmentStatus.replace(/_/g, " ")}.
`;
}

const data = JSON.parse(readFileSync(sourcePath, "utf8"));
writeFileSync(outputPath, render(data));
console.log(`[accelerated-dashboard] wrote ${outputPath}`);
