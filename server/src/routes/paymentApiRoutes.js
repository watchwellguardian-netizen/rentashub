import { createPaymentApiController } from "../controllers/paymentApiController.js";
import { requireRoles } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { validateRequest } from "../middleware/validation.js";

const PAYMENT_ROLES = ["customer", "supplier", "admin"];

export function registerPaymentApiRoutes(router, options = {}) {
  const controller = createPaymentApiController(options);
  const paymentIntentLimit = createRateLimiter({ keyPrefix: "payment-intent", max: options.rateLimits?.paymentIntent?.max || 20, windowMs: options.rateLimits?.paymentIntent?.windowMs || 60_000 });

  router.get("/api/payments", requireRoles(PAYMENT_ROLES), validateRequest("payments.query"), controller.listPayments);
  router.get("/api/payments/:id", requireRoles(PAYMENT_ROLES), validateRequest("payments.params"), controller.findPayment);
  router.post("/api/payments/intent", requireRoles(["customer", "admin"]), paymentIntentLimit, validateRequest("payments.intent"), controller.createIntent);
  router.post("/api/payments/simulate", requireRoles(["customer", "admin"]), validateRequest("payments.simulate"), controller.simulatePayment);
  router.post("/api/payments/refund-placeholder", requireRoles(PAYMENT_ROLES), validateRequest("payments.refundPlaceholder"), controller.refundPlaceholder);
  router.get("/api/wallet", requireRoles(["customer", "admin"]), validateRequest("wallet.query"), controller.wallet);
  router.get("/api/earnings", requireRoles(["supplier", "admin"]), validateRequest("earnings.query"), controller.earnings);
  router.get("/api/payouts", requireRoles(["supplier", "admin"]), validateRequest("payouts.query"), controller.payouts);
  router.post("/api/payouts/request", requireRoles(["supplier", "admin"]), validateRequest("payouts.request"), controller.requestPayout);
  router.get("/api/transactions/:id", requireRoles(PAYMENT_ROLES), validateRequest("transactions.params"), controller.transaction);
}
