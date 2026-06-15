import { API_CONFIG } from "../apiClient.js";

export const DATA_MODES = {
  LOCAL: "local",
  API: "api",
};

export const API_MODE_NOT_IMPLEMENTED_MESSAGE = "API mode not implemented. Frontend adapters still use local storage until the API migration module is approved.";

export function normalizeDataMode(mode = API_CONFIG.dataMode) {
  return String(mode || DATA_MODES.LOCAL).toLowerCase() === DATA_MODES.API ? DATA_MODES.API : DATA_MODES.LOCAL;
}

export function getConfiguredDataMode() {
  return normalizeDataMode(API_CONFIG.dataMode);
}

export function isApiDataMode(mode = API_CONFIG.dataMode) {
  return normalizeDataMode(mode) === DATA_MODES.API;
}
