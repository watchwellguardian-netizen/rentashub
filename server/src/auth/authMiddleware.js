import { createAuthService } from "./authService.js";
import { getRepositories } from "../services/persistenceService.js";

export function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : "";
}

export function createAuthMiddleware(options = {}) {
  return async (req, res, next) => {
    if (req.user) {
      next();
      return;
    }
    const token = readBearerToken(req);
    if (!token) {
      next();
      return;
    }
    try {
      const repositories = await getRepositories(options);
      const service = createAuthService({ repositories, database: options.database, tokenOptions: options.tokenOptions });
      const authenticated = await service.authenticateToken(token);
      req.user = authenticated.user;
      req.auth = authenticated;
    } catch {
      req.user = null;
      req.authError = "invalid_or_expired_token";
    }
    next();
  };
}
