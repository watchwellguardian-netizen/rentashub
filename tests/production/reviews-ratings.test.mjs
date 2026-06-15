import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY } from "../../src/lib/bookingService.js";
import { NOTIFICATION_STORAGE_KEY, getUserNotifications } from "../../src/lib/notificationService.js";
import { SUPPLIER_PROFILE_STORAGE_KEY } from "../../src/lib/supplierProfile.js";
import {
  REVIEWS_STORAGE_KEY,
  adminModerateReview,
  canReviewBooking,
  canRespondToReview,
  getAssetRatingSummary,
  getPublishedAssetReviews,
  getPublishedSupplierReviews,
  getVisibleReviewsForUser,
  loadReviews,
  respondToReview,
  submitReview,
  validateReviewInput,
} from "../../src/lib/reviewService.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const otherCustomer = { id: "other-customer", role: "customer", full_name: "Other Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };
const listing = SEED_LISTINGS[0];

function booking(overrides = {}) {
  return {
    id: "booking-review-test",
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: "review-customer",
    customerName: "Review Customer",
    supplierId: "review-supplier",
    supplierName: "Review Supplier",
    status: "completed",
    ...overrides,
  };
}

function storage({ reviews = [], bookings = [booking()], notifications = [] } = {}) {
  const store = new Map([
    [REVIEWS_STORAGE_KEY, JSON.stringify(reviews)],
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    [NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications)],
    [SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify([{ supplierId: "review-supplier", businessName: "Review Rentals Ltd", publicSummary: "Trusted local supplier", supplierType: "company", verificationStatus: "verified" }])],
    ["rentashub_asset_listings", JSON.stringify(SEED_LISTINGS)],
  ]);
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

function validReview(overrides = {}) {
  return { rating: 5, title: "Great rental", comment: "Clean asset and smooth handoff.", reviewType: "asset", ...overrides };
}

test("review routes are wired including admin moderation", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/reviews", "/reviews/write/:bookingId", "/asset/:id/reviews", "/supplier/:supplierId/reviews", "/admin/reviews"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["admin"\]}/);
  assert.match(app, /allowedRoles={\["customer", "supplier", "broker", "admin"\]}/);
  assert.match(app, /allowedRoles={\["customer"\]}/);
  assert.match(app, /path="\/asset\/:id\/reviews"/);
  assert.match(app, /path="\/supplier\/:supplierId\/reviews"/);
});

test("logged-out users are blocked from private review routes without crashing visible review loading", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  const page = readFileSync(join(root, "src/pages/ReviewsPage.jsx"), "utf8");
  assert.match(app, /<Route path="\/reviews" element={<ReviewsPage \/>} \/>/);
  assert.match(app, /<Route path="\/reviews\/write\/:bookingId" element={<ReviewForm \/>} \/>/);
  assert.match(app, /<Route path="\/admin\/reviews" element={<AdminReviews \/>} \/>/);
  assert.match(page, /if \(!user\) \{\s*setReviews\(\[\]\);\s*return;\s*\}/);
  assert.deepEqual(getVisibleReviewsForUser(storage(), null), []);
});

test("customer can review only own completed booking", () => {
  assert.equal(canReviewBooking(customer, booking()), true);
  assert.equal(canReviewBooking(customer, booking({ status: "active" })), false);
  assert.equal(canReviewBooking(customer, booking({ status: "approved" })), false);
  assert.equal(canReviewBooking(customer, booking({ status: "declined" })), false);
  assert.equal(canReviewBooking(customer, booking({ status: "cancelled" })), false);
  assert.equal(canReviewBooking(otherCustomer, booking()), false);
});

test("review validation and duplicate blocking work", () => {
  const invalid = validateReviewInput({ rating: 6, title: "", comment: "" });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.rating, /1 to 5/);
  assert.match(invalid.errors.title, /required/);
  assert.match(invalid.errors.comment, /required/);
  assert.equal(validateReviewInput({ rating: "", title: "Title", comment: "Comment" }).valid, false);
  assert.equal(validateReviewInput({ rating: 5, title: "x".repeat(121), comment: "Comment" }).valid, false);
  assert.equal(validateReviewInput({ rating: 5, title: "Title", comment: "x".repeat(1001) }).valid, false);

  const local = storage();
  const first = submitReview(local, { user: customer, booking: booking(), input: validReview() });
  assert.equal(first.valid, true);
  const duplicate = submitReview(local, { user: customer, booking: booking(), input: validReview() });
  assert.equal(duplicate.valid, false);
  assert.match(duplicate.errors.duplicate, /already submitted/);
});

test("submitted review appears on asset and supplier pages and creates notification", () => {
  const local = storage();
  const result = submitReview(local, { user: customer, booking: booking(), input: validReview() });
  assert.equal(result.valid, true);
  assert.equal(getPublishedAssetReviews(local, listing.id).length, 1);
  assert.equal(getPublishedSupplierReviews(local, "review-supplier").length, 1);
  assert.equal(getAssetRatingSummary(local, listing.id).average, 5);
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "new_review"), true);
});

