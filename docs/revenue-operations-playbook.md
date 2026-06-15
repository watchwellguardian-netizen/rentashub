# Revenue Operations Playbook

Status: Commercial Readiness Review

This playbook defines what must exist before RentasHub supports revenue-generating pilot customers. It does not activate live payments.

## Revenue Operations Checklist

### Payment Provider

- [ ] Payment provider selected.
- [ ] Sandbox account created.
- [ ] Public key configured.
- [ ] Secret key configured securely.
- [ ] Webhook endpoint configured.
- [ ] Webhook secret configured.
- [ ] Payment intent flow tested.
- [ ] Successful payment event tested.
- [ ] Failed payment event tested.
- [ ] Refund placeholder replaced with provider sandbox flow.
- [ ] Chargeback process documented.

### Merchant And Settlement

- [ ] Merchant account approved.
- [ ] Platform fee model approved.
- [ ] Supplier payout model approved.
- [ ] Settlement currency approved.
- [ ] Payout schedule approved.
- [ ] Tax/reporting owner assigned.
- [ ] Reconciliation owner assigned.

### Escrow And Deposits

- [ ] Escrow provider selected or legal trust account approved.
- [ ] Deposit hold policy approved.
- [ ] Deposit release policy approved.
- [ ] Damage claim policy approved.
- [ ] Dispute hold policy approved.
- [ ] Legal review completed.
- [ ] No escrow claims are made before approval.

### Customer Communications

- [ ] Payment terms published.
- [ ] Refund terms published.
- [ ] Deposit terms published.
- [ ] Fee disclosure approved.
- [ ] Support contact visible.
- [ ] Failed payment handling approved.
- [ ] Escalation copy approved.

### Operational Controls

- [ ] Daily transaction reconciliation.
- [ ] Failed payment review.
- [ ] Refund review.
- [ ] Payout review.
- [ ] Chargeback review.
- [ ] Support ticket review.
- [ ] Audit log review.
- [ ] Incident review.

## Customer Support Requirements

- Payment support owner assigned.
- Escrow/deposit support owner assigned.
- Refund support owner assigned.
- Chargeback support owner assigned.
- Supplier payout support owner assigned.
- Response SLA approved.
- Escalation path approved.

## Paid Pilot Launch Rule

Paid pilot may not start until payment provider sandbox validation, legal review, support ownership, monitoring, reconciliation, and security checks are complete.
