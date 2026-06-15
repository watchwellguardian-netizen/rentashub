import { createFileService } from "../files/fileService.js";

export function createFileController(options = {}) {
  const service = createFileService(options);
  return {
    async uploadIntent(req, res) {
      const result = await service.createUploadIntent(req.body || {}, req);
      res.json(201, result);
    },

    async createMetadata(req, res) {
      const file = await service.createMetadata(req.body || {}, req);
      res.json(201, { file });
    },

    async index(req, res) {
      const files = await service.list(req.query || {}, req);
      res.json(200, { count: files.length, data: files });
    },

    async show(req, res) {
      const file = await service.getById(req.params.id, req);
      res.json(200, { file });
    },

    async update(req, res) {
      const file = await service.update(req.params.id, req.body || {}, req);
      res.json(200, { file });
    },

    async destroy(req, res) {
      const file = await service.softDelete(req.params.id, req);
      res.json(200, { file, softDeleted: true });
    },
  };
}
