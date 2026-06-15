import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY, getBookingById } from "../../src/lib/bookingService.js";
import { canCheckInBooking } from "../../src/lib/inspectionService.js";
import {
  LEDGER_STORAGE_KEY,
  calculatePaymentSummary,
  canPayBooking,
  canViewTransaction,
  createSimulatedPayment,
  formatMoney,
  getCustomerTransactions,
  getCustomerWalletSummary,
  getSupplierEarningsSummary,
  getSupplierTransactions,
  requestSimulatedPayout,
} from "../../src/lib/paymentLedger.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const otherCustomer = { id: "other-customer", role: "customer", full_name: "Other Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };
const listing = SEED_LISTINGS[0];

function approvedBooking(overrides = {}) {
  return {
    id: "booking-payment-test",
    assetId: listing.id,
    assetTitle: listing.title,
    customerId: "review-customer",
    customerName: "Review Customer",
    supplierId: "review-supplier",
    supplierName: "Review Supplier",
    startDateTime: "2026-06-20T09:00",
    endDateTime: "2026-06-22T09:00",
    rentalType: "daily",
    estimatedCost: 36000,
    depositRequirement: listing.depositRequirement,
    status: "approved",
    paymentStatus: "not_active",
    ...overrides,
  };
}

function memoryStorage({ bookings = [approvedBooking()], listings = SEED_LISTINGS, ledger = [] } = {}) {
  const store = new Map([
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    ["rentashub_asset_listings", JSON.stringify(listings)],
    [LEDGER_STORAGE_KEY, JSON.stringify(ledger)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("payment routes and RBAC are wired", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/booking/:id/payment", "/payments", "/wallet", "/earnings", "/payouts", "/transaction/:id"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["customer"\]}/);
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.equal(canPayBooking(customer, approvedBooking()), true);
  assert.equal(canPayBooking(otherCustomer, approvedBooking()), false);
  assert.equal(canPayBooking(null, approvedBooking()), false);
});

test("payment calculation is correct", () => {
  const summary = calculatePaymentSummary(approvedBooking(), listing);
  assert.deepEqual(summary, {
    rentalSubtotal: 36000,
    deposit: 30000,
    protectionFee: 0,
    platformFee: 3600,
    supplierEarnings: 32400,
    total: 69600,
  });
});

test("simulated payment creates ledger transaction and updates booking paid", () => {
  const storage = memoryStorage();
  const result = createSimulatedPayment(storage, { user: customer, booking: approvedBooking(), listing });
  assert.equal(result.valid, true);
  assert.equal(result.transaction.type, "payment");
  assert.equal(result.transaction.status, "simulated_paid");
  assert.equal(result.transaction.total, 69600);
  assert.equal(getBookingById(storage, "booking-payment-test").paymentStatus, "paid");
});

test("check-in requires approved and paid booking or manual offline exception", () => {
  assert.equal(canCheckInBooking(customer, approvedBooking({ paymentStatus: "not_active" })), false);
  assert.equal(canCheckInBooking(customer, approvedBooking({ paymentStatus: "paid" })), true);
  assert.equal(canCheckInBooking(customer, approvedBooking({ paymentStatus: "manual_offline" })), true);
});

test("customer payment history and wallet show own transactions", () => {
  const storage = memoryStorage();
  createSimulatedPayment(storage, { user: customer, booking: approvedBooking(), listing });
  const transactions = getCustomerTransactions(storage, "review-customer");
  const wallet = getCustomerWalletSummary(storage, "review-customer");
  assert.equal(transactions.length, 1);
  assert.equal(wallet.simulatedPaid, 69600);
  assert.equal(wallet.depositsHeld, 30000);
});

test("supplier earnings and payouts are scoped to own assets", () => {
  const storage = memoryStorage();
  createSimulatedPayment(storage, { user: customer, booking: approvedBooking(), listing });
  const own = getSupplierEarningsSummary(storage, "review-supplier");
  const other = getSupplierEarningsSummary(storage, "supplier-two");
  assert.equal(own.availableEarnings, 32400);
  assert.equal(own.platformFees, 3600);
  assert.equal(other.availableEarnings, 0);

  const payout = requestSimulatedPayout(storage, "review-supplier");
  assert.equal(payout.valid, true);
  assert.equal(payout.transaction.type, "payout");
  assert.equal(getSupplierEarningsSummary(storage, "review-supplier").paidOutEarnings, 32400);
});

test("transaction detail permissions are customer/supplier scoped", () => {
  const storage = memoryStorage();
  const paid = createSimulatedPayment(storage, { user: customer, booking: approvedBooking(), listing });
  const transaction = paid.transaction;
  assert.equal(canViewTransaction(customer, transaction), true);
  assert.equal(canViewTransaction(supplier, transaction), true);
  assert.equal(canViewTransaction({ id: "admin-1", role: "admin" }, transaction), true);
  assert.equal(canViewTransaction(otherCustomer, transaction), false);
  assert.equal(canViewTransaction(otherSupplier, transaction), false);
});

test("transaction detail defensive money formatting handles missing or malformed values", () => {
  assert.equal(formatMoney(undefined), "JMD 0");
  assert.equal(formatMoney("not-a-number"), "JMD 0");
  assert.equal(formatMoney(12500), "JMD 12,500");
  const detail = readFileSync(join(root, "src/pages/TransactionDetail.jsx"), "utf8");
  assert.match(detail, /formatMoney\(transaction\.rentalSubtotal\)/);
  assert.doesNotMatch(detail, /transaction\.total\.toLocaleString/);
});

test("payment pages include simulated notices and no real processor claims", () => {
  for (const file of ["src/lib/paymentLedger.js", "src/pages/BookingPayment.jsx", "src/pages/PaymentsPage.jsx", "src/pages/WalletPage.jsx", "src/pages/EarningsPage.jsx", "src/pages/PayoutsPage.jsx", "src/pages/TransactionDetail.jsx"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i);
    assert.doesNotMatch(source, /Stripe|card processor success|bank transfer was sent|paid successfully/i);
  }
  const payment = readFileSync(join(root, "src/pages/BookingPayment.jsx"), "utf8");
  assert.match(payment, /Payment processing is simulated in this development version/);
  assert.match(payment, /No real payment fields/);
  assert.match(payment, /Mark simulated-paid/);
  const payouts = readFileSync(join(root, "src/pages/PayoutsPage.jsx"), "utf8");
  assert.match(payouts, /No real bank transfer is performed/);
});
