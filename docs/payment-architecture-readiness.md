# Payment Architecture Readiness

Status: Provider-ready only.

This document defines the payment architecture required before RentasHub can safely activate real payment providers. It does not process real payments.

## Supported Future Providers

- Stripe Connect.
- PayPal.
- WiPay.
- Fygaro.
- NCB payment gateways.

No provider is active from this document. Provider credentials, sandbox tests, webhook validation, refund tests, chargeback handling, and payout tests are still required.

## Marketplace Fee Architecture

The fee architecture must define:

- Platform fee percentage.
- Buyer fee rules.
- Supplier commission rules.
- Category-level overrides.
- Supplier tier overrides.
- Promotional credits.
- Fee refund behavior.
- Invoice and receipt disclosure.
- Tax/GCT treatment.

## Commission Engine Architecture

The commission engine must support:

- Commission basis by booking, auction sale, inspection referral, transport referral, or financing referral.
- Fee calculation before settlement.
- Refund and cancellation adjustments.
- Supplier earnings calculation.
- Admin review of exceptions.
- Audit trail for every fee calculation.

## Payment Lifecycle

Planned states:

- `draft`
- `intent_created`
- `authorized_placeholder`
- `simulated_paid`
- `failed`
- `cancelled`
- `refunded_placeholder`

Provider sandbox activation must map these states to actual provider events before paid pilot.

## Refund Lifecycle

Refund readiness requires:

- Full refund rules.
- Partial refund rules.
- Failed refund handling.
- Manual review requirements.
- Dispute-linked refund rules.
- Chargeback interaction.
- Audit logging.

## Payment Safety Rules

- Do not store card data.
- Do not store bank account numbers.
- Do not claim provider success without provider response validation.
- Do not allow silent fallback from provider mode to simulation.
- Do not activate live mode without webhook verification and finance approval.
