import { healthController } from "../controllers/healthController.js";

export function registerHealthRoutes(router) {
  router.get("/api/health", healthController.index);
  router.get("/api/health/readiness", healthController.readiness);
  router.get("/api/health/database", healthController.database);
}
