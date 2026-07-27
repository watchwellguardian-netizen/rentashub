const BOOKING_STATUS_MAP = {
  pending_supplier_approval: "pending",
  approved: "approved",
  declined: "declined",
  cancelled: "cancelled",
  active: "active",
  completed: "completed",
};

function now() {
  return new Date().toISOString();
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function sourceKey(prefix, id) {
  return `${prefix}:${id}`;
}

export function mapLegacyAssetToCoreRentalAsset(listing = {}) {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    listing_type: listing.listingType || "rental",
    rental_type: listing.rentalType || "daily",
    price_rate: Number(listing.priceRate || 0),
    deposit_amount: Number(String(listing.depositRequirement || "").replace(/[^\d.]/g, "")) || 0,
    owner_id: listing.ownerSupplierId,
    availability_status: listing.availabilityStatus === "available" ? "available" : "pending",
    verification_status: listing.verificationStatus === "verified" ? "verified" : "pending",
    version: 1,
    metadata_json: JSON.stringify({
      migrated_from: "legacy_local_storage",
      source_key: sourceKey("asset", listing.id),
      supplier_name: listing.supplierName || "Supplier",
      location: listing.location || "",
      migration_provider_status: "provider_independent_local",
    }),
  };
}

export function mapLegacyBookingToCoreRentalBooking(booking = {}) {
  return {
    id: booking.id,
    asset_id: booking.assetId,
    customer_id: booking.customerId,
    supplier_id: booking.supplierId,
    start_at: booking.startDateTime,
    end_at: booking.endDateTime,
    status: BOOKING_STATUS_MAP[booking.status] || "pending",
    payment_status: booking.paymentStatus || "not_active",
    total_amount: Number(booking.estimatedCost || 0),
    deposit_amount: Number(String(booking.depositRequirement || "").replace(/[^\d.]/g, "")) || 0,
    idempotency_key: sourceKey("booking", booking.id),
    version: 1,
    metadata_json: JSON.stringify({
      migrated_from: "legacy_local_storage",
      source_key: sourceKey("booking", booking.id),
      asset_title: booking.assetTitle || "Asset",
      customer_name: booking.customerName || "Customer",
      supplier_name: booking.supplierName || "Supplier",
      pickup_delivery_method: booking.pickupDeliveryMethod || "pickup",
      migration_provider_status: "provider_independent_local",
    }),
  };
}

function validateLegacyAsset(listing = {}) {
  const missing = ["id", "title", "category", "ownerSupplierId"].filter((field) => !hasValue(listing[field]));
  if (missing.length) return { valid: false, reason: `Missing asset fields: ${missing.join(", ")}` };
  if (Number(listing.priceRate || 0) <= 0) return { valid: false, reason: "Asset priceRate must be greater than 0." };
  return { valid: true };
}

function validateLegacyBooking(booking = {}, assetIds = new Set()) {
  const missing = ["id", "assetId", "customerId", "supplierId", "startDateTime", "endDateTime"].filter((field) => !hasValue(booking[field]));
  if (missing.length) return { valid: false, reason: `Missing booking fields: ${missing.join(", ")}` };
  if (!assetIds.has(booking.assetId)) return { valid: false, reason: "Booking references an asset outside the migration asset set." };
  if (new Date(booking.endDateTime) <= new Date(booking.startDateTime)) return { valid: false, reason: "Booking endDateTime must be after startDateTime." };
  return { valid: true };
}

function pushMapped({ source, sourceType, target, existingTargetIds, seenSourceIds, mapped, skipped, quarantined }) {
  if (seenSourceIds.has(source.id)) {
    quarantined.push({ sourceType, sourceId: source.id, reason: "Duplicate source record id." });
    return;
  }
  seenSourceIds.add(source.id);
  if (existingTargetIds.has(source.id)) {
    skipped.push({ sourceType, sourceId: source.id, reason: "Target already exists; idempotent skip." });
    return;
  }
  mapped.push(target);
}

export function generateCoreRentalLegacyMigrationPlan({
  assets = [],
  bookings = [],
  existingAssetIds = [],
  existingBookingIds = [],
  initiatedBy = "operator",
} = {}) {
  const assetIds = new Set(assets.map((asset) => asset.id).filter(Boolean));
  const existingAssets = new Set(existingAssetIds);
  const existingBookings = new Set(existingBookingIds);
  const seenAssets = new Set();
  const seenBookings = new Set();
  const mappedAssets = [];
  const mappedBookings = [];
  const skipped = [];
  const quarantined = [];

  for (const asset of assets) {
    const validation = validateLegacyAsset(asset);
    if (!validation.valid) {
      quarantined.push({ sourceType: "asset", sourceId: asset.id || "missing", reason: validation.reason });
      continue;
    }
    pushMapped({
      source: asset,
      sourceType: "asset",
      target: mapLegacyAssetToCoreRentalAsset(asset),
      existingTargetIds: existingAssets,
      seenSourceIds: seenAssets,
      mapped: mappedAssets,
      skipped,
      quarantined,
    });
  }

  for (const booking of bookings) {
    const validation = validateLegacyBooking(booking, assetIds);
    if (!validation.valid) {
      quarantined.push({ sourceType: "booking", sourceId: booking.id || "missing", reason: validation.reason });
      continue;
    }
    pushMapped({
      source: booking,
      sourceType: "booking",
      target: mapLegacyBookingToCoreRentalBooking(booking),
      existingTargetIds: existingBookings,
      seenSourceIds: seenBookings,
      mapped: mappedBookings,
      skipped,
      quarantined,
    });
  }

  const sourceCount = assets.length + bookings.length;
  const mappedCount = mappedAssets.length + mappedBookings.length;
  const reconciledCount = mappedCount + skipped.length + quarantined.length;

  return {
    status: quarantined.length ? "READY_WITH_QUARANTINE" : "READY",
    providerStatus: "provider_independent_local",
    initiatedBy,
    generatedAt: now(),
    mappedAssets,
    mappedBookings,
    skipped,
    quarantined,
    reconciliation: {
      sourceCount,
      mappedCount,
      skippedCount: skipped.length,
      quarantinedCount: quarantined.length,
      reconciledCount,
      countsMatch: sourceCount === reconciledCount,
    },
    controls: {
      idempotent: true,
      duplicatePrevention: true,
      quarantineInvalidRecords: true,
      resumableAfterInterruption: true,
      rollbackAvailable: "snapshot_or_legacy_export_required",
      auditEvidenceRequired: true,
      legacyWritesMustBeDisabledBeforeReadRemoval: true,
      featureFlagRollback: "rental_core_backend_path",
    },
  };
}
