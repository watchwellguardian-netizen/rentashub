import { createProtectionClaimsApiService } from "../services/protectionClaimsApiService.js";

export function createProtectionClaimsApiController(options = {}) {
  const service = createProtectionClaimsApiService(options);
  return {
    async protectionOverview(req, res) {
      res.json(200, { resource: "protection", data: await service.protectionOverview(req) });
    },

    async listPlans(req, res) {
      const plans = await service.listPlans(req);
      res.json(200, { resource: "protection_plans", count: plans.length, data: plans });
    },

    async findPlan(req, res) {
      res.json(200, { resource: "protection_plan", data: await service.findPlan(req.params.id, req) });
    },

    async getBookingProtection(req, res) {
      res.json(200, { resource: "booking_protection", data: await service.getBookingProtection(req.params.bookingId, req) });
    },

    async selectBookingProtection(req, res) {
      res.json(200, { resource: "booking_protection", data: await service.selectBookingProtection(req.params.bookingId, req.body || {}, req) });
    },

    async listClaims(req, res) {
      const claims = await service.listClaims(req);
      res.json(200, { resource: "claims", count: claims.length, data: claims });
    },

    async findClaim(req, res) {
      res.json(200, { resource: "claim", data: await service.findClaim(req.params.id, req) });
    },

    async createClaim(req, res) {
      res.json(201, { resource: "claim", data: await service.createClaim(req.body || {}, req) });
    },

    async updateClaim(req, res) {
      res.json(200, { resource: "claim", data: await service.updateClaim(req.params.id, req.body || {}, req) });
    },

    async listAdminClaims(req, res) {
      const claims = await service.listClaims(req, { admin: true });
      res.json(200, { resource: "admin_claims", count: claims.length, data: claims });
    },

    async updateAdminClaim(req, res) {
      res.json(200, { resource: "admin_claim", data: await service.updateClaim(req.params.id, req.body || {}, req, { admin: true }) });
    },
  };
}
