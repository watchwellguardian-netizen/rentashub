import { getAssetListingById, loadAssetListings } from "./assetListing.js";
import { getBookingById, isCustomerRole, isSupplierRole, loadBookings, saveBookings } from "./bookingService.js";
import { appendSystemMessage, ensureBookingThread } from "./messagingService.js";
import { createNotification } from "./notificationService.js";
import { calculateBookingProtectionCost } from "./protectionService.js";
import { normalizeRole } from "./rbac.js";

export const LEDGER_STORAGE_KEY = "rentashub_payment_ledger";
export const PLATFORM_FEE_RATE = 0.1;

export const TRANSACTION_TYPES = ["payment", "refund", "deposit_hold", "deposit_release", "payout"];
export const TRANSACTION_STATUSES = ["simulated_paid", "pending", "available", "paid_out", "void"];

export function parseMoney(value) {
  const match = String(value || "").replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function formatMoney(value) {
  const number = Number(value);
  return `JMD ${Number.isFinite(number) ? number.toLocaleString() : "0"}`;
}

export function calculatePaymentSummary(booking, listing) {
  const rentalSubtotal = Number(booking?.estimatedCost || 0);
  const deposit = parseMoney(booking?.depositRequirement || listing?.depositRequirement);
  const protectionFee = calculateBookingProtectionCost(booking);
  const platformFee = Math.round(rentalSubtotal * PLATFORM_FEE_RATE);
  const supplierEarnings = Math.max(0, rentalSubtotal - platformFee);
  const total = rentalSubtotal + deposit + protectionFee + platformFee;
  return { rentalSubtotal, deposit, protectionFee, platformFee, supplierEarnings, total };
}

export function loadLedger(storage) {
  if (!storage) return [];
  const raw = storage.getItem(LEDGER_STORAGE_KEY);
  if (!raw) {
    storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveLedger(storage, transactions) {
  if (!storage) return transactions;
  storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(transactions));
  return transactions;
}

export function getTransactionById(storage, transactionId) {
  return loadLedger(storage).find((transaction) => transaction.id === transactionId) || null;
}

export function canPayBooking(user, booking) {
  return Boolean(user && booking && isCustomerRole(user.role) && booking.customerId === user.id && booking.status === "approved");
}

export function canViewTransaction(user, transaction) {
  if (!user || !transaction) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (isCustomerRole(role)) return transaction.customerId === user.id;
  if (isSupplierRole(role)) return transaction.supplierId === user.id;
  return false;
}

export function getCustomerTransactions(storage, customerId) {
  return loadLedger(storage).filter((transaction) => transaction.customerId === customerId);
}

export function getSupplierTransactions(storage, supplierId) {
  return loadLedger(storage).filter((transaction) => transaction.supplierId === supplierId);
}

function updateBookingPaymentStatus(storage, bookingId, paymentStatus) {
  const bookings = loadBookings(storage);
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking) return null;
  const nextBooking = { ...booking, paymentStatus, updatedAt: new Date().toISOString() };
  saveBookings(storage, bookings.map((item) => (item.id === bookingId ? nextBooking : item)));
  return nextBooking;
}

export function createSimulatedPayment(storage, { user, booking, listing }) {
  if (!canPayBooking(user, booking)) {
    return { valid: false, error: "Only the booking customer can simulate payment for an approved booking." };
  }
  if (booking.paymentStatus === "paid") {
    return { valid: false, error: "This booking is already marked paid." };
  }
  const summary = calculatePaymentSummary(booking, listing);
  const now = new Date().toISOString();
  const transaction = {
    id: `txn-${Date.now()}`,
    bookingId: booking.id,
    assetId: booking.assetId,
    assetTitle: booking.assetTitle,
    customerId: booking.customerId,
    customerName: booking.customerName,
    supplierId: booking.supplierId,
    supplierName: booking.supplierName,
    rentalSubtotal: summary.rentalSubtotal,
    deposit: summary.deposit,
    protectionFee: summary.protectionFee,
    platformFee: summary.platformFee,
    supplierEarnings: summary.supplierEarnings,
    total: summary.total,
    status: "simulated_paid",
    type: "payment",
    timestamp: now,
    note: "Payment processing is simulated in this development version.",
  };
  const transactions = [transaction, ...loadLedger(storage)];
  saveLedger(storage, transactions);
  const nextBooking = updateBookingPaymentStatus(storage, booking.id, "paid");
  const thread = ensureBookingThread(storage, nextBooking || booking, listing);
  appendSystemMessage(storage, thread.id, "Simulated payment recorded. No external payment provider was used.", "system");
  createNotification(storage, {
    recipientId: booking.supplierId,
    type: "payment_simulated_paid",
    title: "Simulated payment recorded",
    body: `${booking.customerName} marked ${booking.assetTitle} as simulated-paid.`,
    relatedRoute: `/booking/${booking.id}/manage`,
  });
  return { valid: true, transaction, booking: nextBooking, transactions };
}

export function getCustomerWalletSummary(storage, customerId) {
  const transactions = getCustomerTransactions(storage, customerId);
  return transactions.reduce((summary, transaction) => ({
    simulatedPaid: summary.simulatedPaid + (transaction.type === "payment" ? transaction.total : 0),
    depositsHeld: summary.depositsHeld + (transaction.type === "payment" ? transaction.deposit : 0),
    platformFees: summary.platformFees + transaction.platformFee,
    transactionCount: summary.transactionCount + 1,
  }), { simulatedPaid: 0, depositsHeld: 0, platformFees: 0, transactionCount: 0 });
}

export function getSupplierEarningsSummary(storage, supplierId) {
  const transactions = getSupplierTransactions(storage, supplierId);
  return transactions.reduce((summary, transaction) => {
    if (transaction.type === "payment" && transaction.status === "simulated_paid") {
      summary.availableEarnings += transaction.supplierEarnings;
      summary.platformFees += transaction.platformFee;
    }
    if (transaction.type === "payout") {
      summary.paidOutEarnings += transaction.total;
      summary.availableEarnings -= transaction.total;
    }
    summary.pendingEarnings = Math.max(0, summary.pendingEarnings);
    return summary;
  }, { pendingEarnings: 0, availableEarnings: 0, paidOutEarnings: 0, platformFees: 0 });
}

export function requestSimulatedPayout(storage, supplierId) {
  const summary = getSupplierEarningsSummary(storage, supplierId);
  if (summary.availableEarnings <= 0) return { valid: false, error: "No available simulated earnings to pay out." };
  const supplierListing = loadAssetListings(storage).find((listing) => listing.ownerSupplierId === supplierId);
  const transaction = {
    id: `payout-${Date.now()}`,
    bookingId: "",
    assetId: supplierListing?.id || "",
    assetTitle: "Supplier payout",
    customerId: "",
    customerName: "",
    supplierId,
    supplierName: supplierListing?.supplierName || "Supplier",
    rentalSubtotal: 0,
    deposit: 0,
    platformFee: 0,
    supplierEarnings: 0,
    total: summary.availableEarnings,
    status: "paid_out",
    type: "payout",
    timestamp: new Date().toISOString(),
    note: "Simulated payout only. No bank transfer is performed.",
  };
  const transactions = [transaction, ...loadLedger(storage)];
  saveLedger(storage, transactions);
  createNotification(storage, {
    recipientId: supplierId,
    type: "supplier_payout_requested",
    title: "Simulated payout requested",
    body: "A simulated payout ledger record was created. No bank transfer is performed.",
    relatedRoute: "/payouts",
  });
  return { valid: true, transaction, transactions };
}

export function resolvePaymentContext(storage, bookingId) {
  const booking = getBookingById(storage, bookingId);
  const listing = booking ? getAssetListingById(storage, booking.assetId) : null;
  return { booking, listing };
}
