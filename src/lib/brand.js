export const APP_NAME = "RentasHub";
export const APP_TAGLINE = "Rent. Buy. Sell. Trade.";
export const APP_DESCRIPTION = "RentasHub is a unified marketplace where individuals and businesses can rent, buy, sell, trade, broker, and manage vehicles, equipment, property, tools, event spaces, storage assets, and specialty assets from one trusted platform.";

export const BRAND_COLORS = {
  primaryBlue: "#0A4DA3",
  marketplaceOrange: "#F58220",
  white: "#FFFFFF",
  darkNavy: "#0B1F3A",
};

export const BRAND_TYPOGRAPHY = {
  primary: "Sora SemiBold",
  secondary: "Sora Regular",
  fallbacks: ["Manrope", "Montserrat", "Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
};

export const LOGO_VERSIONS = {
  master: {
    name: "Version A - Master Brand Logo",
    structure: "R icon, RentasHub wordmark, Rent. Buy. Sell. Trade. tagline",
    defaultUse: true,
  },
  hero: {
    name: "Version B - Marketplace Hero Logo",
    structure: "Modern SUV, semi truck, excavator, R icon, RentasHub wordmark, tagline",
    marketingOnly: true,
  },
  appIcon: {
    name: "Version C - App Icon",
    structure: "R icon only",
    textAllowed: false,
  },
};

export const CATEGORY_BRAND_LABELS = {
  cars: "RentasHub Car Rentals",
  trucks: "RentasHub Truck Rentals",
  "heavy-equipment": "RentasHub Heavy Equipment",
  "small-tools-machines": "RentasHub Tools & Machinery",
  "event-spaces": "RentasHub Event Spaces",
  "real-estate": "RentasHub Real Estate",
  trailers: "RentasHub Fleet Marketplace",
  "storage-containers": "RentasHub Storage & Containers",
  "specialty-assets": "RentasHub Specialty Assets",
};

export const FEATURE_PAGE_NAMES = {
  marketplace: "RentasHub Marketplace",
  search: "RentasHub Search",
  bookings: "RentasHub Bookings",
  payments: "RentasHub Payments",
  wallet: "RentasHub Wallet",
  messages: "RentasHub Messages",
  reviews: "RentasHub Reviews",
  trust: "RentasHub Trust Center",
  ai: "RentasHub AI Assistant",
  protection: "RentasHub Protection Plans",
  claims: "RentasHub Claims",
  brokerage: "RentasHub Brokerage",
  supplierDashboard: "RentasHub Supplier Dashboard",
  customerDashboard: "RentasHub Customer Dashboard",
  admin: "RentasHub Admin Control Center",
};

export const AI_BRAND_NAMES = {
  assistant: "RentasHub AI",
  search: "RentasHub AI Search",
  broker: "RentasHub AI Broker",
  listingAssistant: "RentasHub AI Listing Assistant",
  rentalAdvisor: "RentasHub AI Rental Advisor",
  marketInsights: "RentasHub AI Marketplace Insights",
};

export function brandTitle(section = "") {
  return section ? `${APP_NAME} - ${section}` : APP_NAME;
}

export function publicBrandTitle(pageName = "") {
  if (!pageName) return APP_NAME;
  return pageName.startsWith(APP_NAME) ? pageName : `${APP_NAME} ${pageName}`;
}
