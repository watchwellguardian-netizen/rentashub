import { createNotification } from "./notificationService.js";
import { getAuctionById } from "./auctionService.js";
import { normalizeRole } from "./rbac.js";

export const INSPECTOR_PROFILES_STORAGE_KEY = "rentashub_inspector_profiles";
export const INSPECTION_REQUESTS_STORAGE_KEY = "rentashub_inspection_marketplace_requests";
export const INSPECTION_REPORTS_STORAGE_KEY = "rentashub_inspection_marketplace_reports";

export const INSPECTOR_PROFILE_STATUSES = ["pending_review", "approved", "suspended", "rejected"];
export const INSPECTION_REQUEST_STATUSES = ["quote_requested", "quote_sent", "booked", "report_uploaded", "completed", "cancelled"];
export const INSPECTION_REPORT_STATUSES = ["draft", "submitted", "admin_review", "published_placeholder"];
export const INSPECTION_SERVICE_CATEGORIES = ["vehicles", "heavy_equipment", "tools", "commercial_inventory", "marine_vessels", "government_surplus"];
export const INSPECTION_PARISHES = ["Kingston", "St. Andrew", "St. Catherine", "Clarendon", "Manchester", "St. James", "St. Ann", "Westmoreland", "St. Elizabeth", "Hanover", "Trelawny", "St. Mary", "Portland", "St. Thomas"];

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

export function createSeedInspectorProfiles() {
  return [
    {
      inspectorId: "inspector-kingston-vehicle",
      ownerUserId: "review-supplier",
      companyName: "Kingston Certified Vehicle Inspections",
      individualName: "Marsha Reid",
      certifications: ["Motor vehicle inspection", "VIN verification", "Damage assessment"],
      insuranceDocuments: ["professional_liability_placeholder.pdf"],
      serviceCategories: ["vehicles", "commercial_inventory"],
      parishesServed: ["Kingston", "St. Andrew", "St. Catherine"],
      baseRate: 18000,
      rushRate: 28000,
      availability: "Weekdays, 9 AM - 5 PM",
      status: "approved",
      rating: 4.8,
      completedReports: 42,
      simulatedOnly: true,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-13T12:00:00.000Z",
    },
    {
      inspectorId: "inspector-heavy-equipment-demo",
      ownerUserId: "equipment-inspector-demo",
      companyName: "Island Heavy Equipment Assessors",
      individualName: "Devon Clarke",
      certifications: ["Heavy equipment condition scoring", "Serial verification", "Hydraulic system review"],
      insuranceDocuments: ["equipment_inspection_policy_placeholder.pdf"],
      serviceCategories: ["heavy_equipment", "government_surplus"],
      parishesServed: ["St. Catherine", "Clarendon", "Manchester", "St. Ann"],
      baseRate: 35000,
      rushRate: 52000,
      availability: "By appointment",
      status: "approved",
      rating: 4.7,
      completedReports: 31,
      simulatedOnly: true,
      createdAt: "2026-06-02T10:00:00.000Z",
      updatedAt: "2026-06-13T12:00:00.000Z",
    },
  ];
}

export function loadInspectorProfiles(storage) {
  return readJson(storage, INSPECTOR_PROFILES_STORAGE_KEY, createSeedInspectorProfiles());
}

export function saveInspectorProfiles(storage, profiles) {
  return writeJson(storage, INSPECTOR_PROFILES_STORAGE_KEY, profiles);
}

export function loadInspectionRequests(storage) {
  return readJson(storage, INSPECTION_REQUESTS_STORAGE_KEY, []);
}

export function saveInspectionRequests(storage, requests) {
  return writeJson(storage, INSPECTION_REQUESTS_STORAGE_KEY, requests);
}

export function loadInspectionReports(storage) {
  return readJson(storage, INSPECTION_REPORTS_STORAGE_KEY, []);
}

export function saveInspectionReports(storage, reports) {
  return writeJson(storage, INSPECTION_REPORTS_STORAGE_KEY, reports);
}

export function getInspectorProfile(storage, inspectorId) {
  return loadInspectorProfiles(storage).find((profile) => profile.inspectorId === inspectorId) || null;
}

export function getApprovedInspectors(storage, filters = {}) {
  return loadInspectorProfiles(storage).filter((profile) => {
    if (profile.status !== "approved") return false;
    if (filters.category && !profile.serviceCategories.includes(filters.category)) return false;
    if (filters.parish && !profile.parishesServed.includes(filters.parish)) return false;
    return true;
  });
}

