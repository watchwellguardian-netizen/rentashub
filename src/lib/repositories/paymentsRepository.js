import { getRepositoryStorage, LOCAL_STORAGE_ADAPTER_NOTICE } from "../apiClient.js";
import { calculatePaymentSummary, createSimulatedPayment, getCustomerTransactions, getCustomerWalletSummary, getSupplierEarningsSummary, getSupplierTransactions, getTransactionById, loadLedger, requestSimulatedPayout, saveLedger } from "../paymentLedger.js";

export const paymentsRepository = {
  adapter: "localStorage",
  notice: LOCAL_STORAGE_ADAPTER_NOTICE,
  listLedger(storage) {
    return loadLedger(getRepositoryStorage(storage));
  },
  getTransaction(storage, transactionId) {
    return getTransactionById(getRepositoryStorage(storage), transactionId);
  },
  listCustomerTransactions(storage, customerId) {
    return getCustomerTransactions(getRepositoryStorage(storage), customerId);
  },
  listSupplierTransactions(storage, supplierId) {
    return getSupplierTransactions(getRepositoryStorage(storage), supplierId);
  },
  createSimulatedPayment(storage, payload) {
    return createSimulatedPayment(getRepositoryStorage(storage), payload);
  },
  calculatePaymentSummary,
  getCustomerWalletSummary(storage, customerId) {
    return getCustomerWalletSummary(getRepositoryStorage(storage), customerId);
  },
  getSupplierEarningsSummary(storage, supplierId) {
    return getSupplierEarningsSummary(getRepositoryStorage(storage), supplierId);
  },
  requestSimulatedPayout(storage, supplierId) {
    return requestSimulatedPayout(getRepositoryStorage(storage), supplierId);
  },
  saveLedger(storage, ledger) {
    return saveLedger(getRepositoryStorage(storage), ledger);
  },
};
