import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { getAssetListingById, getSupplierListings, loadAssetListings, saveAssetListings, upsertAssetListing } from "../assetListing.js";

export const assetsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadAssetListings(getRepositoryStorage(storage));
  },
  getById(storage, assetId) {
    return getAssetListingById(getRepositoryStorage(storage), assetId);
  },
  listBySupplier(storage, supplierId) {
    return getSupplierListings(getRepositoryStorage(storage), supplierId);
  },
  upsert(storage, input) {
    return upsertAssetListing(getRepositoryStorage(storage), input);
  },
  softDelete(storage, assetId) {
    const nextListings = loadAssetListings(getRepositoryStorage(storage)).filter((listing) => listing.id !== assetId);
    saveAssetListings(getRepositoryStorage(storage), nextListings);
    return { id: assetId, deletedAt: new Date().toISOString() };
  },
  saveAll(storage, listings) {
    return saveAssetListings(getRepositoryStorage(storage), listings);
  },
};
