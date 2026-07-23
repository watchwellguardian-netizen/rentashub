import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FILE_CLASSIFICATION_MATRIX,
  REQUIRED_SUPABASE_STORAGE_KEYS,
  buildStorageAccessEvidencePackage,
  buildBucketPolicyChecklist,
  buildStorageClassificationAuditReport,
  buildStorageLaunchBlockerReport,
  buildStorageReadinessReport,
  detectPrivatePublicMismatches,
  renderBucketEvidenceChecklistPerBucket,
  renderSignedUrlEvidenceChecklist,
  renderPrivateFileAccessDenialEvidenceTemplate,
  renderPublicPrivateBucketPolicyEvidenceMatrix,
  renderStorageClassificationAuditReport,
  renderStorageLaunchBlockerReport,
  renderStorageAccessEvidencePackage,
  renderFileClassificationMatrix,
  renderStorageEvidencePackageTemplate,
  renderUploadDownloadEvidenceTemplate,
  runUploadIntentHarness,
  scanBucketNamingConformance,
  validateBucketName,
  validateBucketNames,
  validateBucketToFileClassMatrix,
  validateSignedUrlReadiness,
} from "../../scripts/storage-readiness-tooling.mjs";

const shapedEnv = {
  FILE_STORAGE_PROVIDER: "supabase",
  SUPABASE_URL: "https://rentashub.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-shaped-for-readiness",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-shaped-for-readiness",
  FILE_STORAGE_BUCKET_PUBLIC_ASSETS: "public-assets",
  FILE_STORAGE_BUCKET_SUPPLIER_LOGOS: "supplier-logos",
  FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION: "private-verification",
  FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS: "private-inspections",
  FILE_STORAGE_BUCKET_PRIVATE_CLAIMS: "private-claims",
  FILE_STORAGE_BUCKET_PRIVATE_DISPUTES: "private-disputes",
  FILE_STORAGE_SIGNED_URL_TTL_SECONDS: "900",
};

test("bucket-name validator accepts Supabase-compatible names and rejects placeholders", () => {
  assert.equal(validateBucketName("private-verification").status, "PASS");
  assert.equal(validateBucketName("Public_Assets").status, "FAIL");
  assert.equal(validateBucketName("placeholder-bucket").status, "FAIL");
});

test("bucket-name readiness checks every required Supabase storage bucket without printing values", () => {
  const result = validateBucketNames(shapedEnv);
  assert.equal(result.status, "PASS");
  assert.equal(result.valuePrinted, false);
  assert.equal(result.checks.length, 6);
  for (const key of REQUIRED_SUPABASE_STORAGE_KEYS.filter((item) => item.startsWith("FILE_STORAGE_BUCKET_"))) {
    assert.ok(result.checks.some((check) => check.envKey === key));
  }
});

test("public/private bucket policy checklist blocks public treatment for private evidence classes", () => {
  const result = buildBucketPolicyChecklist(shapedEnv);
  assert.equal(result.status, "PASS");
  for (const classification of ["verification_document", "inspection_evidence", "claim_evidence", "dispute_evidence"]) {
    const row = result.rows.find((item) => item.classification === classification);
    assert.equal(row.publicAllowed, false);
    assert.equal(row.privatePolicyRequired, true);
    assert.equal(row.signedUrlRequired, true);
  }
});

test("signed URL readiness remains blocked until SDK validation even with shaped credentials", () => {
  const missing = validateSignedUrlReadiness({});
  assert.equal(missing.status, "NOT_READY");
  assert.ok(missing.blockers.some((blocker) => /SUPABASE_URL/.test(blocker)));

  const shaped = validateSignedUrlReadiness(shapedEnv);
  assert.equal(shaped.status, "NOT_READY");
  assert.equal(shaped.credentialsPresent, true);
  assert.equal(shaped.signedUploadReady, false);
  assert.equal(shaped.signedDownloadReady, false);
  assert.ok(shaped.blockers.some((blocker) => /SDK signed upload\/download/.test(blocker)));
});

