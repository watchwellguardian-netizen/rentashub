import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";

export const DISPUTES_STORAGE_KEY = "rentashub_disputes";

export function loadDisputes(storage) {
  const target = getRepositoryStorage(storage);
  if (!target) return [];
  const raw = target.getItem(DISPUTES_STORAGE_KEY);
  if (!raw) {
    target.setItem(DISPUTES_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveDisputes(storage, disputes) {
  const target = getRepositoryStorage(storage);
  if (!target) return disputes;
  target.setItem(DISPUTES_STORAGE_KEY, JSON.stringify(disputes));
  return disputes;
}

export const disputesRepository = {
  adapter: "localStorage",
  notice: `${LOCAL_STORAGE_ADAPTER_NOTICE} Dispute workflow remains simulated/local until backend API mode is explicitly enabled.`,
  list(storage) {
    return loadDisputes(storage);
  },
  getById(storage, disputeId) {
    return loadDisputes(storage).find((dispute) => dispute.id === disputeId || dispute.disputeId === disputeId) || null;
  },
  saveAll(storage, disputes) {
    return saveDisputes(storage, disputes);
  },
};