test("supplier can respond to own review but not another supplier review", () => {
  const local = storage();
  const result = submitReview(local, { user: customer, booking: booking(), input: validReview() });
  assert.equal(canRespondToReview(supplier, result.review, listing), true);
  assert.equal(canRespondToReview(otherSupplier, result.review, listing), false);
  const response = respondToReview(local, result.review.id, supplier, "Thanks for renting with us.");
  assert.equal(response.valid, true);
  assert.match(response.review.supplierResponse.body, /Thanks/);
  assert.equal(getUserNotifications(local, "review-customer").some((note) => note.type === "review_response"), true);
  assert.equal(respondToReview(local, result.review.id, otherSupplier, "No").valid, false);
  assert.equal(respondToReview(local, result.review.id, supplier, "").valid, false);
  assert.equal(respondToReview(local, result.review.id, supplier, "   ").valid, false);
});

test("admin can simulate hide, unhide, and flag reviews", () => {
  const local = storage();
  const result = submitReview(local, { user: customer, booking: booking(), input: validReview() });
  const reviewCount = loadReviews(local).length;
  assert.equal(adminModerateReview(local, result.review.id, "hidden").review.status, "hidden");
  assert.equal(adminModerateReview(local, result.review.id, "published").review.status, "published");
  assert.equal(adminModerateReview(local, result.review.id, "flagged").review.status, "flagged");
  assert.equal(loadReviews(local).length, reviewCount);
  assert.equal(getUserNotifications(local, "review-customer").some((note) => note.type === "review_moderated"), true);
});

test("review UI integrations render rating summaries and moderation copy", () => {
  const detail = readFileSync(join(root, "src/pages/AssetDetail.jsx"), "utf8");
  const card = readFileSync(join(root, "src/components/AssetCard.jsx"), "utf8");
  const admin = readFileSync(join(root, "src/pages/AdminCenter.jsx"), "utf8");
  const form = readFileSync(join(root, "src/pages/ReviewForm.jsx"), "utf8");
  assert.match(detail, /rating \(\{rating\.count\} reviews\)/);
  assert.match(card, /Rating:/);
  assert.match(admin, /Review moderation/);
  assert.match(admin, /Moderation is simulated\/local/);
  assert.match(form, /Star rating/);
  assert.match(readFileSync(join(root, "src/pages/ReviewsPage.jsx"), "utf8"), /Number\(review\.rating\) === 1 \? "star" : "stars"/);
  assert.match(admin, /Number\(review\.rating\) === 1 \? "star" : "stars"/);
  assert.match(readFileSync(join(root, "src/pages/ReviewsPage.jsx"), "utf8"), /if \(!response\.trim\(\)\)/);
  assert.match(readFileSync(join(root, "src/pages/ReviewsPage.jsx"), "utf8"), /if \(!user\)/);
  for (const file of ["src/lib/reviewService.js", "src/pages/ReviewsPage.jsx", "src/pages/ReviewForm.jsx", "src/pages/AdminCenter.jsx"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner|legal moderation claim/i);
  }
});

test("public review pages show published reviews only and supplier public name", () => {
  const local = storage({
    reviews: [
      { ...validReview(), id: "review-published", bookingId: "booking-review-test", assetId: listing.id, supplierId: "review-supplier", customerId: "review-customer", reviewerId: "review-customer", reviewerRole: "customer", status: "published", createdAt: "now", updatedAt: "now" },
      { ...validReview({ title: "Hidden" }), id: "review-hidden", bookingId: "booking-review-test-2", assetId: listing.id, supplierId: "review-supplier", customerId: "review-customer", reviewerId: "review-customer", reviewerRole: "customer", status: "hidden", createdAt: "now", updatedAt: "now" },
      { ...validReview({ title: "Flagged" }), id: "review-flagged", bookingId: "booking-review-test-3", assetId: listing.id, supplierId: "review-supplier", customerId: "review-customer", reviewerId: "review-customer", reviewerRole: "customer", status: "flagged", createdAt: "now", updatedAt: "now" },
    ],
  });
  assert.equal(getPublishedAssetReviews(local, listing.id).length, 1);
  assert.equal(getPublishedSupplierReviews(local, "review-supplier").length, 1);
  const page = readFileSync(join(root, "src/pages/ReviewsPage.jsx"), "utf8");
  assert.match(page, /getSupplierPublicSummary/);
  assert.match(page, /supplier\.businessName/);
  assert.doesNotMatch(page, /<p>\{supplierId\}<\/p>/);
});

test("public pages do not expose supplier response controls without authenticated owner", () => {
  const local = storage();
  const result = submitReview(local, { user: customer, booking: booking(), input: validReview() });
  assert.equal(canRespondToReview(null, result.review, listing), false);
  assert.equal(canRespondToReview(customer, result.review, listing), false);
  assert.equal(canRespondToReview(otherSupplier, result.review, listing), false);
  assert.equal(canRespondToReview(supplier, result.review, listing), true);
});
