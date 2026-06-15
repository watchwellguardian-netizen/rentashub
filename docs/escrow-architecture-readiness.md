# Escrow Architecture Readiness

Status: Provider-ready only.

This document defines escrow and deposit architecture for future activation. It does not create legal escrow capability, hold customer funds, release deposits, refund real money, or execute settlements.

## Escrow Models

Future provider review may include:

- Stripe Connect escrow-style architecture.
- WiPay settlement model.
- Fygaro settlement model.
- NCB settlement model.
- Manual deposit hold model.
- Legal trust account model.

## Deposit Types

Supported readiness categories:

- Security deposits.
- Damage deposits.
- Reservation deposits.
- Booking hold deposits.
- Property deposits.
- Equipment deposits.

## Deposit Lifecycle

Planned states:

- `not_required`
- `draft`
- `requested`
- `pending_hold`
- `held_placeholder`
- `release_pending`
- `released_placeholder`
- `refund_pending`
- `refunded_placeholder`
- `disputed`
- `expired`

## Escrow Ledger States

Planned states:

- `draft`
- `pending`
- `held`
- `released`
- `partially_released`
- `refunded`
- `disputed`
- `cancelled`
- `expired`

## Release and Dispute Controls

Before activation, RentasHub must define:

- Release authority.
- Partial release rules.
- Damage evidence requirements.
- Inspection report dependency.
- Supplier/customer dispute notices.
- Admin approval thresholds.
- Legal review requirements.
- Audit log retention.

## Settlement Workflow

Planned workflow:

1. Capture review.
2. Ledger posting.
3. Fee calculation.
4. Supplier earnings calculation.
5. Reconciliation.
6. Payout review.
7. Reporting.

No real settlement is active until provider credentials, legal review, reconciliation, and finance approval are complete.
