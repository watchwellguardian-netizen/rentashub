import { createBaseRepository } from "./baseRepository.js";

export function createBookingRepository(database) {
  const base = createBaseRepository(database, "bookings", { idPrefix: "booking" });
  return {
    ...base,
    async listByCustomer(customerId) {
      return base.list({ customer_id: customerId });
    },
    async listBySupplier(supplierId) {
      return base.list({ supplier_id: supplierId });
    },
  };
}
