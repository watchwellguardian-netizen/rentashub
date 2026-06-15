import {
  AUCTION_DOCUMENT_TYPES,
  appendAuctionAudit,
  createDocumentPlaceholders,
  generateAuctionDocumentPlaceholder,
  getAuctionById,
  loadAuctionListings,
} from "./auctionService.js";
import { loadInspectionReports, loadInspectionRequests } from "./inspectionMarketplaceService.js";
import { loadTransportRequests } from "./transportMarketplaceService.js";
import { loadFinancingRequests } from "./financingMarketplaceService.js";
import { normalizeRole } from "./rbac.js";

export const AUCTION_DOCUMENT_ENGINE_STORAGE_KEY = "rentashub_auction_generated_documents";

export const DOCUMENT_ENGINE_TYPES = [
  "notice_of_sale",
  "auction_invoice",
  "sale_confirmation",
  "inspection_report_export",
  "transport_quote_booking",
  "financing_referral_summary",
  "escrow_statement",
  "seller_proceeds_statement",
  "bill_of_sale",
];

export const DOCUMENT_ENGINE_STATUSES = ["template_ready", "generated_placeholder", "review_required", "void_placeholder"];

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

function documentTitle(type) {
  const titles = {
    notice_of_sale: "Notice of Sale placeholder",
    auction_invoice: "Auction invoice placeholder",
    sale_confirmation: "Sale confirmation placeholder",
    inspection_report_export: "Inspection report export placeholder",
    transport_quote_booking: "Transport quote / booking document placeholder",
    financing_referral_summary: "Financing referral summary placeholder",
    escrow_statement: "Escrow statement placeholder",
    seller_proceeds_statement: "Seller proceeds statement placeholder",
    bill_of_sale: "Bill of sale placeholder",
  };
  return titles[type] || type.replaceAll("_", " ");
}

function allowedForAuction(user, auction) {
  const role = normalizeRole(user?.role);
  return role === "admin" || role === "auction_admin" || user?.id === auction?.sellerId || user?.id === auction?.winningBidderId || user?.id === auction?.highBidderId;
}

export function loadGeneratedAuctionDocuments(storage) {
  return readJson(storage, AUCTION_DOCUMENT_ENGINE_STORAGE_KEY, []);
}

export function saveGeneratedAuctionDocuments(storage, documents) {
  return writeJson(storage, AUCTION_DOCUMENT_ENGINE_STORAGE_KEY, documents);
}

export function getDocumentLibraryForAuction(storage, auctionId) {
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return null;
  const generated = loadGeneratedAuctionDocuments(storage).filter((document) => document.auctionId === auctionId);
  const auctionPlaceholders = auction.documentPlaceholders || createDocumentPlaceholders(auctionId);
  const marketplaceSources = [
    ...loadInspectionReports(storage).filter((report) => report.auctionId === auctionId).map((report) => ({ sourceType: "inspection_report", sourceId: report.reportId, label: `Inspection report - ${report.conditionScore}/100` })),
    ...loadInspectionRequests(storage).filter((request) => request.auctionId === auctionId).map((request) => ({ sourceType: "inspection_request", sourceId: request.requestId, label: `Inspection request - ${request.status.replaceAll("_", " ")}` })),
    ...loadTransportRequests(storage).filter((request) => request.auctionId === auctionId).map((request) => ({ sourceType: "transport_request", sourceId: request.requestId, label: `Transport ${request.status.replaceAll("_", " ")} - ${request.providerName}` })),
    ...loadFinancingRequests(storage).filter((request) => request.auctionId === auctionId).map((request) => ({ sourceType: "financing_referral", sourceId: request.requestId, label: `Financing ${request.status.replaceAll("_", " ")} - ${request.partnerName}` })),
  ];
  return {
    auction,
    generated,
    auctionPlaceholders,
    marketplaceSources,
    templates: DOCUMENT_ENGINE_TYPES.map((type) => ({
      type,
      title: documentTitle(type),
      status: generated.some((document) => document.type === type) ? "generated_placeholder" : "template_ready",
      legalStatus: "not_legally_certified",
      eSignatureStatus: "not_active",
      pdfStatus: "html_placeholder_only",
    })),
  };
}

export function generateAuctionDocumentRecord(storage, user, auctionId, type, input = {}) {
  if (!DOCUMENT_ENGINE_TYPES.includes(type)) return { valid: false, error: "Choose a valid document type." };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, error: "Auction was not found." };
  if (!allowedForAuction(user, auction)) return { valid: false, error: "Document generation is limited to related parties or admin." };

  if (AUCTION_DOCUMENT_TYPES.includes(type)) {
    generateAuctionDocumentPlaceholder(storage, user, auctionId, type);
  }

  const generated = {
    documentId: `doc-${type}-${Date.now()}`,
    auctionId,
    type,
    title: documentTitle(type),
    generatedBy: user.id,
    generatedForRole: normalizeRole(user.role),
    status: "generated_placeholder",
    sourceSummary: input.sourceSummary || "Generated from local/demo auction and marketplace records.",
    documentBody: buildDocumentBody(storage, auction, type),
    legalStatus: "not_legally_certified",
    eSignatureStatus: "not_active",
    pdfStatus: "html_placeholder_only",
    downloadReady: false,
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
  };
  saveGeneratedAuctionDocuments(storage, [generated, ...loadGeneratedAuctionDocuments(storage)]);
  appendAuctionAudit(storage, {
    auctionId,
    actorId: user.id,
    action: "auction_document_engine_generated",
    detail: `${type} generated as a simulation-safe placeholder. No legal certification or e-signature occurred.`,
  });
  return { valid: true, document: generated };
}

