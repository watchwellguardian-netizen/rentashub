import { createDisputeApiController } from "../controllers/disputeApiController.js";
import { requireRoles } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/validation.js";

export function registerDisputeApiRoutes(router, options = {}) {
  const controller = createDisputeApiController(options);
  const adminMutationLimit = createRateLimiter({ keyPrefix: "admin-mutation", max: options.rateLimits?.adminMutation?.max || 30, windowMs: options.rateLimits?.adminMutation?.windowMs || 60_000 });

  router.get("/api/disputes", requireRoles(["customer", "supplier", "admin"]), validateRequest("disputes.query"), controller.list);
  router.get("/api/disputes/:id", requireRoles(["customer", "supplier", "admin"]), validateRequest("disputes.params"), controller.find);
  router.post("/api/disputes", requireRoles(["customer", "supplier", "admin"]), validateRequest("disputes.create"), controller.create);
  router.patch("/api/disputes/:id", requireRoles(["customer", "supplier", "admin"]), validateRequest("disputes.update"), controller.update);

  router.get("/api/admin/disputes", requireRoles(["admin"]), validateRequest("admin.disputes.query"), controller.listAdmin);
  router.patch("/api/admin/disputes/:id", requireRoles(["admin"]), adminMutationLimit, validateRequest("admin.disputes.update"), controller.updateAdmin);
}
