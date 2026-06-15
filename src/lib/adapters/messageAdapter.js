import { messagesRepository } from "../repositories/messagesRepository.js";
import { API_CONFIG } from "../apiClient.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { createFrontendAdapter } from "./createAdapter.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";

export const MESSAGE_API_PILOT_NOTICE =
  "Message API mode is a guarded development pilot. Writes prefer backend bearer auth and use development role headers only as a local/demo fallback.";

export class MessageApiError extends Error {
  constructor(message, { status = 0, code = "message_api_error", details = [] } = {}) {
    super(message);
    this.name = "MessageApiError";
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
    throw new MessageApiError("Message API mode is enabled, but VITE_API_BASE_URL is not configured.", {
      code: "backend_unavailable",
    });
  }
  return baseUrl;
}

function devAuthHeaders(user = {}, options = {}) {
  return apiPilotAuthHeaders(user, options, { defaultId: "frontend-message-api-pilot" });
}

async function requestMessageApi(path, { method = "GET", body, headers = {} } = {}) {
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
    throw new MessageApiError("Message API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", {
      code: "backend_unavailable",
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MessageApiError(payload.message || `Message API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "message_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function safeJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toCamelThread(thread = {}) {
  return {
    id: thread.id,
    bookingId: thread.bookingId ?? thread.booking_id ?? "",
    assetId: thread.assetId ?? thread.asset_id ?? "",
    assetTitle: thread.assetTitle ?? thread.asset_title ?? "Booking conversation",
    customerId: thread.customerId ?? thread.customer_id ?? "",
    supplierId: thread.supplierId ?? thread.supplier_id ?? "",
    participants: safeJson(thread.participants ?? thread.participant_ids_json, []),
    lastMessage: thread.lastMessage ?? thread.last_message ?? "",
    unreadBy: safeJson(thread.unreadBy ?? thread.unread_by_json, {}),
    status: thread.status || "open",
    createdAt: thread.createdAt ?? thread.created_at,
    updatedAt: thread.updatedAt ?? thread.updated_at,
  };
}

function toCamelMessage(message = {}) {
  return {
    id: message.id,
    threadId: message.threadId ?? message.thread_id ?? "",
    senderId: message.senderId ?? message.sender_id ?? "",
    senderRole: message.senderRole ?? message.sender_role ?? "customer",
    body: message.body || "",
    timestamp: message.timestamp ?? message.created_at,
    readBy: safeJson(message.readBy ?? message.read_by_json, []),
    isSystem: Boolean(message.isSystem ?? message.is_system),
    status: message.status || "sent",
  };
}

const messageApiImplementation = {
  adapter: "backendApiPilot",
  notice: MESSAGE_API_PILOT_NOTICE,
  async listVisibleThreads(_storage, user, options = {}) {
    const payload = await requestMessageApi("/api/messages", {
      headers: devAuthHeaders(user, options),
    });
    return (payload.data || []).map(toCamelThread);
  },
  async listThreads(_storage, options = {}) {
    const payload = await requestMessageApi("/api/messages", {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.data || []).map(toCamelThread);
  },
  async getThread(_storage, threadId, options = {}) {
    const payload = await requestMessageApi(`/api/messages/${encodeURIComponent(threadId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return payload.thread ? toCamelThread(payload.thread) : null;
  },
  async listThreadMessages(_storage, threadId, options = {}) {
    const payload = await requestMessageApi(`/api/messages/${encodeURIComponent(threadId)}`, {
      headers: devAuthHeaders(options.user || { role: "customer" }, options),
    });
    return (payload.messages || []).map(toCamelMessage);
  },
  async ensureBookingThread(_storage, booking, listing = null, options = {}) {
    const payload = await requestMessageApi("/api/messages", {
      method: "POST",
      body: {
        kind: "thread",
        booking_id: booking.id,
        asset_id: booking.assetId,
        asset_title: booking.assetTitle,
        customer_id: booking.customerId,
        supplier_id: booking.supplierId || listing?.ownerSupplierId,
        participants: [
          { id: booking.customerId, role: "customer", name: booking.customerName || "Customer" },
          { id: booking.supplierId || listing?.ownerSupplierId, role: "supplier", name: booking.supplierName || listing?.supplierName || "Supplier" },
        ],
      },
      headers: devAuthHeaders(options.user || { id: booking.customerId, role: "customer" }, options),
    });
    return toCamelThread(payload.thread || payload.data);
  },
  async send(_storage, { threadId, user, body }, options = {}) {
    const payload = await requestMessageApi("/api/messages", {
      method: "POST",
      body: {
        thread_id: threadId,
        sender_id: user.id,
        sender_role: user.role,
        body,
      },
      headers: devAuthHeaders(user, options),
    });
    return {
      valid: true,
      message: toCamelMessage(payload.message || payload.data),
      thread: payload.thread ? toCamelThread(payload.thread) : null,
      apiMode: true,
    };
  },
  async markRead(_storage, threadId, user, options = {}) {
    await requestMessageApi(`/api/messages/${encodeURIComponent(threadId)}`, {
      method: "PATCH",
      body: { mark_thread_read: true, user_id: user.id },
      headers: devAuthHeaders(user, options),
    });
  },
  saveThreads() {
    throw new MessageApiError("Bulk message thread save is not supported in the message API pilot.", { code: "unsupported_operation" });
  },
  saveMessages() {
    throw new MessageApiError("Bulk message save is not supported in the message API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("messages", messagesRepository);

export const messageAdapter = {
  ...baseAdapter,
  api: messageApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? messageApiImplementation : messagesRepository;
  },
};

for (const methodName of Object.keys(messagesRepository).filter((key) => typeof messagesRepository[key] === "function")) {
  messageAdapter[methodName] = (...args) => messageAdapter.forMode()[methodName](...args);
}
