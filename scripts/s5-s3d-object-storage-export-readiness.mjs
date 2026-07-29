import { createObjectStorageReadinessEvidence, validateObjectStorageConfig } from "../server/src/files/objectStorageRuntimeReadiness.js";

const command = process.argv[2] || "report";

if (command === "validate-storage") {
  console.log(JSON.stringify(validateObjectStorageConfig({
    provider: process.env.OBJECT_STORAGE_PROVIDER || "s3",
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT || "",
    bucket: process.env.OBJECT_STORAGE_BUCKET || "",
    confirmDisposable: process.env.OBJECT_STORAGE_CONFIRM_DISPOSABLE === "true",
  }), null, 2));
} else {
  const evidence = createObjectStorageReadinessEvidence();
  if (command === "json" || process.argv.includes("--json")) {
    console.log(JSON.stringify(evidence, null, 2));
  } else {
    console.log(`[s5-s3d] status: ${evidence.status}`);
    console.log(`[s5-s3d] exports: ${evidence.exportStatus}`);
    console.log(`[s5-s3d] runtime: ${evidence.runtimeStatus}`);
    console.log(`[s5-s3d] ci: ${evidence.ciStatus}`);
    console.log(`[s5-s3d] production touched: NO`);
    console.log(`[s5-s3d] live storage touched: NO`);
  }
}
