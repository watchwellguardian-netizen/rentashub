import { createFileController } from "../controllers/fileController.js";
import { requireRoles } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/validation.js";

const FILE_ROLES = ["customer", "supplier", "broker", "admin"];

export function registerFileRoutes(router, options = {}) {
  const controller = createFileController(options);
  const uploadIntentLimit = createRateLimiter({ keyPrefix: "file-upload-intent", max: options.rateLimits?.fileUploadIntent?.max || 30, windowMs: options.rateLimits?.fileUploadIntent?.windowMs || 60_000 });
  router.post("/api/files/upload-intent", requireRoles(FILE_ROLES), uploadIntentLimit, validateRequest("files.uploadIntent"), controller.uploadIntent);
  router.post("/api/files/metadata", requireRoles(FILE_ROLES), validateRequest("files.metadata"), controller.createMetadata);
  router.get("/api/files", requireRoles(FILE_ROLES), validateRequest("files.query"), controller.index);
  router.get("/api/files/:id", requireRoles(FILE_ROLES), validateRequest("files.show"), controller.show);
  router.patch("/api/files/:id", requireRoles(FILE_ROLES), validateRequest("files.update"), controller.update);
  router.delete("/api/files/:id", requireRoles(FILE_ROLES), validateRequest("files.delete"), controller.destroy);
}
