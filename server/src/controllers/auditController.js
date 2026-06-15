import { getAuditActivationReadiness } from "../audit/auditEventModel.js";
import { getRepositories } from "../services/persistenceService.js";

export function createAuditController(options = {}) {
  async function repository() {
    return (await getRepositories(options)).audit_logs;
  }

  function filtersFromQuery(query = {}) {
    return {
      category: query.category,
      action: query.action,
      actorId: query.actorId || query.actor_id,
      entityType: query.entityType || query.entity_type,
      entityId: query.entityId || query.entity_id,
    };
  }

  return {
    readiness(req, res) {
      res.json(200, {
        ok: true,
        module: "audit-logging-activation-readiness",
        audit: getAuditActivationReadiness(options.env || process.env),
        requestId: req.requestId,
      });
    },

    async list(req, res) {
      const repo = await repository();
      const records = await repo.search(filtersFromQuery(req.query || {}));
      res.json(200, {
        count: records.length,
        data: records,
        exportReady: true,
        externalSiemActive: false,
        notice: "Audit search is local/repository-backed. No live SIEM, external log drain, or compliance-certified archive is active.",
      });
    },

    async export(req, res) {
      const repo = await repository();
      const exported = await repo.export(filtersFromQuery(req.query || {}), { format: req.query?.format || "json" });
      res.json(200, {
        format: exported.format,
        contentType: exported.contentType,
        body: exported.body,
        liveExternalExport: false,
        notice: "Audit export is generated locally for review. No live SIEM export, legal archive, or external log drain was triggered.",
      });
    },
  };
}
