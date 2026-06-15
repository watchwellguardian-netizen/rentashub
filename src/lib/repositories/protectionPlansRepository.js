import { LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { getProtectionPlanById, getRecommendedProtectionPlans, loadProtectionPlans } from "../protectionService.js";

export const protectionPlansRepository = {
  adapter: "localStatic",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  list() {
    return loadProtectionPlans();
  },
  getById(planId) {
    return getProtectionPlanById(planId);
  },
  recommendedForCategory(category) {
    return getRecommendedProtectionPlans(category);
  },
};
