# Payment Operations Playbook

This playbook defines operational readiness for RentasHub payment provider sandbox validation. It does not authorize live payments or real provider transactions.

## Payment Operations Owner

The payment operations owner is accountable for:

- Provider account setup.
- Sandbox credential collection.
- Webhook configuration tracking.
- Settlement and reconciliation review.
- Refund workflow testing.
- Payout workflow testing.
- Escalation to provider support.

Configure with `PAYMENT_OPERATIONS_OWNER`.

## Compliance Owner

The compliance owner is accountable for:

- PCI scope review.
- Card/bank data handling rules.
- Provider terms review.
- Refund/chargeback policy approval.
- Record retention.
- Legal review coordination.

Configure with `PAYMENT_COMPLIANCE_OWNER`.

## Sandbox Validation Steps

1. Select provider: Stripe Connect, WiPay, Lynk Business, or NCB Merchant Services.
2. Create sandbox account.
3. Store test keys in secret manager.
4. Set `PAYMENT_MODE=sandbox`.
5. Configure webhook URL and webhook secret.
6. Run test payment intent.
7. Run test failed payment.
8. Run test refund.
9. Run test payout where provider supports it.
10. Confirm no real card/bank data is collected.
11. Review audit logs and reconciliation output.

## Webhook Test Matrix

Validate provider events for:

- Payment intent created.
- Payment succeeded.
- Payment failed.
- Refund created.
- Refund failed.
- Payout created.
- Payout failed.
- Chargeback/dispute opened.
- Chargeback/dispute updated.
- Unknown event type.
- Duplicate event delivery.

## Merchant Onboarding Workflow

Merchant onboarding should cover:

- Supplier business profile.
- Business type.
- Contact person.
- Tax/finance requirements.
- Payout method.
- Provider verification status.
- Manual review fallback.
- Support owner.

No supplier should receive live payouts until onboarding, provider status, and legal requirements are approved.

## Settlement Workflow

Daily settlement review should confirm:

- Gross payment volume.
- Platform fees.
- Supplier earnings.
- Deposits.
- Refunds.
- Chargebacks.
- Payouts.
- Failed provider events.
- Ledger reconciliation.

## Refund Workflow

Refunds must require:

- Booking ID.
- Transaction ID.
- Refund reason.
- Approver.
- Customer notification.
- Supplier notification where relevant.
- Provider event confirmation.
- Audit log entry.

## Chargeback Workflow

Chargeback response packet should include:

- Booking record.
- Payment transaction.
- Inspection records.
- Message history references.
- Claim/dispute references.
- Supplier/customer identity context.
- Refund history.
- Support notes.

## Payout Workflow

Payout review should include:

- Supplier ID.
- Available earnings.
- Pending disputes/claims.
- Verification status.
- Provider payout status.
- Bank/mobile wallet onboarding status.
- Failed payout handling.

## Escalation

Escalate immediately for:

- Unexpected live charge.
- Duplicate charge.
- Provider webhook signature failure.
- Payout mismatch.
- Chargeback notice.
- Suspected fraud.
- Customer or supplier real-money confusion.

## Paid Pilot No-Go Conditions

- No sandbox validation.
- No webhook verification.
- No payment operations owner.
- No compliance owner.
- No refund policy.
- No chargeback workflow.
- No payout reconciliation.
- No legal review.
- No secure secrets management.
