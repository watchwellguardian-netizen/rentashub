import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { adminUpdateClaimStatus, getClaimById, getClaimsForAsset, getClaimsForSupplier, loadClaims, saveClaims, submitProtectionClaim } from "../protectionService.js";

export const claimsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadClaims(getRepositoryStorage(storage));
  },
  getById(storage, claimId) {
    return getClaimById(getRepositoryStorage(storage), claimId);
  },
  listForAsset(storage, assetId) {
    return getClaimsForAsset(getRepositoryStorage(storage), assetId);
  },
  listForSupplier(storage, supplierId) {
    return getClaimsForSupplier(getRepositoryStorage(storage), supplierId);
  },
  submit(storage, payload) {
    return submitProtectionClaim(getRepositoryStorage(storage), payload);
  },
  adminUpdateStatus(storage, claimId, status, adminUser) {
    return adminUpdateClaimStatus(getRepositoryStorage(storage), claimId, status, adminUser);
  },
  saveAll(storage, claims) {
    return saveClaims(getRepositoryStorage(storage), claims);
  },
};
