import { createNotification, loadNotifications } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";

export const NOTIFICATION_EVENT_QUEUE_STORAGE_KEY = "rentashub_notification_event_queue";
export const NOTIFICATION_PREFERENCES_STORAGE_KEY = "rentashub_notification_preferences";
export const NOTIFICATION_AUDIT_STORAGE_KEY = "rentashub_notification_audit";

export const NOTIFICATION_FRAMEWORK_EVENTS = [
  "auction_created",
  "auction_approved",
  "auction_rejected",
  "auction_ending_soon",
  "auction_won",
  "auction_lost",
  "inspection_requested",
  "inspection_completed",
  "transport_requested",
  "transport_quote_received",
  "financing_request_submitted",
  "financing_referral_updated",
  "document_generated",
  "compliance_alert",
  "dispute_opened",
  "dispute_resolved",
];

export const NOTIFICATION_CHANNELS = ["in_app", "email_placeholder", "sms_placeholder", "push_placeholder"];
export const NOTIFICATION_QUEUE_STATUSES = ["queued_local_only", "delivered_in_app", "provider_inactive", "retry_placeholder", "failed_placeholder"];

function readJson(storage, key, fallback) {
  if (!storage) return fallback;
  const raw = storage.getItem(key);
  if (!raw) {
    storage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(raw);
}

function writeJson(storage, key, value) {
  if (storage) storage.setItem(key, JSON.stringify(value));
  return value;
}

function titleize(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function defaultPreferences(userId) {
  return {
    userId,
    channels: {
      in_app: true,
      email_placeholder: false,
      sms_placeholder: false,
      push_placeholder: false,
    },
    eventTypes: Object.fromEntries(NOTIFICATION_FRAMEWORK_EVENTS.map((eventType) => [eventType, true])),
    providerNotice: "Only local in-app notifications are active. Email, SMS, and push remain inactive provider interfaces.",
    updatedAt: new Date().toISOString(),
  };
}

export function loadNotificationEventQueue(storage) {
  return readJson(storage, NOTIFICATION_EVENT_QUEUE_STORAGE_KEY, []);
}

export function saveNotificationEventQueue(storage, queue) {
  return writeJson(storage, NOTIFICATION_EVENT_QUEUE_STORAGE_KEY, queue);
}

export function loadNotificationPreferences(storage) {
  return readJson(storage, NOTIFICATION_PREFERENCES_STORAGE_KEY, []);
}

export function saveNotificationPreferences(storage, preferences) {
  return writeJson(storage, NOTIFICATION_PREFERENCES_STORAGE_KEY, preferences);
}

export function loadNotificationAudit(storage) {
  return readJson(storage, NOTIFICATION_AUDIT_STORAGE_KEY, []);
}

export function appendNotificationAudit(storage, entry) {
  const audit = {
    auditId: `notification-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    simulatedOnly: true,
    ...entry,
  };
  writeJson(storage, NOTIFICATION_AUDIT_STORAGE_KEY, [audit, ...loadNotificationAudit(storage)]);
  return audit;
}

export function getNotificationPreferences(storage, userId) {
  if (!userId) return defaultPreferences("anonymous");
  return loadNotificationPreferences(storage).find((item) => item.userId === userId) || defaultPreferences(userId);
}

export function updateNotificationPreferences(storage, user, input = {}) {
  if (!user) return { valid: false, error: "Sign in to update notification preferences." };
  const current = getNotificationPreferences(storage, user.id);
  const channels = { ...current.channels, ...(input.channels || {}) };
  channels.email_placeholder = false;
  channels.sms_placeholder = false;
  channels.push_placeholder = false;
  const next = {
    ...current,
    channels,
    eventTypes: { ...current.eventTypes, ...(input.eventTypes || {}) },
    updatedAt: new Date().toISOString(),
  };
  const preferences = loadNotificationPreferences(storage).filter((item) => item.userId !== user.id);
  saveNotificationPreferences(storage, [next, ...preferences]);
  appendNotificationAudit(storage, {
    actorId: user.id,
    action: "notification_preferences_updated",
    detail: "Local preferences updated. External providers remain inactive.",
  });
  return { valid: true, preferences: next };
}

export function getNotificationProviderStatus() {
  return {
    in_app: { status: "active_local", configured: true, productionSuitable: false },
    email_placeholder: { status: "provider_inactive", configured: false, provider: "SendGrid/Mailgun placeholder", productionSuitable: false },
    sms_placeholder: { status: "provider_inactive", configured: false, provider: "Twilio placeholder", productionSuitable: false },
    push_placeholder: { status: "provider_inactive", configured: false, provider: "Firebase/OneSignal placeholder", productionSuitable: false },
    liveDelivery: false,
    notice: "No real email, SMS, push, Twilio, SendGrid, Mailgun, Firebase, or OneSignal integration is active.",
  };
}

export function queueNotificationEvent(storage, user, input = {}) {
  const eventType = input.eventType;
  if (!NOTIFICATION_FRAMEWORK_EVENTS.includes(eventType)) return { valid: false, error: "Choose a valid notification event type." };
  if (!input.recipientId) return { valid: false, error: "Recipient is required." };
  const recipientPreferences = getNotificationPreferences(storage, input.recipientId);
  const inAppEnabled = recipientPreferences.channels.in_app !== false && recipientPreferences.eventTypes[eventType] !== false;
  const event = {
    eventId: `notification-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    eventType,
    recipientId: input.recipientId,
    actorId: user?.id || "system",
    sourceType: input.sourceType || "auction",
    sourceId: input.sourceId || "",
    relatedRoute: input.relatedRoute || "",
    channels: [...NOTIFICATION_CHANNELS],
    status: inAppEnabled ? "delivered_in_app" : "queued_local_only",
    providerStatus: getNotificationProviderStatus(),
    retryCount: 0,
    retryStatus: "not_required_for_local",
    payloadPreview: input.payloadPreview || `${titleize(eventType)} notification event queued locally.`,
    simulatedOnly: true,
    createdAt: new Date().toISOString(),
  };
  saveNotificationEventQueue(storage, [event, ...loadNotificationEventQueue(storage)]);
  if (inAppEnabled) {
    createNotification(storage, {
      recipientId: input.recipientId,
      type: eventType,
      title: titleize(eventType),
      body: `${event.payloadPreview} Email, SMS, and push delivery are provider placeholders only.`,
      relatedRoute: event.relatedRoute,
    });
  }
  appendNotificationAudit(storage, {
    actorId: user?.id || "system",
    recipientId: input.recipientId,
    action: "notification_event_queued",
    eventType,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    detail: "Event queued in local provider-ready notification framework.",
  });
  return { valid: true, event };
}

export function markNotificationEventForRetry(storage, user, eventId) {
  const role = normalizeRole(user?.role);
  if (role !== "admin") return { valid: false, error: "Notification retry queue requires admin access." };
  const queue = loadNotificationEventQueue(storage);
  const event = queue.find((item) => item.eventId === eventId);
  if (!event) return { valid: false, error: "Notification event was not found." };
  const next = {
    ...event,
    status: "retry_placeholder",
    retryCount: Number(event.retryCount || 0) + 1,
    retryStatus: "provider_inactive_retry_placeholder",
    updatedAt: new Date().toISOString(),
  };
  saveNotificationEventQueue(storage, queue.map((item) => item.eventId === eventId ? next : item));
  appendNotificationAudit(storage, {
    actorId: user.id,
    action: "notification_retry_placeholder",
    eventType: event.eventType,
    detail: "Retry marked locally. No external provider delivery occurred.",
  });
  return { valid: true, event: next };
}

export function getNotificationFrameworkDashboard(storage, user, scope = "user") {
  const role = normalizeRole(user?.role);
  const allEvents = loadNotificationEventQueue(storage);
  const allAudit = loadNotificationAudit(storage);
  const allNotifications = loadNotifications(storage);
  const isAdminScope = scope === "admin" || role === "admin";
  const events = isAdminScope ? allEvents : allEvents.filter((event) => event.recipientId === user?.id || event.actorId === user?.id);
  const audit = isAdminScope ? allAudit : allAudit.filter((entry) => entry.recipientId === user?.id || entry.actorId === user?.id);
  const retryQueue = events.filter((event) => ["retry_placeholder", "failed_placeholder"].includes(event.status));
  const preferences = getNotificationPreferences(storage, user?.id || "anonymous");
  return {
    scope,
    events,
    audit,
    retryQueue,
    preferences,
    providerStatus: getNotificationProviderStatus(),
    counts: {
      eventTypes: NOTIFICATION_FRAMEWORK_EVENTS.length,
      queued: events.length,
      retry: retryQueue.length,
      audit: audit.length,
      unread: allNotifications.filter((note) => note.recipientId === user?.id && !note.read).length,
      liveProviders: 0,
    },
    notice: "Notification framework is provider-ready only. In-app local notifications are active; email, SMS, and push are inactive placeholders.",
  };
}
