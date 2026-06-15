import { getAssetListingById, loadAssetListings } from "./assetListing.js";
import { appendSystemMessage, ensureBookingThread } from "./messagingService.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const BOOKING_STORAGE_KEY = "rentashub_bookings";

export const BOOKING_STATUSES = {
  pending_supplier_approval: "Pending supplier approval",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  active: "Active",
  completed: "Completed",
};

export const BLOCKING_BOOKING_STATUSES = ["approved", "active"];

export const SEED_BOOKINGS = [
  {
    id: "booking-seed-pending-1",
    assetId: "asset-seed-supplier-1",
    assetTitle: "7-seater SUV for airport and family rentals",
    customerId: "review-customer",
    customerName: "Review Customer",
    supplierId: "review-supplier",
    supplierName: "Review Supplier",
    startDateTime: "2026-06-10T09:00",
    endDateTime: "2026-06-12T09:00",
    rentalType: "daily",
    pickupDeliveryMethod: "pickup",
    deliveryLocation: "",
    notes: "Demo booking request for supplier review.",
    estimatedDuration: 2,
    estimatedDurationLabel: "2 daily unit(s)",
    estimatedCost: 36000,
    depositRequirement: "JMD 30000 refundable deposit",
    status: "pending_supplier_approval",
    paymentStatus: "not_active",
    createdAt: "2026-06-07T00:00:00.000Z",
    updatedAt: "2026-06-07T00:00:00.000Z",
  },
];

export function isCustomerRole(role) {
  return ["customer", "guest", "user"].includes(normalizeRole(role));
}

export function isSupplierRole(role) {
  return ["supplier", "vendor"].includes(normalizeRole(role));
}

export function canCreateBooking(user) {
  return Boolean(user && isCustomerRole(user.role));
}

export function canViewBooking(user, booking, listing) {
  if (!user || !booking) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (isCustomerRole(role)) return booking.customerId === user.id;
  if (isSupplierRole(role)) return listing?.ownerSupplierId === user.id || booking.supplierId === user.id;
  return false;
}

export function canManageBooking(user, booking, listing) {
  if (!user || !booking || !listing) return false;
  return isSupplierRole(user.role) && listing.ownerSupplierId === user.id;
}

export function loadBookings(storage) {
  if (!storage) return SEED_BOOKINGS;
  const raw = storage.getItem(BOOKING_STORAGE_KEY);
  if (!raw) {
    storage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(SEED_BOOKINGS));
    return SEED_BOOKINGS;
  }
  return JSON.parse(raw);
}

export function saveBookings(storage, bookings) {
  if (!storage) return bookings;
  storage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookings));
  return bookings;
}

export function getBookingById(storage, bookingId) {
  return loadBookings(storage).find((booking) => booking.id === bookingId) || null;
}

export function getCustomerBookings(storage, customerId) {
  return loadBookings(storage).filter((booking) => booking.customerId === customerId);
}

export function getSupplierBookings(storage, supplierId) {
  const listings = loadAssetListings(storage);
  const supplierAssetIds = new Set(listings.filter((listing) => listing.ownerSupplierId === supplierId).map((listing) => listing.id));
  return loadBookings(storage).filter((booking) => supplierAssetIds.has(booking.assetId) || booking.supplierId === supplierId);
}

export function calculateRentalDuration(startDateTime, endDateTime, rentalType = "daily") {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { valid: false, units: 0, label: "Dates not ready" };
  }

  const hours = (end - start) / 36e5;
  const days = hours / 24;
  const unitMap = {
    hourly: Math.ceil(hours),
    daily: Math.ceil(days),
    weekly: Math.ceil(days / 7),
    monthly: Math.ceil(days / 30),
    "long-term": Math.ceil(days / 30),
  };
  const units = Math.max(1, unitMap[rentalType] || Math.ceil(days));
  return { valid: true, units, label: `${units} ${rentalType} unit(s)` };
}

export function estimateBookingCost(listing, startDateTime, endDateTime) {
  const duration = calculateRentalDuration(startDateTime, endDateTime, listing?.rentalType);
  return {
    ...duration,
    estimatedCost: duration.valid ? Number(listing?.priceRate || 0) * duration.units : 0,
  };
}

