import { checkRlsRbacSqlStaticReadiness, renderRlsRbacStaticReport } from "./a4-governance-evidence-toolkit.mjs";

const json = process.argv.includes("--json");
const result = checkRlsRbacSqlStaticReadiness();
console.log(json ? JSON.stringify(result, null, 2) : renderRlsRbacStaticReport(result));
process.exit(result.status === "PASS" ? 0 : 1);
