const PLACEHOLDER_VALUES = new Set(["", "placeholder", "none", "todo", "tbd", "changeme", "your-value", "dev", "test"]);

export const SECURITY_HARDENING_REQUIRED_KEYS = [
  "SECURITY_MFA_PROVIDER",
  "SECURITY_SESSION_COOKIE_POLICY",
  "SECURITY_REFRESH_TOKEN_ROTATION",
  "SECURITY_SESSION_REVOCATION",
  "SECURITY_CSP_POLICY",
  "SECURITY_CORS_REVIEW_STATUS",
  "SECURITY_CSRF_STRATEGY",
  "SECURITY_RATE_LIMIT_POLICY",
  "SECURITY_ABUSE_PROTECTION_PROVIDER",
  "SECURITY_REQUEST_VALIDATION_STATUS",
  "SECURITY_DEPENDENCY_AUDIT_TOOL",
  "SECURITY_VULNERABILITY_SCAN_PROVIDER",
  "SECURITY_PATCH_SLA_POLICY_URL",
  "SECURITY_EVENT_TAXONOMY_STATUS",
  "SECURITY_ALERT_ROUTING_STATUS",
  "SECURITY_INCIDENT_RUNBOOK_STATUS",
  "SECURITY_REMEDIATION_OWNER",
];

export const SECURITY_HARDENING_DOMAINS = [
  {
    id: "authentication_security",
    label: "Authentication security",
    controls: ["mfa_architecture", "session_hardening", "refresh_token_strategy", "session_revocation_controls"],
    requiredKeys: ["SECURITY_MFA_PROVIDER", "SECURITY_SESSION_COOKIE_POLICY", "SECURITY_REFRESH_TOKEN_ROTATION", "SECURITY_SESSION_REVOCATION"],
  },
  {
    id: "application_security",
    label: "Application security",
    controls: ["csp_policy_framework", "security_headers", "cors_review", "csrf_review"],
    requiredKeys: ["SECURITY_CSP_POLICY", "SECURITY_CORS_REVIEW_STATUS", "SECURITY_CSRF_STRATEGY"],
  },
  {
    id: "api_security",
    label: "API security",
    controls: ["rate_limiting", "abuse_protection", "request_validation", "api_hardening"],
    requiredKeys: ["SECURITY_RATE_LIMIT_POLICY", "SECURITY_ABUSE_PROTECTION_PROVIDER", "SECURITY_REQUEST_VALIDATION_STATUS"],
  },
  {
    id: "dependency_security",
    label: "Dependency security",
    controls: ["dependency_audit_framework", "vulnerability_scanning_readiness", "security_update_process"],
    requiredKeys: ["SECURITY_DEPENDENCY_AUDIT_TOOL", "SECURITY_VULNERABILITY_SCAN_PROVIDER", "SECURITY_PATCH_SLA_POLICY_URL"],
  },
  {
    id: "security_monitoring",
    label: "Security monitoring",
    controls: ["security_event_taxonomy", "security_alert_classifications", "incident_response_preparation"],
    requiredKeys: ["SECURITY_EVENT_TAXONOMY_STATUS", "SECURITY_ALERT_ROUTING_STATUS", "SECURITY_INCIDENT_RUNBOOK_STATUS", "SECURITY_REMEDIATION_OWNER"],
  },
];

export const SECURITY_EVENT_TAXONOMY = [
  { id: "auth.login_failed", severity: "medium", category: "authentication", alertClass: "auth_failure_spike" },
  { id: "auth.mfa_challenge_failed", severity: "high", category: "authentication", alertClass: "mfa_failure_spike" },
  { id: "auth.session_revoked", severity: "medium", category: "authentication", alertClass: "session_control" },
  { id: "rbac.permission_denied", severity: "high", category: "authorization", alertClass: "rbac_abuse" },
  { id: "api.rate_limited", severity: "medium", category: "api_security", alertClass: "abuse_protection" },
  { id: "api.validation_failed", severity: "low", category: "api_security", alertClass: "input_validation" },
  { id: "admin.privileged_mutation", severity: "high", category: "admin", alertClass: "suspicious_admin_activity" },
  { id: "payment.provider_error", severity: "high", category: "payment", alertClass: "payment_failure_spike" },
  { id: "storage.private_file_access_denied", severity: "high", category: "storage", alertClass: "private_data_access" },
  { id: "audit.export_requested", severity: "high", category: "audit", alertClass: "audit_data_access" },
];

