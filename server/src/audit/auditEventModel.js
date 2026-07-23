import { createHash, randomUUID } from "node:crypto";

export const AUDIT_EVENT_CATEGORIES = {
  auth: ["auth.registered", "auth.login_succeeded", "auth.login_failed", "auth.logout", "auth.password_reset_requested", "auth.session_revoked"],
  rbac: ["rbac.role_assigned", "rbac.role_changed", "rbac.permission_denied", "rbac.dev_header_blocked"],
  marketplace: ["supplier.profile_submitted", "assets.created", "assets.updated", "assets.deleted", "listings.submitted", "listings.moderated", "availability.checked", "pricing.quoted", "bookings.requested", "bookings.accepted", "bookings.cancelled", "bookings.extension_requested", "bookings.status_changed", "auctions.created", "auctions.approved", "auctions.rejected", "admin.auctions.updated"],
  operations: ["inspections.created", "inspections.updated", "handover.checkin_completed", "handover.checkout_completed", "transport.requested", "financing.referral.created"],
  communications: ["message_threads.created", "messages.created", "notifications.created", "notifications.updated", "documents.generated"],
  trustSafety: ["reviews.created", "reviews.responded", "trust.recalculated", "disputes.created", "admin.disputes.updated", "claims.created", "admin.claims.updated"],
  payments: ["payments.intent_created", "payments.authorized", "payments.captured", "payments.simulated", "payments.refund_placeholder_requested", "payouts.simulated_requested", "escrow.created", "escrow.released", "escrow.disputed"],
  intelligence: ["ai.listing.recommendation_recorded", "ai.valuation.recommendation_recorded", "ai.recommendation.accepted"],
  storage: ["files.upload_intent.created", "files.metadata.created", "files.metadata.updated", "files.metadata.deleted", "storage.access.denied"],
  system: ["seed", "monitoring.test_event", "readiness.checked"],
};

export const AUDIT_RETENTION_POLICIES = {
  default: { retentionDays: 365, exportable: true, legalHoldSupported: true },
  auth: { retentionDays: 730, exportable: true, legalHoldSupported: true },
  rbac: { retentionDays: 730, exportable: true, legalHoldSupported: true },
  payments: { retentionDays: 2555, exportable: true, legalHoldSupported: true },
  trustSafety: { retentionDays: 2555, exportable: true, legalHoldSupported: true },
  storage: { retentionDays: 2555, exportable: true, legalHoldSupported: true },
};

export const AUDIT_EXPORT_FORMATS = ["json", "csv_placeholder"];

const SENSITIVE_KEY_PATTERN = /(secret|token|password|authorization|cookie|dsn|database_url|service_role|api_key|private_key)/i;

export function classifyAuditAction(action = "") {
  const normalized = String(action || "");
  for (const [category, actions] of Object.entries(AUDIT_EVENT_CATEGORIES)) {
    if (actions.includes(normalized)) return category;
  }
  if (/^auth\./.test(normalized)) return "auth";
  if (/^(rbac|admin)\./.test(normalized)) return "rbac";
  if (/^(assets|bookings|auctions|marketplace)\./.test(normalized)) return "marketplace";
  if (/^(inspections|transport|financing)\./.test(normalized)) return "operations";
  if (/^(message|messages|notifications|documents)\./.test(normalized)) return "communications";
  if (/^(reviews|trust|disputes|claims|protection)\./.test(normalized)) return "trustSafety";
  if (/^(payments|payouts|escrow)\./.test(normalized)) return "payments";
  if (/^(ai)\./.test(normalized)) return "intelligence";
  if (/^(files|storage)\./.test(normalized)) return "storage";
  return "system";
}

export function severityForAudit({ category, action } = {}) {
  if (["payments", "trustSafety", "storage", "rbac"].includes(category)) return "high";
  if (category === "auth" && /failed|revoked|reset/.test(action || "")) return "high";
  if (category === "marketplace" || category === "operations") return "medium";
  return "info";
}

export function redactAuditMetadata(value) {
  if (Array.isArray(value)) return value.map(redactAuditMetadata);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redactAuditMetadata(nested)]),
    );
  }
  if (typeof value === "string" && /(Bearer\s+|sk_|sb_|whsec_|postgres:\/\/|postgresql:\/\/)/i.test(value)) return "[REDACTED]";
  return value;
}

