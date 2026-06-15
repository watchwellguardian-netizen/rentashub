import { createMonitoringController } from "../controllers/monitoringController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

export function registerMonitoringRoutes(router, options = {}) {
  const controller = createMonitoringController(options);
  router.get("/api/health/observability", controller.observability);
  router.post("/api/monitoring/test-event", requireRoles(["admin"]), validateRequest("monitoring.testEvent"), controller.testEvent);
}
