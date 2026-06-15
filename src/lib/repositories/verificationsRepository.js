import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { simulateVerificationStatus, submitVerification } from "../supplierProfile.js";

export const verificationsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  submit(storage, user, selectedDocuments) {
    return submitVerification(getRepositoryStorage(storage), user, selectedDocuments);
  },
  simulateStatus(storage, supplierId, status) {
    return simulateVerificationStatus(getRepositoryStorage(storage), supplierId, status);
  },
};
