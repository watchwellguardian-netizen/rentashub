import { getRepositories } from "./persistenceService.js";
import { createPaymentProvider } from "../payments/paymentProvider.js";
import { getPaymentReadiness, PAYMENT_ARCHITECTURE_NOTICE } from "../payments/providerReadiness.js";

function publicError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function forbidden(message = "You cannot access this payment record.") {
  return publicError(403, "forbidden", message);
}

function notFound(message = "Payment record was not found.") {
  return publicError(404, "not_found", message);
}

function validationError(details) {
  return publicError(400, "validation_error", "Please correct the highlighted fields.", details);
}

function normalizeRole(role = "") {
  const value = String(role || "").toLowerCase();
  if (value === "vendor") return "supplier";
  if (value === "guest" || value === "user") return "customer";
  return value;
}

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function calculateSummary(booking = {}, asset = {}, env = process.env) {
  const rentalSubtotal = money(booking.total_amount);
  const deposit = money(asset.deposit_amount);
  const protectionFee = money(booking.protection_cost);
  const platformFeePercentage = Number(env.PLATFORM_FEE_PERCENTAGE || 10);
  const platformFee = Math.round(rentalSubtotal * (platformFeePercentage / 100));
  const supplierEarnings = Math.max(0, rentalSubtotal - platformFee);
  const total = rentalSubtotal + deposit + protectionFee + platformFee;
  return { rentalSubtotal, deposit, protectionFee, platformFee, supplierEarnings, total, platformFeePercentage };
}

function mapTransaction(record = {}) {
  return {
    id: record.id,
    bookingId: record.booking_id || "",
    assetId: record.asset_id || "",
    customerId: record.customer_id || "",
    supplierId: record.supplier_id || "",
    type: record.type || "payment",
    status: record.status || "pending",
    rentalSubtotal: money(record.subtotal),
    deposit: money(record.deposit),
    protectionFee: money(record.protection_fee),
    platformFee: money(record.platform_fee),
    supplierEarnings: money(record.supplier_earnings),
    total: money(record.total),
    timestamp: record.created_at,
    note: record.note || PAYMENT_ARCHITECTURE_NOTICE,
  };
}

function canViewTransaction(user, transaction) {
  const role = normalizeRole(user?.role);
  if (role === "admin") return true;
  if (role === "customer") return transaction.customer_id === user?.id;
  if (role === "supplier") return transaction.supplier_id === user?.id;
  return false;
}

async function audit(repos, action, entityId, req, metadata = {}) {
  await repos.audit_logs.record(action, "payment", {
    actor_id: req.user?.id || "anonymous",
    entity_id: entityId,
    ...metadata,
  });
}

