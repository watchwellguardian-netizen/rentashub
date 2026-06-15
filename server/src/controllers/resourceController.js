import { createResourceService } from "../services/resourceService.js";

export function createResourceController(resourceName, options = {}) {
  const service = createResourceService(resourceName, options);
  return {
    async index(req, res) {
      const records = await service.list(req.query || {});
      res.json(200, { resource: resourceName, count: records.length, data: records });
    },

    async show(req, res) {
      const record = await service.findById(req.params.id);
      res.json(200, { resource: resourceName, data: record });
    },

    async create(req, res) {
      const record = await service.create(req.body || {}, req);
      res.json(201, { resource: resourceName, data: record });
    },

    async update(req, res) {
      const record = await service.update(req.params.id, req.body || {}, req);
      res.json(200, { resource: resourceName, data: record });
    },

    async destroy(req, res) {
      const record = await service.softDelete(req.params.id, req);
      res.json(200, { resource: resourceName, data: record, softDeleted: true });
    },
  };
}
