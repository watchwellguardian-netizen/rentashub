import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { ensureBookingThread, getThreadById, getThreadMessages, getVisibleThreads, loadMessages, loadThreads, markThreadRead, saveMessages, saveThreads, sendMessage } from "../messagingService.js";

export const messagesRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  listThreads(storage) {
    return loadThreads(getRepositoryStorage(storage));
  },
  listMessages(storage) {
    return loadMessages(getRepositoryStorage(storage));
  },
  getThread(storage, threadId) {
    return getThreadById(getRepositoryStorage(storage), threadId);
  },
  listVisibleThreads(storage, user) {
    return getVisibleThreads(getRepositoryStorage(storage), user);
  },
  listThreadMessages(storage, threadId) {
    return getThreadMessages(getRepositoryStorage(storage), threadId);
  },
  ensureBookingThread(storage, booking, listing = null) {
    return ensureBookingThread(getRepositoryStorage(storage), booking, listing);
  },
  send(storage, payload) {
    return sendMessage(getRepositoryStorage(storage), payload);
  },
  markRead(storage, threadId, user) {
    return markThreadRead(getRepositoryStorage(storage), threadId, user);
  },
  saveThreads(storage, threads) {
    return saveThreads(getRepositoryStorage(storage), threads);
  },
  saveMessages(storage, messages) {
    return saveMessages(getRepositoryStorage(storage), messages);
  },
};
