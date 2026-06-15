export const NOTIFICATION_STORAGE_KEY = "rentashub_notifications";

export function loadNotifications(storage) {
  if (!storage) return [];
  const raw = storage.getItem(NOTIFICATION_STORAGE_KEY);
  if (!raw) {
    storage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveNotifications(storage, notifications) {
  if (!storage) return notifications;
  storage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  return notifications;
}

export function createNotification(storage, { recipientId, type, title, body, relatedRoute }) {
  if (!recipientId) return null;
  const notification = {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    recipientId,
    type,
    title,
    body,
    read: false,
    timestamp: new Date().toISOString(),
    relatedRoute,
  };
  saveNotifications(storage, [notification, ...loadNotifications(storage)]);
  return notification;
}

export function getUserNotifications(storage, userId) {
  return loadNotifications(storage).filter((notification) => notification.recipientId === userId);
}

export function getUnreadNotificationCount(storage, userId) {
  return getUserNotifications(storage, userId).filter((notification) => !notification.read).length;
}

export function markNotificationRead(storage, notificationId, userId) {
  const notifications = loadNotifications(storage);
  let changed = false;
  const next = notifications.map((notification) => {
    if (notification.id === notificationId && notification.recipientId === userId) {
      changed = true;
      return { ...notification, read: true };
    }
    return notification;
  });
  saveNotifications(storage, next);
  return changed;
}

export function markAllNotificationsRead(storage, userId) {
  const next = loadNotifications(storage).map((notification) => (
    notification.recipientId === userId ? { ...notification, read: true } : notification
  ));
  saveNotifications(storage, next);
  return getUserNotifications(storage, userId);
}
