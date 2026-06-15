import { getRepositories } from "./persistenceService.js";

const REVIEW_TYPES = new Set(["asset", "supplier", "customer"]);
const REVIEW_STATUSES = new Set(["published", "pending_review", "hidden", "flagged"]);

function publicError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function validationError(details) {
  return publicError(400, "validation_error", "Please correct the highlighted fields.", details);
}

function notFound(resource) {
  return publicError(404, "not_found", `${resource} was not found.`);
}

function forbidden(message = "You do not have permission to access this review.") {
  return publicError(403, "forbidden", message);
}

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseJson(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringify(value) {
  return value ? JSON.stringify(value) : "";
}

function validateReviewPayload(payload = {}) {
  const details = [];
  const rating = Number(payload.rating);
  if (!payload.booking_id) details.push({ field: "booking_id", message: "booking_id is required." });
  if (!payload.asset_id) details.push({ field: "asset_id", message: "asset_id is required." });
  if (!payload.supplier_id) details.push({ field: "supplier_id", message: "supplier_id is required." });
  if (!payload.customer_id) details.push({ field: "customer_id", message: "customer_id is required." });
  if (!payload.reviewer_id) details.push({ field: "reviewer_id", message: "reviewer_id is required." });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) details.push({ field: "rating", message: "rating must be between 1 and 5." });
  if (!String(payload.title || "").trim()) details.push({ field: "title", message: "title is required." });
  if (!String(payload.comment || "").trim()) details.push({ field: "comment", message: "comment is required." });
  if (String(payload.title || "").trim().length > 120) details.push({ field: "title", message: "title must be 120 characters or fewer." });
  if (String(payload.comment || "").trim().length > 1000) details.push({ field: "comment", message: "comment must be 1000 characters or fewer." });
  if (!REVIEW_TYPES.has(payload.review_type || "asset")) details.push({ field: "review_type", message: "review_type is invalid." });
  if (details.length) throw validationError(details);
}

function canSeeReview(user, review) {
  if (!user || !review) return false;
  if (review.status === "published") return true;
  if (user.role === "admin") return true;
  if (user.role === "customer") return review.customer_id === user.id || review.reviewer_id === user.id;
  if (user.role === "supplier") return review.supplier_id === user.id;
  return false;
}

async function audit(repositories, action, req, reviewId) {
  await repositories.audit_logs.record(action, "review", {
    actor_id: req.user?.id || "anonymous",
    entity_id: reviewId,
    resource: "reviews",
  });
}

export function createReviewApiService(options = {}) {
  const context = options.context || options;

  async function repositories() {
    return getRepositories(context);
  }

  return {
    async list(filter = {}, req = {}) {
      const repos = await repositories();
      let reviews = await repos.reviews.list();
      if (filter.asset_id) reviews = reviews.filter((review) => review.asset_id === filter.asset_id && review.status === "published");
      else if (filter.supplier_id) reviews = reviews.filter((review) => review.supplier_id === filter.supplier_id && review.status === "published");
      else if (filter.visible === "me") reviews = reviews.filter((review) => canSeeReview(req.user, review));
      else if (req.user?.role !== "admin") reviews = reviews.filter((review) => review.status === "published");
      return reviews;
    },

    async findById(reviewId, req = {}) {
      const repos = await repositories();
      const review = await repos.reviews.findById(reviewId);
      if (!review) throw notFound("Review");
      if (!canSeeReview(req.user, review)) throw forbidden();
      return review;
    },

    async create(payload, req) {
      validateReviewPayload(payload);
      if (!req.user) throw forbidden("Authentication is required to submit a review.");
      if (req.user.role !== "admin" && payload.reviewer_id !== req.user.id) throw forbidden("Reviewer must match the authenticated user.");
      const repos = await repositories();
      const duplicate = (await repos.reviews.list()).some(
        (review) => review.booking_id === payload.booking_id && review.review_type === (payload.review_type || "asset") && review.reviewer_id === payload.reviewer_id,
      );
      if (duplicate) throw validationError([{ field: "duplicate", message: "You already submitted this review type for this booking." }]);
      const review = await repos.reviews.create({
        id: payload.id || createId("review"),
        booking_id: payload.booking_id,
        asset_id: payload.asset_id,
        supplier_id: payload.supplier_id,
        customer_id: payload.customer_id,
        reviewer_id: payload.reviewer_id,
        reviewer_role: payload.reviewer_role || req.user.role,
        rating: Number(payload.rating),
        title: String(payload.title).trim(),
        comment: String(payload.comment).trim(),
        review_type: payload.review_type || "asset",
        status: REVIEW_STATUSES.has(payload.status) ? payload.status : "published",
        response_json: "",
      });
      await audit(repos, "reviews.created", req, review.id);
      return review;
    },

    async update(reviewId, payload, req) {
      const repos = await repositories();
      const review = await repos.reviews.findById(reviewId);
      if (!review) throw notFound("Review");
      if (payload.supplier_response !== undefined || payload.response_json !== undefined) {
        if (req.user?.role !== "supplier" && req.user?.role !== "admin") throw forbidden("Only the owning supplier can respond to this review.");
        if (req.user.role !== "admin" && review.supplier_id !== req.user.id) throw forbidden("You cannot respond to another supplier's review.");
        const response = payload.supplier_response || parseJson(payload.response_json, null);
        const body = String(response?.body || response?.notes || "").trim();
        if (!body) throw validationError([{ field: "supplier_response", message: "Response is required." }]);
        if (body.length > 500) throw validationError([{ field: "supplier_response", message: "Response must be 500 characters or fewer." }]);
        const updated = await repos.reviews.update(reviewId, {
          response_json: stringify({
            body,
            responderId: req.user.id,
            createdAt: now(),
          }),
          updated_at: now(),
        });
        await audit(repos, "reviews.responded", req, reviewId);
        return updated;
      }
      throw validationError([{ field: "operation", message: "Only supplier response updates are available in the reviews API pilot." }]);
    },

    mapReview(review = {}) {
      return {
        ...review,
        supplier_response: parseJson(review.response_json, null),
      };
    },
  };
}
