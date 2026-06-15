export function createContractService(group, { implemented = false } = {}) {
  return {
    listContract() {
      return {
        group,
        implemented,
        status: implemented ? "implemented" : "scaffold",
        message: implemented
          ? `${group} endpoint is implemented for Module 20.`
          : `${group} API contract is scaffolded. Backend persistence and business logic are not implemented yet.`,
      };
    },
  };
}
