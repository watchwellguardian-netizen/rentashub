import { getAssetListingById } from "./assetListing.js";
import { getBookingById, isCustomerRole, isSupplierRole } from "./bookingService.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const REVIEWS_STORAGE_KEY = "rentashub_reviews";
export const REVIEW_STATUSES = ["published", "pending_review", "hidden", "flagged"];
export const REVIEW_TYPES = ["asset", "supplier", "customer"];

export function loadReviews(storage) {
  if (!storage) return [];
  const raw = storage.getItem(REVIEWS_STORAGE_KEY);
  if (!raw) {
    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveReviews(storage, reviews) {
  if (!storage) return reviews;
  storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  return reviews;
}

export function getReviewById(storage, reviewId) {
  return loadReviews(storage).find((review) => review.id === reviewId) || null;
}

export function canReviewBooking(user, booking) {
  return Boolean(user && booking && isCustomerRole(user.role) && booking.customerId === user.id && booking.status === "completed");
}

export function validateReviewInput(input = {}) {
  const errors = {};
  const rating = Number(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) errors.rating = "Choose a rating from 1 to 5.";
  if (!String(input.title || "").trim()) errors.title = "Review title is required.";
  if (!String(input.comment || "").trim()) errors.comment = "Review comment is required.";
  if (String(input.title || "").trim().length > 120) errors.title = "Review title must be 120 characters or fewer.";
  if (String(input.comment || "").trim().length > 1000) errors.comment = "Review comment must be 1000 characters or fewer.";
  if (!REVIEW_TYPES.includes(input.reviewType || "asset")) errors.reviewType = "Choose a valid review type.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function hasDuplicateReview(storage, bookingId, reviewType, reviewerId) {
  return loadReviews(storage).some((review) => review.bookingId === bookingId && review.reviewType === reviewType && review.reviewerId === reviewerId);
}

export function submitReview(storage, { user, booking, input }) {
  if (!canReviewBooking(user, booking)) return { valid: false, errors: { permission: "You can review only your own completed bookings." } };
  const validation = validateReviewInput(input);
  if (!validation.valid) return validation;
  const reviewType = input.reviewType || "asset";
  if (hasDuplicateReview(storage, booking.id, reviewType, user.id)) {
    return { valid: false, errors: { duplicate: "You already submitted this review type for this booking." } };
  }
  const now = new Date().toISOString();
  const review = {
    id: `review-${Date.now()}`,
    bookingId: booking.id,
    assetId: booking.assetId,
    supplierId: booking.supplierId,
    customerId: booking.customerId,
    reviewerId: user.id,
    reviewerRole: normalizeRole(user.role),
    rating: Number(input.rating),
    title: String(input.title).trim(),
    comment: String(input.comment).trim(),
    reviewType,
    status: "published",
    createdAt: now,
    updatedAt: now,
    supplierResponse: null,
  };
  saveReviews(storage, [review, ...loadReviews(storage)]);
  createNotification(storage, {
    recipientId: booking.supplierId,
    type: "new_review",
    title: "New customer review",
    body: `${booking.customerName} reviewed ${booking.assetTitle}.`,
    relatedRoute: `/supplier/${booking.supplierId}/reviews`,
  });
  return { valid: true, review };
}

export function getPublishedAssetReviews(storage, assetId) {
  return loadReviews(storage).filter((review) => review.assetId === assetId && review.status === "published");
}

export function getPublishedSupplierReviews(storage, supplierId) {
  return loadReviews(storage).filter((review) => review.supplierId === supplierId && review.status === "published");
}

export function getVisibleReviewsForUser(storage, user) {
  if (!user) return [];
  const role = normalizeRole(user.role);
  const reviews = loadReviews(storage);
  if (role === "admin") return reviews;
  if (isCustomerRole(role)) return reviews.filter((review) => review.customerId === user.id || review.reviewerId === user.id);
  if (isSupplierRole(role)) return reviews.filter((review) => review.supplierId === user.id);
  return [];
}

export function getRatingSummary(reviews = []) {
  const published = reviews.filter((review) => review.status === "published");
  const count = published.length;
  const average = count ? Math.round((published.reduce((total, review) => total + Number(review.rating || 0), 0) / count) * 10) / 10 : 0;
  return { average, count };
}

export function getAssetRatingSummary(storage, assetId) {
  return getRatingSummary(getPublishedAssetReviews(storage, assetId));
}

export function getSupplierRatingSummary(storage, supplierId) {
  return getRatingSummary(getPublishedSupplierReviews(storage, supplierId));
}

export function canRespondToReview(user, review, listing = null) {
  if (!user || !review) return false;
  const ownsSupplier = isSupplierRole(user.role) && review.supplierId === user.id;
  const ownsListing = listing && isSupplierRole(user.role) && listing.ownerSupplierId === user.id;
  return Boolean(ownsSupplier || ownsListing);
}

export function respondToReview(storage, reviewId, user, responseText) {
  const review = getReviewById(storage, reviewId);
  const listing = review ? getAssetListingById(storage, review.assetId) : null;
  if (!canRespondToReview(user, review, listing)) return { valid: false, error: "You cannot respond to another supplier's review." };
  if (!String(responseText || "").trim()) return { valid: false, error: "Response is required." };
  if (String(responseText || "").trim().length > 500) return { valid: false, error: "Response must be 500 characters or fewer." };
  const nextReview = {
    ...review,
    supplierResponse: {
      body: String(responseText).trim(),
      responderId: user.id,
      createdAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  saveReviews(storage, loadReviews(storage).map((item) => (item.id === reviewId ? nextReview : item)));
  createNotification(storage, {
    recipientId: review.customerId,
    type: "review_response",
    title: "Supplier responded to your review",
    body: "A supplier response was added to your review.",
    relatedRoute: `/asset/${review.assetId}/reviews`,
  });
  return { valid: true, review: nextReview };
}

export function adminModerateReview(storage, reviewId, status) {
  if (!["published", "hidden", "flagged"].includes(status)) return { valid: false, error: "Choose published, hidden, or flagged." };
  const review = getReviewById(storage, reviewId);
  if (!review) return { valid: false, error: "Review was not found." };
  const nextReview = { ...review, status, updatedAt: new Date().toISOString() };
  saveReviews(storage, loadReviews(storage).map((item) => (item.id === reviewId ? nextReview : item)));
  if (status === "flagged") {
    createNotification(storage, {
      recipientId: review.reviewerId,
      type: "review_moderated",
      title: "Review flagged",
      body: "Your review was flagged in simulated local moderation.",
      relatedRoute: "/reviews",
    });
  }
  return { valid: true, review: nextReview };
}

export function resolveReviewBooking(storage, bookingId) {
  return getBookingById(storage, bookingId);
}
