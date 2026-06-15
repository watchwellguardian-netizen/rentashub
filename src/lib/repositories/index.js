export { usersRepository } from "./usersRepository.js";
export { assetsRepository } from "./assetsRepository.js";
export { bookingsRepository } from "./bookingsRepository.js";
export { inspectionsRepository } from "./inspectionsRepository.js";
export { paymentsRepository } from "./paymentsRepository.js";
export { messagesRepository } from "./messagesRepository.js";
export { notificationsRepository } from "./notificationsRepository.js";
export { supplierProfilesRepository } from "./supplierProfilesRepository.js";
export { verificationsRepository } from "./verificationsRepository.js";
export { reviewsRepository } from "./reviewsRepository.js";
export { disputesRepository } from "./disputesRepository.js";
export { marketplaceOffersRepository } from "./marketplaceOffersRepository.js";
export { wantedRequestsRepository } from "./wantedRequestsRepository.js";
export { trustRiskRepository } from "./trustRiskRepository.js";
export { protectionPlansRepository } from "./protectionPlansRepository.js";
export { claimsRepository } from "./claimsRepository.js";

import { usersRepository } from "./usersRepository.js";
import { assetsRepository } from "./assetsRepository.js";
import { bookingsRepository } from "./bookingsRepository.js";
import { inspectionsRepository } from "./inspectionsRepository.js";
import { paymentsRepository } from "./paymentsRepository.js";
import { messagesRepository } from "./messagesRepository.js";
import { notificationsRepository } from "./notificationsRepository.js";
import { supplierProfilesRepository } from "./supplierProfilesRepository.js";
import { verificationsRepository } from "./verificationsRepository.js";
import { reviewsRepository } from "./reviewsRepository.js";
import { disputesRepository } from "./disputesRepository.js";
import { marketplaceOffersRepository } from "./marketplaceOffersRepository.js";
import { wantedRequestsRepository } from "./wantedRequestsRepository.js";
import { trustRiskRepository } from "./trustRiskRepository.js";
import { protectionPlansRepository } from "./protectionPlansRepository.js";
import { claimsRepository } from "./claimsRepository.js";

export const repositories = {
  users: usersRepository,
  assets: assetsRepository,
  bookings: bookingsRepository,
  inspections: inspectionsRepository,
  payments: paymentsRepository,
  messages: messagesRepository,
  notifications: notificationsRepository,
  supplierProfiles: supplierProfilesRepository,
  verifications: verificationsRepository,
  reviews: reviewsRepository,
  disputes: disputesRepository,
  marketplaceOffers: marketplaceOffersRepository,
  wantedRequests: wantedRequestsRepository,
  trustRisk: trustRiskRepository,
  protectionPlans: protectionPlansRepository,
  claims: claimsRepository,
};
