import { createContractController } from "../controllers/contractController.js";
import { requireRoles } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

export const API_GROUPS = [
  "auth",
  "users",
  "assets",
  "bookings",
  "inspections",
  "payments",
  "escrow",
  "messages",
  "notifications",
  "suppliers",
  "verifications",
  "reviews",
  "disputes",
  "marketplace",
  "trust",
  "protection",
  "claims",
  "admin",
];

const ROLE_REQUIREMENTS = {
  admin: ["admin"],
  payments: ["customer", "supplier", "admin"],
  messages: ["customer", "supplier", "broker", "admin"],
  notifications: ["customer", "supplier", "broker", "admin"],
  verifications: ["supplier", "admin"],
  trust: ["customer", "supplier", "broker", "admin"],
  claims: ["customer", "supplier", "admin"],
};

export function registerContractRoutes(router) {
  for (const group of API_GROUPS) {
    if (["auth", "assets", "bookings", "inspections", "messages", "notifications", "reviews", "trust", "protection", "claims", "disputes", "payments", "escrow"].includes(group)) continue;
    const controller = createContractController(group);
    const roles = ROLE_REQUIREMENTS[group] || [];
    const middleware = roles.length ? [requireRoles(roles)] : [];
    router.get(`/api/${group}`, validateRequest(`${group}.query`), ...middleware, controller.index);
  }
}
