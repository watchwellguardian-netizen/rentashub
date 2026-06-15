import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();

export const AUDIT_TARGETS = [
  {
    id: "root",
    label: "Frontend/root package",
    cwd: root,
    lockfile: "package-lock.json",
    command: ["npm", "audit", "--audit-level=high"],
    requiredForRelease: true,
  },
  {
    id: "server",
    label: "Server package",
    cwd: join(root, "server"),
    lockfile: "server/package-lock.json",
    command: ["npm", "audit", "--audit-level=high"],
    requiredForRelease: true,
  },
];

export function buildDependencyAuditPlan() {
  const targets = AUDIT_TARGETS.map((target) => ({
    id: target.id,
    label: target.label,
    lockfile: target.lockfile,
    lockfilePresent: existsSync(join(root, target.lockfile)),
    command: target.command.join(" "),
    requiredForRelease: target.requiredForRelease,
  }));

  const lockfileGaps = targets
    .filter((target) => !target.lockfilePresent)
    .map((target) => `Missing dependency lockfile for ${target.label}: ${target.lockfile}`);

  return {
    status: lockfileGaps.length ? "READY_WITH_LOCKFILE_GAPS" : "READY_TO_RUN",
    mode: "plan",
    auditLevel: "high",
    targets,
    blockers: [],
    lockfileGaps,
    notes: [
      "Plan mode does not contact the npm registry.",
      "Run mode executes npm audit and may require network access in CI.",
      "Production promotion requires high and critical findings to be remediated or formally accepted.",
    ],
  };
}

export function runDependencyAudit() {
  const plan = buildDependencyAuditPlan();
  if (plan.lockfileGaps.length) {
    return {
      ...plan,
      status: "FAIL",
      mode: "run",
      blockers: plan.lockfileGaps,
    };
  }

  const results = AUDIT_TARGETS.map((target) => {
    const [command, ...args] = target.command;
    const result = spawnSync(command, args, {
      cwd: target.cwd,
      encoding: "utf8",
      shell: true,
    });
    return {
      id: target.id,
      label: target.label,
      exitCode: result.status,
      passed: result.status === 0,
      stderr: result.stderr ? result.stderr.slice(0, 2000) : "",
      stdout: result.stdout ? result.stdout.slice(0, 4000) : "",
    };
  });

  const blockers = results
    .filter((result) => !result.passed)
    .map((result) => `${result.label} audit failed with exit code ${result.exitCode}.`);

  return {
    status: blockers.length ? "FAIL" : "PASS",
    mode: "run",
    auditLevel: "high",
    targets: plan.targets,
    results,
    blockers,
  };
}

function render(result) {
  console.log(`[dependency-audit] ${result.status} (${result.mode})`);
  for (const target of result.targets || []) {
    console.log(`[dependency-audit] ${target.id}: ${target.command} lockfile=${target.lockfilePresent ? "present" : "missing"}`);
  }
  for (const blocker of result.blockers || []) console.log(`[dependency-audit] blocker: ${blocker}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const mode = process.argv[2] || "plan";
  const json = process.argv.includes("--json");
  const result = mode === "run" ? runDependencyAudit() : buildDependencyAuditPlan();
  if (json) console.log(JSON.stringify(result, null, 2));
  else render(result);
  process.exit(result.status === "FAIL" ? 1 : 0);
}
