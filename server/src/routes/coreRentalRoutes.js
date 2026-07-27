import { createCoreRentalController } from "../controllers/coreRentalController.js";
import { requireRoles } from "../middleware/auth.js";

const RENTAL_ROLES = ["customer", "supplier", "broker", "dealer", "admin"];
const SUPPLIER_ROLES = ["supplier", "admin"];
const CUSTOMER_ROLES = ["customer", "admin"];

export function registerCoreRentalRoutes(router, options = {}) {
  const controller = createCoreRentalController(options);

  router.get("/api/v1/rentals/actions", requireRoles(RENTAL_ROLES), controller.actions);
  router.get("/api/v1/rentals/persistence/readiness", requireRoles(["admin"]), controller.readiness);
  router.post("/api/v1/rentals/availability", requireRoles(RENTAL_ROLES), controller.checkAvailability);
  router.post("/api/v1/rentals/quote", requireRoles(RENTAL_ROLES), controller.quote);

  router.post("/api/v1/rentals/assets", requireRoles(SUPPLIER_ROLES), controller.createAsset);
  router.patch("/api/v1/rentals/listings/:id/:action", requireRoles(SUPPLIER_ROLES), controller.runListingAction);

  router.post("/api/v1/rentals/bookings", requireRoles(CUSTOMER_ROLES), controller.requestBooking);
  router.get("/api/v1/rentals/bookings/:id", requireRoles(RENTAL_ROLES), controller.readBooking);
  router.patch("/api/v1/rentals/bookings/:id/:action", requireRoles(RENTAL_ROLES), controller.runBookingAction);
}
