import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RUNTIME_WORKFLOWS = [
  {
    sprint: "S5-S3B",
    gate: "PG-006",
    subsystem: "postgres-rls",
    workflow: "postgres-runtime-validation.yml",
    evidenceFile: "artifacts/runtime-evidence/postgres-pg006.json",
    expectedStatus: "PASS_POSTGRES_EXECUTION",
    ownerAction: "Run PostgreSQL Runtime Validation after GitHub remote is configured.",
  },
  {
    sprint: "S5-S3C",
    gate: "runtime-redis-bullmq",
    subsystem: "redis-bullmq",
    workflow: "redis-bullmq-runtime-validation.yml",
    evidenceFile: "artifacts/runtime-evidence/redis-bullmq-s5-s3c.json",
    expectedStatus: "REDIS_ENGINEERING_COMPLETE",
    ownerAction: "Run Redis BullMQ Runtime Validation.",
  },
  {
    sprint: "S5-S3D",
    gate: "runtime-object-storage-export",
    subsystem: "object-storage-export",
    workflow: "object-storage-export-runtime-validation.yml",
    evidenceFile: "artifacts/runtime-evidence/object-storage-export-s5-s3d.json",
    expectedStatus: "OBJECT_STORAGE_ENGINEERING_COMPLETE",
    ownerAction: "Run Object Storage Export Runtime Validation.",
  },
  {
    sprint: "S5-S3E",
    gate: "runtime-browser-accessibility",
    subsystem: "browser-accessibility",
    workflow: "browser-accessibility-runtime-validation.yml",
    evidenceFile: "artifacts/runtime-evidence/browser-accessibility-s5-s3e.json",
    expectedStatus: "BROWSER_TEST_ENGINEERING_COMPLETE",
    ownerAction: "Run Browser Accessibility Runtime Validation.",
  },
  {
    sprint: "S5-S3F",
    gate: "runtime-auth-authorization",
    subsystem: "auth-authorization",
    workflow: "auth-authorization-runtime-validation.yml",
    evidenceFile: "artifacts/runtime-evidence/auth-authorization-s5-s3f.json",
    expectedStatus: "AUTH_ENGINEERING_COMPLETE",
    ownerAction: "Run Auth Authorization Runtime Validation.",
  },
  {
    sprint: "S5-S3G",
    gate: "runtime-observability-operations",
    subsystem: "observability-operations",
    workflow: "observability-operations-runtime-validation.yml",
    evidenceFile: "artifacts/runtime-evidence/observability-operations-s5-s3g.json",
    expectedStatus: "OBSERVABILITY_ENGINEERING_COMPLETE",
    ownerAction: "Run Observability Operations Runtime Validation.",
  },
];

const REQUIRED_WORKFLOW_SNIPPETS = [
  "workflow_dispatch",
  "permissions:",
  "contents: read",
  "timeout-minutes:",
  "concurrency:",
  "artifacts/runtime-evidence",
  "actions/upload-artifact@v4",
  "retention-days: 14",
];

export function buildRuntimeExecutionMatrix(root = process.cwd()) {
  return RUNTIME_WORKFLOWS.map((entry, index) => {
    const path = `.github/workflows/${entry.workflow}`;
    const absolutePath = `${root}/${path}`;
    const exists = existsSync(absolutePath);
    const source = exists ? readFileSync(absolutePath, "utf8") : "";
    const missing = REQUIRED_WORKFLOW_SNIPPETS.filter((snippet) => !source.includes(snippet));
    const productionGuard = hasProductionGuard(source);
    const evidenceCommand = source.includes(entry.evidenceFile);
    return {
      ...entry,
      order: index + 1,
      path,
      exists,
      evidenceCommand,
      productionGuard,
      timeoutConfigured: source.includes("timeout-minutes:"),
      concurrencyConfigured: source.includes("concurrency:"),
      retryPolicy: "manual_rerun_after_log_review",
      failFastPolicy: "step_failure_stops_job",
      artifact: {
        name: runtimeArtifactName(entry),
        path: entry.evidenceFile,
        retentionDays: 14,
      },
      missing,
      readyForOwnerExecution: exists && evidenceCommand && productionGuard && missing.length === 0,
      ghCommand: `gh workflow run ${entry.workflow} --ref future-release-backlog`,
    };
  });
}

function hasProductionGuard(source = "") {
  return /Refusing .*production|Refusing hosted Supabase|Refusing live .*mode|Refusing non-local/i.test(source);
}

function runtimeArtifactName(entry) {
  return `${entry.subsystem}-runtime-evidence`;
}

export function createRuntimeEvidenceOrchestrationReport(root = process.cwd()) {
  const matrix = buildRuntimeExecutionMatrix(root);
  const blocked = matrix.filter((entry) => !entry.readyForOwnerExecution);
  return {
    sprint: "S5-S3H",
    status: blocked.length ? "CI_RUNTIME_EXECUTION_FRAMEWORK_INCOMPLETE" : "CI_RUNTIME_EXECUTION_FRAMEWORK_COMPLETE",
    evidenceStatus: blocked.length ? "EVIDENCE_ORCHESTRATION_INCOMPLETE" : "EVIDENCE_ORCHESTRATION_COMPLETE",
    ownerActionRegister: "OWNER_ACTION_REGISTER_FINALIZED",
    runtimeExecution: "LIVE_RUNTIME_EXECUTION_PENDING",
    workflowCount: matrix.length,
    readyWorkflowCount: matrix.filter((entry) => entry.readyForOwnerExecution).length,
    executionOrder: matrix.map((entry) => ({
      order: entry.order,
      workflow: entry.workflow,
      subsystem: entry.subsystem,
      command: entry.ghCommand,
      evidenceFile: entry.evidenceFile,
    })),
    matrix,
    ownerActions: [
      "Configure private GitHub repository remote as origin.",
      "Push future-release-backlog.",
      "Run workflows in executionOrder.",
      "Download artifacts from artifacts/runtime-evidence.",
      "Review PASS/FAIL/BLOCKED statuses before any promotion claim.",
    ],
    productionTargetsBlocked: matrix.every((entry) => entry.productionGuard),
    productionTouched: false,
    liveProvidersTouched: false,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const command = process.argv[2] || "report";
  const report = createRuntimeEvidenceOrchestrationReport();

  if (command === "json" || process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else if (command === "commands") {
    for (const item of report.executionOrder) console.log(item.command);
  } else {
    console.log(`[s5-s3h] status: ${report.status}`);
    console.log(`[s5-s3h] evidence: ${report.evidenceStatus}`);
    console.log(`[s5-s3h] workflows ready: ${report.readyWorkflowCount}/${report.workflowCount}`);
    console.log(`[s5-s3h] runtime execution: ${report.runtimeExecution}`);
    console.log(`[s5-s3h] production touched: NO`);
  }
}
