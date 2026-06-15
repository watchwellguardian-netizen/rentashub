import { createAuditController } from "../controllers/auditController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

export function registerAuditRoutes(router, options = {}) {
  const controller = createAuditController(options);
  router.get("/api/audit/readiness", requireRoles(["admin"]), controller.readiness);
  router.get("/api/audit/events", requireRoles(["admin"]), validateRequest("audit.events.query"), controller.list);
  router.get("/api/audit/export", requireRoles(["admin"]), validateRequest("audit.export.query"), controller.export);
}
