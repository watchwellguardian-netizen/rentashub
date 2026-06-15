import { createDisputeApiService } from "../services/disputeApiService.js";

export function createDisputeApiController(options = {}) {
  const service = createDisputeApiService(options);
  return {
    async list(req, res) {
      const disputes = await service.list(req);
      res.json(200, { resource: "disputes", count: disputes.length, data: disputes });
    },

    async find(req, res) {
      res.json(200, { resource: "dispute", data: await service.findById(req.params.id, req) });
    },

    async create(req, res) {
      res.json(201, { resource: "dispute", data: await service.create(req.body || {}, req) });
    },

    async update(req, res) {
      res.json(200, { resource: "dispute", data: await service.update(req.params.id, req.body || {}, req) });
    },

    async listAdmin(req, res) {
      const disputes = await service.list(req, { admin: true });
      res.json(200, { resource: "admin_disputes", count: disputes.length, data: disputes });
    },

    async updateAdmin(req, res) {
      res.json(200, { resource: "admin_dispute", data: await service.update(req.params.id, req.body || {}, req, { admin: true }) });
    },
  };
}
