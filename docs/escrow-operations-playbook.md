# Escrow Operations Playbook

This playbook defines the future operating model for RentasHub deposits and escrow. It is not a live escrow operating procedure until provider credentials, legal approval, and production controls are active.

## Operating Principles

- Customer funds must not be held until the approved provider or legal trust account is active.
- Every hold, release, refund, cancellation, and dispute must be auditable.
- Operations staff must never manually edit financial records without an audit entry.
- Release decisions must be tied to booking, inspection, claim, and dispute records.

## Workflow

1. Booking deposit is drafted during booking/payment review.
2. Deposit moves to pending when a customer confirms intent.
3. Deposit may move to held only when a real provider/legal model is active.
4. Deposit may release after successful checkout and supplier review.
5. Deposit may partially release when approved deductions exist.
6. Deposit may refund after cancellation, expiry, or approved customer return.
7. Deposit may move to disputed when claim/dispute evidence is submitted.

## Operational Owners

- Escrow operations owner: accountable for day-to-day queues.
- Escrow legal owner: accountable for terms, notices, and release policy.
- Escrow dispute owner: accountable for evidence review and escalation.
- Finance/reconciliation owner: accountable for settlement and ledger reconciliation.

## Review Queues

- Pending holds.
- Pending release requests.
- Partial release requests.
- Refund requests.
- Disputed deposits.
- Expired holds.
- Manual reconciliation exceptions.

## Evidence Requirements

- Booking agreement.
- Asset listing rules.
- Check-in inspection.
- Check-out inspection.
- Photos or file metadata where available.
- Supplier/customer notes.
- Claim or dispute record.
- Message thread summary where relevant.

## Reconciliation

- Provider ledger must be reconciled to RentasHub payment ledger.
- Deposit records must reconcile to booking ID, asset ID, customer ID, and supplier ID.
- Exceptions require an audit note and owner assignment.

## Non-Negotiable Safety Rules

- No bank account storage in RentasHub.
- No real fund movement in simulated mode.
- No release without policy and audit trail.
- No live operations without legal review and provider credential verification.
