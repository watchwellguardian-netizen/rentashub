import { createPaymentApiService } from "../services/paymentApiService.js";

export function createPaymentApiController(options = {}) {
  const service = createPaymentApiService(options);
  return {
    async listPayments(req, res) {
      const payments = await service.listPayments(req);
      res.json(200, { resource: "payments", count: payments.length, data: payments, readiness: service.readiness() });
    },
    async findPayment(req, res) {
      res.json(200, { resource: "payment", data: await service.findTransaction(req.params.id, req), readiness: service.readiness() });
    },
    async createIntent(req, res) {
      res.json(200, { resource: "payment_intent", data: await service.createIntent(req.body || {}, req), readiness: service.readiness() });
    },
    async simulatePayment(req, res) {
      res.json(201, { resource: "payment", data: await service.simulatePayment(req.body || {}, req), readiness: service.readiness() });
    },
    async refundPlaceholder(req, res) {
      res.json(202, { resource: "refund_placeholder", data: await service.refundPlaceholder(req.body || {}, req), readiness: service.readiness() });
    },
    async wallet(req, res) {
      res.json(200, { resource: "wallet", data: await service.wallet(req), readiness: service.readiness() });
    },
    async earnings(req, res) {
      res.json(200, { resource: "earnings", data: await service.earnings(req), readiness: service.readiness() });
    },
    async payouts(req, res) {
      const payouts = await service.payouts(req);
      res.json(200, { resource: "payouts", count: payouts.length, data: payouts, readiness: service.readiness() });
    },
    async requestPayout(req, res) {
      res.json(201, { resource: "payout", data: await service.requestPayout(req), readiness: service.readiness() });
    },
    async transaction(req, res) {
      res.json(200, { resource: "transaction", data: await service.findTransaction(req.params.id, req), readiness: service.readiness() });
    },
  };
}
