import { fileURLToPath } from "node:url";

const rcPattern = /^rc-\d+\.\d+[a-z]?$/i;

export function buildReleaseCandidateTagPlan({ tag, title = "", dryRun = true } = {}) {
  const normalizedTag = String(tag || "").trim().toLowerCase();
  const normalizedTitle = String(title || "").trim();
  const blockers = [];

  if (!normalizedTag) blockers.push("Release candidate tag is required.");
  if (normalizedTag && !rcPattern.test(normalizedTag)) blockers.push("Tag must match rc-0.6a style.");
  if (!normalizedTitle) blockers.push("Release candidate title is required.");

  return {
    status: blockers.length ? "FAIL" : "PASS",
    dryRun: Boolean(dryRun),
    tag: normalizedTag || null,
    title: normalizedTitle || null,
    command: blockers.length ? null : `git tag -a ${normalizedTag} -m "${normalizedTitle.replace(/"/g, '\\"')}"`,
    pushCommand: blockers.length ? null : `git push origin ${normalizedTag}`,
    blockers,
    notes: [
      "Create tags only after release evidence passes.",
      "Do not use production or public-launch tags until production certification is complete.",
      "This helper prints commands only and does not mutate Git state.",
    ],
  };
}

function parseArgs(argv) {
  const tag = argv[0];
  const titleIndex = argv.indexOf("--title");
  return {
    tag,
    title: titleIndex >= 0 ? argv[titleIndex + 1] : "",
    json: argv.includes("--json"),
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const options = parseArgs(process.argv.slice(2));
  const result = buildReleaseCandidateTagPlan(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[rc-tag-helper] ${result.status}`);
    if (result.command) {
      console.log(`tag: ${result.command}`);
      console.log(`push: ${result.pushCommand}`);
    }
    for (const blocker of result.blockers) console.log(`blocker: ${blocker}`);
  }
  process.exit(result.status === "PASS" ? 0 : 1);
}
