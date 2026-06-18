import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scoreA4GovernanceEvidence } from "./a4-governance-evidence-toolkit.mjs";

function parseArgs(argv) {
  return { input: argv[2] || null, json: argv.includes("--json") };
}

function render(score) {
  return [
    "# A4 Evidence Package Score",
    "",
    `Status: ${score.status}`,
    `Score: ${score.score}`,
    "",
    "## Gates",
    "",
    ...score.gates.map((gate) => `- ${gate.id} ${gate.title}: ${gate.status}`),
    "",
    "## Blockers",
    "",
    ...(score.blockers.length ? score.blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    `Next authorized gate: ${score.nextAuthorizedGate}`,
  ].join("\n");
}

const args = parseArgs(process.argv);
const content = args.input ? readFileSync(resolve(args.input), "utf8") : "";
const score = scoreA4GovernanceEvidence({ content });
console.log(args.json ? JSON.stringify(score, null, 2) : render(score));
