import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  DOCUMENT_ENGINE_TYPES,
  generateAuctionDocumentRecord,
  getDocumentDashboard,
  getDocumentLibraryForAuction,
  loadGeneratedAuctionDocuments,
} from "../../src/lib/auctionDocumentEngine.js";
import { requestAuctionFinancingPrequalification } from "../../src/lib/financingMarketplaceService.js";
import { requestAuctionInspection, uploadInspectionReportPlaceholder, updateInspectionRequestStatus, getApprovedInspectors } from "../../src/lib/inspectionMarketplaceService.js";
import { requestAuctionTransportQuote, getApprovedTransportProviders } from "../../src/lib/transportMarketplaceService.js";

const root = process.cwd();
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };

function storage() {
  const store = new Map();
  return { getItem: (key) => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 2E document routes are wired for auction buyer supplier and admin workflows", () => {
  const app = source("src/App.jsx");
  for (const route of ["/auction/:auctionId/document-engine", "/dashboard/auction-documents", "/supplier/auction-documents", "/admin/auction-documents"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /AuctionDocumentEnginePage/);
  assert.match(app, /BuyerAuctionDocumentsPage/);
  assert.match(app, /SupplierAuctionDocumentsPage/);
  assert.match(app, /AdminAuctionDocumentsPage/);
});

test("document engine exposes required document templates and generates placeholders for related users", () => {
  const local = storage();
  for (const type of ["notice_of_sale", "auction_invoice", "sale_confirmation", "inspection_report_export", "transport_quote_booking", "financing_referral_summary", "escrow_statement"]) {
    assert.ok(DOCUMENT_ENGINE_TYPES.includes(type), `${type} missing`);
  }
  const blocked = generateAuctionDocumentRecord(local, { id: "other", role: "customer" }, "auction-excavator-001", "notice_of_sale");
  assert.equal(blocked.valid, false);
  const generated = generateAuctionDocumentRecord(local, supplier, "auction-excavator-001", "notice_of_sale");
  assert.equal(generated.valid, true);
  assert.equal(generated.document.status, "generated_placeholder");
  assert.equal(generated.document.legalStatus, "not_legally_certified");
  assert.equal(generated.document.eSignatureStatus, "not_active");
  assert.equal(loadGeneratedAuctionDocuments(local).length, 1);
});

test("document library composes inspection transport and financing marketplace source records", () => {
  const local = storage();
  const inspector = getApprovedInspectors(local)[0];
  const inspection = requestAuctionInspection(local, customer, "auction-excavator-001", {
    inspectorId: inspector.inspectorId,
    scheduledDate: "2026-06-22",
    requestNotes: "Pre-bid export readiness.",
  });
  assert.equal(inspection.valid, true);
  updateInspectionRequestStatus(local, customer, inspection.request.requestId, "booked");
  uploadInspectionReportPlaceholder(local, { id: inspector.ownerUserId, role: "supplier" }, inspection.request.requestId, {
    conditionScore: 86,
    damageNotes: "Minor cosmetic damage.",
    repairEstimateRange: "JMD 80,000 - 120,000",
    inspectorSignature: "Marsha Reid",
  });
  const carrier = getApprovedTransportProviders(local)[0];
  assert.equal(requestAuctionTransportQuote(local, customer, "auction-excavator-001", {
    providerId: carrier.providerId,
    pickupLocation: "Spanish Town yard",
    deliveryLocation: "Kingston depot",
    transportNotes: "Lowboy trailer.",
  }).valid, true);
  assert.equal(requestAuctionFinancingPrequalification(local, customer, "auction-excavator-001", {
    partnerId: "finance-capital-demo",
    productType: "equipment_finance",
    requestedAmount: 2500000,
    buyerType: "business",
    useOfAsset: "Construction fleet.",
    notes: "Referral summary readiness.",
  }).valid, true);
  const library = getDocumentLibraryForAuction(local, "auction-excavator-001");
  assert.ok(library.marketplaceSources.some((source) => source.sourceType === "inspection_report"));
  assert.ok(library.marketplaceSources.some((source) => source.sourceType === "transport_request"));
  assert.ok(library.marketplaceSources.some((source) => source.sourceType === "financing_referral"));
  const reportExport = generateAuctionDocumentRecord(local, supplier, "auction-excavator-001", "inspection_report_export");
  assert.equal(reportExport.valid, true);
  assert.match(reportExport.document.documentBody.join(" "), /condition score 86/);
});

test("document dashboards scope admin supplier and buyer counts safely", () => {
  const local = storage();
  generateAuctionDocumentRecord(local, supplier, "auction-excavator-001", "auction_invoice");
  const adminDashboard = getDocumentDashboard(local, admin, "admin");
  const supplierDashboard = getDocumentDashboard(local, supplier, "supplier");
  const buyerDashboard = getDocumentDashboard(local, customer, "buyer");
  assert.ok(adminDashboard.counts.auctions >= supplierDashboard.counts.auctions);
  assert.ok(adminDashboard.counts.generated >= 1);
  assert.ok(supplierDashboard.counts.templates >= 7);
  assert.ok(buyerDashboard.counts.auctions >= 1);
  assert.equal(adminDashboard.counts.legalCertified, 0);
  assert.equal(adminDashboard.counts.eSigned, 0);
});

test("document engine UI integrates dashboards and keeps legal/e-signature boundaries controlled", () => {
  const pages = source("src/pages/AuctionDocumentEnginePages.jsx");
  const app = source("src/App.jsx");
  const auctionPages = source("src/pages/AuctionPages.jsx");
  const customerDashboard = source("src/pages/CustomerDashboard.jsx");
  const supplierDashboard = source("src/pages/SupplierDashboard.jsx");
  const shell = source("src/components/AppShell.jsx");
  assert.match(pages, /Auction document generation engine/);
  assert.match(pages, /Notice of Sale/);
  assert.match(pages, /Transport quote \/ booking document placeholder/);
  assert.match(pages, /Financing referral summary placeholder/);
  assert.match(pages, /No legal certification, e-signature, binding PDF, tax filing, title guarantee, or live document provider is active/);
  assert.match(app, /auction-documents/);
  assert.match(auctionPages, /Document engine/);
  assert.match(customerDashboard, /Auction documents/);
  assert.match(supplierDashboard, /Auction documents/);
  assert.match(shell, /auction-documents/);
  assert.doesNotMatch(pages, /legally certified|e-signature active|binding PDF generated|title guaranteed/i);
});
