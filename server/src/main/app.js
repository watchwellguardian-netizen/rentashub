import { createRouter } from "./router.js";
import { createAuthMiddleware } from "../auth/authMiddleware.js";
import { attachUser } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import { errorHandler, notFound } from "../middleware/errorHandler.js";
import { requestContext } from "../middleware/requestContext.js";
import { requestLogger } from "../middleware/requestLogger.js";
import { securityHeaders } from "../middleware/securityHeaders.js";
import { registerRoutes } from "../routes/index.js";

export function createApp(options = {}) {
  const router = createRouter({ errorHandler, notFound, maxBodyBytes: options.maxBodyBytes });
  router.use(requestContext);
  router.use(requestLogger(options));
  router.use(securityHeaders);
  router.use(attachUser);
  router.use(createAuthMiddleware(options));
  router.use(auditLog);
  registerRoutes(router, options);
  return router;
}

export const app = createApp();
