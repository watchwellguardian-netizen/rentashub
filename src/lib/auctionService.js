import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const AUCTION_LISTINGS_STORAGE_KEY = "rentashub_auction_listings";
export const AUCTION_BIDS_STORAGE_KEY = "rentashub_auction_bids";
export const AUCTION_WATCHLIST_STORAGE_KEY = "rentashub_auction_watchlist";
export const AUCTION_AUDIT_STORAGE_KEY = "rentashub_auction_audit";
export const AUCTION_ESCROW_STORAGE_KEY = "rentashub_auction_escrow";
export const AUCTION_KYC_STORAGE_KEY = "rentashub_auction_kyc";
export const AUCTION_DISPUTES_STORAGE_KEY = "rentashub_auction_disputes";
export const AUCTION_IDEMPOTENCY_STORAGE_KEY = "rentashub_auction_idempotency_records";

export const AUCTION_CATEGORIES = [
  { id: "cars", label: "Cars" },
  { id: "trucks", label: "Trucks" },
  { id: "suvs", label: "SUVs" },
  { id: "motorcycles", label: "Motorcycles" },
  { id: "vans", label: "Vans" },
  { id: "heavy-equipment", label: "Heavy Equipment" },
  { id: "small-equipment", label: "Small Equipment" },
  { id: "tools", label: "Power Tools" },
  { id: "appliances", label: "Appliances" },
  { id: "marine-vessels", label: "Marine Vessels" },
  { id: "commercial-inventory", label: "Commercial Inventory" },
  { id: "government-surplus", label: "Government Surplus" },
  { id: "customs-lots", label: "Customs Auction Lots" },
  { id: "court-ordered-assets", label: "Court-Ordered Assets" },
  { id: "insurance-salvage", label: "Insurance Salvage" },
  { id: "repossessed-assets", label: "Repossessed Assets" },
  { id: "private-seller-goods", label: "Private Seller Goods" },
];

export const AUCTION_PARISHES = ["Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. James", "St. Ann", "Westmoreland", "St. Elizabeth", "Hanover", "Trelawny", "St. Mary", "Portland", "St. Thomas"];
export const AUCTION_TYPES = ["timed", "sealed_bid", "reserve", "repossessed", "private_seller"];
export const AUCTION_STATUSES = ["draft", "pending_approval", "upcoming", "live", "extended", "closed", "sold", "unsold", "rejected", "suspended", "under_investigation", "cancelled"];
export const BIDDER_TIERS = ["none", "basic", "enhanced", "dealer", "institutional"];
export const ASSET_LIFECYCLE_STATES = ["available_for_rent", "available_for_sale", "available_for_auction", "auction_scheduled", "auction_active", "auction_closed", "sold", "unsold", "suspended", "under_investigation"];
export const AUCTION_PAYMENT_STATUSES = ["not_started", "deposit_pending", "deposit_simulated", "balance_pending", "fully_simulated_paid", "escrow_held_simulated", "ready_for_payout_simulated", "payout_complete_simulated", "refund_pending_simulated", "refund_complete_simulated", "failed_buyer", "cancelled"];
export const AUCTION_ESCROW_STATUSES = ["not_created", "deposit_pending", "deposit_recorded_simulated", "auction_won", "balance_pending", "fully_paid_simulated", "escrow_held_simulated", "dispute_hold_simulated", "ready_for_payout_simulated", "refund_pending_simulated", "cancelled"];
export const AUCTION_DOCUMENT_TYPES = ["buyer_invoice", "seller_proceeds_statement", "escrow_statement", "gct_invoice", "deficiency_notice", "sale_confirmation", "bill_of_sale", "notice_of_sale"];
export const AUCTION_NOTIFICATION_EVENTS = ["auction_approved", "auction_rejected", "auction_started", "outbid", "highest_bidder", "auction_ending_soon", "auction_extended", "auction_won", "deposit_due", "balance_due", "payment_received", "escrow_released", "inspection_completed", "transport_confirmed", "dispute_opened", "listing_suspended", "title_transfer_step_due"];
export const AUCTION_DISPUTE_STATUSES = ["draft", "submitted", "under_review", "evidence_requested", "admin_review", "resolved_simulated", "closed_simulated", "cancelled"];
export const AUCTION_COMPLIANCE_STEPS = [
  "auctioneer_licence_display",
  "electronic_consent",
  "auction_terms_downloadable",
  "kyc_before_bidding",
  "trn_capture",
  "government_id_placeholder",
  "data_protection_consent",
  "gct_invoice_ready",
  "notice_of_sale_ready",
  "ten_day_notice_period",
  "proceeds_waterfall_ready",
  "as_is_where_is_disclosure",
  "seller_right_to_bid_disclosure",
  "shill_bidding_prevention",
  "title_lien_disclosure",
];
export const AUCTION_PROVIDER_INTERFACES = {
  payments: ["stripe_connect_placeholder", "wipay_placeholder", "lynk_business_placeholder", "ncb_merchant_placeholder"],
  escrow: ["stripe_connect_escrow_architecture", "wipay_escrow_readiness", "manual_deposit_hold_model", "legal_trust_account_model"],
  notifications: ["in_app_local", "email_provider_placeholder", "sms_provider_placeholder", "push_provider_placeholder"],
  realtime: ["local_refresh", "websocket_provider_placeholder"],
  documents: ["html_placeholder", "pdf_renderer_placeholder"],
  inspection: ["rentashub_inspection_placeholder", "certified_inspector_provider_placeholder"],
  transport: ["rentashub_transport_placeholder", "haulage_provider_placeholder"],
  financing: ["financing_referral_placeholder", "bank_partner_webhook_placeholder"],
};
export const AUCTION_STATUS_TRANSITIONS = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["upcoming", "live", "rejected", "suspended", "cancelled"],
  upcoming: ["live", "suspended", "cancelled"],
  live: ["extended", "closed", "suspended", "under_investigation", "cancelled"],
  extended: ["closed", "suspended", "under_investigation", "cancelled"],
  closed: ["sold", "unsold", "under_investigation"],
  sold: ["under_investigation"],
  unsold: ["pending_approval", "cancelled"],
  suspended: ["pending_approval", "under_investigation", "cancelled"],
  under_investigation: ["suspended", "cancelled", "closed"],
  cancelled: [],
};
export const AUCTION_PAYMENT_TRANSITIONS = {
  not_started: ["deposit_pending", "cancelled"],
  deposit_pending: ["deposit_simulated", "failed_buyer", "cancelled"],
  deposit_simulated: ["balance_pending", "refund_pending_simulated", "cancelled"],
  balance_pending: ["fully_simulated_paid", "failed_buyer", "refund_pending_simulated"],
  fully_simulated_paid: ["escrow_held_simulated", "ready_for_payout_simulated", "refund_pending_simulated"],
  escrow_held_simulated: ["ready_for_payout_simulated", "refund_pending_simulated"],
  ready_for_payout_simulated: ["payout_complete_simulated"],
  payout_complete_simulated: [],
  refund_pending_simulated: ["refund_complete_simulated"],
  refund_complete_simulated: [],
  failed_buyer: ["cancelled"],
  cancelled: [],
};
export const AUCTION_ESCROW_TRANSITIONS = {
  not_created: ["deposit_pending", "cancelled"],
  deposit_pending: ["deposit_recorded_simulated", "cancelled"],
  deposit_recorded_simulated: ["auction_won", "refund_pending_simulated"],
  auction_won: ["balance_pending", "dispute_hold_simulated"],
  balance_pending: ["fully_paid_simulated", "dispute_hold_simulated"],
  fully_paid_simulated: ["escrow_held_simulated", "ready_for_payout_simulated"],
  escrow_held_simulated: ["ready_for_payout_simulated", "dispute_hold_simulated"],
  dispute_hold_simulated: ["ready_for_payout_simulated", "refund_pending_simulated", "cancelled"],
  ready_for_payout_simulated: [],
  refund_pending_simulated: [],
  cancelled: [],
};
export const AUCTION_ROUTE_GROUPS = {
  public: ["/auctions", "/auctions/live", "/auctions/upcoming", "/auctions/ending-soon", "/auction-calendar", "/auction-rules", "/auction-legal-disclosures", "/how-auctions-work"],
  buyer: ["/dashboard/auctions", "/dashboard/auction-watchlist", "/dashboard/my-bids", "/dashboard/won-auctions", "/dashboard/auction-payments", "/dashboard/auction-escrow", "/dashboard/title-transfer", "/dashboard/auction-disputes"],
  seller: ["/supplier/auctions", "/supplier/auction-listings", "/supplier/create-auction", "/supplier/bulk-auction-upload", "/supplier/repossession-workflow", "/supplier/notice-of-sale", "/supplier/proceeds-waterfall", "/supplier/auction-analytics", "/supplier/auction-payouts"],
  dealer: ["/dealer/auction-dashboard", "/dealer/bulk-bidding", "/dealer/fleet-purchases", "/dealer/dealer-only-auctions", "/dealer/market-intelligence"],
  admin: ["/admin/auctions", "/admin/auction-approvals", "/admin/auction-compliance", "/admin/kyc-review", "/admin/fraud-alerts", "/admin/bid-ledger", "/admin/auction-disputes", "/admin/gct-reports", "/admin/government-auctions", "/admin/court-sales", "/admin/customs-auctions", "/admin/auction-settings"],
};
export const AUCTION_CONTRACT_REQUIRED_FIELDS = ["id", "lotNumber", "title", "category", "sellerId", "auctionType", "status", "startingBid", "minimumIncrement", "endTime"];

