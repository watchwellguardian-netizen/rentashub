import { createTrustApiController } from "../controllers/trustApiController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

const TRUST_READ_ROLES = ["customer", "supplier", "broker", "admin"];

export function registerTrustApiRoutes(router, options = {}) {
  const controller = createTrustApiController(options);
  router.get("/api/trust", requireRoles(TRUST_READ_ROLES), validateRequest("trust.overview"), controller.overview);
  router.get("/api/trust/risk-queue", requireRoles(["admin"]), validateRequest("trust.riskQueue"), controller.riskQueue);
  router.get("/api/trust/:entityType", requireRoles(TRUST_READ_ROLES), validateRequest("trust.list"), controller.list);
  router.get("/api/trust/:entityType/:entityId", requireRoles(TRUST_READ_ROLES), validateRequest("trust.show"), controller.show);
  router.patch("/api/trust/recalculate/:entityType/:entityId", requireRoles(["admin"]), validateRequest("trust.recalculate"), controller.recalculate);
}
