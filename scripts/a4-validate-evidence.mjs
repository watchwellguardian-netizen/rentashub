import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateA4EvidenceIntake } from "./a4-governance-evidence-toolkit.mjs";

function parseArgs(argv) {
  return { input: argv[2] || null, json: argv.includes("--json") };
}

function render(result) {
  return [
    "# A4-01 Evidence Intake Validation",
    "",
    `Status: ${result.status}`,
    "",
    "## Blockers",
    "",
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    `Next authorized gate: ${result.nextAuthorizedGate}`,
    "",
    result.note,
  ].join("\n");
}

const args = parseArgs(process.argv);
const content = args.input ? readFileSync(resolve(args.input), "utf8") : "";
const result = validateA4EvidenceIntake({ content, source: args.input || "stdin" });
console.log(args.json ? JSON.stringify(result, null, 2) : render(result));
process.exit(result.status === "PASS" ? 0 : 1);
