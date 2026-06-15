import { createEscrowController } from "../controllers/escrowController.js";
import { requireRoles } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/validation.js";

const ESCROW_ROLES = ["customer", "supplier", "admin"];

export function registerEscrowRoutes(router, options = {}) {
  const controller = createEscrowController(options);
  const escrowMutationLimit = createRateLimiter({ keyPrefix: "escrow-mutation", max: options.rateLimits?.escrow?.max || 30, windowMs: options.rateLimits?.escrow?.windowMs || 60_000 });

  router.get("/api/escrow", requireRoles(ESCROW_ROLES), validateRequest("escrow.query"), controller.list);
  router.get("/api/escrow/:id", requireRoles(ESCROW_ROLES), validateRequest("escrow.params"), controller.find);
  router.post("/api/escrow/create", requireRoles(ESCROW_ROLES), escrowMutationLimit, validateRequest("escrow.create"), controller.create);
  router.post("/api/escrow/release", requireRoles(["supplier", "admin"]), escrowMutationLimit, validateRequest("escrow.release"), controller.release);
  router.post("/api/escrow/refund", requireRoles(["supplier", "admin"]), escrowMutationLimit, validateRequest("escrow.refund"), controller.refund);
  router.post("/api/escrow/dispute", requireRoles(ESCROW_ROLES), escrowMutationLimit, validateRequest("escrow.dispute"), controller.dispute);
}