export function registerInspectorProfile(storage, user, input = {}) {
  if (!user) return { valid: false, errors: { permission: "Sign in to register as an inspector." } };
  const errors = {};
  if (!String(input.companyName || "").trim()) errors.companyName = "Company name is required.";
  if (!String(input.individualName || "").trim()) errors.individualName = "Inspector name is required.";
  if (!Array.isArray(input.serviceCategories) || !input.serviceCategories.length) errors.serviceCategories = "Choose at least one service category.";
  if (!Array.isArray(input.parishesServed) || !input.parishesServed.length) errors.parishesServed = "Choose at least one parish served.";
  if (!Number(input.baseRate || 0)) errors.baseRate = "Base inspection rate is required.";
  if (Object.keys(errors).length) return { valid: false, errors };

  const profile = {
    inspectorId: `inspector-${Date.now()}`,
    ownerUserId: user.id,
    companyName: String(input.companyName).trim(),
    individualName: String(input.individualName).trim(),
    certifications: Array.isArray(input.certifications) ? input.certifications.filter(Boolean) : [],
    insuranceDocuments: Array.isArray(input.insuranceDocuments) ? input.insuranceDocuments.filter(Boolean) : [],
    serviceCategories: input.serviceCategories,
    parishesServed: input.parishesServed,
    baseRate: Number(input.baseRate),
    rushRate: Number(input.rushRate || input.baseRate || 0),
    availability: String(input.availability || "By appointment"),
    status: "pending_review",
    rating: 0,
    completedReports: 0,
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveInspectorProfiles(storage, [profile, ...loadInspectorProfiles(storage)]);
  createNotification(storage, {
    recipientId: user.id,
    type: "inspection_marketplace",
    title: "Inspector profile submitted",
    body: "Your inspector profile is pending local admin review. No live credential verification is active.",
    relatedRoute: "/inspectors/dashboard",
  });
  return { valid: true, profile };
}

export function updateInspectorStatus(storage, user, inspectorId, status) {
  if (normalizeRole(user?.role) !== "admin") return { valid: false, error: "Inspector approval requires admin access." };
  if (!INSPECTOR_PROFILE_STATUSES.includes(status)) return { valid: false, error: "Choose a valid inspector status." };
  const profiles = loadInspectorProfiles(storage);
  const profile = profiles.find((item) => item.inspectorId === inspectorId);
  if (!profile) return { valid: false, error: "Inspector profile was not found." };
  const next = { ...profile, status, reviewedBy: user.id, updatedAt: new Date().toISOString() };
  saveInspectorProfiles(storage, profiles.map((item) => item.inspectorId === inspectorId ? next : item));
  createNotification(storage, {
    recipientId: profile.ownerUserId,
    type: "inspection_marketplace",
    title: `Inspector profile ${status.replaceAll("_", " ")}`,
    body: "This is a local/admin readiness action. No real credential adjudication occurred.",
    relatedRoute: "/inspectors/dashboard",
  });
  return { valid: true, profile: next };
}

export function requestAuctionInspection(storage, user, auctionId, input = {}) {
  if (!user) return { valid: false, errors: { permission: "Sign in to request an auction inspection." } };
  const auction = getAuctionById(storage, auctionId);
  if (!auction) return { valid: false, errors: { auction: "Auction lot was not found." } };
  const inspector = getInspectorProfile(storage, input.inspectorId);
  const errors = {};
  if (!inspector || inspector.status !== "approved") errors.inspectorId = "Choose an approved inspector.";
  if (!String(input.requestNotes || "").trim()) errors.requestNotes = "Inspection request notes are required.";
  if (Object.keys(errors).length) return { valid: false, errors };
  const request = {
    requestId: `inspection-request-${Date.now()}`,
    auctionId,
    assetId: auctionId,
    buyerId: user.id,
    sellerId: auction.sellerId,
    inspectorId: inspector.inspectorId,
    inspectorName: inspector.companyName,
    requestType: input.requestType || "buyer_requested",
    status: "quote_requested",
    quoteAmount: Number(input.quoteAmount || inspector.baseRate || 0),
    scheduledDate: input.scheduledDate || "",
    requestNotes: String(input.requestNotes).trim(),
    reportId: "",
    badgeStatus: "inspection_requested",
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveInspectionRequests(storage, [request, ...loadInspectionRequests(storage)]);
  createNotification(storage, {
    recipientId: inspector.ownerUserId,
    type: "inspection_marketplace",
    title: "Auction inspection quote requested",
    body: `${auction.title}: a buyer requested an inspection quote.`,
    relatedRoute: "/inspectors/bookings",
  });
  return { valid: true, request };
}

export function updateInspectionRequestStatus(storage, user, requestId, status, updates = {}) {
  if (!INSPECTION_REQUEST_STATUSES.includes(status)) return { valid: false, error: "Choose a valid inspection request status." };
  const requests = loadInspectionRequests(storage);
  const request = requests.find((item) => item.requestId === requestId);
  if (!request) return { valid: false, error: "Inspection request was not found." };
  const role = normalizeRole(user?.role);
  const allowed = role === "admin" || request.buyerId === user?.id || getInspectorProfile(storage, request.inspectorId)?.ownerUserId === user?.id;
  if (!allowed) return { valid: false, error: "You can only update inspection requests related to your account." };
  const next = { ...request, ...updates, status, updatedAt: new Date().toISOString() };
  saveInspectionRequests(storage, requests.map((item) => item.requestId === requestId ? next : item));
  return { valid: true, request: next };
}

export function uploadInspectionReportPlaceholder(storage, user, requestId, input = {}) {
  const request = loadInspectionRequests(storage).find((item) => item.requestId === requestId);
  if (!request) return { valid: false, errors: { request: "Inspection request was not found." } };
  const inspector = getInspectorProfile(storage, request.inspectorId);
  const role = normalizeRole(user?.role);
  if (role !== "admin" && inspector?.ownerUserId !== user?.id) return { valid: false, errors: { permission: "Only the assigned inspector or admin can upload this report placeholder." } };
  const errors = {};
  if (!String(input.conditionScore || "").trim()) errors.conditionScore = "Condition score is required.";
  if (!String(input.damageNotes || "").trim()) errors.damageNotes = "Damage notes are required.";
  if (!String(input.inspectorSignature || "").trim()) errors.inspectorSignature = "Inspector signature is required.";
  if (Object.keys(errors).length) return { valid: false, errors };
  const report = {
    reportId: `inspection-report-${Date.now()}`,
    requestId,
    auctionId: request.auctionId,
    inspectorId: request.inspectorId,
    vinVerification: input.vinVerification || "not_applicable",
    chassisVerification: input.chassisVerification || "not_applicable",
    serialVerification: input.serialVerification || "not_applicable",
    photoGallery: Array.isArray(input.photoGallery) ? input.photoGallery : ["photo_upload_placeholder"],
    conditionScore: String(input.conditionScore),
    damageNotes: String(input.damageNotes),
    repairEstimateRange: input.repairEstimateRange || "estimate_placeholder",
    inspectorSignature: String(input.inspectorSignature),
    status: "published_placeholder",
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveInspectionReports(storage, [report, ...loadInspectionReports(storage)]);
  updateInspectionRequestStatus(storage, user, requestId, "report_uploaded", { reportId: report.reportId, badgeStatus: "inspection_report_available" });
  createNotification(storage, {
    recipientId: request.buyerId,
    type: "inspection_marketplace",
    title: "Auction inspection report available",
    body: "A structured inspection report placeholder is available for review.",
    relatedRoute: "/inspectors/reports",
  });
  return { valid: true, report };
}

export function getInspectionMarketplaceDashboard(storage, user) {
  const role = normalizeRole(user?.role);
  const profiles = loadInspectorProfiles(storage);
  const requests = loadInspectionRequests(storage);
  const reports = loadInspectionReports(storage);
  if (role === "admin") return { profiles, requests, reports };
  const ownProfileIds = profiles.filter((profile) => profile.ownerUserId === user?.id).map((profile) => profile.inspectorId);
  return {
    profiles: profiles.filter((profile) => profile.ownerUserId === user?.id),
    requests: requests.filter((request) => request.buyerId === user?.id || request.sellerId === user?.id || ownProfileIds.includes(request.inspectorId)),
    reports: reports.filter((report) => requests.some((request) => request.reportId === report.reportId && (request.buyerId === user?.id || request.sellerId === user?.id || ownProfileIds.includes(request.inspectorId)))),
  };
}

export function getAuctionInspectionSummary(storage, auctionId) {
  const requests = loadInspectionRequests(storage).filter((request) => request.auctionId === auctionId);
  const reports = loadInspectionReports(storage).filter((report) => report.auctionId === auctionId);
  const latestReport = reports[0] || null;
  return {
    requests,
    reports,
    badge: latestReport ? "Inspection report available" : requests.length ? "Inspection requested" : "Inspection available",
    verifiedCondition: Boolean(latestReport),
    latestReport,
  };
}
