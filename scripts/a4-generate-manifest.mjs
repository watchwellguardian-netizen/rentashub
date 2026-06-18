import { generateA4EvidenceManifest } from "./a4-governance-evidence-toolkit.mjs";

function parseArgs(argv) {
  const args = { input: null, output: "docs/a4-evidence-manifest.md", json: argv.includes("--json") };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--input") args.input = argv[++index];
    else if (argv[index] === "--output") args.output = argv[++index];
  }
  return args;
}

const args = parseArgs(process.argv);
const result = generateA4EvidenceManifest({ packagePath: args.input, output: args.output });
console.log(args.json ? JSON.stringify(result, null, 2) : `WROTE ${result.output}`);
