import { getAssetListingById, loadAssetListings } from "./assetListing.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const OFFERS_STORAGE_KEY = "rentashub_marketplace_offers";
export const WANTED_REQUESTS_STORAGE_KEY = "rentashub_wanted_requests";
export const BROKER_LEADS_STORAGE_KEY = "rentashub_brokerage_leads";

export const OFFER_TYPES = ["purchase_inquiry", "cash_offer", "trade_proposal", "swap_proposal", "broker_request"];
export const WANTED_URGENCIES = ["flexible", "soon", "urgent"];
export const BROKER_LEAD_STATUSES = ["new", "accepted", "declined", "under_review"];

export const EXCHANGE_NAV = [
  { route: "/marketplace", label: "Marketplace", listingType: "all" },
  { route: "/buy", label: "Buy", listingType: "buy" },
  { route: "/sell", label: "Sell", listingType: "sell" },
  { route: "/trade", label: "Trade", listingType: "trade" },
  { route: "/swap", label: "Swap", listingType: "swap" },
  { route: "/brokerage", label: "Brokerage", listingType: "brokerage" },
  { route: "/wanted", label: "Wanted", listingType: "wanted" },
];

export function loadOffers(storage) {
  if (!storage) return [];
  const raw = storage.getItem(OFFERS_STORAGE_KEY);
  if (!raw) {
    storage.setItem(OFFERS_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveOffers(storage, offers) {
  if (!storage) return offers;
  storage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(offers));
  return offers;
}

export function canCreateOffer(user, listing) {
  const role = normalizeRole(user?.role);
  return Boolean(user && listing && ["customer", "guest", "user"].includes(role) && listing.ownerSupplierId !== user.id);
}

export function validateOfferInput(input = {}) {
  const errors = {};
  if (!OFFER_TYPES.includes(input.offerType || "")) errors.offerType = "Choose a valid offer type.";
  if (["cash_offer", "purchase_inquiry"].includes(input.offerType) && Number(input.offerAmount || 0) <= 0) errors.offerAmount = "Enter an offer amount.";
  if (input.offerType === "trade_proposal" && !String(input.tradeProposal || "").trim()) errors.tradeProposal = "Describe your trade proposal.";
  if (input.offerType === "swap_proposal" && !String(input.swapProposal || "").trim()) errors.swapProposal = "Describe your swap proposal.";
  if (input.offerType === "broker_request" && !String(input.brokerRequest || "").trim()) errors.brokerRequest = "Describe the broker assistance needed.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createMarketplaceOffer(storage, { user, listing, input = {} }) {
  if (!canCreateOffer(user, listing)) return { valid: false, errors: { permission: "Sign in as a customer to create an offer for this listing." } };
  const validation = validateOfferInput(input);
  if (!validation.valid) return validation;
  const now = new Date().toISOString();
  const offer = {
    offerId: `offer-${Date.now()}`,
    listingId: listing.id,
    assetId: listing.id,
    requesterId: user.id,
    ownerId: listing.ownerSupplierId,
    offerType: input.offerType,
    offerAmount: Number(input.offerAmount || 0),
    tradeProposal: String(input.tradeProposal || "").trim(),
    swapProposal: String(input.swapProposal || "").trim(),
    brokerRequest: String(input.brokerRequest || "").trim(),
    status: "submitted",
    createdAt: now,
  };
  saveOffers(storage, [offer, ...loadOffers(storage)]);
  createNotification(storage, {
    recipientId: listing.ownerSupplierId,
    type: "marketplace_offer",
    title: "New marketplace offer",
    body: `${user.full_name || "A customer"} submitted an offer for ${listing.title}.`,
    relatedRoute: `/listing/${listing.id}/offer`,
  });
  if (offer.offerType === "broker_request" || listing.brokerAssistRequired) {
    createBrokerLead(storage, { listing, offer, requesterId: user.id });
  }
  return { valid: true, offer };
}

export function getOffersForUser(storage, user) {
  const role = normalizeRole(user?.role);
  const offers = loadOffers(storage);
  if (role === "admin") return offers;
  if (role === "broker") return offers.filter((offer) => offer.offerType === "broker_request");
  if (["supplier", "vendor"].includes(role)) return offers.filter((offer) => offer.ownerId === user.id);
  return offers.filter((offer) => offer.requesterId === user?.id);
}

export function loadWantedRequests(storage) {
  if (!storage) return [];
  const raw = storage.getItem(WANTED_REQUESTS_STORAGE_KEY);
  if (!raw) {
    storage.setItem(WANTED_REQUESTS_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveWantedRequests(storage, requests) {
  if (!storage) return requests;
  storage.setItem(WANTED_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  return requests;
}

export function canCreateWantedRequest(user) {
  return ["customer", "guest", "user"].includes(normalizeRole(user?.role));
}

export function validateWantedRequest(input = {}) {
  const errors = {};
  if (!String(input.requestTitle || "").trim()) errors.requestTitle = "Request title is required.";
  if (!String(input.category || "").trim()) errors.category = "Category is required.";
  if (!String(input.description || "").trim()) errors.description = "Description is required.";
  if (!String(input.budgetRange || "").trim()) errors.budgetRange = "Budget range is required.";
  if (!String(input.location || "").trim()) errors.location = "Location is required.";
  if (!WANTED_URGENCIES.includes(input.urgency || "")) errors.urgency = "Choose an urgency.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createWantedRequest(storage, { user, input = {} }) {
  if (!canCreateWantedRequest(user)) return { valid: false, errors: { permission: "Sign in as a customer to post a wanted request." } };
  const validation = validateWantedRequest(input);
  if (!validation.valid) return validation;
  const request = {
    requestId: `wanted-${Date.now()}`,
    requesterId: user.id,
    requestTitle: String(input.requestTitle).trim(),
    category: String(input.category).trim(),
    description: String(input.description).trim(),
    budgetRange: String(input.budgetRange).trim(),
    location: String(input.location).trim(),
    urgency: input.urgency,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  saveWantedRequests(storage, [request, ...loadWantedRequests(storage)]);
  return { valid: true, request };
}

export function loadBrokerLeads(storage) {
  if (!storage) return [];
  const raw = storage.getItem(BROKER_LEADS_STORAGE_KEY);
  if (!raw) {
    storage.setItem(BROKER_LEADS_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveBrokerLeads(storage, leads) {
  if (!storage) return leads;
  storage.setItem(BROKER_LEADS_STORAGE_KEY, JSON.stringify(leads));
  return leads;
}

export function createBrokerLead(storage, { listing, offer = null, requesterId = "" }) {
  const lead = {
    leadId: `lead-${Date.now()}`,
    listingId: listing.id,
    assetId: listing.id,
    requesterId,
    ownerId: listing.ownerSupplierId,
    offerId: offer?.offerId || "",
    assignedBrokerId: "",
    status: "new",
    createdAt: new Date().toISOString(),
  };
  saveBrokerLeads(storage, [lead, ...loadBrokerLeads(storage)]);
  return lead;
}

export function seedBrokerageLeads(storage) {
  const existing = loadBrokerLeads(storage);
  if (existing.length) return existing;
  const leads = loadAssetListings(storage)
    .filter((listing) => listing.listingType === "brokerage" || listing.brokerAssistRequired)
    .map((listing, index) => ({
      leadId: `lead-seed-${index + 1}`,
      listingId: listing.id,
      assetId: listing.id,
      requesterId: "",
      ownerId: listing.ownerSupplierId,
      offerId: "",
      assignedBrokerId: "",
      status: "new",
      createdAt: listing.updatedAt || new Date().toISOString(),
    }));
  saveBrokerLeads(storage, leads);
  return leads;
}

export function canManageBrokerLead(user) {
  return ["broker", "admin"].includes(normalizeRole(user?.role));
}

export function updateBrokerLeadStatus(storage, user, leadId, status) {
  if (!canManageBrokerLead(user)) return { valid: false, error: "Broker lead management is limited to brokers." };
  if (!BROKER_LEAD_STATUSES.includes(status)) return { valid: false, error: "Choose a valid lead status." };
  const leads = seedBrokerageLeads(storage);
  const lead = leads.find((item) => item.leadId === leadId);
  if (!lead) return { valid: false, error: "Brokerage lead was not found." };
  const nextLead = { ...lead, status, assignedBrokerId: status === "declined" ? "" : user.id, updatedAt: new Date().toISOString() };
  saveBrokerLeads(storage, leads.map((item) => (item.leadId === leadId ? nextLead : item)));
  return { valid: true, lead: nextLead };
}

export function getBrokerLeadContext(storage, lead) {
  return {
    lead,
    listing: getAssetListingById(storage, lead.listingId),
  };
}
