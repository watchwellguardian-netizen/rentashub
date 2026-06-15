import { API_CONFIG } from "../apiClient.js";
import { notificationsRepository } from "../repositories/notificationsRepository.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const NOTIFICATION_API_PILOT_NOTICE =
  "Notification API mode is a guarded development pilot. Writes prefer backend bearer auth and use development role headers only as a local/demo fallback.";

export class NotificationApiError extends Error {
  constructor(message, { status = 0, code = "notification_api_error", details = [] } = {}) {
    super(message);
    this.name = "NotificationApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeBaseUrl(baseUrl = API_CONFIG.baseUrl) {
  return String(baseUrl || "").replace(/\/$/, "");
}

function requireBaseUrl() {
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    throw new NotificationApiError("Notification API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function devAuthHeaders(user = {}, options = {}) {
  return apiPilotAuthHeaders(user, options, { defaultId: "frontend-notification-api-pilot" });
}

async function requestNotificationApi(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NotificationApiError("Notification API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new NotificationApiError(payload.message || `Notification API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "notification_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function toCamelNotification(notification = {}) {
  return {
    id: notification.id,
    recipientId: notification.recipientId ?? notification.user_id ?? notification.recipient_id ?? "",
    type: notification.type || "general",
    title: notification.title || "Notification",
    body: notification.body || "",
    read: Boolean(notification.read ?? notification.read_at),
    timestamp: notification.timestamp ?? notification.created_at,
    relatedRoute: notification.relatedRoute ?? notification.related_route ?? "",
  };
}

const notificationApiImplementation = {
  adapter: "backendApiPilot",
  notice: NOTIFICATION_API_PILOT_NOTICE,
  async list(_storage, options = {}) {
    const payload = await requestNotificationApi("/api/notifications", {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelNotification);
  },
  async listByUser(_storage, _userId, options = {}) {
    return this.list(null, options);
  },
  async getById(_storage, notificationId, options = {}) {
    const payload = await requestNotificationApi(`/api/notifications/${encodeURIComponent(notificationId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.data ? toCamelNotification(payload.data) : null;
  },
  async create(_storage, notification, options = {}) {
    const payload = await requestNotificationApi("/api/notifications", {
      method: "POST",
      body: {
        user_id: notification.recipientId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        related_route: notification.relatedRoute,
      },
      headers: devAuthHeaders(options.user || { id: notification.recipientId, role: "customer" }, options),
    });
    return toCamelNotification(payload.data);
  },
  async markRead(_storage, notificationId, userId, options = {}) {
    const payload = await requestNotificationApi(`/api/notifications/${encodeURIComponent(notificationId)}`, {
      method: "PATCH",
      body: { read: true },
      headers: devAuthHeaders(options.user || { id: userId, role: "customer" }, options),
    });
    return Boolean(payload.data);
  },
  async markAllRead(_storage, userId, options = {}) {
    const payload = await requestNotificationApi("/api/notifications/all", {
      method: "PATCH",
      body: { read_all: true, user_id: userId },
      headers: devAuthHeaders(options.user || { id: userId, role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelNotification);
  },
  saveAll() {
    throw new NotificationApiError("Bulk notification save is not supported in the notification API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("notifications", notificationsRepository);

export const notificationAdapter = {
  ...baseAdapter,
  api: notificationApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? notificationApiImplementation : notificationsRepository;
  },
};

for (const methodName of Object.keys(notificationsRepository).filter((key) => typeof notificationsRepository[key] === "function")) {
  notificationAdapter[methodName] = (...args) => notificationAdapter.forMode()[methodName](...args);
}
