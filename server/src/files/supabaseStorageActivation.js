const PLACEHOLDER_PATTERNS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/];

export const SUPABASE_STORAGE_BUCKETS = {
  publicAssets: {
    envKey: "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
    defaultName: "public-assets",
    visibility: "public",
    relatedEntityTypes: ["asset"],
    purpose: "Public listing and auction asset photos after validation and moderation.",
  },
  supplierLogos: {
    envKey: "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
    defaultName: "supplier-logos",
    visibility: "public_or_signed",
    relatedEntityTypes: ["supplier_profile"],
    purpose: "Supplier profile logos and approved public profile media.",
  },
  privateVerification: {
    envKey: "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
    defaultName: "private-verification",
    visibility: "private",
    relatedEntityTypes: ["verification"],
    purpose: "KYC, business registration, proof of ownership, insurance, and sensitive verification documents.",
  },
  privateInspections: {
    envKey: "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
    defaultName: "private-inspections",
    visibility: "private_restricted",
    relatedEntityTypes: ["inspection"],
    purpose: "Inspection reports, condition photos, serial/VIN/chassis photos, and check-in/check-out evidence.",
  },
  privateClaims: {
    envKey: "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
    defaultName: "private-claims",
    visibility: "private_restricted",
    relatedEntityTypes: ["claim", "review"],
    purpose: "Claim evidence, repair estimates, claim decision attachments, and restricted review evidence.",
  },
  privateDisputes: {
    envKey: "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
    defaultName: "private-disputes",
    visibility: "private_restricted",
    relatedEntityTypes: ["dispute", "message"],
    purpose: "Dispute evidence, mediation notes, legal-sensitive documents, and restricted message attachments.",
  },
};

export const SUPABASE_SIGNED_URL_STRATEGY = {
  upload: {
    status: "provider_sdk_required",
    method: "createSignedUploadUrl",
    ttlEnvKey: "FILE_STORAGE_SIGNED_URL_TTL_SECONDS",
    defaultTtlSeconds: 900,
    note: "Generated only after Supabase SDK integration and real project credentials are tested.",
  },
  download: {
    status: "provider_sdk_required",
    method: "createSignedUrl",
    ttlEnvKey: "FILE_STORAGE_SIGNED_URL_TTL_SECONDS",
    defaultTtlSeconds: 900,
    note: "Private files must use short-lived signed download URLs after backend authorization.",
  },
};

export const SUPABASE_STORAGE_AUDIT_EVENTS = [
  "storage.upload_intent.created",
  "storage.signed_upload_url.requested",
  "storage.metadata.created",
  "storage.object_uploaded.confirmed",
  "storage.signed_download_url.requested",
  "storage.visibility.changed",
  "storage.object.soft_deleted",
  "storage.access.denied",
];

export const SUPABASE_STORAGE_ACCESS_RULES = [
  { role: "owner", access: "read_own_private_metadata_and_authorized_signed_urls" },
  { role: "supplier", access: "read_own_supplier_profile_assets_inspections_messages" },
  { role: "customer", access: "read_own_booking_inspection_claim_dispute_message_files" },
  { role: "inspector", access: "read_assigned_inspection_files_after_assignment" },
  { role: "admin", access: "read_metadata_and_authorize_review_without_public_file_exposure" },
];

function hasRealValue(value) {
  const raw = String(value || "").trim();
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(raw));
}

export function getBucketForEntityType(entityType, env = process.env) {
  const entry = Object.values(SUPABASE_STORAGE_BUCKETS).find((bucket) => bucket.relatedEntityTypes.includes(entityType));
  const bucket = entry || SUPABASE_STORAGE_BUCKETS.privateClaims;
  return {
    envKey: bucket.envKey,
    bucketName: env[bucket.envKey] || bucket.defaultName,
    visibility: bucket.visibility,
    purpose: bucket.purpose,
  };
}

export function isPublicVisibilityAllowed(entityType) {
  const bucket = getBucketForEntityType(entityType, {});
  return bucket.visibility === "public" || bucket.visibility === "public_or_signed";
}

export function getSupabaseStorageActivationPlan(env = process.env) {
  const selectedProvider = String(env.FILE_STORAGE_PROVIDER || "local_placeholder").toLowerCase();
  const required = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    ...Object.values(SUPABASE_STORAGE_BUCKETS).map((bucket) => bucket.envKey),
  ];
  const missing = required.filter((key) => !hasRealValue(env[key]));
  const configuredBuckets = Object.fromEntries(Object.entries(SUPABASE_STORAGE_BUCKETS).map(([key, bucket]) => [
    key,
    {
      envKey: bucket.envKey,
      bucketName: env[bucket.envKey] || "",
      requiredName: bucket.defaultName,
      visibility: bucket.visibility,
      configured: hasRealValue(env[bucket.envKey]),
      purpose: bucket.purpose,
      relatedEntityTypes: bucket.relatedEntityTypes,
    },
  ]));
  const ttlSeconds = Number(env.FILE_STORAGE_SIGNED_URL_TTL_SECONDS || SUPABASE_SIGNED_URL_STRATEGY.upload.defaultTtlSeconds);
  return {
    provider: "supabase",
    selected: selectedProvider === "supabase",
    status: missing.length ? "credential_ready_missing_inputs" : "credentials_shaped_sdk_validation_required",
    credentialsReady: missing.length === 0,
    missing,
    buckets: configuredBuckets,
    uploadPolicy: {
      listingPhotos: getBucketForEntityType("asset", env),
      supplierLogos: getBucketForEntityType("supplier_profile", env),
      verificationDocuments: getBucketForEntityType("verification", env),
      inspectionReports: getBucketForEntityType("inspection", env),
      auctionDocuments: getBucketForEntityType("asset", env),
      claimEvidence: getBucketForEntityType("claim", env),
      disputeEvidence: getBucketForEntityType("dispute", env),
      userUploads: "Route by related entity type; private evidence is never public.",
    },
    signedUrlStrategy: {
      ...SUPABASE_SIGNED_URL_STRATEGY,
      ttlSeconds,
      signedUploadReady: false,
      signedDownloadReady: false,
    },
    auditEvents: SUPABASE_STORAGE_AUDIT_EVENTS,
    accessRules: SUPABASE_STORAGE_ACCESS_RULES,
    rlsAlignment: {
      metadataTable: "file_metadata",
      storageAuditTable: "storage_objects_audit",
      storageObjectsPolicy: "Supabase storage.objects policies must match file_metadata owner, tenant, role, and related entity authorization before live activation.",
      privateBucketsMustRemainPrivate: true,
    },
    activationBoundary: "Credential-ready only. Real Supabase Storage upload/download requires project credentials, SDK integration, bucket policies, signed URL tests, virus scanning decision, and staging validation.",
  };
}
