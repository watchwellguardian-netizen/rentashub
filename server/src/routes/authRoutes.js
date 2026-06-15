import { createAuthController } from "../controllers/authController.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/validation.js";

export function registerAuthRoutes(router, options = {}) {
  const controller = createAuthController(options);
  const authLimit = createRateLimiter({ keyPrefix: "auth", max: options.rateLimits?.auth?.max || 20, windowMs: options.rateLimits?.auth?.windowMs || 60_000 });
  const resetLimit = createRateLimiter({ keyPrefix: "password-reset", max: options.rateLimits?.passwordReset?.max || 10, windowMs: options.rateLimits?.passwordReset?.windowMs || 60_000 });
  router.post("/api/auth/register", authLimit, validateRequest("auth.register"), controller.register);
  router.post("/api/auth/login", authLimit, validateRequest("auth.login"), controller.login);
  router.post("/api/auth/logout", validateRequest("auth.logout"), controller.logout);
  router.get("/api/auth/me", validateRequest("auth.me"), controller.me);
  router.post("/api/auth/refresh", validateRequest("auth.refresh"), controller.refresh);
  router.post("/api/auth/request-password-reset", resetLimit, validateRequest("auth.requestPasswordReset"), controller.requestPasswordReset);
  router.post("/api/auth/reset-password", resetLimit, validateRequest("auth.resetPassword"), controller.resetPassword);
}
