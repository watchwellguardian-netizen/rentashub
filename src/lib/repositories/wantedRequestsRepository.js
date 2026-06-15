import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { createWantedRequest, loadWantedRequests, saveWantedRequests } from "../marketplaceExchange.js";

export const wantedRequestsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadWantedRequests(getRepositoryStorage(storage));
  },
  create(storage, payload) {
    return createWantedRequest(getRepositoryStorage(storage), payload);
  },
  saveAll(storage, requests) {
    return saveWantedRequests(getRepositoryStorage(storage), requests);
  },
};
