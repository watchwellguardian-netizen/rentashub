import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY, updateBookingStatus } from "../../src/lib/bookingService.js";
import { submitInspection } from "../../src/lib/inspectionService.js";
import {
  MESSAGE_STORAGE_KEY,
  THREAD_STORAGE_KEY,
  canAccessThread,
  ensureBookingThread,
  getThreadMessages,
  getUnreadMessageCount,
  getVisibleThreads,
  sendMessage,
} from "../../src/lib/messagingService.js";
import {
  NOTIFICATION_STORAGE_KEY,
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../src/lib/notificationService.js";
import { LEDGER_STORAGE_KEY, createSimulatedPayment, requestSimulatedPayout } from "../../src/lib/paymentLedger.js";

const root = process.cwd();
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const otherCustomer = { id: "other-customer", role: "customer", full_name: "Other Customer" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };
const listing = SEED_LISTINGS[0];

function booking(overrides = {}) {
  return {
    id: "booking-message-test",
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
    paymentStatus: "paid",
    ...overrides,
  };
}

function storage({ bookings = [booking()], threads = [], messages = [], notifications = [], ledger = [] } = {}) {
  const store = new Map([
    [BOOKING_STORAGE_KEY, JSON.stringify(bookings)],
    ["rentashub_asset_listings", JSON.stringify(SEED_LISTINGS)],
    [THREAD_STORAGE_KEY, JSON.stringify(threads)],
    [MESSAGE_STORAGE_KEY, JSON.stringify(messages)],
    [NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications)],
    [LEDGER_STORAGE_KEY, JSON.stringify(ledger)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("message and notification routes are wired and protected", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/messages", "/messages/:threadId", "/notifications", "/booking/:id/messages"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["customer", "supplier", "broker", "admin"\]}/);
  assert.match(app, /ProtectedRoute/);
});

test("customer can view own message threads and send in own booking thread", () => {
  const local = storage();
  const thread = ensureBookingThread(local, booking(), listing);
  assert.equal(canAccessThread(customer, thread), true);
  assert.equal(getVisibleThreads(local, customer).length, 1);
  const sent = sendMessage(local, { threadId: thread.id, user: customer, body: "Hello supplier" });
  assert.equal(sent.valid, true);
  assert.equal(getThreadMessages(local, thread.id).some((message) => message.body === "Hello supplier"), true);
});

test("customer and supplier cannot access another user's thread", () => {
  const local = storage();
  const thread = ensureBookingThread(local, booking(), listing);
  assert.equal(canAccessThread(otherCustomer, thread), false);
  assert.equal(sendMessage(local, { threadId: thread.id, user: otherCustomer, body: "Nope" }).valid, false);
  assert.equal(canAccessThread(otherSupplier, thread), false);
});

test("supplier can view and reply to own asset booking thread", () => {
  const local = storage();
  const thread = ensureBookingThread(local, booking(), listing);
  assert.equal(canAccessThread(supplier, thread), true);
  const sent = sendMessage(local, { threadId: thread.id, user: supplier, body: "Approved pickup window." });
  assert.equal(sent.valid, true);
  assert.equal(getUnreadMessageCount(local, customer) >= 1, true);
});

test("booking approval and decline create notifications or system messages", () => {
  const approvedStore = storage({ bookings: [booking({ status: "pending_supplier_approval", paymentStatus: "not_active" })] });
  updateBookingStatus(approvedStore, "booking-message-test", "approved", supplier);
  assert.equal(getUserNotifications(approvedStore, "review-customer").some((note) => note.type === "booking_approved"), true);
  assert.equal(getThreadMessages(approvedStore, "thread-booking-message-test").some((message) => /approved/.test(message.body)), true);

  const declinedStore = storage({ bookings: [booking({ status: "pending_supplier_approval", paymentStatus: "not_active" })] });
  updateBookingStatus(declinedStore, "booking-message-test", "declined", supplier);
  assert.equal(getUserNotifications(declinedStore, "review-customer").some((note) => note.type === "booking_declined"), true);
});

test("payment, check-in, check-out, inspection flag, and payout create notifications", async () => {
  const local = storage();
  createSimulatedPayment(local, { user: customer, booking: booking({ paymentStatus: "not_active" }), listing });
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "payment_simulated_paid"), true);

  const checkIn = submitInspection(local, {
    type: "check-in",
    user: customer,
    booking: booking(),
    listing,
    input: {
      conditionStatus: "good",
      checklist: { "Exterior/body condition reviewed": true },
      fuelBatteryLevel: "full",
      odometer: "123",
    },
  });
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "check_in_completed"), true);

  submitInspection(local, {
    type: "check-out",
    user: customer,
    booking: booking({ status: "active" }),
    listing,
    input: {
      conditionStatus: "good",
      checklist: { "Exterior/body condition reviewed": true },
      fuelBatteryLevel: "full",
      odometer: "125",
      missingAccessories: "none",
    },
  });
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "check_out_completed"), true);

  const { reviewInspection } = await import("../../src/lib/inspectionService.js");
  reviewInspection(local, checkIn.inspection.id, "flagged", supplier, "Needs review.");
  assert.equal(getUserNotifications(local, "review-customer").some((note) => note.type === "inspection_flagged"), true);

  requestSimulatedPayout(local, "review-supplier");
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "supplier_payout_requested"), true);
});

test("notifications page shows only current user notifications and read actions work", () => {
  const local = storage({
    notifications: [
      { id: "note-1", recipientId: "review-customer", type: "booking_approved", title: "Approved", body: "Approved", read: false, timestamp: "now", relatedRoute: "/bookings" },
      { id: "note-2", recipientId: "supplier-two", type: "booking_approved", title: "Other", body: "Other", read: false, timestamp: "now", relatedRoute: "/bookings" },
    ],
  });
  assert.equal(getUserNotifications(local, "review-customer").length, 1);
  assert.equal(getUnreadNotificationCount(local, "review-customer"), 1);
  assert.equal(markNotificationRead(local, "note-1", "review-customer"), true);
  assert.equal(getUnreadNotificationCount(local, "review-customer"), 0);
  markAllNotificationsRead(local, "supplier-two");
  assert.equal(getUnreadNotificationCount(local, "supplier-two"), 0);
});

test("booking detail links to correct message thread and app shell unread count renders", () => {
  const detail = readFileSync(join(root, "src/pages/BookingDetail.jsx"), "utf8");
  const shell = readFileSync(join(root, "src/components/AppShell.jsx"), "utf8");
  assert.match(detail, /\/booking\/\$\{booking\.id\}\/messages/);
  assert.match(shell, /messageAdapter\.listVisibleThreads/);
  assert.match(shell, /notificationAdapter\.listByUser/);
  assert.match(shell, /nav-count/);
});

test("messaging pages include UX states and no external channel claims", () => {
  for (const file of ["src/pages/MessagesPage.jsx", "src/pages/NotificationsPage.jsx", "src/lib/messagingService.js", "src/lib/notificationService.js"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i);
    assert.doesNotMatch(source, /sent by SMS|sent by email|sent by WhatsApp/i);
  }
  const messages = readFileSync(join(root, "src/pages/MessagesPage.jsx"), "utf8");
  assert.match(messages, /No messages yet/);
  assert.match(messages, /Write a message about this booking/);
  assert.match(messages, /future integration channels/);
  const notifications = readFileSync(join(root, "src/pages/NotificationsPage.jsx"), "utf8");
  assert.match(notifications, /Mark all as read/);
  assert.match(notifications, /No notifications yet/);
});
