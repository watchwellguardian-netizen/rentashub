import { createAuthService } from "../auth/authService.js";
import { readBearerToken } from "../auth/authMiddleware.js";
import { getRepositories } from "../services/persistenceService.js";

async function service(options) {
  const repositories = await getRepositories(options);
  return createAuthService({ repositories, database: options.database, tokenOptions: options.tokenOptions });
}

export function createAuthController(options = {}) {
  return {
    async register(req, res) {
      const result = await (await service(options)).register(req.body || {});
      res.json(201, result);
    },

    async login(req, res) {
      const result = await (await service(options)).login(req.body || {});
      res.json(200, result);
    },

    async logout(req, res) {
      const result = await (await service(options)).logout(readBearerToken(req));
      res.json(200, result);
    },

    async me(req, res) {
      const result = await (await service(options)).authenticateToken(readBearerToken(req));
      res.json(200, { user: result.user, session: { expiresAt: result.session.expires_at } });
    },

    async refresh(req, res) {
      const result = await (await service(options)).refresh(readBearerToken(req));
      res.json(200, result);
    },

    requestPasswordReset(req, res) {
      res.json(202, {
        status: "placeholder",
        message: "Password reset request accepted as a controlled placeholder. Email delivery is not integrated yet.",
      });
    },

    resetPassword(req, res) {
      res.json(202, {
        status: "placeholder",
        message: "Password reset is a controlled placeholder. Secure reset tokens and delivery are not integrated yet.",
      });
    },
  };
}
