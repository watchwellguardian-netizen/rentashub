export const RENTASHUB_ROLES = [
  "customer",
  "supplier",
  "dealer",
  "inspector",
  "transport_provider",
  "financing_partner",
  "admin",
  "super_admin",
];

export const ROLE_ALIASES = {
  user: "customer",
  guest: "customer",
  vendor: "supplier",
  broker: "dealer",
  vehicle_dealer: "dealer",
  equipment_dealer: "dealer",
  certified_inspector: "inspector",
  auction_admin: "admin",
  compliance_officer: "admin",
};

export const ROLE_INHERITANCE = {
  super_admin: ["admin", "customer", "supplier", "dealer", "inspector", "transport_provider", "financing_partner"],
  admin: ["customer", "supplier", "dealer", "inspector", "transport_provider", "financing_partner"],
  dealer: ["customer"],
  supplier: ["customer"],
};

export const PERMISSION_MATRIX = {
  customer: ["marketplace:read", "booking:create", "message:own", "payment:own", "auction:bid", "inspection:request", "transport:request", "financing:request"],
  supplier: ["marketplace:read", "listing:own", "auction:own", "booking:supplier", "message:own", "earnings:own", "inspection:supplier", "transport:request", "financing:request"],
  dealer: ["marketplace:read", "auction:bid", "auction:dealer", "message:own", "financing:request"],
  inspector: ["inspection:assigned", "document:inspection", "message:own"],
  transport_provider: ["transport:assigned", "document:transport", "message:own"],
  financing_partner: ["financing:assigned", "document:financing", "message:own"],
  admin: ["admin:read", "admin:mutate", "audit:read", "marketplace:moderate"],
  super_admin: ["admin:read", "admin:mutate", "audit:read", "marketplace:moderate", "security:manage", "rbac:manage"],
};

export function normalizeRole(role = "customer") {
  const normalized = String(role || "customer").trim().toLowerCase();
  const mapped = ROLE_ALIASES[normalized] || normalized;
  return RENTASHUB_ROLES.includes(mapped) ? mapped : "customer";
}

export function expandRole(role = "customer") {
  const normalized = normalizeRole(role);
  return [...new Set([normalized, ...(ROLE_INHERITANCE[normalized] || [])])];
}

export function canRoleAccess(userRole, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  const expandedUserRoles = expandRole(userRole);
  const expandedAllowed = allowedRoles.map((role) => normalizeRole(role));
  return expandedUserRoles.some((role) => expandedAllowed.includes(role));
}

export function getPermissionMatrix() {
  return RENTASHUB_ROLES.map((role) => ({
    role,
    inherits: ROLE_INHERITANCE[role] || [],
    permissions: PERMISSION_MATRIX[role] || [],
  }));
}
