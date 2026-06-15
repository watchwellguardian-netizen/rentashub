import { TABLES } from "../db/schema.js";
import { createAssetRepository } from "./assetRepository.js";
import { createAuditLogRepository } from "./auditLogRepository.js";
import { createBaseRepository } from "./baseRepository.js";
import { createBookingRepository } from "./bookingRepository.js";
import { createFileMetadataRepository } from "./fileMetadataRepository.js";

export function createRepositories(database) {
  const repositories = Object.fromEntries(
    TABLES.filter((table) => table !== "schema_migrations").map((table) => [table, createBaseRepository(database, table)]),
  );

  return {
    ...repositories,
    assets: createAssetRepository(database),
    bookings: createBookingRepository(database),
    audit_logs: createAuditLogRepository(database),
    file_metadata: createFileMetadataRepository(database),
  };
}