export function buildDocumentBody(storage, auction, type) {
  const inspectionReports = loadInspectionReports(storage).filter((report) => report.auctionId === auction.id);
  const transportRequests = loadTransportRequests(storage).filter((request) => request.auctionId === auction.id);
  const financingRequests = loadFinancingRequests(storage).filter((request) => request.auctionId === auction.id);
  const sections = {
    notice_of_sale: [
      `Lot: ${auction.lotNumber} - ${auction.title}`,
      `Seller: ${auction.sellerName}`,
      `Auction status: ${auction.status}`,
      "Notice wording is placeholder-only and requires legal review before live use.",
    ],
    auction_invoice: [
      `Current bid: JMD ${Number(auction.currentBid || 0).toLocaleString()}`,
      `Buyer premium: ${auction.buyerPremiumPercent || 0}%`,
      `Deposit required: JMD ${Number(auction.depositRequired || 0).toLocaleString()}`,
      "No real invoice, payment demand, tax advice, or settlement instruction is generated.",
    ],
    sale_confirmation: [
      `Auction: ${auction.title}`,
      `High bidder: ${auction.highBidderId || "not assigned"}`,
      `Sale state: ${auction.status}`,
      "Sale confirmation is a controlled placeholder only.",
    ],
    inspection_report_export: inspectionReports.length
      ? inspectionReports.map((report) => `Inspection report ${report.reportId}: condition score ${report.conditionScore}/100; signature placeholder ${report.inspectorSignaturePlaceholder}.`)
      : ["No inspection report has been uploaded. Export remains placeholder-ready."],
    transport_quote_booking: transportRequests.length
      ? transportRequests.map((request) => `${request.providerName}: ${request.status.replaceAll("_", " ")} from ${request.pickupLocation} to ${request.deliveryLocation}.`)
      : ["No transport quote or booking placeholder exists yet."],
    financing_referral_summary: financingRequests.length
      ? financingRequests.map((request) => `${request.partnerName}: ${request.status.replaceAll("_", " ")} for JMD ${Number(request.requestedAmount || 0).toLocaleString()}. No credit decision occurred.`)
      : ["No financing referral placeholder exists yet."],
    escrow_statement: [
      `Escrow status: ${auction.escrowStatus || "not_created"}`,
      `Payment status: ${auction.paymentStatus || "not_started"}`,
      "No real funds are held, released, refunded, or transferred.",
    ],
    seller_proceeds_statement: [
      `Current bid: JMD ${Number(auction.currentBid || 0).toLocaleString()}`,
      `Reserve gap: JMD ${Math.max(0, Number(auction.reservePrice || 0) - Number(auction.currentBid || 0)).toLocaleString()}`,
      "Seller proceeds waterfall is simulated and not a bank settlement.",
    ],
    bill_of_sale: [
      `Asset: ${auction.title}`,
      `Title disclosure: ${auction.titleDisclosure}`,
      "Bill of sale is not legally certified, signed, or binding.",
    ],
  };
  return sections[type] || [`${type.replaceAll("_", " ")} placeholder for ${auction.title}.`];
}

export function getDocumentDashboard(storage, user, scope = "admin") {
  const role = normalizeRole(user?.role);
  const auctions = loadAuctionListings(storage).filter((auction) => {
    if (scope === "admin" || role === "admin") return true;
    if (scope === "supplier" || ["supplier", "vendor"].includes(role)) return auction.sellerId === user?.id || auction.sellerId === "review-supplier";
    return auction.highBidderId === user?.id || auction.winningBidderId === user?.id || ["live", "extended", "closed", "sold"].includes(auction.status);
  });
  const generated = loadGeneratedAuctionDocuments(storage).filter((document) => auctions.some((auction) => auction.id === document.auctionId));
  const placeholders = auctions.flatMap((auction) => auction.documentPlaceholders || createDocumentPlaceholders(auction.id));
  return {
    scope,
    auctions,
    generated,
    placeholders,
    counts: {
      auctions: auctions.length,
      generated: generated.length,
      templates: DOCUMENT_ENGINE_TYPES.length,
      placeholders: placeholders.length,
      legalCertified: 0,
      eSigned: 0,
    },
    notice: "Documents are simulation-safe placeholders. No legal certification, e-signature, binding invoice, tax filing, or PDF provider is active.",
  };
}
