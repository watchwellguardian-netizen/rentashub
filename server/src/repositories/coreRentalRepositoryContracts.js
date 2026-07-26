export const CORE_RENTAL_REPOSITORY_CONTRACT = {
  suppliers: {
    repository: "supplier_profiles",
    methods: ["create", "findById", "list", "update", "softDelete"],
  },
  assets: {
    repository: "assets",
    methods: ["create", "findById", "list", "update", "softDelete", "listByOwner", "listAvailable"],
  },
  listings: {
    repository: "assets",
    methods: ["findById", "list", "update", "listByOwner", "listAvailable"],
  },
  availability: {
    repository: "bookings",
    methods: ["create", "findById", "list", "update", "listByCustomer", "listBySupplier"],
  },
  bookings: {
    repository: "bookings",
    methods: ["create", "findById", "list", "update", "softDelete", "listByCustomer", "listBySupplier"],
  },
  bookingActions: {
    repository: "bookings",
    methods: ["findById", "list", "update"],
  },
  auditEvents: {
    repository: "audit_logs",
    methods: ["create", "findById", "list", "record", "search", "export"],
  },
};

export function validateCoreRentalRepositoryContract(repositories = {}) {
  const findings = [];
  for (const [domain, contract] of Object.entries(CORE_RENTAL_REPOSITORY_CONTRACT)) {
    const repository = repositories[contract.repository];
    if (!repository) {
      findings.push({ domain, repository: contract.repository, method: "*", status: "missing_repository" });
      continue;
    }
    for (const method of contract.methods) {
      if (typeof repository[method] !== "function") {
        findings.push({ domain, repository: contract.repository, method, status: "missing_method" });
      }
    }
  }
  return {
    status: findings.length ? "CONTRACT_INCOMPLETE" : "CONTRACT_READY",
    providerStatus: "provider_independent_local",
    findings,
    domains: Object.keys(CORE_RENTAL_REPOSITORY_CONTRACT),
  };
}