export function bookingsOverlap(first, second) {
  const firstStart = new Date(first.startDateTime).getTime();
  const firstEnd = new Date(first.endDateTime).getTime();
  const secondStart = new Date(second.startDateTime).getTime();
  const secondEnd = new Date(second.endDateTime).getTime();
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function hasBlockingOverlap(bookings, candidate) {
  return bookings.some((booking) => (
    booking.assetId === candidate.assetId
    && booking.id !== candidate.id
    && BLOCKING_BOOKING_STATUSES.includes(booking.status)
    && bookingsOverlap(booking, candidate)
  ));
}

export function validateBookingRequest({ user, listing, input = {}, existingBookings = [] } = {}) {
  const errors = {};
  if (!canCreateBooking(user)) errors.user = "Sign in as a customer to request a booking.";
  if (!listing) errors.asset = "Asset listing was not found.";
  if (listing && listing.availabilityStatus !== "available") errors.asset = "This asset is not available for booking.";
  if (!input.startDateTime) errors.startDateTime = "Start date and time are required.";
  if (!input.endDateTime) errors.endDateTime = "End date and time are required.";
  if (!input.pickupDeliveryMethod) errors.pickupDeliveryMethod = "Choose pickup or delivery.";
  if (input.pickupDeliveryMethod === "delivery" && !input.deliveryLocation) errors.deliveryLocation = "Delivery location is required.";

  const estimate = listing ? estimateBookingCost(listing, input.startDateTime, input.endDateTime) : { valid: false, units: 0, estimatedCost: 0, label: "Dates not ready" };
  if (input.startDateTime && input.endDateTime && !estimate.valid) errors.endDateTime = "End date must be after the start date.";

  const candidate = {
    id: input.id || "",
    assetId: listing?.id,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
  };
  if (!errors.startDateTime && !errors.endDateTime && listing && hasBlockingOverlap(existingBookings, candidate)) {
    errors.overlap = "This asset already has an approved or active booking during those dates.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    estimate,
  };
}

export function createBookingRequest(storage, { user, listing, input }) {
  const existingBookings = loadBookings(storage);
  const validation = validateBookingRequest({ user, listing, input, existingBookings });
  if (!validation.valid) return validation;

  const now = new Date().toISOString();
  const booking = {
    id: input.id || `booking-${Date.now()}`,
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: user.id,
    customerName: user.full_name || user.email || "Customer",
    supplierId: listing.ownerSupplierId,
    supplierName: listing.supplierName || "Supplier",
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    rentalType: listing.rentalType,
    pickupDeliveryMethod: input.pickupDeliveryMethod,
    deliveryLocation: input.pickupDeliveryMethod === "delivery" ? input.deliveryLocation : "",
    notes: input.notes || "",
    estimatedDuration: validation.estimate.units,
    estimatedDurationLabel: validation.estimate.label,
    estimatedCost: validation.estimate.estimatedCost,
    depositRequirement: listing.depositRequirement,
    status: "pending_supplier_approval",
    paymentStatus: "not_active",
    createdAt: now,
    updatedAt: now,
  };

  const nextBookings = [booking, ...existingBookings];
  saveBookings(storage, nextBookings);
  const thread = ensureBookingThread(storage, booking, listing);
  appendSystemMessage(storage, thread.id, "New booking request submitted.", "system");
  createNotification(storage, {
    recipientId: booking.supplierId,
    type: "new_booking_request",
    title: "New booking request",
    body: `${booking.customerName} requested ${booking.assetTitle}.`,
    relatedRoute: `/booking/${booking.id}/manage`,
  });
  return { valid: true, errors: {}, booking, bookings: nextBookings };
}

export function updateBookingStatus(storage, bookingId, status, user) {
  const bookings = loadBookings(storage);
  const listings = loadAssetListings(storage);
  const booking = bookings.find((item) => item.id === bookingId);
  const listing = booking ? getAssetListingById(storage, booking.assetId) || listings.find((item) => item.id === booking.assetId) : null;

  if (!booking) return { valid: false, error: "Booking request was not found." };
  if (["approved", "declined"].includes(status) && !canManageBooking(user, booking, listing)) {
    return { valid: false, error: "You cannot manage bookings for another supplier's asset." };
  }
  if (status === "cancelled" && !(isCustomerRole(user?.role) && booking.customerId === user.id)) {
    return { valid: false, error: "Only the booking customer can cancel this request." };
  }
  if (status === "approved" && hasBlockingOverlap(bookings, { ...booking, status })) {
    return { valid: false, error: "This booking overlaps an approved or active booking." };
  }

  const nextBooking = { ...booking, status, updatedAt: new Date().toISOString() };
  const nextBookings = bookings.map((item) => (item.id === bookingId ? nextBooking : item));
  saveBookings(storage, nextBookings);
  const thread = ensureBookingThread(storage, nextBooking, listing);
  if (status === "approved") {
    appendSystemMessage(storage, thread.id, "Booking approved by supplier.", "system");
    createNotification(storage, {
      recipientId: booking.customerId,
      type: "booking_approved",
      title: "Booking approved",
      body: `${booking.assetTitle} was approved. Simulated payment is available next.`,
      relatedRoute: `/booking/${booking.id}/payment`,
    });
  }
  if (status === "declined") {
    appendSystemMessage(storage, thread.id, "Booking declined by supplier.", "system");
    createNotification(storage, {
      recipientId: booking.customerId,
      type: "booking_declined",
      title: "Booking declined",
      body: `${booking.assetTitle} was declined by the supplier.`,
      relatedRoute: `/booking/${booking.id}`,
    });
  }
  return { valid: true, booking: nextBooking, bookings: nextBookings };
}

export function resolveBookingContext(storage, bookingId) {
  const booking = getBookingById(storage, bookingId);
  const listing = booking ? getAssetListingById(storage, booking.assetId) : null;
  return { booking, listing };
}
