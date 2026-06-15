import { supplierProfilesRepository } from "../repositories/supplierProfilesRepository.js";
import { verificationsRepository } from "../repositories/verificationsRepository.js";
import { createFrontendAdapter } from "./createAdapter.js";

export const supplierAdapter = createFrontendAdapter("suppliers", {
  ...supplierProfilesRepository,
  submitVerification: verificationsRepository.submit,
  simulateVerificationStatus: verificationsRepository.simulateStatus,
});