const now = new Date("2026-06-13T12:00:00.000Z");

export function createSeedAuctions() {
  return [
    {
      id: "auction-excavator-001",
      lotNumber: "RH-AUC-2026-0001",
      title: "2018 Caterpillar 320 Excavator",
      category: "heavy-equipment",
      parish: "St. Catherine",
      location: "Spanish Town, St. Catherine",
      sellerId: "review-supplier",
      sellerName: "RentasHub Demo Supplier",
      sellerType: "Institutional Seller",
      auctionType: "reserve",
      assetLifecycleState: "auction_active",
      status: "live",
      startTime: "2026-06-10T14:00:00.000Z",
      endTime: "2026-06-20T20:00:00.000Z",
      startingBid: 7200000,
      currentBid: 7900000,
      reservePrice: 8500000,
      minimumIncrement: 50000,
      buyerPremiumPercent: 5,
      depositRequired: 250000,
      watchers: 38,
      bidCount: 8,
      highBidderId: "bidder-seed-2",
      winningBidderId: "",
      asIsWhereIs: true,
      repossessed: true,
      governmentLot: false,
      customsLot: false,
      courtOrdered: false,
      titleDisclosure: "Seller-declared ownership and lien records are available for buyer review. RentasHub does not warrant title.",
      legalDisclosure: "RentasHub displays seller-declared and system-available title, lien, and ownership information but does not warrant, insure, or guarantee title. Final title verification remains the buyer's responsibility unless a paid third-party verification service is separately purchased.",
      inspectionSummary: "Upload-ready inspection workflow. Third-party inspection activation is pending.",
      transportSummary: "Transport marketplace is provider-ready; no live haulage booking is activated.",
      financingSummary: "Financing referrals are informational only. RentasHub does not originate loans.",
      paymentTerms: "Simulated deposit and escrow ledger only. No real funds are held.",
      collectionTerms: "Buyer must arrange collection after full simulated settlement and seller release approval.",
      complianceFlags: ["notice_of_sale_ready", "as_is_where_is_disclosed"],
      complianceChecklist: createDefaultComplianceChecklist(["notice_of_sale_ready", "as_is_where_is_disclosed", "kyc_before_bidding", "electronic_consent", "title_lien_disclosure"]),
      paymentStatus: "deposit_pending",
      escrowStatus: "deposit_pending",
      documentPlaceholders: createDocumentPlaceholders("auction-excavator-001"),
      notificationEventQueue: createDefaultNotificationEvents("auction-excavator-001"),
      providerInterfaces: AUCTION_PROVIDER_INTERFACES,
      lifecycleHistory: [{ status: "live", actorId: "system-seed", timestamp: "2026-06-10T14:00:00.000Z", note: "Seed auction marked live for local review." }],
      fraudFlags: [],
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: now.toISOString(),
    },
    {
      id: "auction-car-002",
      lotNumber: "RH-AUC-2026-0002",
      title: "2020 Toyota Hiace Van",
      category: "vans",
      parish: "Kingston",
      location: "Kingston",
      sellerId: "private-seller-1",
      sellerName: "Private Seller Demo",
      sellerType: "Private Seller",
      auctionType: "timed",
      assetLifecycleState: "auction_scheduled",
      status: "upcoming",
      startTime: "2026-06-18T14:00:00.000Z",
      endTime: "2026-06-25T20:00:00.000Z",
      startingBid: 3100000,
      currentBid: 0,
      reservePrice: 0,
      minimumIncrement: 25000,
      buyerPremiumPercent: 4,
      depositRequired: 100000,
      watchers: 14,
      bidCount: 0,
      highBidderId: "",
      winningBidderId: "",
      asIsWhereIs: true,
      repossessed: false,
      governmentLot: false,
      customsLot: false,
      courtOrdered: false,
      titleDisclosure: "Vehicle documents are seller-declared and require final buyer verification.",
      legalDisclosure: "AS IS WHERE IS sale. No live title warranty is provided by RentasHub.",
      inspectionSummary: "Buyer inspection request is available as a controlled placeholder.",
      transportSummary: "Transport quotes are not live yet.",
      financingSummary: "Financing referral is not live yet.",
      paymentTerms: "Simulated deposit only.",
      collectionTerms: "Collection terms will be confirmed after auction close.",
      complianceFlags: ["as_is_where_is_disclosed"],
      complianceChecklist: createDefaultComplianceChecklist(["as_is_where_is_disclosed", "electronic_consent"]),
      paymentStatus: "not_started",
      escrowStatus: "not_created",
      documentPlaceholders: createDocumentPlaceholders("auction-car-002"),
      notificationEventQueue: createDefaultNotificationEvents("auction-car-002"),
      providerInterfaces: AUCTION_PROVIDER_INTERFACES,
      lifecycleHistory: [{ status: "upcoming", actorId: "system-seed", timestamp: "2026-06-03T10:00:00.000Z", note: "Seed auction scheduled for local review." }],
      fraudFlags: [],
      createdAt: "2026-06-03T10:00:00.000Z",
      updatedAt: now.toISOString(),
    },
    {
      id: "auction-generator-003",
      lotNumber: "RH-AUC-2026-0003",
      title: "Commercial Diesel Generator Lot",
      category: "commercial-inventory",
      parish: "St. James",
      location: "Montego Bay, St. James",
      sellerId: "government-agency-demo",
      sellerName: "Agency Seller Demo",
      sellerType: "Government Agency Seller",
      auctionType: "sealed_bid",
      assetLifecycleState: "auction_active",
      status: "live",
      startTime: "2026-06-08T14:00:00.000Z",
      endTime: "2026-06-15T20:00:00.000Z",
      startingBid: 950000,
      currentBid: 0,
      reservePrice: 1200000,
      minimumIncrement: 20000,
      buyerPremiumPercent: 5,
      depositRequired: 50000,
      watchers: 21,
      bidCount: 3,
      highBidderId: "",
      winningBidderId: "",
      asIsWhereIs: true,
      repossessed: false,
      governmentLot: true,
      customsLot: false,
      courtOrdered: false,
      titleDisclosure: "Government authorization placeholder and asset disposal authorization required before live sale.",
      legalDisclosure: "Sealed bids remain hidden until controlled close simulation. No government sale is live.",
      inspectionSummary: "Serial number photo upload-ready placeholder.",
      transportSummary: "Bulk goods transport provider directory pending.",
      financingSummary: "Financing referral is not live yet.",
      paymentTerms: "Simulated balance and escrow only.",
      collectionTerms: "Collection by appointment after controlled award notice.",
      complianceFlags: ["government_authorization_required", "as_is_where_is_disclosed"],
      complianceChecklist: createDefaultComplianceChecklist(["government_authorization_required", "as_is_where_is_disclosed", "auction_terms_downloadable", "data_protection_consent"]),
      paymentStatus: "balance_pending",
      escrowStatus: "auction_won",
      documentPlaceholders: createDocumentPlaceholders("auction-generator-003"),
      notificationEventQueue: createDefaultNotificationEvents("auction-generator-003"),
      providerInterfaces: AUCTION_PROVIDER_INTERFACES,
      lifecycleHistory: [{ status: "live", actorId: "system-seed", timestamp: "2026-06-08T14:00:00.000Z", note: "Seed sealed-bid auction marked live for local review." }],
      fraudFlags: [],
      createdAt: "2026-06-04T10:00:00.000Z",
      updatedAt: now.toISOString(),
    },
  ];
}

