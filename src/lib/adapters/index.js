export { API_MODE_NOT_IMPLEMENTED_MESSAGE, DATA_MODES, getConfiguredDataMode, isApiDataMode, normalizeDataMode } from "./adapterConfig.js";
export { BEARER_AUTH_MIGRATION_NOTICE, apiPilotAuthHeaders } from "./apiAuthHeaders.js";
export { ASSET_API_PILOT_NOTICE, AssetApiError, assetAdapter } from "./assetAdapter.js";
export { BOOKING_API_PILOT_NOTICE, BookingApiError, bookingAdapter } from "./bookingAdapter.js";
export { INSPECTION_API_PILOT_NOTICE, InspectionApiError, inspectionAdapter } from "./inspectionAdapter.js";
export { MESSAGE_API_PILOT_NOTICE, MessageApiError, messageAdapter } from "./messageAdapter.js";
export { NOTIFICATION_API_PILOT_NOTICE, NotificationApiError, notificationAdapter } from "./notificationAdapter.js";
export { REVIEW_API_PILOT_NOTICE, ReviewApiError, reviewAdapter } from "./reviewAdapter.js";
export { DISPUTE_API_PILOT_NOTICE, DisputeApiError, disputeAdapter } from "./disputeAdapter.js";
export { PAYMENT_API_PILOT_NOTICE, PaymentApiError, paymentAdapter } from "./paymentAdapter.js";
export { supplierAdapter } from "./supplierAdapter.js";
export { marketplaceAdapter } from "./marketplaceAdapter.js";
export { TRUST_API_PILOT_NOTICE, TrustApiError, trustAdapter } from "./trustAdapter.js";
export { PROTECTION_API_PILOT_NOTICE, ProtectionApiError, protectionAdapter } from "./protectionAdapter.js";
export { API_AUTH_MIGRATION_NOTICE, AuthApiError, AUTH_MODES, authAdapter, getConfiguredAuthMode, normalizeAuthMode } from "./authAdapter.js";

import { assetAdapter } from "./assetAdapter.js";
import { authAdapter } from "./authAdapter.js";
import { bookingAdapter } from "./bookingAdapter.js";
import { disputeAdapter } from "./disputeAdapter.js";
import { inspectionAdapter } from "./inspectionAdapter.js";
import { marketplaceAdapter } from "./marketplaceAdapter.js";
import { messageAdapter } from "./messageAdapter.js";
import { notificationAdapter } from "./notificationAdapter.js";
import { paymentAdapter } from "./paymentAdapter.js";
import { protectionAdapter } from "./protectionAdapter.js";
import { reviewAdapter } from "./reviewAdapter.js";
import { supplierAdapter } from "./supplierAdapter.js";
import { trustAdapter } from "./trustAdapter.js";

export const frontendAdapters = {
  auth: authAdapter,
  assets: assetAdapter,
  bookings: bookingAdapter,
  disputes: disputeAdapter,
  inspections: inspectionAdapter,
  notifications: notificationAdapter,
  reviews: reviewAdapter,
  payments: paymentAdapter,
  messages: messageAdapter,
  suppliers: supplierAdapter,
  marketplace: marketplaceAdapter,
  trust: trustAdapter,
  protection: protectionAdapter,
};