test("file classification matrix covers public assets logos and private evidence", () => {
  const names = FILE_CLASSIFICATION_MATRIX.map((item) => item.classification);
  assert.deepEqual(names, [
    "public_asset_photo",
    "supplier_logo",
    "verification_document",
    "inspection_evidence",
    "claim_evidence",
    "dispute_evidence",
  ]);
  const markdown = renderFileClassificationMatrix();
  assert.match(markdown, /private-verification/);
  assert.match(markdown, /must never be publicly downloadable/);
});

test("upload-intent test harness validates bucket routing and public verification block", () => {
  const result = runUploadIntentHarness(shapedEnv);
  assert.equal(result.status, "PASS");
  assert.equal(result.valuePrinted, false);
  assert.ok(result.results.some((item) => item.name === "public verification document blocked" && item.accepted === false));
  assert.ok(result.results.some((item) => item.name === "public asset photo" && item.provider === "supabase" && item.signedUploadUrlGenerated === false));
});

test("storage evidence package template requests operational evidence without credential values", () => {
  const template = renderStorageEvidencePackageTemplate();
  assert.match(template, /Supabase Storage Evidence Package Template/);
  assert.match(template, /private-disputes/);
  assert.match(template, /Unauthorized access denied/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_URL"]) {
    assert.doesNotMatch(template, new RegExp(`${label}\\s*=`));
  }
});

test("storage readiness report remains credential-safe and reports manual SDK blocker", () => {
  const report = buildStorageReadinessReport({ env: shapedEnv });
  assert.equal(report.status, "NEEDS_CREDENTIALS_OR_REMEDIATION");
  assert.equal(report.valuePrinted, false);
  assert.equal(report.bucketNames.status, "PASS");
  assert.equal(report.bucketNamingConformance.status, "PASS");
  assert.equal(report.bucketToFileClassMatrix.status, "PASS");
  assert.equal(report.bucketPolicy.status, "PASS");
  assert.equal(report.privatePublicMismatches.status, "PASS");
  assert.equal(report.uploadIntentHarness.status, "PASS");
  assert.ok(report.blockers.some((blocker) => /SDK signed upload\/download/.test(blocker)));
});

