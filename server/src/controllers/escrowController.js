import { createEscrowService } from "../services/escrowService.js";

export function createEscrowController(options = {}) {
  const service = createEscrowService(options);
  return {
    list(req, res) {
      const records = service.list(req);
      res.json(200, { resource: "escrow", count: records.length, data: records, readiness: service.readiness() });
    },
    find(req, res) {
      res.json(200, { resource: "escrow", data: service.find(req.params.id, req), readiness: service.readiness() });
    },
    create(req, res) {
      res.json(201, { resource: "escrow", data: service.create(req.body || {}, req), readiness: service.readiness() });
    },
    release(req, res) {
      res.json(202, { resource: "escrow_release", data: service.updateStatus(req.body?.escrowId || req.body?.escrow_id, "release", req.body || {}, req), readiness: service.readiness() });
    },
    refund(req, res) {
      res.json(202, { resource: "escrow_refund", data: service.updateStatus(req.body?.escrowId || req.body?.escrow_id, "refund", req.body || {}, req), readiness: service.readiness() });
    },
    dispute(req, res) {
      res.json(202, { resource: "escrow_dispute", data: service.updateStatus(req.body?.escrowId || req.body?.escrow_id, "dispute", req.body || {}, req), readiness: service.readiness() });
    },
  };
}