export function createDefaultComplianceChecklist(completed = []) {
  return AUCTION_COMPLIANCE_STEPS.map((step) => ({
    step,
    status: completed.includes(step) ? "complete" : "pending",
    required: true,
    evidencePlaceholder: `${step}_evidence_placeholder`,
    simulatedOnly: true,
  }));
}

export function createDocumentPlaceholders(auctionId) {
  return AUCTION_DOCUMENT_TYPES.map((type) => ({
    documentId: `${auctionId}-${type}`,
    auctionId,
    type,
    status: "placeholder_ready",
    generated: false,
    downloadReady: false,
    note: "PDF/document generation is a controlled placeholder. No legal document is generated.",
  }));
}

export function createDefaultNotificationEvents(auctionId) {
  return AUCTION_NOTIFICATION_EVENTS.map((eventType) => ({
    eventId: `${auctionId}-${eventType}`,
    auctionId,
    eventType,
    channels: eventType === "highest_bidder" ? ["in_app"] : ["in_app", "email_placeholder", "sms_placeholder", "push_placeholder"],
    status: "provider_inactive",
    note: "Only local in-app notifications are active. Email, SMS, and push providers are placeholders.",
  }));
}

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

export function loadAuctionListings(storage) {
  return readJson(storage, AUCTION_LISTINGS_STORAGE_KEY, createSeedAuctions());
}

export function saveAuctionListings(storage, listings) {
  return writeJson(storage, AUCTION_LISTINGS_STORAGE_KEY, listings);
}

export function loadAuctionBids(storage) {
  return readJson(storage, AUCTION_BIDS_STORAGE_KEY, [
    { bidId: "bid-seed-1", auctionId: "auction-excavator-001", bidderId: "bidder-seed-1", bidderName: "Verified Bidder Demo", amount: 7600000, bidType: "standard", status: "accepted", createdAt: "2026-06-12T12:00:00.000Z" },
    { bidId: "bid-seed-2", auctionId: "auction-excavator-001", bidderId: "bidder-seed-2", bidderName: "Dealer Demo", amount: 7900000, bidType: "proxy", maxBid: 8200000, status: "highest", createdAt: "2026-06-12T13:00:00.000Z" },
    { bidId: "bid-seed-3", auctionId: "auction-generator-003", bidderId: "sealed-demo", bidderName: "Sealed Bidder", amount: 0, sealedAmount: 1260000, bidType: "sealed", status: "sealed", createdAt: "2026-06-12T14:00:00.000Z" },
  ]);
}

export function saveAuctionBids(storage, bids) {
  return writeJson(storage, AUCTION_BIDS_STORAGE_KEY, bids);
}

export function loadAuctionWatchlist(storage) {
  return readJson(storage, AUCTION_WATCHLIST_STORAGE_KEY, []);
}

export function saveAuctionWatchlist(storage, watchlist) {
  return writeJson(storage, AUCTION_WATCHLIST_STORAGE_KEY, watchlist);
}

export function loadAuctionAudit(storage) {
  return readJson(storage, AUCTION_AUDIT_STORAGE_KEY, []);
}