test("bucket naming conformance scanner detects valid but unapproved bucket names", () => {
  const result = scanBucketNamingConformance({
    ...shapedEnv,
    FILE_STORAGE_BUCKET_PUBLIC_ASSETS: "public-assets-custom",
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.valuePrinted, false);
  assert.ok(result.checks.some((check) => check.envKey === "FILE_STORAGE_BUCKET_PUBLIC_ASSETS" && check.validName && !check.conformsToExpectedName));
});

test("bucket-to-file-class matrix validator confirms expected routing and catches mismatches", () => {
  const result = validateBucketToFileClassMatrix(shapedEnv);
  assert.equal(result.status, "PASS");
  assert.ok(result.rows.every((row) => row.entityRoutesToExpectedBucket));

  const mismatch = validateBucketToFileClassMatrix({
    ...shapedEnv,
    FILE_STORAGE_BUCKET_PRIVATE_CLAIMS: "claims-public",
  });
  assert.equal(mismatch.status, "FAIL");
  assert.ok(mismatch.blockers.some((blocker) => /claim_evidence/.test(blocker)));
});

test("private/public mismatch detector blocks private evidence routed to public-like buckets", () => {
  const result = detectPrivatePublicMismatches(shapedEnv);
  assert.equal(result.status, "PASS");

  const mismatch = detectPrivatePublicMismatches({
    ...shapedEnv,
    FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION: "public-verification",
  });
  assert.equal(mismatch.status, "FAIL");
  assert.ok(mismatch.rows.some((row) => row.classification === "verification_document" && row.privateClass && row.mismatchDetected));
});

test("signed URL evidence checklist is generated without credential values", () => {
  const checklist = renderSignedUrlEvidenceChecklist();
  assert.match(checklist, /Signed URL Evidence Checklist/);
  assert.match(checklist, /Expired signed URL denied/);
  assert.match(checklist, /Frontend never receives service role credentials/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_URL"]) {
    assert.doesNotMatch(checklist, new RegExp(`${label}\\s*=`));
  }
});

test("storage access evidence package generator combines storage automation checks", () => {
  const report = buildStorageAccessEvidencePackage({ env: shapedEnv });
  assert.equal(report.status, "NEEDS_CREDENTIALS_OR_REMEDIATION");
  assert.equal(report.liveStorageTouched, false);
  assert.equal(report.valuePrinted, false);
  assert.ok(report.checks.some((check) => check.name === "bucket_naming_conformance" && check.status === "PASS"));
  assert.ok(report.checks.some((check) => check.name === "private_public_mismatch_detector" && check.status === "PASS"));
  assert.ok(report.blockers.some((blocker) => /signed_url_readiness/.test(blocker)));

  const rendered = renderStorageAccessEvidencePackage(report);
  assert.match(rendered, /Storage Access Evidence Package/);
  assert.match(rendered, /Live Storage Touched: NO/);
});

test("bucket evidence checklist per bucket covers every approved bucket without secrets", () => {
  const markdown = renderBucketEvidenceChecklistPerBucket();
  for (const bucket of ["public-assets", "supplier-logos", "private-verification", "private-inspections", "private-claims", "private-disputes"]) {
    assert.match(markdown, new RegExp(bucket));
  }
  assert.match(markdown, /Bucket Evidence Checklist Per Bucket/);
  assert.match(markdown, /Evidence redacted/);
  for (const label of ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_URL"]) {
    assert.doesNotMatch(markdown, new RegExp(`${label}\\s*=`));
  }
});

test("public private bucket policy evidence matrix separates public and private evidence", () => {
  const markdown = renderPublicPrivateBucketPolicyEvidenceMatrix();
  assert.match(markdown, /Public\/Private Bucket Policy Evidence Matrix/);
  assert.match(markdown, /public-assets \| public \| Yes/);
  assert.match(markdown, /private-verification \| private \| No/);
  assert.match(markdown, /Anonymous access denial evidence/);
});

test("upload download evidence template and private denial template are evidence-only", () => {
  const uploadDownload = renderUploadDownloadEvidenceTemplate();
  const privateDenial = renderPrivateFileAccessDenialEvidenceTemplate();
  assert.match(uploadDownload, /Upload\/Download Evidence Template/);
  assert.match(uploadDownload, /Private dispute download/);
  assert.match(privateDenial, /Private File Access Denial Evidence Template/);
  assert.match(privateDenial, /Expired signed URL reuse/);
  for (const output of [uploadDownload, privateDenial]) {
    assert.doesNotMatch(output, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
    assert.doesNotMatch(output, /postgresql:\/\//);
  }
});

test("storage classification audit report covers classifications access roles and audit events", () => {
  const report = buildStorageClassificationAuditReport({ env: shapedEnv });
  assert.equal(report.status, "PASS");
  assert.equal(report.liveStorageTouched, false);
  assert.equal(report.valuePrinted, false);
  assert.equal(report.rows.length, FILE_CLASSIFICATION_MATRIX.length);
  assert.ok(report.rows.every((row) => row.auditEventsRequired.includes("storage.access.denied")));

  const rendered = renderStorageClassificationAuditReport(report);
  assert.match(rendered, /Storage Classification Audit Report/);
  assert.match(rendered, /Required Access Roles/);
  assert.match(rendered, /storage.access.denied/);
});

test("storage launch blocker report remains blocked until real storage evidence exists", () => {
  const report = buildStorageLaunchBlockerReport({ env: shapedEnv });
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.liveStorageTouched, false);
  assert.equal(report.valuePrinted, false);
  assert.ok(report.blockers.some((blocker) => /Manual evidence required: Required buckets created/.test(blocker)));
  assert.ok(report.blockers.some((blocker) => /signed_url_readiness/.test(blocker) || /SDK signed upload\/download/.test(blocker)));

  const rendered = renderStorageLaunchBlockerReport(report);
  assert.match(rendered, /Storage Launch Blocker Report/);
  assert.match(rendered, /A4-01 Infrastructure Ownership Confirmation Submitted/);
});
