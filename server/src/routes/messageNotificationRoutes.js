import { createMessageController, createNotificationController } from "../controllers/messageNotificationController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

const COMMUNICATION_ROLES = ["customer", "supplier", "broker", "admin"];

export function registerMessageRoutes(router, options = {}) {
  const controller = createMessageController(options);
  router.get("/api/messages", requireRoles(COMMUNICATION_ROLES), validateRequest("messages.query"), controller.index);
  router.get("/api/messages/:threadId", requireRoles(COMMUNICATION_ROLES), validateRequest("messages.params"), controller.show);
  router.post("/api/messages", requireRoles(COMMUNICATION_ROLES), validateRequest("messages.create"), controller.create);
  router.patch("/api/messages/:messageId", requireRoles(COMMUNICATION_ROLES), validateRequest("messages.update"), controller.update);
}

export function registerNotificationRoutes(router, options = {}) {
  const controller = createNotificationController(options);
  router.get("/api/notifications", requireRoles(COMMUNICATION_ROLES), validateRequest("notifications.query"), controller.index);
  router.get("/api/notifications/:id", requireRoles(COMMUNICATION_ROLES), validateRequest("notifications.params"), controller.show);
  router.post("/api/notifications", requireRoles(COMMUNICATION_ROLES), validateRequest("notifications.create"), controller.create);
  router.patch("/api/notifications/:id", requireRoles(COMMUNICATION_ROLES), validateRequest("notifications.update"), controller.update);
}
