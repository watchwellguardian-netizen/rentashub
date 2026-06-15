import { createBaseRepository } from "./baseRepository.js";

export function createFileMetadataRepository(database) {
  const base = createBaseRepository(database, "file_metadata", { idPrefix: "file" });
  return {
    ...base,
    async listByOwner(ownerId) {
      return base.list({ owner_id: ownerId });
    },
    async listByRelatedEntity(entityType, entityId) {
      return base.list({ entity_type: entityType, entity_id: entityId });
    },
  };
}
