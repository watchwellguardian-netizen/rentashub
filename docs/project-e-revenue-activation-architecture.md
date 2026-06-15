# Project E1 - Revenue Activation Architecture

Status: Provider-ready only.

Project E1 prepares RentasHub revenue controls for future provider activation. It does not activate Stripe, PayPal, WiPay, Fygaro, NCB payment gateways, real escrow accounts, real money movement, real settlements, live refunds, live chargebacks, payouts, or bank transfers.

## Objectives

- Define marketplace fee and commission architecture.
- Define payment, refund, deposit, escrow, settlement, payout, and reconciliation lifecycles.
- Expose revenue activation readiness in `/api/health/readiness` and the admin dashboard.
- Identify missing owners, policies, and provider validation gates before paid pilot.

## Revenue Domains

1. Payments architecture
   - Marketplace fee policy.
   - Commission engine policy.
   - Payment lifecycle policy.
   - Refund lifecycle policy.
   - Transaction audit policy.

2. Deposit and escrow architecture
   - Deposit lifecycle policy.
   - Escrow ledger policy.
   - Escrow state machine policy.
   - Settlement workflow policy.

3. Financial controls
   - Reconciliation owner.
   - Financial reporting owner.
   - Tax/GCT policy.
   - Payout policy.

## Required Environment Gates

- `REVENUE_ACTIVATION_MODE=readiness_only`
- `REVENUE_OWNER_NAME`
- `REVENUE_OWNER_EMAIL`
- `MARKETPLACE_FEE_POLICY_URL`
- `COMMISSION_POLICY_URL`
- `PAYMENT_LIFECYCLE_POLICY_URL`
- `REFUND_LIFECYCLE_POLICY_URL`
- `DEPOSIT_LIFECYCLE_POLICY_URL`
- `ESCROW_LEDGER_POLICY_URL`
- `ESCROW_STATE_MACHINE_POLICY_URL`
- `SETTLEMENT_WORKFLOW_POLICY_URL`
- `RECONCILIATION_OWNER`
- `FINANCIAL_REPORTING_OWNER`
- `TAX_GCT_POLICY_URL`
- `PAYOUT_POLICY_URL`
- `TRANSACTION_AUDIT_POLICY_URL`

## Admin Readiness

The admin revenue readiness panel reports:

- Payment architecture.
- Escrow architecture.
- Financial controls.
- Transaction audit.
- Tax/GCT readiness.
- Payout readiness.
- Reconciliation.
- Financial reporting.
- Real money movement.
- Real settlements.
- Real escrow account.
- Missing gates.

## Activation Boundary

Project E1 is an architecture and readiness layer only. No live money movement is active. Paid pilot remains blocked until real provider sandbox validation, legal escrow review, reconciliation testing, Tax/GCT approval, payout approval, and security review are complete.
