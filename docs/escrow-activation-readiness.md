# Escrow & Deposit Protection Activation Readiness

Module 50 prepares RentasHub for future escrow and deposit protection activation. It does not activate live escrow, process deposits, hold customer funds, release money, refund money, or create a legal escrow service.

## Status

- Current stage: credential-ready only.
- Default behavior: no live funds processing.
- Existing protection and claims workflows remain simulated/API-pilot capable.
- Live activation requires provider credentials, legal review, payment-provider review, settlement review, dispute policy approval, and explicit launch approval.

## Provider Readiness Models

RentasHub tracks readiness for these paths:

- Stripe Connect escrow architecture.
- WiPay escrow readiness.
- Lynk Business settlement readiness.
- NCB settlement readiness.
- Manual deposit hold model.
- Legal trust account model.

Each path must define provider credentials, webhook strategy where applicable, settlement currency, operations owner, legal owner, dispute owner, release policy, and refund policy before any paid pilot.

## Deposit Types

The escrow readiness model supports:

- Security deposits.
- Damage deposits.
- Reservation deposits.
- Booking hold deposits.
- Property deposits.
- Equipment deposits.

## Escrow States

Supported readiness states:

- `draft`
- `pending`
- `held`
- `released`
- `partially_released`
- `refunded`
- `disputed`
- `cancelled`
- `expired`

These states are workflow states only. They do not mean funds were moved.

## Required Environment Variables

```bash
ESCROW_PROVIDER=placeholder|stripe_connect|wipay|lynk|ncb|manual_deposit_hold|legal_trust_account
ESCROW_MODE=readiness_only|sandbox|legal_review|live_disabled
ESCROW_OPERATIONS_OWNER=
ESCROW_LEGAL_OWNER=
ESCROW_DISPUTE_OWNER=
ESCROW_RELEASE_POLICY_URL=
ESCROW_DISPUTE_POLICY_URL=
ESCROW_SETTLEMENT_CURRENCY=JMD
```

Provider-specific examples:

```bash
STRIPE_SECRET_KEY=
STRIPE_CONNECT_CLIENT_ID=
STRIPE_WEBHOOK_SECRET=
WIPAY_ACCOUNT_ID=
WIPAY_API_KEY=
WIPAY_WEBHOOK_SECRET=
LYNK_MERCHANT_ID=
LYNK_API_KEY=
LYNK_WEBHOOK_SECRET=
NCB_MERCHANT_ID=
NCB_API_KEY=
NCB_WEBHOOK_SECRET=
MANUAL_DEPOSIT_HOLD_POLICY_URL=
DEPOSIT_RECONCILIATION_OWNER=
LEGAL_TRUST_ACCOUNT_BANK=
LEGAL_TRUST_ACCOUNT_OWNER=
LEGAL_TRUST_ACCOUNT_POLICY_URL=
```

## Readiness Gates

- Provider readiness: credentials and provider account selected.
- Trust account readiness: legal trust or approved manual hold model reviewed.
- Legal readiness: escrow terms, release rules, cancellation rules, and notices reviewed.
- Dispute readiness: evidence rules, inspection linkage, review owner, and escalation path approved.
- Settlement readiness: currency, payout timing, reconciliation, and audit controls approved.
- Release readiness: conditional release, partial release, refund, cancellation, and expiry rules approved.

## Safety Rules

- No raw card, bank, or customer-funds data is stored.
- No fake escrow success is displayed.
- No real escrow release is simulated as provider success.
- Every API escrow action returns `liveFundsProcessed: false`.
- Legal escrow language must remain conditional until legal review is completed.

## Activation Checklist

- Select provider or legal trust account model.
- Obtain sandbox credentials.
- Configure webhooks where supported.
- Approve release and dispute policies.
- Confirm settlement and reconciliation owner.
- Run readiness API and admin readiness checks.
- Complete legal review.
- Complete payment/security review.
- Complete closed beta go/no-go review.
