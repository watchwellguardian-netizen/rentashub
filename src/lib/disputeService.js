import { getAssetListingById } from "./assetListing.js";
import { getBookingById } from "./bookingService.js";
import { createNotification } from "./notificationService.js";
import { normalizeRole } from "./rbac.js";
import { loadDisputes, saveDisputes } from "./repositories/disputesRepository.js";

export const DISPUTE_NOTICE = "Dispute handling is simulated in this development version. No legal mediation, arbitration, payout, or escrow action is active.";
export const DISPUTE_REASONS = ["damage", "late_return", "missing_item", "payment_issue", "booking_terms", "safety_issue", "other"];
export const DISPUTE_STATUSES = ["submitted", "under_review", "needs_more_info", "resolved_placeholder", "rejected_placeholder", "escalated_placeholder"];

function now() {
  return new Date().toISOString();
}

export function canViewDispute(user, dispute) {
  if (!user || !dispute) return false;
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (role === "customer") return dispute.customerId === user.id || dispute.openedBy === user.id;
  if (role === "supplier") return dispute.supplierId === user.id;
  return false;
}

export function canOpenDispute(user, booking, listing) {
  if (!user || !booking || !listing) return false;
  const role = normalizeRole(user.role);
  if (role === "customer") return booking.customerId === user.id;
  if (role === "supplier") return booking.supplierId === user.id || listing.ownerSupplierId === user.id;
  return false;
}

export function validateDisputeInput(input = {}) {
  const errors = {};
  if (!DISPUTE_REASONS.includes(input.reason)) errors.reason = "Choose a valid dispute reason.";
  if (!String(input.summary || "").trim()) errors.summary = "Dispute summary is required.";
  if (String(input.summary || "").trim().length > 1200) errors.summary = "Dispute summary must be 1200 characters or fewer.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function listVisibleDisputes(storage, user) {
  return loadDisputes(storage).filter((dispute) => canViewDispute(user, dispute));
}

export function getDisputeById(storage, disputeId) {
  return loadDisputes(storage).find((dispute) => dispute.id === disputeId) || null;
}

export function resolveDisputeContext(storage, disputeId) {
  const dispute = getDisputeById(storage, disputeId);
  const booking = dispute ? getBookingById(storage, dispute.bookingId) : null;
  const listing = dispute ? getAssetListingById(storage, dispute.assetId) : null;
  return { dispute, booking, listing };
}

export function openDispute(storage, { user, bookingId, input = {} }) {
  const booking = getBookingById(storage, bookingId);
  const listing = booking ? getAssetListingById(storage, booking.assetId) : null;
  if (!canOpenDispute(user, booking, listing)) return { valid: false, error: "You cannot open a dispute for this booking." };
  const validation = validateDisputeInput(input);
  if (!validation.valid) return validation;
  const timestamp = now();
  const dispute = {
    id: input.id || `dispute-${Date.now()}`,
    bookingId: booking.id,
    assetId: booking.assetId,
    customerId: booking.customerId,
    supplierId: booking.supplierId || listing.ownerSupplierId,
    openedBy: user.id,
    openedByRole: normalizeRole(user.role),
    reason: input.reason,
    summary: String(input.summary).trim(),
    evidence: Array.isArray(input.evidence) && input.evidence.length
      ? input.evidence
      : [{ id: `evidence-${Date.now()}`, name: "evidence upload coming soon", status: "upload-ready-placeholder" }],
    status: "submitted",
    adminNotes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    notice: DISPUTE_NOTICE,
  };
  const disputes = [dispute, ...loadDisputes(storage)];
  saveDisputes(storage, disputes);
  const otherPartyId = user.id === booking.customerId ? dispute.supplierId : booking.customerId;
  createNotification(storage, {
    recipientId: otherPartyId,
    type: "dispute_submitted",
    title: "Dispute submitted",
    body: `${dispute.reason} dispute submitted for ${booking.assetTitle}.`,
    relatedRoute: `/dispute/${dispute.id}`,
  });
  createNotification(storage, {
    recipientId: "admin-1",
    type: "dispute_submitted_admin",
    title: "New simulated dispute",
    body: `${dispute.reason} dispute submitted for ${booking.assetTitle}.`,
    relatedRoute: "/admin/disputes",
  });
  return { valid: true, dispute, disputes };
}

export function adminUpdateDisputeStatus(storage, disputeId, status, adminUser, adminNotes = "") {
  if (normalizeRole(adminUser?.role) !== "admin") return { valid: false, error: "Admin access is required." };
  if (!DISPUTE_STATUSES.includes(status)) return { valid: false, error: "Choose a valid dispute status." };
  const disputes = loadDisputes(storage);
  const dispute = disputes.find((item) => item.id === disputeId);
  if (!dispute) return { valid: false, error: "Dispute was not found." };
  const nextDispute = { ...dispute, status, adminNotes: String(adminNotes || dispute.adminNotes || ""), updatedAt: now() };
  const nextDisputes = disputes.map((item) => (item.id === disputeId ? nextDispute : item));
  saveDisputes(storage, nextDisputes);
  for (const recipientId of [dispute.customerId, dispute.supplierId]) {
    createNotification(storage, {
      recipientId,
      type: "dispute_status_updated",
      title: "Dispute status updated",
      body: `Simulated dispute ${dispute.id} is now ${status}. No payout or legal decision was made.`,
      relatedRoute: `/dispute/${dispute.id}`,
    });
  }
  return { valid: true, dispute: nextDispute, disputes: nextDisputes };
}
