import { marketplaceOffersRepository } from "../repositories/marketplaceOffersRepository.js";
import { wantedRequestsRepository } from "../repositories/wantedRequestsRepository.js";
import { createFrontendAdapter } from "./createAdapter.js";

export const marketplaceAdapter = createFrontendAdapter("marketplace", {
  listOffers: marketplaceOffersRepository.list,
  listOffersForUser: marketplaceOffersRepository.listForUser,
  createOffer: marketplaceOffersRepository.create,
  saveOffers: marketplaceOffersRepository.saveAll,
  listWantedRequests: wantedRequestsRepository.list,
  createWantedRequest: wantedRequestsRepository.create,
  saveWantedRequests: wantedRequestsRepository.saveAll,
});
