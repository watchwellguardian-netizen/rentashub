import { getSecurityHardeningProgram } from "./securityHardeningProgram.js";

const PLACEHOLDER_VALUES = new Set(["", "placeholder", "none", "todo", "tbd", "changeme", "your-value", "dev", "test"]);

export const SECURITY_CERTIFICATION_REQUIRED_KEYS = [
  "SECURITY_OWNER_NAME",
  "SECURITY_OWNER_EMAIL",
  "OWASP_REVIEW_OWNER",
  "DEPENDENCY_AUDIT_OWNER",
  "SECRETS_MANAGER_PROVIDER",
  "RBAC_AUDIT_OWNER",
  "AUTH_AUDIT_OWNER",
  "STORAGE_SECURITY_OWNER",
  "PAYMENT_SECURITY_OWNER",
  "ESCROW_SECURITY_OWNER",
  "INCIDENT_RESPONSE_OWNER",
  "VULNERABILITY_MANAGEMENT_OWNER",
];

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder") && !normalized.startsWith("<");
}

function state(configured, ready, missing) {
  return configured ? ready : missing;
}

export function getSecurityCertificationReadiness(env = process.env) {
  const hardeningProgram = getSecurityHardeningProgram(env);
  const missing = SECURITY_CERTIFICATION_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  const score = Math.round(((SECURITY_CERTIFICATION_REQUIRED_KEYS.length - missing.length) / SECURITY_CERTIFICATION_REQUIRED_KEYS.length) * 100);
  const ready = missing.length === 0;
  return {
    kind: "securityCertification",
    provider: "external_security_review",
    status: ready ? "ready_for_external_security_review" : "security_certification_readiness_missing",
    ready,
    score,
    missing,
    certified: false,
    penetrationTestCompleted: false,
    soc2Claimed: false,
    hardeningProgram,
    hardeningScore: hardeningProgram.score,
    hardeningStatus: hardeningProgram.status,
    owaspStatus: state(hasRealValue(env.OWASP_REVIEW_OWNER), "owner_assigned", "review_required"),
    dependencyAuditStatus: state(hasRealValue(env.DEPENDENCY_AUDIT_OWNER), "owner_assigned", "audit_required"),
    secretsStatus: state(hasRealValue(env.SECRETS_MANAGER_PROVIDER), "secret_manager_selected", "secret_manager_required"),
    rbacStatus: state(hasRealValue(env.RBAC_AUDIT_OWNER), "owner_assigned", "audit_required"),
    authenticationStatus: state(hasRealValue(env.AUTH_AUDIT_OWNER), "owner_assigned", "audit_required"),
    storageStatus: state(hasRealValue(env.STORAGE_SECURITY_OWNER), "owner_assigned", "audit_required"),
    paymentStatus: state(hasRealValue(env.PAYMENT_SECURITY_OWNER), "owner_assigned", "audit_required"),
    escrowStatus: state(hasRealValue(env.ESCROW_SECURITY_OWNER), "owner_assigned", "audit_required"),
    monitoringStatus: state(hasRealValue(env.MONITORING_SECURITY_OWNER) || hasRealValue(env.INFRASTRUCTURE_MONITORING_PROVIDER), "owner_assigned", "audit_required"),
    incidentResponseStatus: state(hasRealValue(env.INCIDENT_RESPONSE_OWNER), "owner_assigned", "tabletop_required"),
    message: ready
      ? "Security certification readiness is prepared for external review. Certification, SOC2, and penetration testing remain incomplete until performed by qualified reviewers."
      : `Security certification readiness is missing required owners/configuration: ${missing.join(", ")}.`,
  };
}
