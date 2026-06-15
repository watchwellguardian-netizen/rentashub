import { API_MODE_NOT_IMPLEMENTED_MESSAGE, DATA_MODES, normalizeDataMode } from "./adapterConfig.js";

function createApiGuard(domainName, methodName) {
  return () => {
    throw new Error(`${API_MODE_NOT_IMPLEMENTED_MESSAGE} Domain: ${domainName}. Method: ${methodName}.`);
  };
}

export function createFrontendAdapter(domainName, localImplementation) {
  const methodNames = Object.keys(localImplementation).filter((key) => typeof localImplementation[key] === "function");
  const apiImplementation = Object.fromEntries(methodNames.map((methodName) => [methodName, createApiGuard(domainName, methodName)]));

  const adapter = {
    domain: domainName,
    defaultMode: DATA_MODES.LOCAL,
    local: localImplementation,
    api: apiImplementation,
    forMode(mode) {
      return normalizeDataMode(mode) === DATA_MODES.API ? apiImplementation : localImplementation;
    },
  };

  for (const methodName of methodNames) {
    adapter[methodName] = (...args) => adapter.forMode()[methodName](...args);
  }

  return adapter;
}
