import { createResourceController } from "../controllers/resourceController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

export function registerAssetRoutes(router, options = {}) {
  const controller = createResourceController("assets", options);
  router.get("/api/assets", validateRequest("assets.query"), controller.index);
  router.get("/api/assets/:id", validateRequest("assets.params"), controller.show);
  router.post("/api/assets", requireRoles(["supplier", "admin"]), validateRequest("assets.create"), controller.create);
  router.patch("/api/assets/:id", requireRoles(["supplier", "admin"]), validateRequest("assets.update"), controller.update);
  router.delete("/api/assets/:id", requireRoles(["supplier", "admin"]), validateRequest("assets.delete"), controller.destroy);
}

export function registerBookingRoutes(router, options = {}) {
  const controller = createResourceController("bookings", options);
  router.get("/api/bookings", requireRoles(["customer", "supplier", "broker", "admin"]), validateRequest("bookings.query"), controller.index);
  router.get("/api/bookings/:id", requireRoles(["customer", "supplier", "broker", "admin"]), validateRequest("bookings.params"), controller.show);
  router.post("/api/bookings", requireRoles(["customer", "supplier", "admin"]), validateRequest("bookings.create"), controller.create);
  router.patch("/api/bookings/:id", requireRoles(["customer", "supplier", "admin"]), validateRequest("bookings.update"), controller.update);
}

export function registerInspectionRoutes(router, options = {}) {
  const controller = createResourceController("inspections", options);
  router.get("/api/inspections", requireRoles(["customer", "supplier", "admin"]), validateRequest("inspections.query"), controller.index);
  router.get("/api/inspections/:id", requireRoles(["customer", "supplier", "admin"]), validateRequest("inspections.params"), controller.show);
  router.post("/api/inspections", requireRoles(["customer", "admin"]), validateRequest("inspections.create"), controller.create);
  router.patch("/api/inspections/:id", requireRoles(["supplier", "admin"]), validateRequest("inspections.update"), controller.update);
}
