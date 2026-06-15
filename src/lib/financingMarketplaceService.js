import { createNotification } from "./notificationService.js";
import { getAuctionById } from "./auctionService.js";
import { normalizeRole } from "./rbac.js";

export const FINANCING_PARTNERS_STORAGE_KEY = "rentashub_financing_partners";
export const FINANCING_PRODUCTS_STORAGE_KEY = "rentashub_financing_products";
export const FINANCING_REQUESTS_STORAGE_KEY = "rentashub_financing_requests";

export const FINANCING_PARTNER_STATUSES = ["pending_review", "approved", "suspended", "rejected"];
export const FINANCING_REQUEST_STATUSES = ["prequalification_requested", "partner_review_placeholder", "documents_requested_placeholder", "offer_placeholder", "referred_placeholder", "declined_placeholder", "cancelled"];
export const FINANCING_PRODUCT_TYPES = ["asset_purchase", "equipment_finance", "vehicle_finance", "working_capital", "lease_to_own", "dealer_floorplan"];
export const FINANCING_PARISHES = ["Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. James", "St. Ann", "Westmoreland", "St. Elizabeth", "Hanover", "Trelawny", "St. Mary", "Portland", "St. Thomas"];

function readJson(storage, key, fallback) {
  if (!storage) return fallback;
  const raw = storage.getItem(key);
  if (!raw) {
    storage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw);
}

function writeJson(storage, key, value) {
  if (storage) storage.setItem(key, JSON.stringify(value));
  return value;
}

export function createSeedFinancingPartners() {
  return [
    {
      partnerId: "finance-capital-demo",
      ownerUserId: "finance-partner-demo",
      companyName: "Capital Equipment Finance Demo",
      contactName: "Monique Grant",
      productTypes: ["equipment_finance", "asset_purchase"],
      parishesServed: ["Kingston", "St. Andrew", "St. Catherine", "Clarendon"],
      minimumAmount: 250000,
      maximumAmount: 15000000,
      indicativeRateLabel: "Indicative only - partner review required",
      documentRequirements: ["business_registration_placeholder.pdf", "bank_statement_placeholder.pdf"],
      availability: "Business-day review placeholder",
      status: "approved",
      referralsHandled: 34,
      simulatedOnly: true,
      createdAt: "2026-06-06T10:00:00.000Z",
      updatedAt: "2026-06-13T13:00:00.000Z",
    },
    {
      partnerId: "finance-vehicle-demo",
      ownerUserId: "vehicle-finance-demo",
      companyName: "Island Vehicle Finance Readiness",
      contactName: "Damian Clarke",
      productTypes: ["vehicle_finance", "lease_to_own"],
      parishesServed: ["Kingston", "St. Andrew", "St. James", "St. Ann"],
      minimumAmount: 500000,
      maximumAmount: 12000000,
      indicativeRateLabel: "No credit decision - referral readiness only",
      documentRequirements: ["id_placeholder.pdf", "income_placeholder.pdf", "auction_invoice_placeholder.pdf"],
      availability: "48-hour referral review placeholder",
      status: "approved",
      referralsHandled: 22,
      simulatedOnly: true,
      createdAt: "2026-06-07T10:00:00.000Z",
      updatedAt: "2026-06-13T13:00:00.000Z",
    },
  ];
}

export function createSeedFinancingProducts() {
  return [
    {
      productId: "product-equipment-finance-demo",
      partnerId: "finance-capital-demo",
      productName: "Equipment purchase finance placeholder",
      productType: "equipment_finance",
      minAmount: 250000,
      maxAmount: 15000000,
      termsLabel: "12-60 month indicative terms",
      eligibilitySummary: "Business profile, asset invoice, and partner review required.",
      status: "active_placeholder",
      simulatedOnly: true,
    },
    {
      productId: "product-vehicle-finance-demo",
      partnerId: "finance-vehicle-demo",
      productName: "Vehicle auction finance placeholder",
      productType: "vehicle_finance",
      minAmount: 500000,
      maxAmount: 12000000,
      termsLabel: "Partner terms unavailable until live activation",
      eligibilitySummary: "No credit bureau pull or approval occurs in this version.",
      status: "active_placeholder",
      simulatedOnly: true,
    },
  ];
}

export function loadFinancingPartners(storage) {
  return readJson(storage, FINANCING_PARTNERS_STORAGE_KEY, createSeedFinancingPartners());
}

export function saveFinancingPartners(storage, partners) {
  return writeJson(storage, FINANCING_PARTNERS_STORAGE_KEY, partners);
}

