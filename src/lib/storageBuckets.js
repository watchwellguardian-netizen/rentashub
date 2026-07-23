export const STORAGE_BUCKET_VISIBILITY = {
  public: "public",
  private: "private",
};

export const STORAGE_BUCKETS = [
  {
    name: "listing-media",
    visibility: STORAGE_BUCKET_VISIBILITY.public,
    fileClasses: ["listing_photo", "listing_video_placeholder"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 12,
    ownershipRule: "asset_owner_or_admin",
    retention: "listing_lifetime_plus_365_days",
    signedUrlRequired: false,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS2 Rental marketplace",
    productionReady: false,
  },
  {
    name: "profile-images",
    visibility: STORAGE_BUCKET_VISIBILITY.public,
    fileClasses: ["supplier_logo", "profile_photo"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 5,
    ownershipRule: "profile_owner_or_admin",
    retention: "profile_lifetime_plus_365_days",
    signedUrlRequired: false,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS1 Core platform foundation",
    productionReady: false,
  },
  {
    name: "private-identity-documents",
    visibility: STORAGE_BUCKET_VISIBILITY.private,
    fileClasses: ["kyc_document", "business_registration", "ownership_document"],
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 20,
    ownershipRule: "subject_user_compliance_admin_only",
    retention: "legal_retention_policy_required",
    signedUrlRequired: true,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS6 Trust, operations, and ecosystem services",
    productionReady: false,
  },
  {
    name: "business-verification-documents",
    visibility: STORAGE_BUCKET_VISIBILITY.private,
    fileClasses: ["business_registration", "tax_registration", "insurance_certificate", "supplier_verification"],
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 20,
    ownershipRule: "business_owner_compliance_admin_only",
    retention: "legal_retention_policy_required",
    signedUrlRequired: true,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS6 Trust, operations, and ecosystem services",
    productionReady: false,
  },
  {
    name: "inspection-evidence",
    visibility: STORAGE_BUCKET_VISIBILITY.private,
    fileClasses: ["inspection_photo", "inspection_report", "handover_evidence"],
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 30,
    ownershipRule: "assigned_inspector_parties_admin",
    retention: "booking_lifetime_plus_2555_days",
    signedUrlRequired: true,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS6 Trust, operations, and ecosystem services",
    productionReady: false,
  },
  {
    name: "claim-evidence",
    visibility: STORAGE_BUCKET_VISIBILITY.private,
    fileClasses: ["damage_photo", "claim_document", "dispute_evidence"],
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 30,
    ownershipRule: "claim_parties_dispute_officer_admin",
    retention: "claim_lifetime_plus_2555_days",
    signedUrlRequired: true,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS6 Trust, operations, and ecosystem services",
    productionReady: false,
  },
  {
    name: "auction-documents",
    visibility: STORAGE_BUCKET_VISIBILITY.private,
    fileClasses: ["auction_notice", "bidder_document", "auction_invoice", "sale_confirmation"],
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxSizeMb: 25,
    ownershipRule: "auction_parties_admin_compliance",
    retention: "auction_lifetime_plus_2555_days",
    signedUrlRequired: true,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS5 Auctions and recovery",
    productionReady: false,
  },
  {
    name: "generated-contracts",
    visibility: STORAGE_BUCKET_VISIBILITY.private,
    fileClasses: ["rental_contract", "sale_contract", "settlement_statement"],
    allowedMimeTypes: ["application/pdf"],
    maxSizeMb: 15,
    ownershipRule: "contract_parties_admin",
    retention: "contract_lifetime_plus_2555_days",
    signedUrlRequired: true,
    malwareScanningRequired: true,
    metadataStrippingRequired: true,
    accessPolicyStatus: "DEFINED_NOT_ACTIVATED",
    owner: "WS2 Rental marketplace",
    productionReady: false,
  },
];

export function listStorageBuckets() {
  return STORAGE_BUCKETS.map((bucket) => ({ ...bucket, fileClasses: [...bucket.fileClasses] }));
}

export function validateStorageBucketDefinitions(buckets = STORAGE_BUCKETS) {
  const errors = [];
  const seen = new Set();
  for (const bucket of buckets) {
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bucket.name)) errors.push(`${bucket.name} has invalid bucket name`);
    if (seen.has(bucket.name)) errors.push(`${bucket.name} is duplicated`);
    seen.add(bucket.name);
    if (!Object.values(STORAGE_BUCKET_VISIBILITY).includes(bucket.visibility)) errors.push(`${bucket.name} has invalid visibility`);
    if (bucket.visibility === STORAGE_BUCKET_VISIBILITY.private && !bucket.signedUrlRequired) errors.push(`${bucket.name} private bucket must require signed URLs`);
    if (!bucket.owner) errors.push(`${bucket.name} missing owner`);
    if (!Array.isArray(bucket.fileClasses) || bucket.fileClasses.length === 0) errors.push(`${bucket.name} missing file classes`);
    if (!Array.isArray(bucket.allowedMimeTypes) || bucket.allowedMimeTypes.length === 0) errors.push(`${bucket.name} missing allowed MIME types`);
    if (!Number.isFinite(bucket.maxSizeMb) || bucket.maxSizeMb <= 0) errors.push(`${bucket.name} missing maximum size`);
    if (!bucket.ownershipRule) errors.push(`${bucket.name} missing ownership rule`);
    if (!bucket.retention) errors.push(`${bucket.name} missing retention rule`);
    if (bucket.malwareScanningRequired !== true) errors.push(`${bucket.name} must require malware scanning before activation`);
    if (bucket.metadataStrippingRequired !== true) errors.push(`${bucket.name} must require metadata stripping before activation`);
    if (bucket.accessPolicyStatus !== "DEFINED_NOT_ACTIVATED") errors.push(`${bucket.name} must remain DEFINED_NOT_ACTIVATED`);
    if (bucket.productionReady) errors.push(`${bucket.name} must not be marked production-certified before A4 storage certification`);
  }
  return { valid: errors.length === 0, errors, bucketCount: buckets.length };
}