export function hashAuditRecord(record, previousHash = "") {
  const payload = JSON.stringify({
    previousHash,
    action: record.action,
    category: record.category,
    actor_id: record.actor_id,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    metadata_json: record.metadata_json,
    created_at: record.created_at,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function createAuditRecord(action, entityType, metadata = {}, options = {}) {
  const timestamp = options.createdAt || new Date().toISOString();
  const category = metadata.category || classifyAuditAction(action);
  const sanitizedMetadata = redactAuditMetadata(metadata);
  const record = {
    id: metadata.id || `audit-${randomUUID()}`,
    event_id: metadata.event_id || `audit-event-${randomUUID()}`,
    actor_id: metadata.actor_id || "system",
    actor_role: metadata.actor_role || metadata.role || "",
    action,
    category,
    severity: metadata.severity || severityForAudit({ category, action }),
    entity_type: entityType,
    entity_id: metadata.entity_id || null,
    request_id: metadata.request_id || "",
    source: metadata.source || "api",
    immutable_style: true,
    retention_policy: metadata.retention_policy || (AUDIT_RETENTION_POLICIES[category] ? category : "default"),
    export_status: metadata.export_status || "export_ready_placeholder",
    metadata_json: JSON.stringify(sanitizedMetadata),
    created_at: timestamp,
    updated_at: timestamp,
  };
  record.previous_hash = metadata.previous_hash || options.previousHash || "";
  record.immutable_hash = metadata.immutable_hash || hashAuditRecord(record, record.previous_hash);
  return record;
}

export function getAuditActivationReadiness(env = process.env) {
  const retentionConfigured = Boolean(env.AUDIT_RETENTION_POLICY_URL);
  const exportOwnerConfigured = Boolean(env.AUDIT_EXPORT_OWNER_EMAIL);
  const siemConfigured = Boolean(env.SIEM_PROVIDER && env.SIEM_LOG_DRAIN_URL);
  return {
    provider: "local_repository",
    status: siemConfigured ? "siem_credentials_shaped_activation_required" : "provider_ready_only",
    immutableStyleRecords: true,
    searchReady: true,
    exportReady: true,
    liveSiemActive: false,
    retentionConfigured,
    exportOwnerConfigured,
    siemConfigured,
    missing: [
      ...(!retentionConfigured ? ["AUDIT_RETENTION_POLICY_URL"] : []),
      ...(!exportOwnerConfigured ? ["AUDIT_EXPORT_OWNER_EMAIL"] : []),
      ...(!siemConfigured ? ["SIEM_PROVIDER", "SIEM_LOG_DRAIN_URL"] : []),
    ],
    categories: Object.keys(AUDIT_EVENT_CATEGORIES),
    exportFormats: AUDIT_EXPORT_FORMATS,
    retentionPolicies: AUDIT_RETENTION_POLICIES,
    boundary: "Provider-ready only. No live SIEM, external log drain, legal archive, or compliance-certified immutable ledger is active.",
  };
}

export function filterAuditRecords(records = [], filters = {}) {
  return records.filter((record) => {
    if (filters.category && record.category !== filters.category) return false;
    if (filters.action && record.action !== filters.action) return false;
    if (filters.actorId && record.actor_id !== filters.actorId) return false;
    if (filters.entityType && record.entity_type !== filters.entityType) return false;
    if (filters.entityId && record.entity_id !== filters.entityId) return false;
    return true;
  });
}

export function exportAuditRecords(records = [], { format = "json" } = {}) {
  if (format === "csv_placeholder") {
    return {
      format,
      contentType: "text/csv",
      body: "created_at,action,category,actor_id,entity_type,entity_id,request_id\n"
        + records.map((record) => [record.created_at, record.action, record.category, record.actor_id, record.entity_type, record.entity_id, record.request_id].join(",")).join("\n"),
      liveExternalExport: false,
    };
  }
  return {
    format: "json",
    contentType: "application/json",
    body: JSON.stringify(records, null, 2),
    liveExternalExport: false,
  };
}
