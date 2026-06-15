import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  NOTIFICATION_AUDIT_STORAGE_KEY,
  NOTIFICATION_EVENT_QUEUE_STORAGE_KEY,
  NOTIFICATION_FRAMEWORK_EVENTS,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  getNotificationFrameworkDashboard,
  getNotificationProviderStatus,
  markNotificationEventForRetry,
  queueNotificationEvent,
  updateNotificationPreferences,
} from "../../src/lib/notificationFramework.js";
import { NOTIFICATION_STORAGE_KEY, getUserNotifications } from "../../src/lib/notificationService.js";

const root = process.cwd();
const admin = { id: "review-admin", role: "admin", full_name: "Review Admin" };
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const dealer = { id: "review-broker", role: "broker", full_name: "Review Broker" };
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };

function storage() {
  const store = new Map([
    [NOTIFICATION_STORAGE_KEY, JSON.stringify([])],
    [NOTIFICATION_EVENT_QUEUE_STORAGE_KEY, JSON.stringify([])],
    [NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify([])],
    [NOTIFICATION_AUDIT_STORAGE_KEY, JSON.stringify([])],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Phase 2F notification framework routes are wired for user admin supplier and dealer scopes", () => {
  const app = source("src/App.jsx");
  for (const route of ["/notifications", "/admin/notifications", "/supplier/notifications", "/dealer/notifications"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing route ${route}`);
  }
  assert.match(app, /<NotificationsPage scope="admin" \/>/);
  assert.match(app, /<NotificationsPage scope="supplier" \/>/);
  assert.match(app, /<NotificationsPage scope="dealer" \/>/);
});

test("notification framework supports required event types and local in-app queueing", () => {
  const local = storage();
  for (const eventType of [
    "auction_created",
    "auction_approved",
    "auction_rejected",
    "auction_ending_soon",
    "auction_won",
    "auction_lost",
    "inspection_requested",
    "inspection_completed",
    "transport_requested",
    "transport_quote_received",
    "financing_request_submitted",
    "financing_referral_updated",
    "document_generated",
    "compliance_alert",
    "dispute_opened",
    "dispute_resolved",
  ]) {
    assert.ok(NOTIFICATION_FRAMEWORK_EVENTS.includes(eventType), `${eventType} missing`);
  }
  const queued = queueNotificationEvent(local, supplier, {
    eventType: "document_generated",
    recipientId: customer.id,
    sourceType: "auction_document",
    sourceId: "auction-excavator-001",
    relatedRoute: "/auction/auction-excavator-001/document-engine",
    payloadPreview: "Document generated placeholder.",
  });
  assert.equal(queued.valid, true);
  assert.equal(queued.event.status, "delivered_in_app");
  assert.equal(getUserNotifications(local, customer.id).some((note) => note.type === "document_generated"), true);
});

test("notification preferences keep external channels inactive and auditable", () => {
  const local = storage();
  const result = updateNotificationPreferences(local, customer, {
    channels: { in_app: false, email_placeholder: true, sms_placeholder: true, push_placeholder: true },
  });
  assert.equal(result.valid, true);
  assert.equal(result.preferences.channels.in_app, false);
  assert.equal(result.preferences.channels.email_placeholder, false);
  assert.equal(result.preferences.channels.sms_placeholder, false);
  assert.equal(result.preferences.channels.push_placeholder, false);
  const queued = queueNotificationEvent(local, supplier, {
    eventType: "auction_won",
    recipientId: customer.id,
    relatedRoute: "/dashboard/won-auctions",
  });
  assert.equal(queued.valid, true);
  assert.equal(queued.event.status, "queued_local_only");
  assert.equal(getUserNotifications(local, customer.id).length, 0);
  assert.equal(getNotificationFrameworkDashboard(local, customer).counts.audit >= 1, true);
});

test("admin can mark retry placeholders while non-admin cannot", () => {
  const local = storage();
  const queued = queueNotificationEvent(local, supplier, {
    eventType: "compliance_alert",
    recipientId: supplier.id,
    relatedRoute: "/admin/notifications",
  });
  assert.equal(markNotificationEventForRetry(local, supplier, queued.event.eventId).valid, false);
  const retry = markNotificationEventForRetry(local, admin, queued.event.eventId);
  assert.equal(retry.valid, true);
  assert.equal(retry.event.status, "retry_placeholder");
  assert.equal(retry.event.retryCount, 1);
});

test("notification dashboards expose provider status without live delivery claims", () => {
  const local = storage();
  queueNotificationEvent(local, dealer, {
    eventType: "auction_ending_soon",
    recipientId: dealer.id,
    relatedRoute: "/dealer/auction-dashboard",
  });
  const adminDashboard = getNotificationFrameworkDashboard(local, admin, "admin");
  const dealerDashboard = getNotificationFrameworkDashboard(local, dealer, "dealer");
  const status = getNotificationProviderStatus();
  assert.equal(adminDashboard.counts.liveProviders, 0);
  assert.equal(dealerDashboard.events.length, 1);
  assert.equal(status.liveDelivery, false);
  assert.equal(status.email_placeholder.status, "provider_inactive");
  assert.equal(status.sms_placeholder.status, "provider_inactive");
  assert.equal(status.push_placeholder.status, "provider_inactive");
});

test("notification UI integrates event center preferences audit and provider boundaries", () => {
  const page = source("src/pages/NotificationsPage.jsx");
  const shell = source("src/components/AppShell.jsx");
  assert.match(page, /Notification event center/);
  assert.match(page, /Notification preferences/);
  assert.match(page, /Queue and retry status/);
  assert.match(page, /Provider status dashboard/);
  assert.match(page, /Notification audit log/);
  assert.match(page, /No real email, SMS, push, Twilio, SendGrid, Mailgun, Firebase, or OneSignal provider is active/);
  assert.match(page, /Mark all as read/);
  assert.match(page, /No notifications yet/);
  assert.match(shell, /admin\/notifications/);
  assert.match(shell, /supplier\/notifications/);
  assert.match(shell, /dealer\/notifications/);
  assert.doesNotMatch(page, /sent by SMS|sent by email|push delivered|Twilio active|SendGrid active|OneSignal active/i);
});
