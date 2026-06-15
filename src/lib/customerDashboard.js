import { canAccessRole, normalizeRole } from "./rbac.js";
import { APP_NAME } from "./brand.js";

export const CUSTOMER_DASHBOARD_ALLOWED_ROLES = ["customer"];

export const CUSTOMER_DASHBOARD_STORAGE_KEY = "rentashub_customer_dashboard";

export const ACTIONS = [
  {
    id: "search-assets",
    label: "Search Assets",
    description: "Find rentals, sales, auctions, swaps, trades, and brokerage assets.",
    route: "/search",
    status: "active",
  },
  {
    id: "view-bookings",
    label: "View Bookings",
    description: "Check active requests, confirmed bookings, and past rentals.",
    route: "/bookings",
    status: "active",
  },
  {
    id: "messages",
    label: "Messages",
    description: "Open conversations, supplier replies, and support notices.",
    route: "/messages",
    status: "active",
  },
  {
    id: "list-asset",
    label: "List an Asset",
    description: "Supplier accounts can add assets. Customer upgrade guidance opens here later.",
    route: "/supplier-info",
    status: "controlled_placeholder",
  },
  {
    id: "ai-help",
    label: "Get AI Help",
    description: "Ask for help choosing the right vehicle, tool, space, or broker path.",
    route: "/ai",
    status: "active",
  },
];

export const EMPTY_DATA = {
  activeBookings: [],
  favorites: [],
  recentActivity: [],
  messages: [],
  wallet: {
    availableCredit: 0,
    depositsHeld: 0,
    pendingPayments: 0,
    currency: "JMD",
    status: "placeholder",
  },
};

export function canAccessCustomerDashboard(role) {
  return canAccessRole(normalizeRole(role), CUSTOMER_DASHBOARD_ALLOWED_ROLES);
}

export function getVisibleActions(role) {
  if (!canAccessCustomerDashboard(role)) return [];
  return ACTIONS;
}

export function createCustomerDashboardModel({ user = {}, data = EMPTY_DATA, loading = false, error = null } = {}) {
  const merged = {
    ...EMPTY_DATA,
    ...data,
    wallet: {
      ...EMPTY_DATA.wallet,
      ...(data?.wallet || {}),
    },
  };
  const role = normalizeRole(user?.role || "customer");

  return {
    productName: APP_NAME,
    userName: user?.full_name || user?.name || user?.email || "Customer",
    role,
    allowed: canAccessCustomerDashboard(role),
    loading,
    error,
    actions: getVisibleActions(role),
    activeBookings: merged.activeBookings,
    favorites: merged.favorites,
    recentActivity: merged.recentActivity,
    messages: merged.messages,
    wallet: merged.wallet,
    emptyStates: {
      activeBookings: merged.activeBookings.length === 0,
      favorites: merged.favorites.length === 0,
      recentActivity: merged.recentActivity.length === 0,
      messages: merged.messages.length === 0,
    },
    responsiveSections: ["welcome", "search", "quick-actions", "bookings", "favorites", "activity", "messages", "wallet"],
  };
}

export function loadStoredCustomerDashboardData(storage) {
  if (!storage) return EMPTY_DATA;
  const raw = storage.getItem(CUSTOMER_DASHBOARD_STORAGE_KEY);
  if (!raw) return EMPTY_DATA;
  const parsed = JSON.parse(raw);
  return {
    ...EMPTY_DATA,
    ...parsed,
    wallet: {
      ...EMPTY_DATA.wallet,
      ...(parsed.wallet || {}),
    },
  };
}
