export const ROLE_LABELS = {
  admin: "Admin",
  customer: "Customer",
  guest: "Customer",
  user: "Customer",
  supplier: "Supplier",
  vendor: "Supplier",
  broker: "Broker",
  bidder: "Bidder",
  verified_bidder: "Verified Bidder",
  high_value_bidder: "High-Value Bidder",
  diaspora_buyer: "Diaspora Buyer",
  private_seller: "Private Seller",
  institutional_seller: "Institutional Seller",
  bank_seller: "Bank Seller",
  credit_union_seller: "Credit Union Seller",
  government_agency_seller: "Government Agency Seller",
  customs_agency_seller: "Customs Agency Seller",
  court_seller: "Court Seller",
  bailiff: "Bailiff",
  receiver: "Receiver",
  liquidator: "Liquidator",
  dealer: "Dealer",
  vehicle_dealer: "Vehicle Dealer",
  equipment_dealer: "Equipment Dealer",
  certified_inspector: "Certified Inspector",
  transport_provider: "Transport Provider",
  financing_partner: "Financing Partner",
  compliance_officer: "Compliance Officer",
  auction_admin: "Auction Admin",
  super_admin: "Super Admin",
};

export const ROLE_GROUPS = {
  customer: ["customer", "guest", "user"],
  supplier: ["supplier", "vendor"],
  broker: ["broker"],
  admin: ["admin"],
  bidder: ["customer", "guest", "user", "bidder", "verified_bidder", "high_value_bidder", "diaspora_buyer"],
  seller: ["supplier", "vendor", "private_seller", "institutional_seller", "bank_seller", "credit_union_seller", "government_agency_seller", "customs_agency_seller", "court_seller", "bailiff", "receiver", "liquidator"],
  dealer: ["broker", "dealer", "vehicle_dealer", "equipment_dealer"],
  auction_admin: ["admin", "auction_admin", "compliance_officer", "super_admin"],
};

export const ROLE_ALIASES = {
  guest: ["customer", "user"],
  customer: ["guest", "user"],
  user: ["customer", "guest"],
  vendor: ["supplier"],
  supplier: ["vendor"],
  bidder: ["customer", "guest", "user"],
  verified_bidder: ["customer"],
  high_value_bidder: ["customer"],
  diaspora_buyer: ["customer"],
  dealer: ["broker"],
  vehicle_dealer: ["dealer", "broker"],
  equipment_dealer: ["dealer", "broker"],
  auction_admin: ["admin"],
  compliance_officer: ["admin"],
  super_admin: ["admin"],
};

export const REVIEW_USERS = [
  {
    id: "review-customer",
    full_name: "Review Customer",
    email: "customer@rentashub.local",
    role: "customer",
  },
  {
    id: "review-supplier",
    full_name: "Review Supplier",
    email: "supplier@rentashub.local",
    role: "supplier",
  },
  {
    id: "review-broker",
    full_name: "Review Broker",
    email: "broker@rentashub.local",
    role: "broker",
  },
  {
    id: "review-admin",
    full_name: "Review Admin",
    email: "admin@rentashub.local",
    role: "admin",
  },
];

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export function roleLabel(role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || normalized.replace(/_/g, " ") || "Unknown";
}

export function expandAllowedRoles(roles = []) {
  const expanded = new Set();

  roles.forEach((role) => {
    const normalized = normalizeRole(role);
    expanded.add(normalized);
    (ROLE_GROUPS[normalized] || []).forEach((groupRole) => expanded.add(groupRole));
    (ROLE_ALIASES[normalized] || []).forEach((aliasRole) => expanded.add(aliasRole));
  });

  return [...expanded].filter(Boolean);
}

export function canAccessRole(userRole, allowedRoles = []) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return expandAllowedRoles(allowedRoles).includes(normalizeRole(userRole));
}
