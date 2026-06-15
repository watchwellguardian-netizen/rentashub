import { createBaseRepository } from "./baseRepository.js";

export function createAssetRepository(database) {
  const base = createBaseRepository(database, "assets", { idPrefix: "asset" });
  return {
    ...base,
    async listByOwner(ownerId) {
      return base.list({ owner_id: ownerId });
    },
    async listAvailable() {
      return base.list({ availability_status: "available" });
    },
  };
}
