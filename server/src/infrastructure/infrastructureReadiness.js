const PLACEHOLDER_VALUES = new Set(["", "placeholder", "local", "none", "todo", "tbd", "changeme", "your-value", "dev", "test"]);

export const INFRASTRUCTURE_REQUIRED_KEYS = [
  "PRODUCTION_DOMAIN",
  "STAGING_DOMAIN",
  "TLS_CERTIFICATE_PROVIDER",
  "CDN_PROVIDER",
  "HOSTING_PROVIDER",
  "BACKUP_PROVIDER",
  "DISASTER_RECOVERY_REGION",
  "INFRASTRUCTURE_MONITORING_PROVIDER",
  "ENVIRONMENT_PROMOTION_WORKFLOW",
  "DEPLOYMENT_RUNBOOK_OWNER",
];

function hasRealValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized) && !normalized.includes("placeholder") && !normalized.startsWith("<");
}

function status(configured, readyLabel, missingLabel) {
  return configured ? readyLabel : missingLabel;
}

export function getInfrastructureReadiness(env = process.env) {
  const missing = INFRASTRUCTURE_REQUIRED_KEYS.filter((key) => !hasRealValue(env[key]));
  const score = Math.round(((INFRASTRUCTURE_REQUIRED_KEYS.length - missing.length) / INFRASTRUCTURE_REQUIRED_KEYS.length) * 100);
  const dnsConfigured = hasRealValue(env.PRODUCTION_DOMAIN) && hasRealValue(env.STAGING_DOMAIN);
  const tlsConfigured = hasRealValue(env.TLS_CERTIFICATE_PROVIDER) && hasRealValue(env.TLS_ENFORCEMENT_POLICY);
  const cdnConfigured = hasRealValue(env.CDN_PROVIDER);
  const hostingConfigured = hasRealValue(env.HOSTING_PROVIDER);
  const backupConfigured = hasRealValue(env.BACKUP_PROVIDER) && hasRealValue(env.BACKUP_RETENTION_DAYS);
  const disasterRecoveryConfigured = hasRealValue(env.DISASTER_RECOVERY_REGION) && hasRealValue(env.DISASTER_RECOVERY_RTO_MINUTES) && hasRealValue(env.DISASTER_RECOVERY_RPO_MINUTES);
  const monitoringConfigured = hasRealValue(env.INFRASTRUCTURE_MONITORING_PROVIDER) || hasRealValue(env.MONITORING_PROVIDER);
  const deploymentConfigured = hasRealValue(env.ENVIRONMENT_PROMOTION_WORKFLOW) && hasRealValue(env.DEPLOYMENT_RUNBOOK_OWNER);
  const ready = missing.length === 0 && tlsConfigured && backupConfigured && disasterRecoveryConfigured;

  return {
    kind: "infrastructureActivation",
    provider: env.HOSTING_PROVIDER || env.DEPLOYMENT_PROVIDER || "placeholder",
    status: ready ? "credential_ready" : "manual_infrastructure_setup_required",
    ready,
    score,
    missing,
    liveActivation: false,
    productionTrafficActive: false,
    productionDomain: env.PRODUCTION_DOMAIN || "",
    stagingDomain: env.STAGING_DOMAIN || "",
    dnsStatus: status(dnsConfigured, "domains_documented", "domains_missing"),
    tlsStatus: status(tlsConfigured, "tls_policy_documented", "tls_certificate_missing"),
    cdnStatus: status(cdnConfigured, "cdn_provider_selected", "cdn_provider_missing"),
    backupStatus: status(backupConfigured, "backup_policy_documented", "backup_policy_missing"),
    disasterRecoveryStatus: status(disasterRecoveryConfigured, "dr_policy_documented", "dr_policy_missing"),
    hostingStatus: status(hostingConfigured, "hosting_provider_selected", "hosting_provider_missing"),
    monitoringStatus: status(monitoringConfigured, "infrastructure_monitoring_selected", "infrastructure_monitoring_missing"),
    deploymentStatus: status(deploymentConfigured, "promotion_workflow_documented", "promotion_workflow_missing"),
    message: ready
      ? "Infrastructure is credential-ready for staging review. No production deployment, DNS cutover, TLS activation, CDN routing, or production traffic is active."
      : `Infrastructure readiness is missing required gates: ${missing.join(", ")}.`,
  };
}
