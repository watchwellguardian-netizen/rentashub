import { getRepositories } from "./persistenceService.js";

function publicError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function validationError(details) {
  return publicError(400, "validation_error", "Please correct the highlighted fields.", details);
}

function notFound(resource) {
  return publicError(404, "not_found", `${resource} was not found.`);
}

function forbidden(message = "You do not have permission to access this resource.") {
  return publicError(403, "forbidden", message);
}

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringify(value) {
  return JSON.stringify(value || {});
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function canAccessThread(user, thread) {
  if (!user || !thread) return false;
  if (user.role === "admin") return true;
  const participantIds = parseJson(thread.participant_ids_json, []);
  return participantIds.some((participant) => participant.id === user.id || participant === user.id);
}

async function audit(repositories, action, resource, req, entityId) {
  await repositories.audit_logs.record(action, resource, {
    actor_id: req.user?.id || "anonymous",
    entity_id: entityId,
    resource,
  });
}

export function createMessageService(options = {}) {
  const context = options.context || options;

  async function repositories() {
    return getRepositories(context);
  }

  return {
    async listThreads(req) {
      const repos = await repositories();
      const threads = await repos.message_threads.list();
      return threads.filter((thread) => canAccessThread(req.user, thread));
    },

    async getThreadDetail(threadId, req) {
      const repos = await repositories();
      const thread = await repos.message_threads.findById(threadId);
      if (!thread) throw notFound("Message thread");
      if (!canAccessThread(req.user, thread)) throw forbidden("You cannot access another user's message thread.");
      const messages = await repos.messages.list({ thread_id: threadId });
      return { thread, messages };
    },

    async ensureThread(payload, req) {
      const required = ["booking_id", "asset_id", "customer_id", "supplier_id"];
      const missing = required.filter((field) => !payload[field]);
      if (missing.length) throw validationError(missing.map((field) => ({ field, message: `${field} is required.` })));
      const repos = await repositories();
      const existing = (await repos.message_threads.list({ booking_id: payload.booking_id }))[0];
      if (existing) {
        if (!canAccessThread(req.user, existing)) throw forbidden("You cannot access another user's message thread.");
        return existing;
      }
      const participants = payload.participants?.length
        ? payload.participants
        : [
            { id: payload.customer_id, role: "customer", name: "Customer" },
            { id: payload.supplier_id, role: "supplier", name: "Supplier" },
          ];
      const thread = await repos.message_threads.create({
        id: payload.id || `thread-${payload.booking_id}`,
        booking_id: payload.booking_id,
        asset_id: payload.asset_id,
        asset_title: payload.asset_title || "Booking conversation",
        customer_id: payload.customer_id,
        supplier_id: payload.supplier_id,
        participant_ids_json: stringify(participants),
        unread_by_json: stringify({ [payload.customer_id]: 0, [payload.supplier_id]: 1 }),
        last_message: "Booking conversation created.",
        status: "open",
      });
      await repos.messages.create({
        id: createId("sys"),
        thread_id: thread.id,
        sender_id: "system",
        sender_role: "system",
        body: "Booking conversation created.",
        read_by_json: stringify([]),
        is_system: true,
        status: "sent",
      });
      await audit(repos, "message_threads.created", "message_thread", req, thread.id);
      return thread;
    },

    async sendMessage(payload, req) {
      const required = ["thread_id", "sender_id", "body"];
      const missing = required.filter((field) => !String(payload[field] || "").trim());
      if (missing.length) throw validationError(missing.map((field) => ({ field, message: `${field} is required.` })));
      const repos = await repositories();
      const thread = await repos.message_threads.findById(payload.thread_id);
      if (!thread) throw notFound("Message thread");
      if (!canAccessThread(req.user, thread)) throw forbidden("You cannot send messages in this thread.");
      if (payload.sender_id !== req.user.id && req.user.role !== "admin") throw forbidden("Sender must match the authenticated user.");

      const message = await repos.messages.create({
        id: payload.id || createId("msg"),
        thread_id: payload.thread_id,
        sender_id: payload.sender_id,
        sender_role: payload.sender_role || req.user.role,
        body: String(payload.body).trim(),
        read_by_json: stringify([payload.sender_id]),
        is_system: false,
        status: "sent",
      });
      const participants = parseJson(thread.participant_ids_json, []);
      const unreadBy = parseJson(thread.unread_by_json, {});
      for (const participant of participants) {
        const participantId = participant.id || participant;
        if (participantId !== payload.sender_id) unreadBy[participantId] = Number(unreadBy[participantId] || 0) + 1;
      }
      const updatedThread = await repos.message_threads.update(thread.id, {
        last_message: message.body,
        unread_by_json: stringify(unreadBy),
        updated_at: now(),
      });
      await audit(repos, "messages.created", "message", req, message.id);
      return { message, thread: updatedThread };
    },

    async patchMessageOrThread(id, payload, req) {
      const repos = await repositories();
      const message = await repos.messages.findById(id);
      if (message) {
        const thread = await repos.message_threads.findById(message.thread_id);
        if (!canAccessThread(req.user, thread)) throw forbidden("You cannot update this message.");
        const updated = await repos.messages.update(id, payload);
        await audit(repos, "messages.updated", "message", req, id);
        return { message: updated, thread };
      }

      const thread = await repos.message_threads.findById(id);
      if (!thread) throw notFound("Message");
      if (!canAccessThread(req.user, thread)) throw forbidden("You cannot update this message thread.");
      if (payload.mark_thread_read) {
        const unreadBy = parseJson(thread.unread_by_json, {});
        unreadBy[req.user.id] = 0;
        const updatedThread = await repos.message_threads.update(thread.id, { unread_by_json: stringify(unreadBy), updated_at: now() });
        const messages = await repos.messages.list({ thread_id: thread.id });
        for (const item of messages) {
          const readBy = parseJson(item.read_by_json, []);
          if (!readBy.includes(req.user.id)) await repos.messages.update(item.id, { read_by_json: stringify([...readBy, req.user.id]) });
        }
        await audit(repos, "message_threads.updated", "message_thread", req, thread.id);
        return { thread: updatedThread };
      }
      const updatedThread = await repos.message_threads.update(thread.id, payload);
      await audit(repos, "message_threads.updated", "message_thread", req, thread.id);
      return { thread: updatedThread };
    },
  };
}

export function createNotificationService(options = {}) {
  const context = options.context || options;

  async function repositories() {
    return getRepositories(context);
  }

  function canAccessNotification(user, notification) {
    return user?.role === "admin" || notification.user_id === user?.id;
  }

  return {
    async list(req) {
      const repos = await repositories();
      const notifications = await repos.notifications.list(req.user.role === "admin" ? {} : { user_id: req.user.id });
      return notifications;
    },

    async findById(id, req) {
      const repos = await repositories();
      const notification = await repos.notifications.findById(id);
      if (!notification) throw notFound("Notification");
      if (!canAccessNotification(req.user, notification)) throw forbidden("You cannot access another user's notification.");
      return notification;
    },

    async create(payload, req) {
      const required = ["user_id", "type", "title"];
      const missing = required.filter((field) => !String(payload[field] || "").trim());
      if (missing.length) throw validationError(missing.map((field) => ({ field, message: `${field} is required.` })));
      const repos = await repositories();
      if (req.user.role !== "admin" && payload.user_id !== req.user.id) throw forbidden("You cannot create notifications for another user.");
      const notification = await repos.notifications.create({
        id: payload.id || createId("note"),
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        body: payload.body || "",
        related_route: payload.related_route || "",
        read_at: payload.read ? now() : "",
      });
      await audit(repos, "notifications.created", "notification", req, notification.id);
      return notification;
    },

    async update(id, payload, req) {
      const repos = await repositories();
      if (id === "all" && payload.read_all) {
        const notifications = await repos.notifications.list(req.user.role === "admin" ? {} : { user_id: req.user.id });
        const updated = [];
        for (const notification of notifications) {
          updated.push(await repos.notifications.update(notification.id, { read_at: now() }));
        }
        await audit(repos, "notifications.updated", "notification", req, "all");
        return updated;
      }
      const notification = await repos.notifications.findById(id);
      if (!notification) throw notFound("Notification");
      if (!canAccessNotification(req.user, notification)) throw forbidden("You cannot update another user's notification.");
      const updated = await repos.notifications.update(id, {
        ...payload,
        read_at: payload.read ? now() : payload.read_at,
      });
      await audit(repos, "notifications.updated", "notification", req, id);
      return updated;
    },
  };
}
