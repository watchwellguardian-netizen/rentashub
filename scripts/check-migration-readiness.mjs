import { checkMigrationReadiness } from "./a4-governance-evidence-toolkit.mjs";

const json = process.argv.includes("--json");
const result = checkMigrationReadiness();
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[migration-readiness] ${result.status}: ${result.required.length} A4 migrations checked.`);
  console.log(`[migration-readiness] live database touched: ${result.liveDatabaseTouched ? "YES" : "NO"}`);
  console.log(`[migration-readiness] DATABASE_URL required: ${result.databaseUrlRequired ? "YES" : "NO"}`);
  for (const blocker of result.blockers) console.log(`[migration-readiness] ${blocker}`);
}
process.exit(result.status === "PASS" ? 0 : 1);
