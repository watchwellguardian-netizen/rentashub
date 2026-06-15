import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { createMarketplaceOffer, getOffersForUser, loadOffers, saveOffers } from "../marketplaceExchange.js";

export const marketplaceOffersRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadOffers(getRepositoryStorage(storage));
  },
  listForUser(storage, user) {
    return getOffersForUser(getRepositoryStorage(storage), user);
  },
  create(storage, payload) {
    return createMarketplaceOffer(getRepositoryStorage(storage), payload);
  },
  saveAll(storage, offers) {
    return saveOffers(getRepositoryStorage(storage), offers);
  },
};
