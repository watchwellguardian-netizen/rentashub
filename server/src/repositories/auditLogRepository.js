import { createBaseRepository } from "./baseRepository.js";
import { createAuditRecord, exportAuditRecords, filterAuditRecords } from "../audit/auditEventModel.js";

export function createAuditLogRepository(database) {
  const base = createBaseRepository(database, "audit_logs", { idPrefix: "audit", softDelete: false });
  return {
    ...base,
    async record(action, entityType, metadata = {}) {
      const rows = database.table("audit_logs");
      const previousHash = rows.length ? rows[rows.length - 1].immutable_hash || rows[rows.length - 1].hash || "" : "";
      return base.create(createAuditRecord(action, entityType, metadata, { previousHash }));
    },
    async search(filters = {}) {
      return filterAuditRecords(await base.list({}, { includeDeleted: true }), filters);
    },
    async export(filters = {}, options = {}) {
      const records = await this.search(filters);
      return exportAuditRecords(records, options);
    },
  };
}
