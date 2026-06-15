import { API_CONFIG } from "../apiClient.js";
import { paymentsRepository } from "../repositories/paymentsRepository.js";
import { DATA_MODES, normalizeDataMode } from "./adapterConfig.js";
import { apiPilotAuthHeaders } from "./apiAuthHeaders.js";
import { createFrontendAdapter } from "./createAdapter.js";

export const PAYMENT_API_PILOT_NOTICE =
  "Payments API mode is provider-ready but simulated by default. It does not collect cards, store bank accounts, execute escrow, process refunds, perform payouts, or move real money.";

export class PaymentApiError extends Error {
  constructor(message, { status = 0, code = "payment_api_error", details = [] } = {}) {
    super(message);
    this.name = "PaymentApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requireBaseUrl() {
  const baseUrl = String(API_CONFIG.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) throw new PaymentApiError("Payments API mode is enabled, but VITE_API_BASE_URL is not configured.", { code: "backend_unavailable" });
  return baseUrl;
}

async function requestPaymentApi(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${requireBaseUrl()}${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new PaymentApiError("Payments API backend is unavailable. Start the backend or switch VITE_DATA_MODE back to local.", { code: "backend_unavailable" });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PaymentApiError(payload.message || `Payments API request failed with status ${response.status}.`, {
      status: response.status,
      code: payload.error || (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "payment_api_error"),
      details: payload.details || [],
    });
  }
  return payload;
}

function toTransaction(record = {}) {
  return {
    id: record.id,
    bookingId: record.bookingId || record.booking_id || "",
    assetId: record.assetId || record.asset_id || "",
    assetTitle: record.assetTitle || "",
    customerId: record.customerId || record.customer_id || "",
    supplierId: record.supplierId || record.supplier_id || "",
    type: record.type || "payment",
    status: record.status || "pending",
    rentalSubtotal: Number(record.rentalSubtotal ?? record.subtotal ?? 0),
    deposit: Number(record.deposit || 0),
    protectionFee: Number(record.protectionFee ?? record.protection_fee ?? 0),
    platformFee: Number(record.platformFee ?? record.platform_fee ?? 0),
    supplierEarnings: Number(record.supplierEarnings ?? record.supplier_earnings ?? 0),
    total: Number(record.total || 0),
    timestamp: record.timestamp || record.created_at,
    note: record.note || PAYMENT_API_PILOT_NOTICE,
  };
}

const localPaymentImplementation = {
  ...paymentsRepository,
  createIntent(storage, { booking, listing }) {
    return {
      provider: "local",
      status: "preview_only",
      summary: paymentsRepository.calculatePaymentSummary?.(booking, listing),
      notice: PAYMENT_API_PILOT_NOTICE,
    };
  },
  listPayouts(storage, supplierId) {
    return paymentsRepository.listSupplierTransactions(storage, supplierId).filter((transaction) => transaction.type === "payout");
  },
};

const paymentApiImplementation = {
  adapter: "backendApiPilot",
  notice: PAYMENT_API_PILOT_NOTICE,
  async listLedger(_storage, options = {}) {
    const payload = await requestPaymentApi("/api/payments", { headers: apiPilotAuthHeaders(options.user, options) });
    return (payload.data || []).map(toTransaction);
  },
  async getTransaction(_storage, transactionId, options = {}) {
    const payload = await requestPaymentApi(`/api/transactions/${encodeURIComponent(transactionId)}`, { headers: apiPilotAuthHeaders(options.user, options) });
    return payload.data ? toTransaction(payload.data) : null;
  },
  async listCustomerTransactions(storage, _customerId, options = {}) {
    return this.listLedger(storage, options);
  },
  async listSupplierTransactions(storage, _supplierId, options = {}) {
    return this.listLedger(storage, options);
  },
  async createIntent(_storage, { bookingId }, options = {}) {
    const payload = await requestPaymentApi("/api/payments/intent", {
      method: "POST",
      body: { booking_id: bookingId },
      headers: apiPilotAuthHeaders(options.user, options),
    });
    return payload.data;
  },
  async createSimulatedPayment(_storage, { user, booking }, options = {}) {
    const payload = await requestPaymentApi("/api/payments/simulate", {
      method: "POST",
      body: { booking_id: booking?.id || options.bookingId },
      headers: apiPilotAuthHeaders(user, options),
    });
    return { valid: true, transaction: toTransaction(payload.data?.transaction), booking: payload.data?.booking, provider: payload.data?.provider, apiMode: true };
  },
  async refundPlaceholder(_storage, transactionId, user, options = {}) {
    const payload = await requestPaymentApi("/api/payments/refund-placeholder", {
      method: "POST",
      body: { transaction_id: transactionId },
      headers: apiPilotAuthHeaders(user, options),
    });
    return payload.data;
  },
  async getWallet(_storage, user, options = {}) {
    const payload = await requestPaymentApi("/api/wallet", { headers: apiPilotAuthHeaders(user, options) });
    return payload.data;
  },
  async getCustomerWalletSummary(storage, _customerId, options = {}) {
    return this.getWallet(storage, options.user || { role: "customer" }, options);
  },
  async getEarnings(_storage, user, options = {}) {
    const payload = await requestPaymentApi("/api/earnings", { headers: apiPilotAuthHeaders(user, options) });
    return payload.data;
  },
  async getSupplierEarningsSummary(storage, _supplierId, options = {}) {
    return this.getEarnings(storage, options.user || { role: "supplier" }, options);
  },
  async listPayouts(_storage, userOrSupplierId, options = {}) {
    const user = typeof userOrSupplierId === "object" ? userOrSupplierId : options.user || { id: userOrSupplierId, role: "supplier" };
    const payload = await requestPaymentApi("/api/payouts", { headers: apiPilotAuthHeaders(user, options) });
    return (payload.data || []).map(toTransaction);
  },
  async requestSimulatedPayout(_storage, userOrSupplierId, options = {}) {
    const user = typeof userOrSupplierId === "object" ? userOrSupplierId : { id: userOrSupplierId, role: "supplier" };
    const payload = await requestPaymentApi("/api/payouts/request", {
      method: "POST",
      body: {},
      headers: apiPilotAuthHeaders(user, options),
    });
    return { valid: true, transaction: toTransaction(payload.data?.transaction), notice: payload.data?.notice, apiMode: true };
  },
  saveLedger() {
    throw new PaymentApiError("Bulk payment ledger save is not supported in the payments API pilot.", { code: "unsupported_operation" });
  },
};

const baseAdapter = createFrontendAdapter("payments", localPaymentImplementation);

export const paymentAdapter = {
  ...baseAdapter,
  api: paymentApiImplementation,
  forMode(mode) {
    return normalizeDataMode(mode) === DATA_MODES.API ? paymentApiImplementation : localPaymentImplementation;
  },
};

for (const methodName of Object.keys(localPaymentImplementation).filter((key) => typeof localPaymentImplementation[key] === "function")) {
  paymentAdapter[methodName] = (...args) => paymentAdapter.forMode()[methodName](...args);
}

paymentAdapter.toTransaction = toTransaction;
