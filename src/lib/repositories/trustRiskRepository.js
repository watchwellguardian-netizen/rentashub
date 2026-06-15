import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { calculateAssetTrustScore, calculateCustomerTrustScore, calculateSupplierTrustScore, createTrustOverview, getRiskQueue, getTrustSummaryForListing, rankListingsByTrust } from "../trustEngine.js";

export const trustRiskRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  overview(storage) {
    return createTrustOverview(getRepositoryStorage(storage));
  },
  riskQueue(storage) {
    return getRiskQueue(getRepositoryStorage(storage));
  },
  supplierScore(storage, supplierId) {
    return calculateSupplierTrustScore(getRepositoryStorage(storage), supplierId);
  },
  customerScore(storage, customerId) {
    return calculateCustomerTrustScore(getRepositoryStorage(storage), customerId);
  },
  assetScore(storage, assetId) {
    return calculateAssetTrustScore(getRepositoryStorage(storage), assetId);
  },
  summaryForListing(storage, listing) {
    return getTrustSummaryForListing(getRepositoryStorage(storage), listing);
  },
  rankListings(storage, listings = []) {
    return rankListingsByTrust(getRepositoryStorage(storage), listings);
  },
  recalculate(storage, entityType, entityId) {
    if (entityType === "supplier") return calculateSupplierTrustScore(getRepositoryStorage(storage), entityId);
    if (entityType === "customer") return calculateCustomerTrustScore(getRepositoryStorage(storage), entityId);
    if (entityType === "asset") return calculateAssetTrustScore(getRepositoryStorage(storage), entityId);
    return null;
  },
};
