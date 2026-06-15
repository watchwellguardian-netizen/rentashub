import { createProtectionClaimsApiController } from "../controllers/protectionClaimsApiController.js";
import { requireRoles } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/validation.js";

export function registerProtectionClaimsApiRoutes(router, options = {}) {
  const controller = createProtectionClaimsApiController(options);
  const adminMutationLimit = createRateLimiter({ keyPrefix: "admin-mutation", max: options.rateLimits?.adminMutation?.max || 30, windowMs: options.rateLimits?.adminMutation?.windowMs || 60_000 });

  router.get("/api/protection", validateRequest("protection.query"), controller.protectionOverview);
  router.get("/api/protection/plans", validateRequest("protection.plans.query"), controller.listPlans);
  router.get("/api/protection/plans/:id", validateRequest("protection.plans.params"), controller.findPlan);
  router.get("/api/protection/booking/:bookingId", requireRoles(["customer", "supplier", "admin"]), validateRequest("protection.booking.params"), controller.getBookingProtection);
  router.post("/api/protection/booking/:bookingId", requireRoles(["customer", "admin"]), validateRequest("protection.booking.create"), controller.selectBookingProtection);
  router.patch("/api/protection/booking/:bookingId", requireRoles(["customer", "admin"]), validateRequest("protection.booking.update"), controller.selectBookingProtection);

  router.get("/api/claims", requireRoles(["customer", "supplier", "admin"]), validateRequest("claims.query"), controller.listClaims);
  router.get("/api/claims/:id", requireRoles(["customer", "supplier", "admin"]), validateRequest("claims.params"), controller.findClaim);
  router.post("/api/claims", requireRoles(["customer", "supplier", "admin"]), validateRequest("claims.create"), controller.createClaim);
  router.patch("/api/claims/:id", requireRoles(["customer", "supplier", "admin"]), validateRequest("claims.update"), controller.updateClaim);

  router.get("/api/admin/claims", requireRoles(["admin"]), validateRequest("admin.claims.query"), controller.listAdminClaims);
  router.patch("/api/admin/claims/:id", requireRoles(["admin"]), adminMutationLimit, validateRequest("admin.claims.update"), controller.updateAdminClaim);
}
