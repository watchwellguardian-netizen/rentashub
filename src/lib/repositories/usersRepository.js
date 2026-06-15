import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { REVIEW_USERS } from "../rbac.js";

export const usersRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list(storage) {
    getRepositoryStorage(storage);
    return REVIEW_USERS;
  },
  getById(storage, userId) {
    getRepositoryStorage(storage);
    return REVIEW_USERS.find((user) => user.id === userId) || null;
  },
};
