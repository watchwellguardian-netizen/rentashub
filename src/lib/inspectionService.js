import { getCategoryById } from "./assetListing.js";
import { getAssetListingById } from "./assetListing.js";
import { getBookingById, isCustomerRole, isSupplierRole, loadBookings, saveBookings } from "./bookingService.js";
import { appendSystemMessage, ensureBookingThread } from "./messagingService.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const INSPECTION_STORAGE_KEY = "rentashub_inspections";

export const CONDITION_ITEMS = [
  "Exterior/body condition reviewed",
  "Interior/operator area reviewed",
  "Tires/tracks/ground contact reviewed",
  "Controls and safety items reviewed",
  "Accessories and included items reviewed",
];

export const INSPECTION_REVIEW_STATUSES = {
  pending: "Pending supplier review",
  accepted: "Accepted",
  flagged: "Flagged for follow-up",
};

export function loadInspections(storage) {
  if (!storage) return [];
  const raw = storage.getItem(INSPECTION_STORAGE_KEY);
  if (!raw) {
    storage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveInspections(storage, inspections) {
  if (!storage) return inspections;
  storage.setItem(INSPECTION_STORAGE_KEY, JSON.stringify(inspections));
  return inspections;
}

export function getInspectionById(storage, inspectionId) {
  return loadInspections(storage).find((inspection) => inspection.id === inspectionId) || null;
}

export function getInspectionsByBooking(storage, bookingId) {
  return loadInspections(storage).filter((inspection) => inspection.bookingId === bookingId);
}

export function getInspectionContext(storage, inspectionId) {
  const inspection = getInspectionById(storage, inspectionId);
  const booking = inspection ? getBookingById(storage, inspection.bookingId) : null;
  const listing = inspection ? getAssetListingById(storage, inspection.assetId) : null;
  return { inspection, booking, listing };
}

export function hasMeterFields(listing) {
  return ["cars", "trucks", "heavy-equipment"].includes(listing?.category);
}

export function hasOdometerField(listing) {
  return ["cars", "trucks"].includes(listing?.category);
}

export function hasEngineHoursField(listing) {
  return listing?.category === "heavy-equipment";
}

export function hasAccessoryFields(listing) {
  return ["small-tools-machines", "heavy-equipment", "trailers", "specialty-assets"].includes(listing?.category);
}

export function canCheckInBooking(user, booking) {
  const paymentAllowed = ["paid", "manual_offline"].includes(booking?.paymentStatus);
  return Boolean(user && booking && isCustomerRole(user.role) && booking.customerId === user.id && ["approved", "active"].includes(booking.status) && paymentAllowed);
}

export function canCheckOutBooking(user, booking) {
  return Boolean(user && booking && isCustomerRole(user.role) && booking.customerId === user.id && booking.status === "active");
}

export function canViewInspection(user, inspection, booking, listing) {
  if (!user || !inspection || !booking) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (isCustomerRole(role)) return booking.customerId === user.id;
  if (isSupplierRole(role)) return listing?.ownerSupplierId === user.id;
  return false;
}

export function canReviewInspection(user, inspection, booking, listing) {
  return Boolean(user && inspection && booking && listing && isSupplierRole(user.role) && listing.ownerSupplierId === user.id);
}

export function createEmptyInspectionInput() {
  return {
    conditionStatus: "good",
    checklist: CONDITION_ITEMS.reduce((items, item) => ({ ...items, [item]: false }), {}),
    photos: [],
    fuelBatteryLevel: "",
    odometer: "",
    engineHours: "",
    accessoriesIncluded: "",
    missingAccessories: "",
    customerNotes: "",
    damageNotes: "",
    locationLabel: "",
  };
}

function updateStoredBookingStatus(storage, bookingId, status) {
  const bookings = loadBookings(storage);
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking) return null;
  const nextBooking = { ...booking, status, updatedAt: new Date().toISOString() };
  saveBookings(storage, bookings.map((item) => (item.id === bookingId ? nextBooking : item)));
  return nextBooking;
}

function normalizeInspectionInput(input = {}) {
  return {
    ...createEmptyInspectionInput(),
    ...input,
    checklist: {
      ...createEmptyInspectionInput().checklist,
      ...(input.checklist || {}),
    },
    photos: Array.isArray(input.photos) ? input.photos : [],
  };
}

export function validateInspection({ type, user, booking, listing, input = {} } = {}) {
  const errors = {};
  const normalized = normalizeInspectionInput(input);
  if (!booking) errors.booking = "Booking was not found.";
  if (!listing) errors.asset = "Asset listing was not found.";
  if (type === "check-in" && !canCheckInBooking(user, booking)) errors.permission = "Check-in is available only for your own approved or active booking.";
  if (type === "check-out" && !canCheckOutBooking(user, booking)) errors.permission = "Check-out is available only for your own active booking.";
  if (!normalized.conditionStatus) errors.conditionStatus = "Choose a condition status.";
  if (Object.values(normalized.checklist).every((checked) => !checked)) errors.checklist = "Complete at least one checklist item.";
  if (hasOdometerField(listing) && !normalized.odometer) errors.odometer = "Odometer reading is required for vehicles and trucks.";
  if (hasEngineHoursField(listing) && !normalized.engineHours) errors.engineHours = "Engine hours are required for heavy equipment.";
  if (hasAccessoryFields(listing) && type === "check-in" && !normalized.accessoriesIncluded) errors.accessoriesIncluded = "Accessories included are required for tools and equipment.";
  if (hasAccessoryFields(listing) && type === "check-out" && !normalized.missingAccessories) errors.missingAccessories = "Enter missing accessories or write none.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    input: normalized,
  };
}