export function createPaymentApiService(options = {}) {
  const context = options.context || options;
  const env = options.env || process.env;
  async function repositories() {
    return getRepositories(context);
  }

  async function getBookingContext(bookingId) {
    const repos = await repositories();
    const booking = await repos.bookings.findById(bookingId);
    if (!booking) throw publicError(404, "not_found", "Booking was not found.");
    const asset = await repos.assets.findById(booking.asset_id);
    if (!asset) throw publicError(404, "not_found", "Asset was not found.");
    return { repos, booking, asset };
  }

  return {
    readiness() {
      return getPaymentReadiness(env);
    },

    async listPayments(req) {
      const repos = await repositories();
      const transactions = await repos.payment_ledger.list();
      return transactions.filter((transaction) => canViewTransaction(req.user, transaction)).map(mapTransaction);
    },

    async findTransaction(transactionId, req) {
      const repos = await repositories();
      const transaction = await repos.payment_ledger.findById(transactionId);
      if (!transaction) throw notFound("Transaction was not found.");
      if (!canViewTransaction(req.user, transaction)) throw forbidden("You cannot view another user's transaction.");
      return mapTransaction(transaction);
    },

    async createIntent(payload = {}, req) {
      if (!payload.booking_id) throw validationError([{ field: "booking_id", message: "booking_id is required." }]);
      const { booking, asset } = await getBookingContext(payload.booking_id);
      if (normalizeRole(req.user?.role) !== "admin" && booking.customer_id !== req.user?.id) throw forbidden("Only the booking customer can preview payment for this booking.");
      if (booking.status !== "approved") throw validationError([{ field: "booking_id", message: "Payment preview is available only for approved bookings." }]);
      const summary = calculateSummary(booking, asset, env);
      const provider = createPaymentProvider(env);
      return provider.createIntent({ bookingId: booking.id, assetId: asset.id, ...summary });
    },

    async simulatePayment(payload = {}, req) {
      if (!payload.booking_id) throw validationError([{ field: "booking_id", message: "booking_id is required." }]);
      const { repos, booking, asset } = await getBookingContext(payload.booking_id);
      if (booking.customer_id !== req.user?.id) throw forbidden("Only the booking customer can simulate payment.");
      if (booking.status !== "approved") throw validationError([{ field: "booking_id", message: "Only approved bookings can be marked simulated-paid." }]);
      if (booking.payment_status === "paid") throw validationError([{ field: "booking_id", message: "This booking is already marked paid." }]);
      const summary = calculateSummary(booking, asset, env);
      const captured = await createPaymentProvider({ ...env, PAYMENT_MODE: "simulated", PAYMENT_PROVIDER: "simulated" }).capture(summary);
      const transaction = await repos.payment_ledger.create({
        booking_id: booking.id,
        asset_id: booking.asset_id,
        customer_id: booking.customer_id,
        supplier_id: booking.supplier_id,
        type: "payment",
        status: "simulated_paid",
        subtotal: summary.rentalSubtotal,
        deposit: summary.deposit,
        protection_fee: summary.protectionFee,
        platform_fee: summary.platformFee,
        supplier_earnings: summary.supplierEarnings,
        total: summary.total,
        note: captured.notice,
      });
      await repos.bookings.update(booking.id, { payment_status: "paid" });
      await audit(repos, "payments.simulated", transaction.id, req, { booking_id: booking.id });
      return { transaction: mapTransaction(transaction), booking: { ...booking, payment_status: "paid" }, provider: captured };
    },

    async refundPlaceholder(payload = {}, req) {
      if (!payload.transaction_id) throw validationError([{ field: "transaction_id", message: "transaction_id is required." }]);
      const repos = await repositories();
      const transaction = await repos.payment_ledger.findById(payload.transaction_id);
      if (!transaction) throw notFound("Transaction was not found.");
      if (!canViewTransaction(req.user, transaction)) throw forbidden("You cannot request a placeholder refund for this transaction.");
      await audit(repos, "payments.refund_placeholder_requested", transaction.id, req);
      return { status: "refund_placeholder_only", transaction: mapTransaction(transaction), notice: "Refund placeholder recorded only. No refund, chargeback, escrow release, or money movement occurred." };
    },

    async wallet(req) {
      const transactions = await this.listPayments(req);
      return transactions.reduce((summary, transaction) => ({
        simulatedPaid: summary.simulatedPaid + (transaction.type === "payment" ? transaction.total : 0),
        depositsHeld: summary.depositsHeld + (transaction.type === "payment" ? transaction.deposit : 0),
        platformFees: summary.platformFees + transaction.platformFee,
        transactionCount: summary.transactionCount + 1,
        notice: PAYMENT_ARCHITECTURE_NOTICE,
      }), { simulatedPaid: 0, depositsHeld: 0, platformFees: 0, transactionCount: 0, notice: PAYMENT_ARCHITECTURE_NOTICE });
    },

    async earnings(req) {
      const transactions = await this.listPayments(req);
      return transactions.reduce((summary, transaction) => {
        if (transaction.type === "payment" && transaction.status === "simulated_paid") {
          summary.availableEarnings += transaction.supplierEarnings;
          summary.platformFees += transaction.platformFee;
        }
        if (transaction.type === "payout") {
          summary.paidOutEarnings += transaction.total;
          summary.availableEarnings -= transaction.total;
        }
        return summary;
      }, { pendingEarnings: 0, availableEarnings: 0, paidOutEarnings: 0, platformFees: 0, notice: PAYMENT_ARCHITECTURE_NOTICE });
    },

    async payouts(req) {
      const transactions = await this.listPayments(req);
      return transactions.filter((transaction) => transaction.type === "payout");
    },

    async requestPayout(req) {
      const role = normalizeRole(req.user?.role);
      if (role !== "supplier" && role !== "admin") throw forbidden("Only suppliers can request simulated payouts.");
      const summary = await this.earnings(req);
      if (summary.availableEarnings <= 0) throw validationError([{ field: "supplier_id", message: "No available simulated earnings to pay out." }]);
      const repos = await repositories();
      const transaction = await repos.payment_ledger.create({
        booking_id: "",
        asset_id: "",
        customer_id: "",
        supplier_id: req.user.id,
        type: "payout",
        status: "simulated_payout_requested",
        subtotal: 0,
        deposit: 0,
        platform_fee: 0,
        supplier_earnings: 0,
        total: summary.availableEarnings,
        note: "Simulated payout request only. No bank transfer, escrow release, or provider payout occurred.",
      });
      await audit(repos, "payouts.simulated_requested", transaction.id, req);
      return { transaction: mapTransaction(transaction), notice: transaction.note };
    },
  };
}
