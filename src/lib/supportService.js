import { createNotification } from "./notificationService.js";
import { canAccessRole, normalizeRole, REVIEW_USERS } from "./rbac.js";

export const SUPPORT_CASE_STORAGE_KEY = "rentashub_support_cases";

export const SUPPORT_PRIORITIES = {
  low: { label: "Low", slaHours: 72 },
  normal: { label: "Normal", slaHours: 48 },
  high: { label: "High", slaHours: 24 },
  urgent: { label: "Urgent", slaHours: 4 },
};

export const SUPPORT_STATUSES = {
  open: "Open",
  waiting_on_customer: "Waiting on customer",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

export const SUPPORT_CATEGORIES = [
  "booking",
  "listing",
  "payment-readiness",
  "verification",
  "claim-dispute",
  "technical",
  "general",
];

const ADMIN_OWNER = "review-admin";

export function loadSupportCases(storage) {
  if (!storage) return [];
  const raw = storage.getItem(SUPPORT_CASE_STORAGE_KEY);
  if (!raw) {
    storage.setItem(SUPPORT_CASE_STORAGE_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveSupportCases(storage, cases) {
  if (!storage) return cases;
  storage.setItem(SUPPORT_CASE_STORAGE_KEY, JSON.stringify(cases));
  return cases;
}

export function getSupportSla({ priority = "normal", createdAt = new Date().toISOString(), status = "open" } = {}) {
  const config = SUPPORT_PRIORITIES[priority] || SUPPORT_PRIORITIES.normal;
  const dueAt = new Date(new Date(createdAt).getTime() + config.slaHours * 60 * 60 * 1000).toISOString();
  const now = Date.now();
  const dueTime = new Date(dueAt).getTime();
  const terminal = ["resolved", "closed"].includes(status);
  return {
    priority,
    slaHours: config.slaHours,
    dueAt,
    breached: !terminal && Number.isFinite(dueTime) && dueTime < now,
  };
}

function requireSupportUser(user) {
  return Boolean(user?.id) && canAccessRole(user.role, ["customer", "supplier", "broker", "admin"]);
}

function canViewCase(user, supportCase) {
  if (!user || !supportCase) return false;
  if (normalizeRole(user.role) === "admin") return true;
  return supportCase.createdBy === user.id || supportCase.relatedUserIds?.includes(user.id);
}

function normalizeCase(input = {}, user) {
  const now = new Date().toISOString();
  const priority = SUPPORT_PRIORITIES[input.priority] ? input.priority : "normal";
  const category = SUPPORT_CATEGORIES.includes(input.category) ? input.category : "general";
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  return {
    id: input.id || `support-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    category,
    priority,
    status: "open",
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
    createdByRole: normalizeRole(user.role),
    assignedTo: ADMIN_OWNER,
    relatedUserIds: [...new Set([user.id, ...(input.relatedUserIds || [])].filter(Boolean))],
    relatedRoute: input.relatedRoute || "/support",
    notes: [
      {
        id: `support-note-${Date.now()}`,
        authorId: user.id,
        authorRole: normalizeRole(user.role),
        body: description || "Support case opened.",
        visibility: "participants",
        createdAt: now,
      },
    ],
    escalationReason: "",
    resolutionSummary: "",
    providerBoundary: "Local support workflow only. No live email, SMS, helpdesk, or SLA provider is active.",
  };
}

export function createSupportCase(storage, input, user) {
  if (!requireSupportUser(user)) return { valid: false, error: "Sign in with a supported RentasHub role to open a support case." };
  const supportCase = normalizeCase(input, user);
  if (supportCase.title.length < 6) return { valid: false, error: "Support case title must be at least 6 characters." };
  if (supportCase.description.length < 10) return { valid: false, error: "Support case description must be at least 10 characters." };

  const cases = [supportCase, ...loadSupportCases(storage)];
  saveSupportCases(storage, cases);
  createNotification(storage, {
    recipientId: user.id,
    type: "support_case_opened",
    title: "Support case opened",
    body: `${supportCase.title} is open with ${SUPPORT_PRIORITIES[supportCase.priority].label} priority.`,
    relatedRoute: `/support/${supportCase.id}`,
  });
  createNotification(storage, {
    recipientId: ADMIN_OWNER,
    type: "support_case_assigned",
    title: "Support case assigned",
    body: `${supportCase.title} requires support review.`,
    relatedRoute: `/admin/support`,
  });
  return { valid: true, case: withSla(supportCase), cases: cases.map(withSla) };
}

export function withSla(supportCase) {
  return {
    ...supportCase,
    sla: getSupportSla(supportCase),
  };
}

export function getVisibleSupportCases(storage, user) {
  const cases = loadSupportCases(storage).map(withSla);
  if (normalizeRole(user?.role) === "admin") return cases;
  return cases.filter((supportCase) => canViewCase(user, supportCase));
}

export function getSupportCaseById(storage, caseId, user) {
  const supportCase = loadSupportCases(storage).find((item) => item.id === caseId);
  if (!supportCase || !canViewCase(user, supportCase)) return null;
  return withSla(supportCase);
}

export function addSupportCaseNote(storage, caseId, body, user, visibility = "participants") {
  if (!requireSupportUser(user)) return { valid: false, error: "Sign in to add a support note." };
  const cases = loadSupportCases(storage);
  const supportCase = cases.find((item) => item.id === caseId);
  if (!supportCase || !canViewCase(user, supportCase)) return { valid: false, error: "Support case was not found." };
  const noteBody = String(body || "").trim();
  if (noteBody.length < 2) return { valid: false, error: "Support note cannot be empty." };
  const now = new Date().toISOString();
  const note = {
    id: `support-note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    authorId: user.id,
    authorRole: normalizeRole(user.role),
    body: noteBody,
    visibility: normalizeRole(user.role) === "admin" ? visibility : "participants",
    createdAt: now,
  };
  const nextCase = {
    ...supportCase,
    updatedAt: now,
    notes: [...(supportCase.notes || []), note],
  };
  const nextCases = cases.map((item) => (item.id === caseId ? nextCase : item));
  saveSupportCases(storage, nextCases);
  const recipients = normalizeRole(user.role) === "admin" ? nextCase.relatedUserIds : [ADMIN_OWNER];
  for (const recipientId of recipients.filter((id) => id !== user.id)) {
    createNotification(storage, {
      recipientId,
      type: "support_case_note_added",
      title: "Support case updated",
      body: nextCase.title,
      relatedRoute: `/support/${nextCase.id}`,
    });
  }
  return { valid: true, case: withSla(nextCase), note };
}

export function updateSupportCaseStatus(storage, caseId, status, adminUser, options = {}) {
  if (normalizeRole(adminUser?.role) !== "admin") return { valid: false, error: "Only admins can update support case status." };
  if (!SUPPORT_STATUSES[status]) return { valid: false, error: "Choose a valid support case status." };
  const cases = loadSupportCases(storage);
  const supportCase = cases.find((item) => item.id === caseId);
  if (!supportCase) return { valid: false, error: "Support case was not found." };
  const now = new Date().toISOString();
  const nextCase = {
    ...supportCase,
    status,
    updatedAt: now,
    escalationReason: status === "escalated" ? String(options.escalationReason || "Admin escalation required.").trim() : supportCase.escalationReason,
    resolutionSummary: ["resolved", "closed"].includes(status) ? String(options.resolutionSummary || "Resolved in local support workflow.").trim() : supportCase.resolutionSummary,
    notes: [
      ...(supportCase.notes || []),
      {
        id: `support-note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        authorId: adminUser.id,
        authorRole: "admin",
        body: `Status changed to ${SUPPORT_STATUSES[status]}.`,
        visibility: "participants",
        createdAt: now,
      },
    ],
  };
  const nextCases = cases.map((item) => (item.id === caseId ? nextCase : item));
  saveSupportCases(storage, nextCases);
  for (const recipientId of nextCase.relatedUserIds || []) {
    createNotification(storage, {
      recipientId,
      type: "support_case_status_changed",
      title: "Support case status changed",
      body: `${nextCase.title} is now ${SUPPORT_STATUSES[status]}.`,
      relatedRoute: `/support/${nextCase.id}`,
    });
  }
  return { valid: true, case: withSla(nextCase), cases: nextCases.map(withSla) };
}

export function getSupportOperationsSummary(storage) {
  const cases = loadSupportCases(storage).map(withSla);
  const openCases = cases.filter((supportCase) => !["resolved", "closed"].includes(supportCase.status));
  return {
    total: cases.length,
    open: openCases.length,
    escalated: cases.filter((supportCase) => supportCase.status === "escalated").length,
    breached: openCases.filter((supportCase) => supportCase.sla.breached).length,
    byStatus: Object.keys(SUPPORT_STATUSES).reduce((totals, status) => ({
      ...totals,
      [status]: cases.filter((supportCase) => supportCase.status === status).length,
    }), {}),
    byPriority: Object.keys(SUPPORT_PRIORITIES).reduce((totals, priority) => ({
      ...totals,
      [priority]: cases.filter((supportCase) => supportCase.priority === priority).length,
    }), {}),
    ownerRoster: REVIEW_USERS.filter((user) => user.role === "admin").map((user) => ({ id: user.id, name: user.full_name })),
    providerBoundary: "Local support queue is active. External helpdesk, live email, SMS, and call-center tooling require provider evidence.",
  };
}
