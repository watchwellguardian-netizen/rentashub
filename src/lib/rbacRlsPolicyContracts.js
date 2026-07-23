export const STATIC_POLICY_VALIDATION_STATUS = "STATIC_POLICY_VALIDATED";

export const CORE_POLICY_ACTIONS = {
  readBooking: "booking:read",
  mutateBooking: "booking:mutate",
  readListing: "listing:read",
  mutateListing: "listing:mutate",
  privilegedAccess: "admin:privileged_access",
};

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const ACTIVE_STATUSES = new Set(["active", "verified"]);

export function evaluateStaticAccess({ actor = {}, record = {}, action = "" } = {}) {
  const role = String(actor.role || "").toLowerCase();
  const status = String(actor.status || "").toLowerCase();
  const permissions = new Set(actor.permissions || []);

  if (!actor.id) return deny("unauthenticated_access_rejected");
  if (!ACTIVE_STATUSES.has(status)) return deny("inactive_or_suspended_user_denied");

  if (ADMIN_ROLES.has(role)) {
    if (action === CORE_POLICY_ACTIONS.privilegedAccess && !permissions.has("admin:privileged_access")) {
      return deny("admin_role_without_required_permission_denied");
    }
    return allow("admin_explicit_access");
  }

  if (actor.organizationId && record.organizationId && actor.organizationId !== record.organizationId) {
    return deny("cross_organization_access_denied");
  }

  if (role === "customer") {
    if (record.customerId === actor.id && [CORE_POLICY_ACTIONS.readBooking, CORE_POLICY_ACTIONS.mutateBooking].includes(action)) return allow("customer_owned_record_access");
    return deny("customer_cross_user_access_denied");
  }

  if (role === "supplier") {
    if (record.supplierId === actor.id && [CORE_POLICY_ACTIONS.readListing, CORE_POLICY_ACTIONS.mutateListing, CORE_POLICY_ACTIONS.readBooking, CORE_POLICY_ACTIONS.mutateBooking].includes(action)) {
      return allow("supplier_owned_record_access");
    }
    return deny("supplier_cross_owner_access_denied");
  }

  return deny("role_without_policy_denied");
}

export const STATIC_RBAC_RLS_SCENARIOS = [
  { id: "unauthenticated_access_rejection", expected: false, actor: {}, record: { customerId: "customer-1" }, action: CORE_POLICY_ACTIONS.readBooking },
  { id: "customer_access_owned_record", expected: true, actor: { id: "customer-1", role: "customer", status: "active", organizationId: "org-a" }, record: { customerId: "customer-1", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.readBooking },
  { id: "customer_denial_other_customer", expected: false, actor: { id: "customer-1", role: "customer", status: "active", organizationId: "org-a" }, record: { customerId: "customer-2", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.readBooking },
  { id: "supplier_access_owned_listing", expected: true, actor: { id: "supplier-1", role: "supplier", status: "active", organizationId: "org-a" }, record: { supplierId: "supplier-1", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.readListing },
  { id: "supplier_denial_other_supplier", expected: false, actor: { id: "supplier-1", role: "supplier", status: "active", organizationId: "org-a" }, record: { supplierId: "supplier-2", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.readListing },
  { id: "organization_isolation", expected: false, actor: { id: "supplier-1", role: "supplier", status: "active", organizationId: "org-a" }, record: { supplierId: "supplier-1", organizationId: "org-b" }, action: CORE_POLICY_ACTIONS.readListing },
  { id: "admin_access_by_explicit_permission", expected: true, actor: { id: "admin-1", role: "admin", status: "active", permissions: ["admin:privileged_access"] }, record: { customerId: "customer-1", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.privilegedAccess },
  { id: "role_without_required_permission_denied", expected: false, actor: { id: "admin-1", role: "admin", status: "active", permissions: [] }, record: { customerId: "customer-1", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.privilegedAccess },
  { id: "inactive_user_denied", expected: false, actor: { id: "customer-1", role: "customer", status: "suspended", organizationId: "org-a" }, record: { customerId: "customer-1", organizationId: "org-a" }, action: CORE_POLICY_ACTIONS.readBooking },
];

function allow(reason) {
  return { allowed: true, reason, validationStatus: STATIC_POLICY_VALIDATION_STATUS, rlsEnforced: false };
}

function deny(reason) {
  return { allowed: false, reason, validationStatus: STATIC_POLICY_VALIDATION_STATUS, rlsEnforced: false };
}

export function runStaticPolicyScenarioMatrix(scenarios = STATIC_RBAC_RLS_SCENARIOS) {
  const results = scenarios.map((scenario) => {
    const result = evaluateStaticAccess(scenario);
    return { id: scenario.id, expected: scenario.expected, ...result, passed: result.allowed === scenario.expected };
  });
  return {
    validationStatus: STATIC_POLICY_VALIDATION_STATUS,
    rlsEnforced: false,
    passed: results.every((result) => result.passed),
    results,
  };
}
