import { getRepositories } from "./persistenceService.js";

const TRUST_SCORE_VERSION = "api-pilot-v1";

function publicError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function notFound(resource) {
  return publicError(404, "not_found", `${resource} was not found.`);
}

function validationError(details) {
  return publicError(400, "validation_error", "Please correct the highlighted fields.", details);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values = [], fallback = 50) {
  const numeric = values.map(Number).filter((value) => Number.isFinite(value));
  return numeric.length ? numeric.reduce((total, value) => total + value, 0) / numeric.length : fallback;
}

function ratingScore(reviews = []) {
  const published = reviews.filter((review) => review.status === "published");
  if (!published.length) return { average: 0, count: 0, score: 50 };
  const avg = average(published.map((review) => review.rating), 0);
  return { average: Math.round(avg * 10) / 10, count: published.length, score: clamp((avg / 5) * 100) };
}

function riskLevel(score, flags = []) {
  if (flags.length >= 2 || score < 45) return "high";
  if (flags.length || score < 70) return "medium";
  return "low";
}

function buildScore(entityType, entityId, score, badges = [], flags = [], inputs = {}) {
  return {
    entityType,
    entityId,
    score: clamp(score),
    riskLevel: riskLevel(clamp(score), flags),
    badges,
    flags,
    inputs,
    version: TRUST_SCORE_VERSION,
  };
}

async function audit(repositories, action, req, entityId) {
  await repositories.audit_logs.record(action, "trust_score", {
    actor_id: req.user?.id || "anonymous",
    entity_id: entityId,
    resource: "trust",
  });
}

