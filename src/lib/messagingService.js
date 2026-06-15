import { normalizeRole } from "./rbac.js";

export const THREAD_STORAGE_KEY = "rentashub_message_threads";
export const MESSAGE_STORAGE_KEY = "rentashub_messages";

function isCustomerRole(role) {
  return ["customer", "guest", "user"].includes(normalizeRole(role));
}

function isSupplierRole(role) {
  return ["supplier", "vendor"].includes(normalizeRole(role));
}

export function loadThreads(storage) {
  if (!storage) return [];
  const raw = storage.getItem(THREAD_STORAGE_KEY);
  if (!raw) {
    storage.setItem(THREAD_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveThreads(storage, threads) {
  if (!storage) return threads;
  storage.setItem(THREAD_STORAGE_KEY, JSON.stringify(threads));
  return threads;
}

export function loadMessages(storage) {
  if (!storage) return [];
  const raw = storage.getItem(MESSAGE_STORAGE_KEY);
  if (!raw) {
    storage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveMessages(storage, messages) {
  if (!storage) return messages;
  storage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
  return messages;
}

export function canAccessThread(user, thread) {
  if (!user || !thread) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (isCustomerRole(role)) return thread.customerId === user.id;
  if (isSupplierRole(role)) return thread.supplierId === user.id;
  return thread.participants?.some((participant) => participant.id === user.id);
}

export function getVisibleThreads(storage, user) {
  return loadThreads(storage).filter((thread) => canAccessThread(user, thread));
}

export function getThreadById(storage, threadId) {
  return loadThreads(storage).find((thread) => thread.id === threadId) || null;
}

export function getThreadMessages(storage, threadId) {
  return loadMessages(storage).filter((message) => message.threadId === threadId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function getUnreadMessageCount(storage, user) {
  return getVisibleThreads(storage, user).reduce((total, thread) => total + Number(thread.unreadBy?.[user.id] || 0), 0);
}

export function ensureBookingThread(storage, booking, listing = null) {
  const threads = loadThreads(storage);
  const existing = threads.find((thread) => thread.bookingId === booking.id);
  if (existing) return existing;
  const now = new Date().toISOString();
  const thread = {
    id: `thread-${booking.id}`,
    bookingId: booking.id,
    assetId: booking.assetId,
    assetTitle: booking.assetTitle,
    customerId: booking.customerId,
    supplierId: booking.supplierId || listing?.ownerSupplierId,
    participants: [
      { id: booking.customerId, role: "customer", name: booking.customerName || "Customer" },
      { id: booking.supplierId || listing?.ownerSupplierId, role: "supplier", name: booking.supplierName || listing?.supplierName || "Supplier" },
    ],
    lastMessage: "Booking conversation created.",
    unreadBy: {
      [booking.customerId]: 0,
      [booking.supplierId || listing?.ownerSupplierId]: 1,
    },
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  saveThreads(storage, [thread, ...threads]);
  appendSystemMessage(storage, thread.id, "Booking conversation created.", "system");
  return thread;
}

function bumpThread(storage, threadId, body, senderId, isSystem) {
  const threads = loadThreads(storage);
  const nextThreads = threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    const unreadBy = { ...(thread.unreadBy || {}) };
    for (const participant of thread.participants || []) {
      if (participant.id !== senderId) unreadBy[participant.id] = Number(unreadBy[participant.id] || 0) + 1;
    }
    return {
      ...thread,
      lastMessage: body,
      unreadBy: isSystem ? unreadBy : unreadBy,
      updatedAt: new Date().toISOString(),
    };
  });
  saveThreads(storage, nextThreads);
  return nextThreads.find((thread) => thread.id === threadId) || null;
}

export function sendMessage(storage, { threadId, user, body }) {
  const thread = getThreadById(storage, threadId);
  if (!canAccessThread(user, thread)) return { valid: false, error: "You cannot send messages in this thread." };
  if (!String(body || "").trim()) return { valid: false, error: "Message body is required." };
  const message = {
    id: `msg-${Date.now()}`,
    threadId,
    senderId: user.id,
    senderRole: normalizeRole(user.role),
    body: String(body).trim(),
    timestamp: new Date().toISOString(),
    readBy: [user.id],
    isSystem: false,
  };
  saveMessages(storage, [...loadMessages(storage), message]);
  const nextThread = bumpThread(storage, threadId, message.body, user.id, false);
  return { valid: true, message, thread: nextThread };
}

export function appendSystemMessage(storage, threadId, body, senderId = "system") {
  const message = {
    id: `sys-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    threadId,
    senderId,
    senderRole: "system",
    body,
    timestamp: new Date().toISOString(),
    readBy: [],
    isSystem: true,
  };
  saveMessages(storage, [...loadMessages(storage), message]);
  const nextThread = bumpThread(storage, threadId, body, senderId, true);
  return { valid: true, message, thread: nextThread };
}

export function markThreadRead(storage, threadId, user) {
  const threads = loadThreads(storage).map((thread) => (
    thread.id === threadId ? { ...thread, unreadBy: { ...(thread.unreadBy || {}), [user.id]: 0 } } : thread
  ));
  saveThreads(storage, threads);
  const messages = loadMessages(storage).map((message) => (
    message.threadId === threadId && !message.readBy?.includes(user.id)
      ? { ...message, readBy: [...(message.readBy || []), user.id] }
      : message
  ));
  saveMessages(storage, messages);
}
