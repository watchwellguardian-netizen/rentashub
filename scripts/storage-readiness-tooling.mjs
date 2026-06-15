import { createUploadIntent } from "../server/src/files/fileStorageAdapter.js";
import { validateFileMetadata } from "../server/src/files/fileValidator.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  SUPABASE_SIGNED_URL_STRATEGY,
  SUPABASE_STORAGE_BUCKETS,
  getBucketForEntityType,
  getSupabaseStorageActivationPlan,
  isPublicVisibilityAllowed,
} from "../server/src/files/supabaseStorageActivation.js";

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/];
const PRIVATE_ENTITY_TYPES = new Set(["verification", "inspection", "claim", "dispute", "message"]);

export const REQUIRED_SUPABASE_STORAGE_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  ...Object.values(SUPABASE_STORAGE_BUCKETS).map((bucket) => bucket.envKey),
];

export const FILE_CLASSIFICATION_MATRIX = [
  {
    classification: "public_asset_photo",
    relatedEntityType: "asset",
    bucketKey: "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
    expectedBucket: "public-assets",
    visibility: "public",
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    signedUrlRequired: false,
    publicAllowed: true,
  },
  {
    classification: "supplier_logo",
    relatedEntityType: "supplier_profile",
    bucketKey: "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
    expectedBucket: "supplier-logos",
    visibility: "public_or_signed",
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    signedUrlRequired: false,
    publicAllowed: true,
  },
  {
    classification: "verification_document",
    relatedEntityType: "verification",
    bucketKey: "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
    expectedBucket: "private-verification",
    visibility: "private",
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    signedUrlRequired: true,
    publicAllowed: false,
  },
  {
    classification: "inspection_evidence",
    relatedEntityType: "inspection",
    bucketKey: "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
    expectedBucket: "private-inspections",
    visibility: "restricted",
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    signedUrlRequired: true,
    publicAllowed: false,
  },
  {
    classification: "claim_evidence",
    relatedEntityType: "claim",
    bucketKey: "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
    expectedBucket: "private-claims",
    visibility: "restricted",
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    signedUrlRequired: true,
    publicAllowed: false,
  },
  {
    classification: "dispute_evidence",
    relatedEntityType: "dispute",
    bucketKey: "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
    expectedBucket: "private-disputes",
    visibility: "restricted",
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"],
    signedUrlRequired: true,
    publicAllowed: false,
  },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

export function validateBucketName(name = "") {
  const value = String(name || "").trim();
  const blockers = [];
  if (!value) blockers.push("Bucket name is required.");
  if (!BUCKET_NAME_PATTERN.test(value)) blockers.push("Bucket name must be lowercase letters, numbers, and hyphens, 3-63 characters, and start/end with alphanumeric characters.");
  if (/--/.test(value)) blockers.push("Bucket name should not contain consecutive hyphens.");
  if (/placeholder|example|your-|change/i.test(value)) blockers.push("Bucket name contains placeholder text.");
  return {
    status: blockers.length ? "FAIL" : "PASS",
    present: Boolean(value),
    valuePrinted: false,
    blockers,
  };
}

export function validateBucketNames(env = process.env) {
  const checks = Object.entries(SUPABASE_STORAGE_BUCKETS).map(([id, bucket]) => {
    const configuredName = env[bucket.envKey] || "";
    const validation = validateBucketName(configuredName);
    return {
      id,
      envKey: bucket.envKey,
      expectedName: bucket.defaultName,
      configured: hasRealValue(configuredName),
      validName: validation.status === "PASS",
      visibility: bucket.visibility,
      relatedEntityTypes: bucket.relatedEntityTypes,
      blockers: validation.blockers.map((blocker) => `${bucket.envKey}: ${blocker}`),
    };
  });
  const blockers = checks.flatMap((check) => check.blockers);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    valuePrinted: false,
    checks,
    blockers,
  };
}

export function buildBucketPolicyChecklist(env = process.env) {
  const rows = FILE_CLASSIFICATION_MATRIX.map((item) => {
    const configuredBucket = getBucketForEntityType(item.relatedEntityType, env);
    const policy = {
      classification: item.classification,
      relatedEntityType: item.relatedEntityType,
      bucketEnvKey: item.bucketKey,
      expectedBucket: item.expectedBucket,
      configured: hasRealValue(env[item.bucketKey]),
      configuredBucketPresent: Boolean(configuredBucket.bucketName),
      requiredVisibility: item.visibility,
      publicAllowed: item.publicAllowed,
      signedUrlRequired: item.signedUrlRequired,
      anonymousReadAllowed: item.publicAllowed,
      privatePolicyRequired: !item.publicAllowed,
      publicRuleMatchesEntity: isPublicVisibilityAllowed(item.relatedEntityType) === item.publicAllowed,
    };
    const blockers = [];
    if (!policy.publicAllowed && policy.anonymousReadAllowed) blockers.push(`${item.classification} must not allow anonymous reads.`);
    if (!policy.publicAllowed && policy.publicRuleMatchesEntity !== true) blockers.push(`${item.classification} public/private rule mismatch.`);
    return { ...policy, blockers };
  });
  const blockers = rows.flatMap((row) => row.blockers);
  return {
    status: blockers.length ? "FAIL" : "PASS",
    rows,
    blockers,
  };
}

