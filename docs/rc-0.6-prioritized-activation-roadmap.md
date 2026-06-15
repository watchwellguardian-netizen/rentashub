# RC-0.6 Prioritized Activation Roadmap

Feature development is frozen. The roadmap below is limited to activation blockers.

## Priority 1 - Supabase Activation

Objective: Convert staging from local/demo foundations to live infrastructure.

Actions:

1. Create Supabase staging project.
2. Configure PostgreSQL `DATABASE_URL`.
3. Run migrations and seed validation.
4. Activate Supabase Auth.
5. Validate RBAC and RLS.
6. Create storage buckets and policies.
7. Validate signed URL access.
8. Complete backup and restore test.

Exit condition: Database, auth, storage, audit persistence, backup, and restore validation pass in staging.

## Priority 2 - Monitoring Activation

Objective: Make staging observable before external beta users.

Actions:

1. Configure Sentry.
2. Configure Better Stack.
3. Configure heartbeat and uptime checks.
4. Configure log drain.
5. Verify alert routing.
6. Run incident escalation test.

Exit condition: Errors, uptime failures, and incident test events reach the assigned owner.

## Priority 3 - Security Hardening Activation

Objective: Reduce beta and paid-pilot security risk.

Actions:

1. Select MFA strategy.
2. Validate session and refresh-token controls.
3. Lock CORS/CSP/CSRF policies to staging/production origins.
4. Activate distributed rate limiting or WAF plan.
5. Run dependency and vulnerability scans.
6. Complete OWASP review.
7. Schedule penetration test.

Exit condition: Critical findings are closed and high findings have an approved remediation plan.

## Priority 4 - Compliance Activation

Objective: Approve live user data processing and marketplace obligations.

Actions:

1. Complete Jamaica DPA review.
2. Complete GDPR applicability review.
3. Approve privacy, terms, beta disclaimers, and provider disclosures.
4. Validate consent, retention, deletion, export, and DSAR workflows.
5. Select KYC provider if paid pilot requires verified identities.

Exit condition: Legal/compliance owner approves closed beta data processing and paid-pilot prerequisites.

## Priority 5 - Revenue Activation

Objective: Prepare real commercial transactions after infrastructure, monitoring, security, and compliance are stable.

Actions:

1. Select payment provider.
2. Configure sandbox credentials.
3. Validate webhook signatures.
4. Test payment, refund, chargeback, payout, and failed-provider flows.
5. Approve escrow legal structure.
6. Validate Tax/GCT.
7. Validate reconciliation and financial reporting.

Exit condition: Paid pilot revenue flow is validated end to end in sandbox and approved by finance/legal/security.
