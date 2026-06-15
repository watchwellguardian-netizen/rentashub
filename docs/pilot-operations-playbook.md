# Pilot Operations Playbook

This playbook prepares RentasHub for controlled demo, internal testing, and supplier pilot operations. It does not authorize public launch, live payments, escrow, KYC, insurance, live monitoring, or production security certification.

## Pilot Objective

Run a limited supplier pilot that validates marketplace workflows, supplier onboarding, listing quality, booking requests, inspections, messages, reviews, trust scoring, claims placeholders, and support procedures before paid or public launch.

## Pilot Scope

- Pilot region: configure with `PILOT_REGION`.
- Pilot asset categories: configure with `PILOT_ASSET_CATEGORIES`.
- Supplier target: configure with `PILOT_SUPPLIER_TARGET`.
- Customer target: configure with `PILOT_CUSTOMER_TARGET`.
- Support channel: configure with `PILOT_SUPPORT_EMAIL` and optional `PILOT_SUPPORT_PHONE`.
- Escalation contact: configure with `PILOT_ESCALATION_EMAIL`.
- Operating hours: configure with `PILOT_OPERATING_HOURS`.
- Pilot owner: configure with `PILOT_OWNER_NAME` and `PILOT_OWNER_EMAIL`.

## Required Owners

- Pilot owner: accountable for go/no-go, scope, stakeholder updates, and rollback.
- Supplier onboarding owner: accountable for supplier invitations, listing standards, profile completeness, and first-week supplier follow-up.
- Support owner: accountable for intake, triage, response time, and ticket tracking.
- Escalation owner: accountable for urgent safety, fraud, legal, provider, and operational escalations.
- Dispute owner: accountable for evidence intake and controlled resolution notes.
- Verification owner: accountable for supplier profile and document-review readiness.
- Incident owner: accountable for operational incidents, monitoring follow-up, and post-incident review.

## Go/No-Go Checklist

Pilot Go requires:

- Pilot owner assigned.
- Supplier onboarding owner assigned.
- Support owner assigned.
- Escalation owner assigned.
- Dispute owner assigned.
- Verification owner assigned.
- Region and categories scoped.
- Supplier and customer target counts approved.
- Operating hours published internally.
- Support and escalation contacts tested.
- Admin moderation playbook reviewed.
- Customer support playbook reviewed.
- Supplier onboarding playbook reviewed.
- Known non-live systems disclosed: payments, escrow, KYC, insurance, live monitoring, object storage, and real database activation.
- Rollback decision path approved.

Pilot No-Go triggers:

- No accountable owner.
- No support route.
- No escalation contact.
- No supplier verification review process.
- No moderation/takedown process.
- Claims/disputes cannot be manually triaged.
- Real provider claims are shown without active providers.
- Security or privacy concern is unresolved.

## Pilot KPIs

Track during the pilot:

- Suppliers onboarded.
- Assets listed.
- Approved listings.
- Search volume.
- Booking requests.
- Booking response time.
- Message response rate.
- Dispute rate.
- Claim rate.
- Review completion rate.
- Lead conversion rate.
- Support tickets.
- Failed workflows.

## Daily Operating Rhythm

1. Review new suppliers, profiles, listings, and verification status.
2. Review booking requests and response time.
3. Review messages and unresolved support tickets.
4. Review claims, disputes, flagged reviews, and suspicious activity.
5. Review failed workflows and UX blockers.
6. Record KPI summary and owner actions.

## Escalation Rules

Escalate immediately for:

- Safety issue.
- Fraud or suspicious admin activity.
- Private document exposure.
- Payment confusion or real-money expectation.
- Claim/dispute involving property damage.
- Supplier/customer harassment or abusive conduct.
- Repeated failed workflow blocking bookings or inspections.

## Pilot Communication Rules

- Say “pilot” or “testing,” not public launch.
- Say payments are simulated unless a real provider is activated and approved.
- Say verification and claims review are operational placeholders unless real KYC/insurance providers are activated.
- Do not promise binding arbitration, escrow release, refunds, payouts, or legal claims adjudication.

## Rollback

Rollback means pausing new supplier/customer invitations, disabling public sharing of pilot links, freezing manual approvals, exporting KPI/issues, and completing a review before reopening.