export const SECURITY_ALERT_CLASSIFICATIONS = [
  { id: "sev1", label: "Critical security incident", responseTarget: "15 minutes", examples: ["credential_exposure", "unauthorized_admin_access", "payment_data_exposure"] },
  { id: "sev2", label: "High-risk security event", responseTarget: "1 hour", examples: ["rbac_bypass_attempt", "storage_private_access_attempt", "auth_failure_spike"] },
  { id: "sev3", label: "Elevated abuse pattern", responseTarget: "4 hours", examples: ["rate_limit_spike", "validation_error_spike", "suspicious_session_pattern"] },
  { id: "sev4", label: "Security readiness finding", responseTarget: "next business day", examples: ["dependency_update_due", "policy_review_due", "runbook_update_due"] },
];

export const SECURITY_REMEDIATION_SEQUENCE = [
  "Assign security remediation owner and incident owner.",
  "Configure managed secrets, strong auth/session secrets, and rotation procedure.",
  "Validate MFA architecture, refresh-token rotation, and session revocation in staging.",
  "Lock CORS, CSP, CSRF strategy, and security headers for deployed origins.",
  "Apply distributed rate limiting and abuse protection before public traffic.",
  "Run dependency audit and vulnerability scan with remediation SLA.",
  "Route security events to monitoring/SIEM after provider credentials are active.",
  "Complete external OWASP review and penetration test before public launch approval.",
];

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder") && !normalized.startsWith("<");
}

function domainStatus(domain, env) {
  const missing = domain.requiredKeys.filter((key) => !hasRealValue(env[key]));
  return {
    id: domain.id,
    label: domain.label,
    controls: domain.controls,
    requiredKeys: domain.requiredKeys,
    missing,
    ready: missing.length === 0,
    status: missing.length ? "hardening_inputs_missing" : "ready_for_staging_validation",
  };
}

export function calculateSecurityReadinessScore(env = process.env) {
  const missing = SECURITY_HARDENING_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  return Math.round(((SECURITY_HARDENING_REQUIRED_KEYS.length - missing.length) / SECURITY_HARDENING_REQUIRED_KEYS.length) * 100);
}

export function getSecurityHardeningProgram(env = process.env) {
  const domains = SECURITY_HARDENING_DOMAINS.map((domain) => domainStatus(domain, env));
  const missing = SECURITY_HARDENING_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  const score = calculateSecurityReadinessScore(env);
  const ready = missing.length === 0;
  return {
    kind: "securityHardeningProgram",
    provider: "provider_ready_security_controls",
    status: ready ? "ready_for_staging_security_validation" : "security_hardening_inputs_missing",
    ready,
    score,
    missing,
    domains,
    eventTaxonomy: SECURITY_EVENT_TAXONOMY,
    alertClassifications: SECURITY_ALERT_CLASSIFICATIONS,
    remediationSequence: SECURITY_REMEDIATION_SEQUENCE,
    mfaLive: false,
    wafLive: false,
    socLive: false,
    siemLive: false,
    externalPenTestVendorActive: false,
    productionSecurityToolingActive: false,
    certified: false,
    productionSuitable: false,
    message: ready
      ? "Security hardening controls are ready for staging validation. Live MFA, WAF, SOC/SIEM, penetration-test vendors, and production security tooling remain inactive."
      : `Security hardening program is missing required inputs: ${missing.join(", ")}.`,
  };
}
