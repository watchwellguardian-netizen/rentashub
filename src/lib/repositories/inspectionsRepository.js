import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { getInspectionById, getInspectionContext, getInspectionsByBooking, loadInspections, reviewInspection, saveInspections, submitInspection } from "../inspectionService.js";

export const inspectionsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    return loadInspections(getRepositoryStorage(storage));
  },
  getById(storage, inspectionId) {
    return getInspectionById(getRepositoryStorage(storage), inspectionId);
  },
  listByBooking(storage, bookingId) {
    return getInspectionsByBooking(getRepositoryStorage(storage), bookingId);
  },
  getContext(storage, inspectionId) {
    return getInspectionContext(getRepositoryStorage(storage), inspectionId);
  },
  submit(storage, payload) {
    return submitInspection(getRepositoryStorage(storage), payload);
  },
  review(storage, inspectionId, status, user, notes) {
    return reviewInspection(getRepositoryStorage(storage), inspectionId, status, user, notes);
  },
  saveAll(storage, inspections) {
    return saveInspections(getRepositoryStorage(storage), inspections);
  },
};
