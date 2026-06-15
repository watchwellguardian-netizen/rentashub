# Payment Provider Activation Readiness

Module 49 prepares RentasHub for payment provider sandbox validation. It does not activate live payments, process real transactions, release escrow, issue real refunds, handle real chargebacks, execute payouts, or store card/bank data.

## Recommended Providers

Primary:

- Stripe Connect

Secondary:

- WiPay
- Lynk Business
- NCB Merchant Services

Provider choice should be based on geography, merchant onboarding support, payout support, webhook reliability, dispute tooling, settlement reporting, fees, and legal/compliance fit.

## Required Environment Variables

```env
PAYMENT_PROVIDER=placeholder|stripe|paypal|wipay|lynk|ncb|jn
PAYMENT_MODE=simulated|sandbox|live
PAYMENT_PUBLIC_KEY=
PAYMENT_SECRET_KEY=
PAYMENT_SANDBOX_ENABLED=false
PAYMENT_SANDBOX_PUBLIC_KEY=
PAYMENT_SANDBOX_SECRET_KEY=
PAYMENT_WEBHOOK_URL=
PAYMENT_WEBHOOK_SECRET=
PAYMENT_OPERATIONS_OWNER=
PAYMENT_COMPLIANCE_OWNER=
MERCHANT_ONBOARDING_MODE=manual|provider_hosted|embedded
MERCHANT_ONBOARDING_URL=
SETTLEMENT_ACCOUNT_ID=
SETTLEMENT_CURRENCY=JMD
REFUND_MODE=manual_review|provider_sandbox
CHARGEBACK_CONTACT_EMAIL=
PAYOUT_MODE=simulated|provider
PAYOUT_PROVIDER=
PAYOUT_WEBHOOK_SECRET=
```

Provider-specific variables may also be required:

- Stripe: `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`
- WiPay: `WIPAY_ACCOUNT_ID`, `WIPAY_API_KEY`, `WIPAY_WEBHOOK_SECRET`
- Lynk: `LYNK_MERCHANT_ID`, `LYNK_API_KEY`, `LYNK_WEBHOOK_SECRET`
- NCB: `NCB_MERCHANT_ID`, `NCB_API_KEY`, `NCB_WEBHOOK_SECRET`

Placeholder, empty, and simulated values must not count as live readiness.

## Sandbox Readiness

Sandbox validation requires:

- Provider account created.
- Sandbox/test mode enabled.
- Sandbox public key supplied.
- Sandbox secret key supplied through a secret manager.
- Test payment intent works in provider dashboard.
- Test failure, cancellation, refund, and webhook events are available.
- No real card or bank data is entered into RentasHub.

## Webhook Readiness

Webhook validation requires:

- Public HTTPS API endpoint.
- Provider webhook URL configured.
- Provider webhook secret configured.
- Signature verification implemented before accepting provider events.
- Idempotency key strategy.
- Replay protection strategy.
- Audit log record for each provider event.
- Controlled handling for duplicate, stale, and unknown events.

Module 49 documents readiness only. It does not implement live webhook processing.

## Merchant Onboarding Readiness

Merchant onboarding must define:

- Required supplier business fields.
- Individual/company onboarding path.
- Payout eligibility rules.
- Tax/finance document requirements.
- Provider-hosted or embedded onboarding choice.
- Manual review fallback.
- Supplier support process for onboarding errors.

## Settlement Readiness

Settlement readiness must define:

- Settlement currency.
- Platform fee handling.
- Supplier earnings timing.
- Deposit handling.
- Reconciliation report owner.
- Failed payout handling.
- Accounting export format.

## Refund Readiness

Refund readiness must define:

- Who can request refunds.
- Who can approve refunds.
- Partial vs full refund rules.
- Deposit refund policy.
- Audit log requirements.
- Customer/supplier notification wording.
- Provider sandbox refund test.

## Chargeback Readiness

Chargeback readiness must define:

- Chargeback contact owner.
- Evidence packet requirements.
- Booking, inspection, message, review, and claim references.
- Response SLA.
- Provider dispute portal access.
- Audit and legal retention policy.

## Payout Readiness

Payout readiness must define:

- Payout provider.
- Payout timing.
- Minimum payout threshold.
- Failed payout handling.
- Supplier bank/mobile wallet onboarding.
- Reconciliation owner.
- Tax/reporting responsibilities.

## Compliance Checklist

- No card data stored by RentasHub.
- No bank account data stored by RentasHub.
- Provider keys stored only in secret manager.
- Webhook signatures verified before event acceptance.
- Idempotency keys used for payment creation.
- Audit logs retained for payment, refund, payout, and provider events.
- Access to payment admin actions limited by RBAC.
- Refund/chargeback approvals documented.
- PCI scope reviewed before accepting real payments.
- Legal review completed for platform fees, deposits, refunds, chargebacks, and payouts.

## Current Status

Payments remain simulated by default. Provider selection, sandbox keys, webhook validation, merchant onboarding, settlement, refunds, chargebacks, payouts, compliance ownership, and reconciliation must be completed before paid pilot.
