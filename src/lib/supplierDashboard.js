import { canAccessRole, normalizeRole } from "./rbac.js";
import { APP_NAME } from "./brand.js";

export const SUPPLIER_DASHBOARD_ALLOWED_ROLES = ["supplier"];

export const SUPPLIER_DASHBOARD_STORAGE_KEY = "rentashub_supplier_dashboard";

export const SUPPLIER_ACTIONS = [
  {
    id: "add-asset",
    label: "Add Asset",
    description: "Create a new rental, sale, swap, trade, or brokerage asset.",
    route: "/list-asset",
  },
  {
    id: "my-listings",
    label: "View My Listings",
    description: "Review active, paused, pending, and draft listings.",
    route: "/my-listings",
  },
  {
    id: "rental-requests",
    label: "Rental Requests",
    description: "Accept, decline, or clarify customer booking requests.",
    route: "/rental-requests",
  },
  {
    id: "supplier-profile",
    label: "Supplier Profile",
    description: "Manage public profile, service areas, verification, and customer trust signals.",
    route: "/supplier-profile",
  },
  {
    id: "messages",
    label: "Messages",
    description: "Open customer, broker, and support conversations.",
    route: "/messages",
  },
  {
    id: "earnings",
    label: "Earnings",
    description: "View payout, commission, deposit, and revenue summaries.",
    route: "/earnings",
  },
  {
    id: "ai-listing-help",
    label: "Get AI Listing Help",
    description: "Improve listing titles, descriptions, photos, pricing, and policies.",
    route: "/ai/listing-assistant",
  },
];

export const EMPTY_SUPPLIER_DATA = {
  businessProfile: {
    businessName: "Supplier Business",
    verificationStatus: "Pending verification",
    serviceArea: "Not set",
    responseTarget: "Under 24 hours",
  },
  listingSummary: {
    active: 0,
    pending: 0,
    paused: 0,
    draft: 0,
  },
  rentalRequests: [],
  pendingApprovals: [],
  messages: [],
  maintenanceReminders: [],
  earnings: {
    grossRevenue: 0,
    pendingPayout: 0,
    depositsHeld: 0,
    currency: "JMD",
    status: "placeholder",
  },
};

export function canAccessSupplierDashboard(role) {
  return canAccessRole(normalizeRole(role), SUPPLIER_DASHBOARD_ALLOWED_ROLES);
}

export function getVisibleSupplierActions(role) {
  if (!canAccessSupplierDashboard(role)) return [];
  return SUPPLIER_ACTIONS;
}

export function createSupplierDashboardModel({ user = {}, data = EMPTY_SUPPLIER_DATA, loading = false, error = null } = {}) {
  const merged = {
    ...EMPTY_SUPPLIER_DATA,
    ...data,
    businessProfile: {
      ...EMPTY_SUPPLIER_DATA.businessProfile,
      ...(data?.businessProfile || {}),
    },
    listingSummary: {
      ...EMPTY_SUPPLIER_DATA.listingSummary,
      ...(data?.listingSummary || {}),
    },
    earnings: {
      ...EMPTY_SUPPLIER_DATA.earnings,
      ...(data?.earnings || {}),
    },
  };
  const role = normalizeRole(user?.role || "supplier");

  return {
    productName: APP_NAME,
    userName: user?.full_name || user?.business_name || user?.email || "Supplier",
    role,
    allowed: canAccessSupplierDashboard(role),
    loading,
    error,
    actions: getVisibleSupplierActions(role),
    businessProfile: merged.businessProfile,
    listingSummary: merged.listingSummary,
    rentalRequests: merged.rentalRequests,
    pendingApprovals: merged.pendingApprovals,
    messages: merged.messages,
    maintenanceReminders: merged.maintenanceReminders,
    earnings: merged.earnings,
    emptyStates: {
      rentalRequests: merged.rentalRequests.length === 0,
      pendingApprovals: merged.pendingApprovals.length === 0,
      messages: merged.messages.length === 0,
      maintenanceReminders: merged.maintenanceReminders.length === 0,
      listings: Object.values(merged.listingSummary).every((value) => Number(value) === 0),
    },
    responsiveSections: ["welcome", "profile", "listings", "requests", "approvals", "earnings", "messages", "maintenance", "quick-actions"],
  };
}

export function loadStoredSupplierDashboardData(storage) {
  if (!storage) return EMPTY_SUPPLIER_DATA;
  const raw = storage.getItem(SUPPLIER_DASHBOARD_STORAGE_KEY);
  if (!raw) return EMPTY_SUPPLIER_DATA;
  const parsed = JSON.parse(raw);
  return {
    ...EMPTY_SUPPLIER_DATA,
    ...parsed,
    businessProfile: {
      ...EMPTY_SUPPLIER_DATA.businessProfile,
      ...(parsed.businessProfile || {}),
    },
    listingSummary: {
      ...EMPTY_SUPPLIER_DATA.listingSummary,
      ...(parsed.listingSummary || {}),
    },
    earnings: {
      ...EMPTY_SUPPLIER_DATA.earnings,
      ...(parsed.earnings || {}),
    },
  };
}
