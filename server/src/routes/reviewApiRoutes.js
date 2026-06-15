import { createReviewApiController } from "../controllers/reviewApiController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

const REVIEW_ROLES = ["customer", "supplier", "broker", "admin"];

export function registerReviewApiRoutes(router, options = {}) {
  const controller = createReviewApiController(options);
  router.get("/api/reviews", validateRequest("reviews.query"), controller.index);
  router.get("/api/reviews/:id", validateRequest("reviews.params"), controller.show);
  router.post("/api/reviews", requireRoles(["customer", "admin"]), validateRequest("reviews.create"), controller.create);
  router.patch("/api/reviews/:id", requireRoles(REVIEW_ROLES), validateRequest("reviews.update"), controller.update);
}
