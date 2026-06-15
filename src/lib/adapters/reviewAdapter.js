import { reviewsRepository } from "../repositories/reviewsRepository.js";
import { API_CONFIG } from "../apiClient.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const REVIEW_API_PILOT_NOTICE =
  "Review API mode is a guarded development pilot. Writes prefer backend bearer auth and use development role headers only as a local/demo fallback.";

export class ReviewApiError extends Error {
  constructor(message, { status = 0, code = "review_api_error", details = [] } = {}) {
    super(message);
    this.name = "ReviewApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeBaseUrl(baseUrl = API_CONFIG.baseUrl) {
  return String(baseUrl || "").replace(/\/$/, "");
}

function requireBaseUrl() {
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    throw new ReviewApiError("Review API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function devAuthHeaders(user = {}, options = {}) {
  return apiPilotAuthHeaders(user, options, { defaultId: "frontend-review-api-pilot" });
}

async function requestReviewApi(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ReviewApiError("Review API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ReviewApiError(payload.message || `Review API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "review_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function safeJson(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toCamelReview(review = {}) {
  return {
    id: review.id,
    bookingId: review.bookingId ?? review.booking_id ?? "",
    assetId: review.assetId ?? review.asset_id ?? "",
    supplierId: review.supplierId ?? review.supplier_id ?? "",
    customerId: review.customerId ?? review.customer_id ?? "",
    reviewerId: review.reviewerId ?? review.reviewer_id ?? "",
    reviewerRole: review.reviewerRole ?? review.reviewer_role ?? "customer",
    rating: Number(review.rating || 0),
    title: review.title || "",
    comment: review.comment || "",
    reviewType: review.reviewType ?? review.review_type ?? "asset",
    status: review.status || "published",
    createdAt: review.createdAt ?? review.created_at,
    updatedAt: review.updatedAt ?? review.updated_at,
    supplierResponse: review.supplierResponse ?? review.supplier_response ?? safeJson(review.response_json, null),
  };
}

function toApiReview({ user, booking, input }) {
  return {
    booking_id: booking.id,
    asset_id: booking.assetId,
    supplier_id: booking.supplierId,
    customer_id: booking.customerId,
    reviewer_id: user.id,
    reviewer_role: user.role,
    rating: Number(input.rating),
    title: input.title,
    comment: input.comment,
    review_type: input.reviewType || "asset",
  };
}

function ratingSummary(reviews = []) {
  const published = reviews.filter((review) => review.status === "published");
  const count = published.length;
  const average = count ? Math.round((published.reduce((total, review) => total + Number(review.rating || 0), 0) / count) * 10) / 10 : 0;
  return { average, count };
}

const reviewApiImplementation = {
  adapter: "backendApiPilot",
  notice: REVIEW_API_PILOT_NOTICE,
  async list(_storage, options = {}) {
    const payload = await requestReviewApi("/api/reviews", {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelReview);
  },
  async getById(_storage, reviewId, options = {}) {
    const payload = await requestReviewApi(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data ? toCamelReview(payload.data) : null;
  },
  async listVisible(_storage, user, options = {}) {
    const payload = await requestReviewApi("/api/reviews?visible=me", {
      headers: devAuthHeaders(user, options),
    });
    return (payload.data || []).map(toCamelReview);
  },
  async listPublishedForAsset(_storage, assetId, options = {}) {
    const payload = await requestReviewApi(`/api/reviews?asset_id=${encodeURIComponent(assetId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelReview);
  },
  async listPublishedForSupplier(_storage, supplierId, options = {}) {
    const payload = await requestReviewApi(`/api/reviews?supplier_id=${encodeURIComponent(supplierId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelReview);
  },
  getRatingSummary(_storage, reviews = []) {
    return ratingSummary(reviews);
  },
  async getAssetRatingSummary(storage, assetId, options = {}) {
    return ratingSummary(await this.listPublishedForAsset(storage, assetId, options));
  },
  async getSupplierRatingSummary(storage, supplierId, options = {}) {
    return ratingSummary(await this.listPublishedForSupplier(storage, supplierId, options));
  },
  resolveBooking() {
    throw new ReviewApiError("Booking resolution remains local until the review form is fully API-authenticated.", { code: "unsupported_operation" });
  },
  async submit(_storage, payload, options = {}) {
    const body = toApiReview(payload);
    const response = await requestReviewApi("/api/reviews", {
      method: "POST",
      body,
      headers: devAuthHeaders(payload.user, options),
    });
    return { valid: true, review: toCamelReview(response.data), apiMode: true };
  },
  async respond(_storage, reviewId, user, responseText, options = {}) {
    const response = await requestReviewApi(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: "PATCH",
      body: { supplier_response: { body: responseText } },
      headers: devAuthHeaders(user, options),
    });
    return { valid: true, review: toCamelReview(response.data), apiMode: true };
  },
  moderate() {
    throw new ReviewApiError("Admin moderation is not migrated in the review API pilot.", { code: "unsupported_operation" });
  },
  saveAll() {
    throw new ReviewApiError("Bulk review save is not supported in the review API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("reviews", reviewsRepository);

export const reviewAdapter = {
  ...baseAdapter,
  api: reviewApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? reviewApiImplementation : reviewsRepository;
  },
};

for (const methodName of Object.keys(reviewsRepository).filter((key) => typeof reviewsRepository[key] === "function")) {
  reviewAdapter[methodName] = (...args) => reviewAdapter.forMode()[methodName](...args);
}

reviewAdapter.toCamelReview = toCamelReview;
