import { canRoleAccess, normalizeRole } from "../auth/rbacPolicy.js";

export function attachUser(req, res, next) {
  const devHeadersDisabled = String(process.env.AUTH_DISABLE_DEV_HEADERS_IN_PRODUCTION || "true").toLowerCase() === "true";
  const isProduction = String(process.env.NODE_ENV || "development").toLowerCase() === "production";
  if (isProduction && devHeadersDisabled) {
    next();
    return;
  }
  const role = req.headers["x-user-role"];
  const id = req.headers["x-user-id"];
  const normalized = normalizeRole(role);
  req.user = role ? { id: id || "request-user", role: normalized } : null;
  next();
}

export function requireRoles(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      res.json(401, { error: "unauthorized", message: "Authentication is required for this endpoint." });
      return;
    }
    if (roles.length && !canRoleAccess(req.user.role, roles)) {
      res.json(403, { error: "forbidden", message: "This role cannot access this endpoint." });
      return;
    }
    next();
  };
}
