import { createTrustApiService } from "../services/trustApiService.js";

export function createTrustApiController(options = {}) {
  const service = createTrustApiService(options);
  return {
    async overview(_req, res) {
      const [suppliers, assets, customers] = await Promise.all([
        service.list("supplier"),
        service.list("asset"),
        service.list("customer"),
      ]);
      res.json(200, { resource: "trust", data: { suppliers, assets, customers } });
    },
    async list(req, res) {
      const scores = await service.list(req.params.entityType);
      res.json(200, { resource: "trust", entityType: req.params.entityType, count: scores.length, data: scores });
    },
    async show(req, res) {
      const score = await service.find(req.params.entityType, req.params.entityId);
      res.json(200, { resource: "trust", entityType: req.params.entityType, data: score });
    },
    async riskQueue(_req, res) {
      const queue = await service.riskQueue();
      res.json(200, { resource: "trust", count: queue.length, data: queue });
    },
    async recalculate(req, res) {
      const score = await service.recalculate(req.params.entityType, req.params.entityId, req);
      res.json(200, { resource: "trust", entityType: req.params.entityType, data: score });
    },
  };
}