export function loadFinancingProducts(storage) {
  return readJson(storage, FINANCING_PRODUCTS_STORAGE_KEY, createSeedFinancingProducts());
}

export function saveFinancingProducts(storage, products) {
  return writeJson(storage, FINANCING_PRODUCTS_STORAGE_KEY, products);
}

export function loadFinancingRequests(storage) {
  return readJson(storage, FINANCING_REQUESTS_STORAGE_KEY, []);
}

export function saveFinancingRequests(storage, requests) {
  return writeJson(storage, FINANCING_REQUESTS_STORAGE_KEY, requests);
}

export function getFinancingPartner(storage, partnerId) {
  return loadFinancingPartners(storage).find((partner) => partner.partnerId === partnerId) || null;
}

export function getApprovedFinancingPartners(storage, filters = {}) {
  return loadFinancingPartners(storage).filter((partner) => {
    if (partner.status !== "approved") return false;
    if (filters.productType && !partner.productTypes.includes(filters.productType)) return false;
    if (filters.parish && !partner.parishesServed.includes(filters.parish)) return false;
    return true;
  });
}

export function getFinancingProductsForPartner(storage, partnerId) {
  return loadFinancingProducts(storage).filter((product) => product.partnerId === partnerId);
}

export function registerFinancingPartner(storage, user, input = {}) {
  if (!user) return { valid: false, errors: { permission: "Sign in to register a financing partner profile." } };
  const errors = {};
  if (!String(input.companyName || "").trim()) errors.companyName = "Company name is required.";
  if (!String(input.contactName || "").trim()) errors.contactName = "Contact name is required.";
  if (!Array.isArray(input.productTypes) || !input.productTypes.length) errors.productTypes = "Choose at least one financing product type.";
  if (!Array.isArray(input.parishesServed) || !input.parishesServed.length) errors.parishesServed = "Choose at least one parish served.";
  if (!Number(input.minimumAmount || 0)) errors.minimumAmount = "Minimum referral amount is required.";
  if (!Number(input.maximumAmount || 0)) errors.maximumAmount = "Maximum referral amount is required.";
  if (Number(input.maximumAmount || 0) < Number(input.minimumAmount || 0)) errors.maximumAmount = "Maximum amount must be greater than minimum amount.";
  if (Object.keys(errors).length) return { valid: false, errors };

  const partner = {
    partnerId: `finance-${Date.now()}`,
    ownerUserId: user.id,
    companyName: String(input.companyName).trim(),
    contactName: String(input.contactName).trim(),
    productTypes: input.productTypes,
    parishesServed: input.parishesServed,
    minimumAmount: Number(input.minimumAmount),
    maximumAmount: Number(input.maximumAmount),
    indicativeRateLabel: String(input.indicativeRateLabel || "Indicative only - no live credit decision"),
    documentRequirements: Array.isArray(input.documentRequirements) ? input.documentRequirements.filter(Boolean) : [],
    availability: String(input.availability || "By appointment"),
    status: "pending_review",
    referralsHandled: 0,
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveFinancingPartners(storage, [partner, ...loadFinancingPartners(storage)]);
  createNotification(storage, {
    recipientId: user.id,
    type: "financing_marketplace",
    title: "Financing partner profile submitted",
    body: "Your partner profile is pending local admin review. No lending, KYC sharing, or credit decision is active.",
    relatedRoute: "/financing/dashboard",
  });
  return { valid: true, partner };
}

export function updateFinancingPartnerStatus(storage, user, partnerId, status) {
  if (normalizeRole(user?.role) !== "admin") return { valid: false, error: "Financing partner review requires admin access." };
  if (!FINANCING_PARTNER_STATUSES.includes(status)) return { valid: false, error: "Choose a valid financing partner status." };
  const partners = loadFinancingPartners(storage);
  const partner = partners.find((item) => item.partnerId === partnerId);
  if (!partner) return { valid: false, error: "Financing partner was not found." };
  const next = { ...partner, status, reviewedBy: user.id, updatedAt: new Date().toISOString() };
  saveFinancingPartners(storage, partners.map((item) => item.partnerId === partnerId ? next : item));
  createNotification(storage, {
    recipientId: partner.ownerUserId,
    type: "financing_marketplace",
    title: `Financing partner profile ${status.replaceAll("_", " ")}`,
    body: "This is a simulated admin readiness action. No lending licence, KYC, credit, or banking adjudication occurred.",
    relatedRoute: "/financing/dashboard",
  });
  return { valid: true, partner: next };
}

export function requestAuctionFinancingPrequalification(storage, user, auctionId, input = {}) {
  if (!user) return { valid: false, errors: { permission: "Sign in to request financing prequalification." } };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, errors: { auction: "Auction lot was not found." } };
  const partner = getFinancingPartner(storage, input.partnerId);
  const errors = {};
  if (!partner || partner.status !== "approved") errors.partnerId = "Choose an approved financing partner.";
  if (!String(input.requestedAmount || "").trim() || !Number(input.requestedAmount)) errors.requestedAmount = "Requested amount is required.";
  if (!String(input.buyerType || "").trim()) errors.buyerType = "Buyer type is required.";
  if (!String(input.useOfAsset || "").trim()) errors.useOfAsset = "Use of asset is required.";
  if (!String(input.notes || "").trim()) errors.notes = "Referral notes are required.";
  if (Object.keys(errors).length) return { valid: false, errors };
  const requestedAmount = Number(input.requestedAmount);
  const request = {
    requestId: `finance-request-${Date.now()}`,
    auctionId,
    assetId: auctionId,
    requesterId: user.id,
    sellerId: auction.sellerId,
    partnerId: partner.partnerId,
    partnerName: partner.companyName,
    productType: input.productType || partner.productTypes[0],
    requestedAmount,
    buyerType: String(input.buyerType).trim(),
    useOfAsset: String(input.useOfAsset).trim(),
    notes: String(input.notes).trim(),
    status: "prequalification_requested",
    creditDecisionStatus: "not_performed",
    kycDataSharingStatus: "not_active",
    documentPullStatus: "placeholder_only",
    referralDisclosure: "This is not a loan approval, lending decision, credit bureau pull, or banking API submission.",
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveFinancingRequests(storage, [request, ...loadFinancingRequests(storage)]);
  createNotification(storage, {
    recipientId: partner.ownerUserId,
    type: "financing_marketplace",
    title: "Auction financing referral requested",
    body: `${auction.title}: a buyer requested financing prequalification readiness. No real credit decision occurred.`,
    relatedRoute: "/financing/referrals",
  });
  return { valid: true, request };
}

export function updateFinancingRequestStatus(storage, user, requestId, status, updates = {}) {
  if (!FINANCING_REQUEST_STATUSES.includes(status)) return { valid: false, error: "Choose a valid financing referral status." };
  const requests = loadFinancingRequests(storage);
  const request = requests.find((item) => item.requestId === requestId);
  if (!request) return { valid: false, error: "Financing referral was not found." };
  const role = normalizeRole(user?.role);
  const partner = getFinancingPartner(storage, request.partnerId);
  const allowed = role === "admin" || request.requesterId === user?.id || request.sellerId === user?.id || partner?.ownerUserId === user?.id;
  if (!allowed) return { valid: false, error: "You can only update financing referrals related to your account." };
  const next = { ...request, ...updates, status, updatedAt: new Date().toISOString() };
  saveFinancingRequests(storage, requests.map((item) => item.requestId === requestId ? next : item));
  return { valid: true, request: next };
}

export function getFinancingMarketplaceDashboard(storage, user) {
  const role = normalizeRole(user?.role);
  const partners = loadFinancingPartners(storage);
  const requests = loadFinancingRequests(storage);
  const products = loadFinancingProducts(storage);
  if (role === "admin") return { partners, requests, products };
  const ownPartnerIds = partners.filter((partner) => partner.ownerUserId === user?.id).map((partner) => partner.partnerId);
  return {
    partners: partners.filter((partner) => partner.ownerUserId === user?.id),
    requests: requests.filter((request) => request.requesterId === user?.id || request.sellerId === user?.id || ownPartnerIds.includes(request.partnerId)),
    products: products.filter((product) => ownPartnerIds.includes(product.partnerId)),
  };
}

export function getAuctionFinancingSummary(storage, auctionId) {
  const requests = loadFinancingRequests(storage).filter((request) => request.auctionId === auctionId);
  return {
    requests,
    badge: requests.some((request) => ["offer_placeholder", "referred_placeholder"].includes(request.status)) ? "Financing referral placeholder active" : requests.length ? "Financing prequalification requested" : "Financing referrals available",
    active: requests.some((request) => ["partner_review_placeholder", "documents_requested_placeholder", "offer_placeholder", "referred_placeholder"].includes(request.status)),
  };
}
