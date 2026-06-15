import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { createNotification, getUserNotifications, loadNotifications, markAllNotificationsRead, markNotificationRead, saveNotifications } from "../notificationService.js";

export const notificationsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadNotifications(getRepositoryStorage(storage));
  },
  listByUser(storage, userId) {
    return getUserNotifications(getRepositoryStorage(storage), userId);
  },
  create(storage, notification) {
    return createNotification(getRepositoryStorage(storage), notification);
  },
  markRead(storage, notificationId, userId) {
    return markNotificationRead(getRepositoryStorage(storage), notificationId, userId);
  },
  markAllRead(storage, userId) {
    return markAllNotificationsRead(getRepositoryStorage(storage), userId);
  },
  saveAll(storage, notifications) {
    return saveNotifications(getRepositoryStorage(storage), notifications);
  },
};