export function appendAuctionAudit(storage, event) {
  const entry = { id: `auction-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), ...event };
  writeJson(storage, AUCTION_AUDIT_STORAGE_KEY, [entry, ...loadAuctionAudit(storage)]);
  return entry;
}

export function loadAuctionEscrowLedger(storage) {
  return readJson(storage, AUCTION_ESCROW_STORAGE_KEY, []);
}

export function appendAuctionEscrowLedger(storage, entry) {
  const record = { id: `auction-escrow-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), simulatedOnly: true, ...entry };
  writeJson(storage, AUCTION_ESCROW_STORAGE_KEY, [record, ...loadAuctionEscrowLedger(storage)]);
  return record;
}

export function loadAuctionKycRecords(storage) {
  return readJson(storage, AUCTION_KYC_STORAGE_KEY, [
    { userId: "review-customer", tier: "basic", status: "verified", trnCaptured: true, governmentIdUploaded: true, electronicConsent: true, enhanced: false },
    { userId: "review-broker", tier: "dealer", status: "verified", trnCaptured: true, governmentIdUploaded: true, electronicConsent: true, enhanced: true },
  ]);
}

export function loadAuctionDisputes(storage) {
  return readJson(storage, AUCTION_DISPUTES_STORAGE_KEY, []);
}

export function saveAuctionDisputes(storage, disputes) {
  return writeJson(storage, AUCTION_DISPUTES_STORAGE_KEY, disputes);
}

export function loadAuctionIdempotencyRecords(storage) {
  return readJson(storage, AUCTION_IDEMPOTENCY_STORAGE_KEY, []);
}

export function saveAuctionIdempotencyRecords(storage, records) {
  return writeJson(storage, AUCTION_IDEMPOTENCY_STORAGE_KEY, records);
}

function findAuctionIdempotencyRecord(storage, key) {
  if (!key) return null;
  return loadAuctionIdempotencyRecords(storage).find((record) => record.key === key) || null;
}

function recordAuctionIdempotency(storage, record) {
  if (!record?.key) return null;
  const records = loadAuctionIdempotencyRecords(storage).filter((item) => item.key !== record.key);
  const next = { createdAt: new Date().toISOString(), ...record };
  saveAuctionIdempotencyRecords(storage, [next, ...records]);
  return next;
}

export function getBidderVerification(storage, user) {
  return loadAuctionKycRecords(storage).find((record) => record.userId === user?.id) || { userId: user?.id || "", tier: "none", status: "not_started", trnCaptured: false, governmentIdUploaded: false, electronicConsent: false, enhanced: false };
}

export function getAuctionById(storage, auctionId) {
  return loadAuctionListings(storage).find((auction) => auction.id === auctionId) || null;
}

export function getAuctionBids(storage, auctionId) {
  return loadAuctionBids(storage).filter((bid) => bid.auctionId === auctionId);
}

export function getVisibleBidHistory(storage, auctionId) {
  return getAuctionBids(storage, auctionId).map((bid) => ({
    ...bid,
    amount: bid.bidType === "sealed" ? 0 : bid.amount,
    sealedAmount: undefined,
  }));
}

export function filterAuctions(storage, filters = {}) {
  const listings = loadAuctionListings(storage);
  return listings.filter((auction) => {
    if (filters.status && auction.status !== filters.status) return false;
    if (filters.category && auction.category !== filters.category) return false;
    if (filters.parish && auction.parish.toLowerCase().replace(/\s+/g, "-") !== filters.parish) return false;
    if (filters.endingSoon) {
      const hours = (new Date(auction.endTime).getTime() - now.getTime()) / 36e5;
      if (hours > 72 || !["live", "extended"].includes(auction.status)) return false;
    }
    return true;
  });
}

export function canBid(user, auction, verification) {
  const role = normalizeRole(user?.role);
  if (!user) return { allowed: false, reason: "Sign in as a verified bidder before bidding." };
  if (!["customer", "guest", "user", "broker"].includes(role)) return { allowed: false, reason: "Only bidder, customer, or dealer review roles may bid." };
  if (auction?.sellerId === user.id) return { allowed: false, reason: "Sellers cannot bid on their own auction lots." };
  if (!["live", "extended"].includes(auction?.status)) return { allowed: false, reason: "Bidding is available only while an auction is live." };
  if (!verification || verification.status !== "verified" || verification.tier === "none") return { allowed: false, reason: "Auction bidding requires Basic Bidder verification and electronic consent." };
  return { allowed: true, reason: "" };
}

export function validateAuctionInput(input = {}) {
  const errors = {};
  if (!String(input.title || "").trim()) errors.title = "Auction title is required.";
  if (!AUCTION_CATEGORIES.some((category) => category.id === input.category)) errors.category = "Choose a supported movable asset category.";
  if (String(input.category || "").includes("real-estate")) errors.category = "Land, houses, buildings, and immovable property are excluded from RentasHub Auctions.";
  if (!String(input.parish || "").trim()) errors.parish = "Parish is required.";
  if (!AUCTION_TYPES.includes(input.auctionType || "")) errors.auctionType = "Choose a supported auction type.";
  if (Number(input.startingBid || 0) <= 0) errors.startingBid = "Starting bid must be greater than zero.";
  if (Number(input.minimumIncrement || 0) <= 0) errors.minimumIncrement = "Minimum increment must be greater than zero.";
  if (!String(input.endTime || "").trim()) errors.endTime = "End time is required.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function calculateAuctionFinancials(auction = {}, winningAmount = 0) {
  const hammerPrice = Number(winningAmount || auction.currentBid || auction.startingBid || 0);
  const buyerPremium = Math.round((hammerPrice * Number(auction.buyerPremiumPercent || 0)) / 100);
  const depositRequired = Number(auction.depositRequired || 0);
  const reservePrice = Number(auction.reservePrice || 0);
  const totalBuyerObligation = hammerPrice + buyerPremium;
  return {
    hammerPrice,
    buyerPremium,
    depositRequired,
    balanceDue: Math.max(0, totalBuyerObligation - depositRequired),
    totalBuyerObligation,
    reservePrice,
    reserveMet: reservePrice <= 0 || hammerPrice >= reservePrice,
    sellerProceedsPlaceholder: hammerPrice,
    moneyMovementStatus: "simulated_only",
  };
}

