# Release Decision Matrix

## Demo Release Criteria

- Status: Go.
- Criteria: Local/demo mode, simulated payments, simulated protection/claims, clear non-live labels, no real customer payments, no real documents, no public provider claims.
- Required evidence: Frontend tests pass, backend tests pass, build passes, ZIP refreshed, demo users documented.
- Blockers: Broken build, broken ZIP, retired branding, or misleading live-provider claims.

## Internal Team Testing Criteria

- Status: Go.
- Criteria: Demo release criteria plus backend API pilots enabled in controlled environment, readiness reviewed, admin readiness visible, local placeholder storage only.
- Required evidence: CI run or local equivalent, readiness report, security baseline doc, deployment readiness doc.
- Blockers: Uncontrolled secrets, missing tests, broken auth/RBAC, broken admin access.

## Supplier Pilot Criteria

- Status: Conditional Go.
- Criteria: Supplier onboarding, asset listing, supplier dashboard, verification placeholders, messaging, bookings, inspections, reviews, trust, and support runbook.
- Required evidence: Staging deployment, real database, monitoring, backup, object storage if documents/photos are collected.
- Blockers: No database, no monitoring, no backup, no storage for required files.

## Customer Pilot Criteria

- Status: Conditional Go.
- Criteria: Customer dashboard, search, asset detail, booking, messaging, inspection, review, trust, and clear simulated payment/protection labels.
- Required evidence: Staging deployment, auth hardening, database active, privacy policy, support process.
- Blockers: Real payments requested without payment certification, no security review, no privacy review.

## Paid Beta Criteria

- Status: No-Go until payment and operations gaps close.
- Criteria: Real payment provider, reconciliation, refunds, payout controls, tax/finance operations, real auth hardening, monitoring, backups, legal review.
- Required evidence: Provider credentials, webhook tests, incident response owner, security review.
- Blockers: Simulated payments, no escrow policy where escrow is promised, no monitoring/backups.

## Public Launch Criteria

- Status: No-Go.
- Criteria: Production database, object storage, payment/escrow if offered, KYC/insurance if offered, deployment, DNS/TLS, WAF/rate limiting, monitoring, backups, legal/compliance, accessibility, load test, penetration test, owner approvals.
- Required evidence: Completed production launch checklist.
- Blockers: Any critical gap in `docs/final-gap-register.md`.

## Decision Summary

- Demo release: Go.
- Internal team testing: Go.
- Supplier pilot: Conditional Go after staging, database, monitoring, backup, and storage decisions.
- Customer pilot: Conditional Go after auth/privacy/security review and staging validation.
- Paid beta: No-Go.
- Public launch: No-Go.

## Phase 2 Gate Mapping

- Module 44 - Production Database Activation is required before supplier pilot or customer pilot with real data.
- Module 45 - Object Storage Activation is required before collecting asset photos, verification documents, inspection evidence, claims evidence, dispute evidence, or supplier logos.
- Module 46 - Frontend Authentication Migration is required before live users, claims, payments, disputes, admin moderation, or provider-backed workflows.
- Module 47 - Payment Provider Activation is required before paid beta.
- Module 48 - Monitoring & Observability is required before any external pilot.
- Module 49 - Production Security Certification is required before public launch.
- Module 50 - Pilot Launch Readiness is required before onboarding the first 20 suppliers and first 100 customers.
