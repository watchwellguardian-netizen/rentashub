import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { adminModerateReview, getAssetRatingSummary, getPublishedAssetReviews, getPublishedSupplierReviews, getRatingSummary, getReviewById, getSupplierRatingSummary, getVisibleReviewsForUser, loadReviews, resolveReviewBooking, respondToReview, saveReviews, submitReview } from "../reviewService.js";

export const reviewsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadReviews(getRepositoryStorage(storage));
  },
  getById(storage, reviewId) {
    return getReviewById(getRepositoryStorage(storage), reviewId);
  },
  listVisible(storage, user) {
    return getVisibleReviewsForUser(getRepositoryStorage(storage), user);
  },
  listPublishedForAsset(storage, assetId) {
    return getPublishedAssetReviews(getRepositoryStorage(storage), assetId);
  },
  listPublishedForSupplier(storage, supplierId) {
    return getPublishedSupplierReviews(getRepositoryStorage(storage), supplierId);
  },
  getRatingSummary(_storage, reviews = []) {
    return getRatingSummary(reviews);
  },
  getAssetRatingSummary(storage, assetId) {
    return getAssetRatingSummary(getRepositoryStorage(storage), assetId);
  },
  getSupplierRatingSummary(storage, supplierId) {
    return getSupplierRatingSummary(getRepositoryStorage(storage), supplierId);
  },
  resolveBooking(storage, bookingId) {
    return resolveReviewBooking(getRepositoryStorage(storage), bookingId);
  },
  submit(storage, payload) {
    return submitReview(getRepositoryStorage(storage), payload);
  },
  respond(storage, reviewId, user, responseText) {
    return respondToReview(getRepositoryStorage(storage), reviewId, user, responseText);
  },
  moderate(storage, reviewId, status) {
    return adminModerateReview(getRepositoryStorage(storage), reviewId, status);
  },
  saveAll(storage, reviews) {
    return saveReviews(getRepositoryStorage(storage), reviews);
  },
};