export function createTrustApiService(options = {}) {
  const context = options.context || options;

  async function repositories() {
    return getRepositories(context);
  }

  async function loadDomain() {
    const repos = await repositories();
    const [assets, bookings, inspections, reviews, profiles, ledger, claims] = await Promise.all([
      repos.assets.list(),
      repos.bookings.list(),
      repos.inspections.list(),
      repos.reviews.list(),
      repos.supplier_profiles.list(),
      repos.payment_ledger.list(),
      repos.claims.list(),
    ]);
    return { repos, assets, bookings, inspections, reviews, profiles, ledger, claims };
  }

  function supplierScore(domain, supplierId) {
    const profile = domain.profiles.find((item) => item.supplier_id === supplierId || item.supplierId === supplierId);
    const assets = domain.assets.filter((asset) => (asset.owner_id || asset.ownerSupplierId || asset.supplier_id) === supplierId);
    const bookings = domain.bookings.filter((booking) => (booking.supplier_id || booking.supplierId) === supplierId);
    const reviews = domain.reviews.filter((review) => (review.supplier_id || review.supplierId) === supplierId);
    if (!profile && !assets.length && !bookings.length && !reviews.length) throw notFound("Supplier trust record");
    const rating = ratingScore(reviews);
    const completed = bookings.filter((booking) => booking.status === "completed").length;
    const cancelled = bookings.filter((booking) => ["cancelled", "declined"].includes(booking.status)).length;
    const verified = ["verified", "approved"].includes(profile?.verification_status || profile?.verificationStatus);
    const verifiedAssets = assets.filter((asset) => ["verified", "approved"].includes(asset.verification_status || asset.verificationStatus)).length;
    const claims = domain.claims.filter((claim) => claim.supplier_id === supplierId || claim.supplierId === supplierId);
    const verificationScore = verified ? 100 : profile ? 70 : 35;
    const bookingScore = bookings.length ? clamp((completed / bookings.length) * 100) : 55;
    const assetScore = assets.length ? clamp((verifiedAssets / assets.length) * 100) : 50;
    const claimScore = clamp(100 - Math.min(60, claims.length * 20));
    const score = average([verificationScore, bookingScore, assetScore, rating.score, claimScore], 60) - Math.min(20, cancelled * 6);
    const badges = [];
    if (verified) badges.push("Verified Supplier");
    if (score >= 70) badges.push("Trusted Supplier");
    if (score >= 85) badges.push("Gold Supplier");
    const flags = [];
    if (!verified) flags.push("Incomplete verification");
    if (cancelled >= 2) flags.push("Frequent cancellations");
    if (rating.count && rating.average < 3.5) flags.push("Poor review trends");
    if (claims.length >= 2) flags.push("Escalated claims");
    return buildScore("supplier", supplierId, score, badges, flags, {
      verificationScore,
      bookingScore,
      assetScore,
      reviewScore: rating.score,
      claimScore,
      averageRating: rating.average,
      reviewCount: rating.count,
      totalBookings: bookings.length,
      completedBookings: completed,
      totalAssets: assets.length,
      claims: claims.length,
    });
  }

  function customerScore(domain, customerId) {
    const bookings = domain.bookings.filter((booking) => (booking.customer_id || booking.customerId) === customerId);
    const reviews = domain.reviews.filter((review) => (review.customer_id || review.customerId) === customerId || (review.reviewer_id || review.reviewerId) === customerId);
    const ledger = domain.ledger.filter((transaction) => (transaction.customer_id || transaction.customerId) === customerId);
    if (!bookings.length && !reviews.length && !ledger.length) throw notFound("Customer trust record");
    const completed = bookings.filter((booking) => booking.status === "completed").length;
    const cancelled = bookings.filter((booking) => ["cancelled", "declined", "no_show"].includes(booking.status)).length;
    const paid = ledger.filter((transaction) => ["paid", "completed"].includes(transaction.status)).length;
    const rating = ratingScore(reviews);
    const completionScore = bookings.length ? clamp((completed / bookings.length) * 100) : 55;
    const paymentScore = bookings.length ? clamp((paid / Math.max(1, bookings.length)) * 100) : 55;
    const score = average([completionScore, paymentScore, rating.score], 60) - Math.min(20, cancelled * 7);
    const flags = [];
    if (cancelled >= 2) flags.push("Frequent cancellations");
    if (rating.count && rating.average < 3.5) flags.push("Poor review trends");
    const badges = score >= 75 ? ["Reliable Customer"] : [];
    return buildScore("customer", customerId, score, badges, flags, {
      completionScore,
      paymentScore,
      reviewScore: rating.score,
      averageRating: rating.average,
      reviewCount: rating.count,
      totalBookings: bookings.length,
      completedBookings: completed,
      cancelled,
    });
  }

  function assetScore(domain, assetId) {
    const asset = domain.assets.find((item) => item.id === assetId);
    const bookings = domain.bookings.filter((booking) => (booking.asset_id || booking.assetId) === assetId);
    const inspections = domain.inspections.filter((inspection) => (inspection.asset_id || inspection.assetId) === assetId);
    const reviews = domain.reviews.filter((review) => (review.asset_id || review.assetId) === assetId);
    if (!asset && !bookings.length && !reviews.length) throw notFound("Asset trust record");
    const rating = ratingScore(reviews);
    const completed = bookings.filter((booking) => booking.status === "completed").length;
    const damageSignals = inspections.filter((inspection) => (
      inspection.supplier_review?.status === "flagged"
      || String(inspection.condition_status || inspection.conditionStatus || "").toLowerCase().includes("damage")
      || String(inspection.damage_notes || inspection.damageNotes || "").trim()
    )).length;
    const verified = ["verified", "approved"].includes(asset?.verification_status || asset?.verificationStatus);
    const verificationScore = verified ? 100 : 50;
    const bookingScore = bookings.length ? clamp((completed / bookings.length) * 100) : 55;
    const inspectionScore = inspections.length ? clamp(100 - ((damageSignals / inspections.length) * 70)) : 60;
    const qualityScore = clamp([
      asset?.title,
      asset?.description,
      asset?.location,
      asset?.price_rate || asset?.priceRate,
      asset?.insurance_requirement || asset?.insuranceRequirement,
    ].filter(Boolean).length * 20);
    const score = average([verificationScore, bookingScore, inspectionScore, rating.score, qualityScore], 60);
    const flags = [];
    if (!verified) flags.push("Incomplete verification");
    if (damageSignals >= 2) flags.push("Damage frequency");
    if (rating.count && rating.average < 3.5) flags.push("Poor review trends");
    const badges = score >= 75 ? ["Trusted Asset"] : [];
    if (!damageSignals) badges.push("Safe Operator");
    return buildScore("asset", assetId, score, badges, [...new Set(flags)], {
      verificationScore,
      bookingScore,
      inspectionScore,
      reviewScore: rating.score,
      qualityScore,
      averageRating: rating.average,
      reviewCount: rating.count,
      totalBookings: bookings.length,
      completedBookings: completed,
      damageSignals,
    });
  }

  return {
    async list(entityType) {
      const domain = await loadDomain();
      if (entityType === "supplier") {
        const ids = [...new Set([
          ...domain.assets.map((asset) => asset.owner_id || asset.ownerSupplierId || asset.supplier_id).filter(Boolean),
          ...domain.profiles.map((profile) => profile.supplier_id || profile.supplierId).filter(Boolean),
        ])];
        return ids.map((id) => supplierScore(domain, id));
      }
      if (entityType === "customer") {
        const ids = [...new Set(domain.bookings.map((booking) => booking.customer_id || booking.customerId).filter(Boolean))];
        return ids.map((id) => customerScore(domain, id));
      }
      if (entityType === "asset") {
        return domain.assets.map((asset) => assetScore(domain, asset.id));
      }
      throw validationError([{ field: "entityType", message: "Choose supplier, customer, or asset." }]);
    },

    async find(entityType, entityId) {
      const domain = await loadDomain();
      if (entityType === "supplier") return supplierScore(domain, entityId);
      if (entityType === "customer") return customerScore(domain, entityId);
      if (entityType === "asset") return assetScore(domain, entityId);
      throw validationError([{ field: "entityType", message: "Choose supplier, customer, or asset." }]);
    },

    async riskQueue() {
      const all = [
        ...(await this.list("supplier")),
        ...(await this.list("asset")),
        ...(await this.list("customer")),
      ];
      return all.filter((score) => score.riskLevel !== "low" || score.flags.length).sort((a, b) => a.score - b.score);
    },

    async recalculate(entityType, entityId, req) {
      const score = await this.find(entityType, entityId);
      const repos = await repositories();
      await repos.trust_scores.create({
        id: `trust-${entityType}-${entityId}-${Date.now().toString(36)}`,
        entity_type: entityType,
        entity_id: entityId,
        score: score.score,
        risk_level: score.riskLevel,
        score_json: JSON.stringify(score),
      });
      await audit(repos, "trust.recalculated", req, `${entityType}:${entityId}`);
      return score;
    },
  };
}
