import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildInfrastructureLaunchBlockerReport,
  buildInfrastructureReadinessToolingReport,
  renderBackupValidationEvidenceTemplate,
  renderCdnEvidenceChecklist,
  renderDisasterRecoveryEvidenceTemplate,
  renderDnsEvidenceChecklist,
  renderEnvironmentPromotionEvidenceTemplate,
  renderHostingEvidenceChecklist,
  renderInfrastructureLaunchBlockerReport,
  renderProductionLaunchInfrastructureChecklist,
  renderRollbackEvidenceTemplate,
  renderTlsEvidenceChecklist,
} from "../../scripts/infrastructure-readiness-tooling.mjs";

const shapedEnv = {
  PRODUCTION_DOMAIN: "rentashub.com",
  STAGING_DOMAIN: "staging.rentashub.com",
  TLS_CERTIFICATE_PROVIDER: "managed-provider",
  TLS_ENFORCEMENT_POLICY: "https-only",
  CDN_PROVIDER: "cloudflare",
  HOSTING_PROVIDER: "render-vercel",
  BACKUP_PROVIDER: "supabase-managed-backups",
  BACKUP_RETENTION_DAYS: "30",
  DISASTER_RECOVERY_REGION: "us-east-1",
  DISASTER_RECOVERY_RTO_MINUTES: "240",
  DISASTER_RECOVERY_RPO_MINUTES: "1440",
  INFRASTRUCTURE_MONITORING_PROVIDER: "better-stack",
  ENVIRONMENT_PROMOTION_WORKFLOW: "dev-uat-production",
  DEPLOYMENT_RUNBOOK_OWNER: "devops-owner",
};

function assertCredentialSafe(markdown) {
  assert.doesNotMatch(markdown, /API[_ -]?token\s*=/i);
  assert.doesNotMatch(markdown, /DNS[_ -]?secret\s*=/i);
  assert.doesNotMatch(markdown, /TLS[_ -]?private[_ -]?key\s*=/i);
  assert.doesNotMatch(markdown, /DATABASE_URL\s*=/i);
  assert.doesNotMatch(markdown, /SUPABASE_SERVICE_ROLE_KEY\s*=/i);
  assert.doesNotMatch(markdown, /postgresql:\/\//i);
}

test("DNS TLS hosting and CDN evidence checklists render safely", () => {
  const dns = renderDnsEvidenceChecklist();
  const tls = renderTlsEvidenceChecklist();
  const hosting = renderHostingEvidenceChecklist();
  const cdn = renderCdnEvidenceChecklist();
  assert.match(dns, /DNS Evidence Checklist/);
  assert.match(dns, /Production traffic cutover approval/);
  assert.match(tls, /TLS Evidence Checklist/);
  assert.match(tls, /Auto-renewal policy documented/);
  assert.match(hosting, /Hosting Evidence Checklist/);
  assert.match(hosting, /Environment separation verified/);
  assert.match(cdn, /CDN Evidence Checklist/);
  assert.match(cdn, /Cache purge procedure documented/);
  for (const output of [dns, tls, hosting, cdn]) assertCredentialSafe(output);
});

test("environment promotion and rollback templates cover production hold and rollback proof", () => {
  const promotion = renderEnvironmentPromotionEvidenceTemplate();
  const rollback = renderRollbackEvidenceTemplate();
  assert.match(promotion, /Environment Promotion Evidence Template/);
  assert.match(promotion, /Production hold respected/);
  assert.match(promotion, /Secrets mapped by name only/);
  assert.match(rollback, /Rollback Evidence Template/);
  assert.match(rollback, /Previous artifact identified/);
  assert.match(rollback, /Database rollback\/forward-fix decision recorded/);
  assertCredentialSafe(promotion);
  assertCredentialSafe(rollback);
});

test("disaster recovery and backup validation templates cover RTO RPO and restore integrity", () => {
  const dr = renderDisasterRecoveryEvidenceTemplate();
  const backup = renderBackupValidationEvidenceTemplate();
  assert.match(dr, /Disaster Recovery Evidence Template/);
  assert.match(dr, /RTO target/);
  assert.match(dr, /DNS failover path documented/);
  assert.match(backup, /Backup Validation Evidence Template/);
  assert.match(backup, /Restore integrity verified/);
  assert.match(backup, /RPO measured/);
  assertCredentialSafe(dr);
  assertCredentialSafe(backup);
});

test("production launch infrastructure checklist keeps launch gated", () => {
  const markdown = renderProductionLaunchInfrastructureChecklist();
  assert.match(markdown, /Production Launch Infrastructure Checklist/);
  assert.match(markdown, /DNS readiness/);
  assert.match(markdown, /Monitoring readiness/);
  assert.match(markdown, /Production launch remains NO-GO/);
  assertCredentialSafe(markdown);
});

test("infrastructure readiness report is evidence-only and does not activate traffic", () => {
  const missing = buildInfrastructureReadinessToolingReport({ env: {} });
  assert.equal(missing.status, "CREDENTIAL_READY_MANUAL_EVIDENCE_REQUIRED");
  assert.equal(missing.liveActivation, false);
  assert.equal(missing.productionTrafficActive, false);
  assert.equal(missing.valuePrinted, false);
  assert.ok(missing.launchBlockerCount > 0);

  const shaped = buildInfrastructureReadinessToolingReport({ env: shapedEnv });
  assert.equal(shaped.liveActivation, false);
  assert.equal(shaped.productionTrafficActive, false);
  assert.equal(shaped.readiness.ready, true);
});

test("infrastructure launch blocker report remains blocked pending manual evidence", () => {
  const missing = buildInfrastructureLaunchBlockerReport({ env: {} });
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.liveActivation, false);
  assert.equal(missing.productionTrafficActive, false);
  assert.ok(missing.blockers.some((blocker) => /PRODUCTION_DOMAIN/.test(blocker)));
  assert.ok(missing.blockers.some((blocker) => /DNS records and rollback evidence/.test(blocker)));

  const shaped = buildInfrastructureLaunchBlockerReport({ env: shapedEnv });
  assert.equal(shaped.status, "BLOCKED");
  assert.ok(shaped.blockers.some((blocker) => /Production launch infrastructure checklist signoff/.test(blocker)));

  const markdown = renderInfrastructureLaunchBlockerReport(shaped);
  assert.match(markdown, /Infrastructure Launch Blocker Report/);
  assert.match(markdown, /production infrastructure activation remains blocked/);
  assertCredentialSafe(markdown);
});