export function validateAuctionContract(auction = {}) {
  const errors = {};
  for (const field of AUCTION_CONTRACT_REQUIRED_FIELDS) {
    if (auction[field] === undefined || auction[field] === null || auction[field] === "") errors[field] = `${field} is required.`;
  }
  if (auction.category && !AUCTION_CATEGORIES.some((category) => category.id === auction.category)) errors.category = "Unsupported auction category.";
  if (String(auction.category || "").includes("real-estate")) errors.category = "Immovable property categories are not supported.";
  if (auction.auctionType && !AUCTION_TYPES.includes(auction.auctionType)) errors.auctionType = "Unsupported auction type.";
  if (auction.status && !AUCTION_STATUSES.includes(auction.status)) errors.status = "Unsupported auction status.";
  if (Number(auction.startingBid || 0) <= 0) errors.startingBid = "Starting bid must be greater than zero.";
  if (Number(auction.minimumIncrement || 0) <= 0) errors.minimumIncrement = "Minimum increment must be greater than zero.";
  if (Number(auction.depositRequired || 0) < 0) errors.depositRequired = "Deposit cannot be negative.";
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    providerBoundary: "local_contract_only",
    productionReady: false,
  };
}

export function createAuctionContractSnapshot(storage, auctionId) {
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return null;
  const bids = getAuctionBids(storage, auctionId);
  const visibleBids = getVisibleBidHistory(storage, auctionId);
  const highestStandardBid = bids.filter((bid) => bid.bidType !== "sealed").sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0] || null;
  const highestSealedBid = bids.filter((bid) => bid.bidType === "sealed").sort((a, b) => Number(b.sealedAmount || 0) - Number(a.sealedAmount || 0))[0] || null;
  const leadingBid = highestSealedBid && Number(highestSealedBid.sealedAmount || 0) > Number(highestStandardBid?.amount || 0) ? highestSealedBid : highestStandardBid;
  const leadingAmount = leadingBid?.bidType === "sealed" ? Number(leadingBid.sealedAmount || 0) : Number(leadingBid?.amount || auction.currentBid || auction.startingBid || 0);
  const financials = calculateAuctionFinancials(auction, leadingAmount);
  const contract = validateAuctionContract(auction);
  return {
    auctionId,
    lotNumber: auction.lotNumber,
    contractStatus: contract.valid ? "READY_LOCAL_CONTRACT" : "BLOCKED_CONTRACT_ERRORS",
    contractErrors: contract.errors,
    bidCount: bids.length,
    visibleBidCount: visibleBids.length,
    leadingBidderId: leadingBid?.bidderId || auction.highBidderId || "",
    leadingBidType: leadingBid?.bidType || "",
    financials,
    canCloseLocally: contract.valid && ["live", "extended"].includes(auction.status) && bids.length > 0,
    blockers: [
      "No live auction exchange provider is active.",
      "No real payment, escrow, title transfer, legal, email, SMS, push, or socket provider is active.",
    ],
    providerBoundary: "provider_independent_local_only",
    productionReady: false,
  };
}

export function createAuctionListing(storage, user, input = {}) {
  if (!["supplier", "vendor", "admin"].includes(normalizeRole(user?.role))) return { valid: false, errors: { permission: "Only suppliers or controlled admins can create auction listings." } };
  const validation = validateAuctionInput(input);
  if (!validation.valid) return validation;
  const count = loadAuctionListings(storage).length + 1;
  const auction = {
    id: `auction-${Date.now()}`,
    lotNumber: `RH-AUC-2026-${String(count).padStart(4, "0")}`,
    title: String(input.title).trim(),
    category: input.category,
    parish: input.parish,
    location: String(input.location || input.parish).trim(),
    sellerId: user.id,
    sellerName: user.full_name || "Supplier",
    sellerType: input.sellerType || "Supplier / Seller",
    auctionType: input.auctionType,
    assetLifecycleState: "auction_scheduled",
    status: "pending_approval",
    startTime: input.startTime || new Date().toISOString(),
    endTime: input.endTime,
    startingBid: Number(input.startingBid),
    currentBid: 0,
    reservePrice: Number(input.reservePrice || 0),
    minimumIncrement: Number(input.minimumIncrement),
    buyerPremiumPercent: Number(input.buyerPremiumPercent || 5),
    depositRequired: Number(input.depositRequired || 0),
    watchers: 0,
    bidCount: 0,
    highBidderId: "",
    winningBidderId: "",
    asIsWhereIs: true,
    repossessed: Boolean(input.repossessed),
    governmentLot: Boolean(input.governmentLot),
    customsLot: Boolean(input.customsLot),
    courtOrdered: Boolean(input.courtOrdered),
    titleDisclosure: String(input.titleDisclosure || "Seller-declared ownership and lien details require buyer verification.").trim(),
    legalDisclosure: "RentasHub displays seller-declared and system-available title, lien, and ownership information but does not warrant, insure, or guarantee title. Final title verification remains the buyer's responsibility unless a paid third-party verification service is separately purchased.",
    inspectionSummary: "Inspection upload-ready placeholder.",
    transportSummary: "Transport marketplace provider-ready placeholder.",
    financingSummary: "Financing referral placeholder. RentasHub does not originate loans.",
    paymentTerms: "Simulated deposit and escrow only. No real funds are held.",
    collectionTerms: String(input.collectionTerms || "Collection terms must be confirmed by seller before approval.").trim(),
    complianceFlags: ["as_is_where_is_disclosed"],
    complianceChecklist: createDefaultComplianceChecklist(["as_is_where_is_disclosed", "electronic_consent", "auction_terms_downloadable"]),
    paymentStatus: "not_started",
    escrowStatus: "not_created",
    documentPlaceholders: createDocumentPlaceholders(`auction-${Date.now()}`),
    notificationEventQueue: [],
    providerInterfaces: AUCTION_PROVIDER_INTERFACES,
    lifecycleHistory: [{ status: "pending_approval", actorId: user.id, timestamp: new Date().toISOString(), note: "Auction created and queued for admin approval." }],
    fraudFlags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  auction.documentPlaceholders = createDocumentPlaceholders(auction.id);
  auction.notificationEventQueue = createDefaultNotificationEvents(auction.id);
  saveAuctionListings(storage, [auction, ...loadAuctionListings(storage)]);
  appendAuctionAudit(storage, { auctionId: auction.id, actorId: user.id, action: "auction_created", detail: "Auction listing created in local/demo mode." });
  return { valid: true, auction };
}

export function placeAuctionBid(storage, user, auctionId, input = {}) {
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, errors: { auction: "Auction lot was not found." } };
  const verification = getBidderVerification(storage, user);
  const permission = canBid(user, auction, verification);
  if (!permission.allowed) return { valid: false, errors: { permission: permission.reason } };
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  const existingRecord = findAuctionIdempotencyRecord(storage, idempotencyKey);
  if (existingRecord) {
    if (existingRecord.action !== "place_bid" || existingRecord.auctionId !== auctionId || existingRecord.actorId !== user.id) return { valid: false, errors: { idempotency: "Idempotency key is already used for a different auction action." } };
    const existingBid = loadAuctionBids(storage).find((bid) => bid.bidId === existingRecord.resultId);
    return existingBid ? { valid: true, idempotent: true, bid: existingBid, auction: getAuctionById(storage, auctionId) } : { valid: false, errors: { idempotency: "Idempotency record points to a missing bid." } };
  }
  const bidType = input.bidType || "standard";
  const bidAmount = Number(input.amount || 0);
  const currentFloor = Number(auction.currentBid || auction.startingBid || 0);
  const requiredAmount = currentFloor + Number(auction.minimumIncrement || 1);
  if (bidType !== "sealed" && bidAmount < requiredAmount) return { valid: false, errors: { amount: `Bid must be at least JMD ${requiredAmount.toLocaleString()}.` } };
  if (bidType === "sealed" && bidAmount <= 0) return { valid: false, errors: { amount: "Sealed bid amount is required." } };

  const bid = {
    bidId: `bid-${Date.now()}`,
    auctionId,
    bidderId: user.id,
    bidderName: user.full_name || "Verified Bidder",
    amount: bidType === "sealed" ? 0 : bidAmount,
    sealedAmount: bidType === "sealed" ? bidAmount : undefined,
    bidType,
    maxBid: bidType === "proxy" ? Number(input.maxBid || bidAmount) : undefined,
    status: bidType === "sealed" ? "sealed" : "highest",
    createdAt: new Date().toISOString(),
  };

  const bids = loadAuctionBids(storage).map((existing) => existing.auctionId === auctionId && existing.status === "highest" ? { ...existing, status: "outbid" } : existing);
  saveAuctionBids(storage, [bid, ...bids]);
  const nextAuction = bidType === "sealed"
    ? { ...auction, bidCount: Number(auction.bidCount || 0) + 1, updatedAt: new Date().toISOString() }
    : { ...auction, currentBid: bidAmount, highBidderId: user.id, bidCount: Number(auction.bidCount || 0) + 1, updatedAt: new Date().toISOString() };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: bidType === "sealed" ? "sealed_bid_submitted" : "bid_submitted", detail: "Bid was timestamped and stored in the local immutable-style audit log." });
  createNotification(storage, {
    recipientId: user.id,
    type: "auction_bid",
    title: bidType === "sealed" ? "Sealed bid submitted" : "You are highest bidder",
    body: `${auction.title}: ${bidType === "sealed" ? "your sealed bid is stored for controlled close simulation" : "your bid is currently highest"}.`,
    relatedRoute: `/auction/${auctionId}`,
  });
  if (bidType !== "sealed" && bidAmount >= Number(auction.reservePrice || 0)) {
    appendAuctionEscrowLedger(storage, { auctionId, bidderId: user.id, type: "deposit_hold", status: "simulated_pending", amount: Number(auction.depositRequired || 0), note: "Deposit hold readiness record only; no real funds are held." });
  }
  recordAuctionIdempotency(storage, { key: idempotencyKey, action: "place_bid", auctionId, actorId: user.id, resultId: bid.bidId });
  return { valid: true, bid, auction: nextAuction };
}

