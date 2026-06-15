import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { getSupplierProfile, getSupplierPublicSummary, loadSupplierProfiles, saveSupplierProfiles, upsertSupplierProfile } from "../supplierProfile.js";

export const supplierProfilesRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadSupplierProfiles(getRepositoryStorage(storage));
  },
  getBySupplierId(storage, supplierId, user = {}) {
    return getSupplierProfile(getRepositoryStorage(storage), supplierId, user);
  },
  getPublicSummary(storage, supplierId) {
    return getSupplierPublicSummary(getRepositoryStorage(storage), supplierId);
  },
  upsert(storage, user, input) {
    return upsertSupplierProfile(getRepositoryStorage(storage), user, input);
  },
  saveAll(storage, profiles) {
    return saveSupplierProfiles(getRepositoryStorage(storage), profiles);
  },
};
