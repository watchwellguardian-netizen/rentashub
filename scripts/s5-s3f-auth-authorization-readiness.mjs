import { createOidcReadinessEvidence, getOidcAuthHealth, getOidcCredentialReadiness } from "../server/src/auth/oidcReadiness.js";

const command = process.argv[2] || "report";

if (command === "health") {
  console.log(JSON.stringify(getOidcAuthHealth(process.env), null, 2));
} else if (command === "credentials") {
  console.log(JSON.stringify(getOidcCredentialReadiness(process.env), null, 2));
} else {
  const evidence = createOidcReadinessEvidence();
  if (command === "json" || process.argv.includes("--json")) {
    console.log(JSON.stringify(evidence, null, 2));
  } else {
    console.log(`[s5-s3f] status: ${evidence.status}`);
    console.log(`[s5-s3f] authorization: ${evidence.authorizationStatus}`);
    console.log(`[s5-s3f] credentials: ${evidence.credentialStatus}`);
    console.log(`[s5-s3f] live IdP: ${evidence.liveIdentityProvider}`);
    console.log(`[s5-s3f] production touched: NO`);
  }
}