export function closeAuctionLocally(storage, user, auctionId, input = {}) {
  if (!["admin", "auction_admin", "super_admin"].includes(normalizeRole(user?.role))) return { valid: false, errors: { permission: "Auction close and award requires auction admin access." } };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, errors: { auction: "Auction lot was not found." } };
  const idempotencyKey = String(input.idempotencyKey || "").trim();
  const existingRecord = findAuctionIdempotencyRecord(storage, idempotencyKey);
  if (existingRecord) {
    if (existingRecord.action !== "close_auction" || existingRecord.auctionId !== auctionId || existingRecord.actorId !== user.id) return { valid: false, errors: { idempotency: "Idempotency key is already used for a different auction action." } };
    const closedAuction = getAuctionById(storage, auctionId);
    return { valid: true, idempotent: true, auction: closedAuction, award: existingRecord.award || null };
  }
  if (!["live", "extended"].includes(auction.status)) return { valid: false, errors: { status: "Only live or extended auctions can be closed locally." } };
  const snapshot = createAuctionContractSnapshot(storage, auctionId);
  if (!snapshot?.canCloseLocally) return { valid: false, errors: { contract: "Auction contract is not ready to close locally." } };
  const award = snapshot.financials.reserveMet && snapshot.leadingBidderId
    ? {
        bidderId: snapshot.leadingBidderId,
        bidType: snapshot.leadingBidType,
        hammerPrice: snapshot.financials.hammerPrice,
        buyerPremium: snapshot.financials.buyerPremium,
        totalBuyerObligation: snapshot.financials.totalBuyerObligation,
        balanceDue: snapshot.financials.balanceDue,
        awardStatus: "local_award_ready",
      }
    : {
        bidderId: "",
        bidType: "",
        hammerPrice: snapshot.financials.hammerPrice,
        buyerPremium: 0,
        totalBuyerObligation: 0,
        balanceDue: 0,
        awardStatus: "reserve_not_met_unsold",
      };
  const nextStatus = award.bidderId ? "closed" : "unsold";
  const nextAuction = {
    ...auction,
    status: nextStatus,
    assetLifecycleState: award.bidderId ? "auction_closed" : "unsold",
    winningBidderId: award.bidderId,
    paymentStatus: award.bidderId ? "balance_pending" : auction.paymentStatus,
    escrowStatus: award.bidderId ? "auction_won" : auction.escrowStatus,
    lifecycleHistory: [...(auction.lifecycleHistory || []), { status: nextStatus, actorId: user.id, timestamp: new Date().toISOString(), note: "Auction closed locally; no live exchange, payment, escrow, or title action occurred." }],
    updatedAt: new Date().toISOString(),
  };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  if (award.bidderId) {
    appendAuctionEscrowLedger(storage, { auctionId, bidderId: award.bidderId, type: "award_balance_due", status: "simulated_pending", amount: award.balanceDue, note: "Local award balance due record only; no real funds are held or moved." });
    queueAuctionNotificationEvent(storage, user, auctionId, "auction_won", award.bidderId);
  }
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: "auction_closed_locally", detail: award.awardStatus });
  recordAuctionIdempotency(storage, { key: idempotencyKey, action: "close_auction", auctionId, actorId: user.id, resultId: auctionId, award });
  return { valid: true, auction: nextAuction, award, contract: snapshot };
}

export function toggleAuctionWatchlist(storage, user, auctionId) {
  if (!user) return { valid: false, error: "Sign in to watch an auction." };
  const watchlist = loadAuctionWatchlist(storage);
  const exists = watchlist.some((item) => item.userId === user.id && item.auctionId === auctionId);
  const next = exists
    ? watchlist.filter((item) => !(item.userId === user.id && item.auctionId === auctionId))
    : [{ id: `watch-${Date.now()}`, userId: user.id, auctionId, createdAt: new Date().toISOString() }, ...watchlist];
  saveAuctionWatchlist(storage, next);
  return { valid: true, watching: !exists };
}

