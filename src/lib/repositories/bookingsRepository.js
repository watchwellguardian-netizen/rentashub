import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { createBookingRequest, getBookingById, getCustomerBookings, getSupplierBookings, loadBookings, saveBookings, updateBookingStatus, resolveBookingContext } from "../bookingService.js";

export const bookingsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadBookings(getRepositoryStorage(storage));
  },
  getById(storage, bookingId) {
    return getBookingById(getRepositoryStorage(storage), bookingId);
  },
  listByCustomer(storage, customerId) {
    return getCustomerBookings(getRepositoryStorage(storage), customerId);
  },
  listBySupplier(storage, supplierId) {
    return getSupplierBookings(getRepositoryStorage(storage), supplierId);
  },
  createRequest(storage, payload) {
    return createBookingRequest(getRepositoryStorage(storage), payload);
  },
  updateStatus(storage, bookingId, status, user) {
    return updateBookingStatus(getRepositoryStorage(storage), bookingId, status, user);
  },
  resolveContext(storage, bookingId) {
    return resolveBookingContext(getRepositoryStorage(storage), bookingId);
  },
  saveAll(storage, bookings) {
    return saveBookings(getRepositoryStorage(storage), bookings);
  },
};