export function validateSignedUrlReadiness(env = process.env) {
  const plan = getSupabaseStorageActivationPlan({ ...env, FILE_STORAGE_PROVIDER: env.FILE_STORAGE_PROVIDER || "supabase" });
  const ttlSeconds = Number(env.FILE_STORAGE_SIGNED_URL_TTL_SECONDS || SUPABASE_SIGNED_URL_STRATEGY.upload.defaultTtlSeconds);
  const blockers = [];
  if (plan.missing.length) blockers.push(...plan.missing.map((key) => `${key} is required before signed URL readiness can be tested.`));
  if (!Number.isFinite(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) blockers.push("FILE_STORAGE_SIGNED_URL_TTL_SECONDS must be between 60 and 3600 seconds.");
  blockers.push("Supabase SDK signed upload/download generation has not been live-tested.");
  return {
    status: blockers.length ? "NOT_READY" : "READY",
    provider: "supabase",
    credentialsPresent: plan.missing.length === 0,
    ttlSeconds,
    signedUploadReady: false,
    signedDownloadReady: false,
    sdkValidationRequired: true,
    valuePrinted: false,
    blockers,
  };
}

export function runUploadIntentHarness(env = process.env) {
  const scenarios = [
    {
      name: "public asset photo",
      input: { relatedEntityType: "asset", relatedEntityId: "asset-demo", originalFileName: "front-view.jpg", mimeType: "image/jpeg", fileSize: 120000, visibility: "public", ownerUserId: "supplier-demo" },
      expectedBucket: env.FILE_STORAGE_BUCKET_PUBLIC_ASSETS || "public-assets",
      expectedAccepted: true,
    },
    {
      name: "supplier logo",
      input: { relatedEntityType: "supplier_profile", relatedEntityId: "supplier-demo", originalFileName: "logo.png", mimeType: "image/png", fileSize: 90000, visibility: "public", ownerUserId: "supplier-demo" },
      expectedBucket: env.FILE_STORAGE_BUCKET_SUPPLIER_LOGOS || "supplier-logos",
      expectedAccepted: true,
    },
    {
      name: "private verification document",
      input: { relatedEntityType: "verification", relatedEntityId: "verification-demo", originalFileName: "registration.pdf", mimeType: "application/pdf", fileSize: 220000, visibility: "private", ownerUserId: "supplier-demo" },
      expectedBucket: env.FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION || "private-verification",
      expectedAccepted: true,
    },
    {
      name: "public verification document blocked",
      input: { relatedEntityType: "verification", relatedEntityId: "verification-demo", originalFileName: "registration.pdf", mimeType: "application/pdf", fileSize: 220000, visibility: "public", ownerUserId: "supplier-demo" },
      expectedAccepted: false,
    },
  ];

  const results = scenarios.map((scenario) => {
    const validation = validateFileMetadata({ ...scenario.input, storageProvider: "supabase" });
    if (!validation.valid) {
      return {
        name: scenario.name,
        status: scenario.expectedAccepted ? "FAIL" : "PASS",
        accepted: false,
        expectedAccepted: scenario.expectedAccepted,
        blockers: validation.errors.map((error) => `${error.field}: ${error.message}`),
      };
    }
    try {
      const intent = createUploadIntent(scenario.input, { env: { ...env, FILE_STORAGE_PROVIDER: "supabase" }, storageProvider: "supabase", visibility: scenario.input.visibility });
      const bucketMatches = !scenario.expectedBucket || intent.bucket === scenario.expectedBucket;
      return {
        name: scenario.name,
        status: scenario.expectedAccepted && bucketMatches && intent.signedUploadUrl === null ? "PASS" : "FAIL",
        accepted: true,
        expectedAccepted: scenario.expectedAccepted,
        provider: intent.provider,
        bucketMatches,
        signedUploadUrlGenerated: Boolean(intent.signedUploadUrl),
        signedUploadUrlStatus: intent.signedUploadUrlStatus,
        blockers: bucketMatches ? [] : [`Expected bucket ${scenario.expectedBucket} but upload intent routed differently.`],
      };
    } catch (error) {
      return {
        name: scenario.name,
        status: scenario.expectedAccepted ? "FAIL" : "PASS",
        accepted: false,
        expectedAccepted: scenario.expectedAccepted,
        errorCode: error.code || "error",
        blockers: scenario.expectedAccepted ? [error.publicMessage || error.message] : [],
      };
    }
  });

  const blockers = results.filter((result) => result.status !== "PASS").flatMap((result) => result.blockers.map((blocker) => `${result.name}: ${blocker}`));
  return {
    status: blockers.length ? "FAIL" : "PASS",
    provider: "supabase",
    valuePrinted: false,
    results,
    blockers,
  };
}

export function renderFileClassificationMatrix() {
  const lines = [
    "# File Classification Matrix",
    "",
    "| Classification | Related Entity | Bucket | Visibility | Signed URL Required | Public Allowed |",
    "| --- | --- | --- | --- | --- | --- |",
    ...FILE_CLASSIFICATION_MATRIX.map((item) => `| ${item.classification} | ${item.relatedEntityType} | ${item.expectedBucket} | ${item.visibility} | ${item.signedUrlRequired ? "Yes" : "No"} | ${item.publicAllowed ? "Yes" : "No"} |`),
    "",
    "Private verification, inspection, claim, dispute, and message evidence must never be publicly downloadable.",
  ];
  return lines.join("\n");
}

export function renderStorageEvidencePackageTemplate() {
  return `# Supabase Storage Evidence Package Template

Do not include Supabase keys, service role tokens, database passwords, screenshots containing credentials, or raw private documents.

## Environment

- Environment: Development / UAT
- Supabase Project Name:
- Supabase Project ID:
- Storage Operator:
- Date:

## Bucket Evidence

| Bucket | Public/Private | Created | Policy Verified | Evidence Location |
| --- | --- | --- | --- | --- |
| public-assets | Public | Pending | Pending |  |
| supplier-logos | Public or signed | Pending | Pending |  |
| private-verification | Private | Pending | Pending |  |
| private-inspections | Private | Pending | Pending |  |
| private-claims | Private | Pending | Pending |  |
| private-disputes | Private | Pending | Pending |  |

## Upload Intent Evidence

- Public asset upload intent:
- Supplier logo upload intent:
- Verification document private intent:
- Inspection evidence private intent:
- Claim evidence private intent:
- Dispute evidence private intent:

## Signed URL Evidence

- Signed upload URL generated in Development:
- Signed download URL generated for private object:
- Expiry observed:
- Unauthorized access denied:
- SDK method used:

## Security Evidence

- Anonymous access denied for private buckets:
- KYC/verification files private:
- Inspection evidence private:
- Claim/dispute evidence private:
- Virus scan decision recorded:
- Audit event recorded:

## Decision

- Result: PASS / FAIL
- Blockers:
- Next action:
`;
}

export function buildStorageReadinessReport({ env = process.env } = {}) {
  const bucketNames = validateBucketNames(env);
  const bucketPolicy = buildBucketPolicyChecklist(env);
  const signedUrls = validateSignedUrlReadiness(env);
  const uploadIntentHarness = runUploadIntentHarness(env);
  const blockers = [
    ...bucketNames.blockers,
    ...bucketPolicy.blockers,
    ...signedUrls.blockers,
    ...uploadIntentHarness.blockers,
  ];
  return {
    status: blockers.length ? "NEEDS_CREDENTIALS_OR_REMEDIATION" : "CREDENTIAL_READY",
    provider: "supabase",
    bucketNames,
    bucketPolicy,
    signedUrls,
    uploadIntentHarness,
    classificationCount: FILE_CLASSIFICATION_MATRIX.length,
    valuePrinted: false,
    blockers,
  };
}

function renderReport(report) {
  console.log("# Storage Readiness Report");
  console.log(`Status: ${report.status}`);
  console.log("");
  console.log(`- Bucket-name validation: ${report.bucketNames.status}`);
  console.log(`- Public/private bucket policy checklist: ${report.bucketPolicy.status}`);
  console.log(`- Signed URL readiness: ${report.signedUrls.status}`);
  console.log(`- Upload-intent harness: ${report.uploadIntentHarness.status}`);
  console.log(`- File classifications: ${report.classificationCount}`);
  for (const blocker of report.blockers) console.log(`- Blocker: ${blocker}`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] || "")) {
  const command = process.argv[2] || "report";
  if (command === "json") console.log(JSON.stringify(buildStorageReadinessReport(), null, 2));
  else if (command === "classification-matrix") console.log(renderFileClassificationMatrix());
  else if (command === "evidence-template") console.log(renderStorageEvidencePackageTemplate());
  else renderReport(buildStorageReadinessReport());
}