export function getAuctionDashboard(storage, user) {
  const role = normalizeRole(user?.role);
  const auctions = loadAuctionListings(storage);
  const bids = loadAuctionBids(storage);
  const watchlist = loadAuctionWatchlist(storage);
  if (["supplier", "vendor"].includes(role)) {
    const own = auctions.filter((auction) => auction.sellerId === user.id || auction.sellerId === "review-supplier");
    return { auctions: own, bids: bids.filter((bid) => own.some((auction) => auction.id === bid.auctionId)), watchlist: [] };
  }
  if (role === "admin") return { auctions, bids, watchlist, audit: loadAuctionAudit(storage), escrow: loadAuctionEscrowLedger(storage) };
  return {
    auctions,
    bids: bids.filter((bid) => bid.bidderId === user?.id),
    watchlist: watchlist.filter((item) => item.userId === user?.id).map((item) => ({ ...item, auction: getAuctionById(storage, item.auctionId) })).filter((item) => item.auction),
    won: auctions.filter((auction) => auction.winningBidderId === user?.id),
    escrow: loadAuctionEscrowLedger(storage).filter((entry) => entry.bidderId === user?.id),
  };
}

export function adminUpdateAuctionStatus(storage, user, auctionId, status) {
  if (normalizeRole(user?.role) !== "admin") return { valid: false, error: "Auction administration requires admin access." };
  if (!AUCTION_STATUSES.includes(status)) return { valid: false, error: "Choose a valid auction status." };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, error: "Auction was not found." };
  const transition = validateAuctionStatusTransition(auction.status, status);
  if (!transition.valid) return { valid: false, error: transition.error };
  const nextAuction = {
    ...auction,
    status,
    assetLifecycleState: status === "live" ? "auction_active" : status === "closed" ? "auction_closed" : status === "sold" ? "sold" : status === "unsold" ? "unsold" : ["suspended", "under_investigation"].includes(status) ? status : auction.assetLifecycleState,
    lifecycleHistory: [...(auction.lifecycleHistory || []), { status, actorId: user.id, timestamp: new Date().toISOString(), note: "Admin status action simulated locally." }],
    updatedAt: new Date().toISOString(),
  };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: `auction_${status}`, detail: "Admin status action simulated locally and audit logged." });
  return { valid: true, auction: nextAuction };
}

export function validateAuctionStatusTransition(currentStatus, nextStatus) {
  if (!AUCTION_STATUSES.includes(nextStatus)) return { valid: false, error: "Choose a valid auction status." };
  const allowed = AUCTION_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus) && currentStatus !== nextStatus) return { valid: false, error: `Cannot move auction from ${currentStatus} to ${nextStatus}.` };
  return { valid: true };
}

export function validateAuctionPaymentTransition(currentStatus, nextStatus) {
  if (!AUCTION_PAYMENT_STATUSES.includes(nextStatus)) return { valid: false, error: "Choose a valid auction payment status." };
  const allowed = AUCTION_PAYMENT_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus) && currentStatus !== nextStatus) return { valid: false, error: `Cannot move auction payment from ${currentStatus} to ${nextStatus}.` };
  return { valid: true };
}

export function validateAuctionEscrowTransition(currentStatus, nextStatus) {
  if (!AUCTION_ESCROW_STATUSES.includes(nextStatus)) return { valid: false, error: "Choose a valid auction escrow status." };
  const allowed = AUCTION_ESCROW_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus) && currentStatus !== nextStatus) return { valid: false, error: `Cannot move auction escrow from ${currentStatus} to ${nextStatus}.` };
  return { valid: true };
}

export function updateAuctionComplianceStep(storage, user, auctionId, step, status = "complete") {
  if (!["admin", "auction_admin", "compliance_officer", "super_admin"].includes(normalizeRole(user?.role))) return { valid: false, error: "Compliance updates require auction admin access." };
  if (!AUCTION_COMPLIANCE_STEPS.includes(step)) return { valid: false, error: "Choose a valid compliance step." };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, error: "Auction was not found." };
  const checklist = (auction.complianceChecklist || createDefaultComplianceChecklist()).map((item) => item.step === step ? { ...item, status, reviewedBy: user.id, reviewedAt: new Date().toISOString() } : item);
  const nextAuction = { ...auction, complianceChecklist: checklist, updatedAt: new Date().toISOString() };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: "auction_compliance_updated", detail: `${step} marked ${status} in local/demo mode.` });
  return { valid: true, auction: nextAuction };
}

export function updateAuctionPaymentWorkflow(storage, user, auctionId, { paymentStatus, escrowStatus, amount = 0, note = "" } = {}) {
  if (!["admin", "auction_admin", "super_admin"].includes(normalizeRole(user?.role))) return { valid: false, error: "Auction payment workflow updates require admin access." };
  if (paymentStatus && !AUCTION_PAYMENT_STATUSES.includes(paymentStatus)) return { valid: false, error: "Choose a valid auction payment status." };
  if (escrowStatus && !AUCTION_ESCROW_STATUSES.includes(escrowStatus)) return { valid: false, error: "Choose a valid auction escrow status." };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, error: "Auction was not found." };
  if (paymentStatus) {
    const paymentTransition = validateAuctionPaymentTransition(auction.paymentStatus || "not_started", paymentStatus);
    if (!paymentTransition.valid) return paymentTransition;
  }
  if (escrowStatus) {
    const escrowTransition = validateAuctionEscrowTransition(auction.escrowStatus || "not_created", escrowStatus);
    if (!escrowTransition.valid) return escrowTransition;
  }
  const nextAuction = { ...auction, paymentStatus: paymentStatus || auction.paymentStatus, escrowStatus: escrowStatus || auction.escrowStatus, updatedAt: new Date().toISOString() };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  appendAuctionEscrowLedger(storage, { auctionId, type: paymentStatus || escrowStatus || "status_update", status: "simulated_recorded", amount: Number(amount || 0), note: note || "Auction payment/escrow status updated in simulated mode only." });
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: "auction_payment_workflow_updated", detail: "Payment and escrow status changed without real money movement." });
  return { valid: true, auction: nextAuction };
}

export function getAuctionEscrowLedgerForAuction(storage, auctionId) {
  return loadAuctionEscrowLedger(storage).filter((entry) => entry.auctionId === auctionId);
}