export function submitInspection(storage, { type, user, booking, listing, input }) {
  const validation = validateInspection({ type, user, booking, listing, input });
  if (!validation.valid) return validation;

  const now = new Date().toISOString();
  const inspection = {
    id: `${type}-${booking.id}-${Date.now()}`,
    type,
    bookingId: booking.id,
    assetId: listing.id,
    assetTitle: listing.title,
    assetCategory: listing.category,
    categoryLabel: getCategoryById(listing.category).label,
    conditionStatus: validation.input.conditionStatus,
    checklist: validation.input.checklist,
    photos: validation.input.photos.length
      ? validation.input.photos
      : [{ id: `photo-placeholder-${Date.now()}`, name: "photo upload coming soon", status: "upload-ready-placeholder" }],
    fuelBatteryLevel: validation.input.fuelBatteryLevel,
    odometer: validation.input.odometer,
    engineHours: validation.input.engineHours,
    accessoriesIncluded: validation.input.accessoriesIncluded,
    missingAccessories: validation.input.missingAccessories,
    customerNotes: validation.input.customerNotes,
    damageNotes: validation.input.damageNotes,
    location: {
      label: validation.input.locationLabel,
      gpsReady: true,
      coordinates: null,
    },
    submittedByUserId: user.id,
    submittedByRole: normalizeRole(user.role),
    timestamp: now,
    supplierReview: {
      status: "pending",
      reviewedByUserId: "",
      reviewedAt: "",
      notes: "",
    },
  };

  const inspections = [inspection, ...loadInspections(storage)];
  saveInspections(storage, inspections);
  const bookingStatus = type === "check-in" ? "active" : "completed";
  const updatedBooking = updateStoredBookingStatus(storage, booking.id, bookingStatus);
  const thread = ensureBookingThread(storage, updatedBooking || booking, listing);
  appendSystemMessage(storage, thread.id, type === "check-in" ? "Digital check-in completed." : "Digital check-out completed.", "system");
  createNotification(storage, {
    recipientId: listing.ownerSupplierId,
    type: type === "check-in" ? "check_in_completed" : "check_out_completed",
    title: type === "check-in" ? "Check-in completed" : "Check-out completed",
    body: `${booking.customerName} submitted ${type} for ${booking.assetTitle}.`,
    relatedRoute: `/inspection/${inspection.id}/review`,
  });
  return { valid: true, errors: {}, inspection, booking: updatedBooking, inspections };
}

export function reviewInspection(storage, inspectionId, reviewStatus, user, notes = "") {
  const context = getInspectionContext(storage, inspectionId);
  if (!context.inspection) return { valid: false, error: "Inspection record was not found." };
  if (!canReviewInspection(user, context.inspection, context.booking, context.listing)) {
    return { valid: false, error: "You cannot review inspections for another supplier's asset." };
  }
  if (!["accepted", "flagged"].includes(reviewStatus)) {
    return { valid: false, error: "Choose accepted or flagged review status." };
  }

  const nextInspection = {
    ...context.inspection,
    supplierReview: {
      status: reviewStatus,
      reviewedByUserId: user.id,
      reviewedAt: new Date().toISOString(),
      notes,
      placeholder: reviewStatus === "flagged" ? "Damage claim and dispute workflow will be added in a later module." : "",
    },
  };
  const inspections = loadInspections(storage).map((inspection) => (inspection.id === inspectionId ? nextInspection : inspection));
  saveInspections(storage, inspections);
  if (reviewStatus === "flagged") {
    createNotification(storage, {
      recipientId: context.booking.customerId,
      type: "inspection_flagged",
      title: "Inspection flagged",
      body: `${context.inspection.assetTitle} inspection was flagged for follow-up.`,
      relatedRoute: `/inspection/${inspectionId}`,
    });
  }
  return { valid: true, inspection: nextInspection, inspections };
}