export function generateAuctionDocumentPlaceholder(storage, user, auctionId, type) {
  if (!AUCTION_DOCUMENT_TYPES.includes(type)) return { valid: false, error: "Choose a valid auction document type." };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, error: "Auction was not found." };
  const role = normalizeRole(user?.role);
  const allowed = role === "admin" || role === "auction_admin" || user?.id === auction.sellerId || user?.id === auction.winningBidderId;
  if (!allowed) return { valid: false, error: "Document placeholder access is limited to related parties or admin." };
  const documents = (auction.documentPlaceholders || createDocumentPlaceholders(auctionId)).map((doc) => doc.type === type ? { ...doc, generated: true, downloadReady: false, generatedAt: new Date().toISOString(), generatedBy: user.id, note: "Placeholder generated. Real PDF rendering and legal review are not active." } : doc);
  const nextAuction = { ...auction, documentPlaceholders: documents, updatedAt: new Date().toISOString() };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: "auction_document_placeholder_generated", detail: `${type} placeholder generated.` });
  return { valid: true, document: documents.find((doc) => doc.type === type) };
}

export function queueAuctionNotificationEvent(storage, user, auctionId, eventType, recipientId = "") {
  if (!AUCTION_NOTIFICATION_EVENTS.includes(eventType)) return { valid: false, error: "Choose a valid notification event." };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, error: "Auction was not found." };
  const event = {
    eventId: `auction-event-${Date.now()}`,
    auctionId,
    eventType,
    recipientId,
    channels: ["in_app", "email_placeholder", "sms_placeholder", "push_placeholder"],
    status: "queued_local_only",
    createdBy: user?.id || "system",
    createdAt: new Date().toISOString(),
    note: "Email, SMS, and push delivery are inactive provider interfaces.",
  };
  const nextAuction = { ...auction, notificationEventQueue: [event, ...(auction.notificationEventQueue || [])], updatedAt: new Date().toISOString() };
  saveAuctionListings(storage, loadAuctionListings(storage).map((item) => item.id === auctionId ? nextAuction : item));
  if (recipientId) {
    createNotification(storage, {
      recipientId,
      type: "auction_event",
      title: eventType.replaceAll("_", " "),
      body: `${auction.title}: ${event.note}`,
      relatedRoute: `/auction/${auctionId}`,
    });
  }
  appendAuctionAudit(storage, { auctionId, actorId: user?.id || "system", action: "auction_notification_event_queued", detail: eventType });
  return { valid: true, event };
}

export function createAuctionDispute(storage, user, auctionId, input = {}) {
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, errors: { auction: "Auction was not found." } };
  if (!user) return { valid: false, errors: { permission: "Sign in to open an auction dispute." } };
  const errors = {};
  if (!String(input.reason || "").trim()) errors.reason = "Dispute reason is required.";
  if (!String(input.description || "").trim()) errors.description = "Dispute description is required.";
  if (Object.keys(errors).length) return { valid: false, errors };
  const dispute = {
    disputeId: `auction-dispute-${Date.now()}`,
    auctionId,
    openedBy: user.id,
    sellerId: auction.sellerId,
    bidderId: auction.highBidderId || user.id,
    reason: String(input.reason).trim(),
    description: String(input.description).trim(),
    status: "submitted",
    evidencePlaceholders: ["photos_placeholder", "inspection_report_placeholder", "payment_record_placeholder"],
    resolutionPlaceholder: "Admin review only. No binding mediation, arbitration, refund, payout, or escrow decision is made.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveAuctionDisputes(storage, [dispute, ...loadAuctionDisputes(storage)]);
  appendAuctionAudit(storage, { auctionId, actorId: user.id, action: "auction_dispute_opened", detail: dispute.reason });
  queueAuctionNotificationEvent(storage, user, auctionId, "dispute_opened", auction.sellerId);
  return { valid: true, dispute };
}

export function updateAuctionDisputeStatus(storage, user, disputeId, status) {
  if (!["admin", "auction_admin", "compliance_officer", "super_admin"].includes(normalizeRole(user?.role))) return { valid: false, error: "Auction dispute status updates require admin access." };
  if (!AUCTION_DISPUTE_STATUSES.includes(status)) return { valid: false, error: "Choose a valid dispute status." };
  const disputes = loadAuctionDisputes(storage);
  const dispute = disputes.find((item) => item.disputeId === disputeId);
  if (!dispute) return { valid: false, error: "Auction dispute was not found." };
  const next = { ...dispute, status, updatedAt: new Date().toISOString(), reviewedBy: user.id };
  saveAuctionDisputes(storage, disputes.map((item) => item.disputeId === disputeId ? next : item));
  appendAuctionAudit(storage, { auctionId: dispute.auctionId, actorId: user.id, action: "auction_dispute_status_updated", detail: status });
  return { valid: true, dispute: next };
}

export function getAuctionOperationalWorkflow(storage, auctionId) {
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return null;
  return {
    auction,
    complianceChecklist: auction.complianceChecklist || createDefaultComplianceChecklist(),
    paymentStatus: auction.paymentStatus || "not_started",
    escrowStatus: auction.escrowStatus || "not_created",
    documentPlaceholders: auction.documentPlaceholders || createDocumentPlaceholders(auctionId),
    notificationEventQueue: auction.notificationEventQueue || createDefaultNotificationEvents(auctionId),
    disputes: loadAuctionDisputes(storage).filter((dispute) => dispute.auctionId === auctionId),
    escrowLedger: getAuctionEscrowLedgerForAuction(storage, auctionId),
    providerInterfaces: auction.providerInterfaces || AUCTION_PROVIDER_INTERFACES,
    connectionPoints: {
      inspection: { status: "provider_ready_placeholder", route: `/auction/${auctionId}/inspection`, live: false },
      transport: { status: "provider_ready_placeholder", route: `/auction/${auctionId}/transport`, live: false },
      financing: { status: "referral_ready_placeholder", route: `/auction/${auctionId}/financing`, live: false },
      payments: { status: "simulated_only", live: false },
      escrow: { status: "simulated_only", live: false },
      realtime: { status: "local_refresh_only", live: false },
    },
  };
}

export function calculateAuctionKpis(storage) {
  const auctions = loadAuctionListings(storage);
  const bids = loadAuctionBids(storage);
  const sold = auctions.filter((auction) => auction.status === "sold").length;
  const active = auctions.filter((auction) => ["live", "extended"].includes(auction.status)).length;
  const pending = auctions.filter((auction) => auction.status === "pending_approval").length;
  const gmv = auctions.reduce((total, auction) => total + Number(auction.currentBid || 0), 0);
  return {
    active,
    upcoming: auctions.filter((auction) => auction.status === "upcoming").length,
    pending,
    suspended: auctions.filter((auction) => ["suspended", "under_investigation"].includes(auction.status)).length,
    bids: bids.length,
    watchers: auctions.reduce((total, auction) => total + Number(auction.watchers || 0), 0),
    sellThroughRate: auctions.length ? Math.round((sold / auctions.length) * 100) : 0,
    gmv,
    reserveGap: auctions.reduce((total, auction) => total + Math.max(0, Number(auction.reservePrice || 0) - Number(auction.currentBid || 0)), 0),
  };
}
