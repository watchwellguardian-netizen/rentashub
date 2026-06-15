# Revenue Remediation Roadmap

Status: Provider-ready only.

## Phase 1 - Ownership and Policy

1. Assign `REVENUE_OWNER_NAME` and `REVENUE_OWNER_EMAIL`.
2. Approve marketplace fee policy.
3. Approve commission policy.
4. Approve payment lifecycle policy.
5. Approve refund lifecycle policy.
6. Approve deposit lifecycle policy.
7. Approve escrow ledger and state machine policies.
8. Approve Tax/GCT handling.
9. Approve payout policy.
10. Approve transaction audit policy.

## Phase 2 - Sandbox Provider Validation

1. Select primary payment provider.
2. Configure sandbox credentials in secure environment variables.
3. Validate payment intent creation.
4. Validate webhook signatures.
5. Validate simulated-to-provider ledger mapping.
6. Test refund scenarios.
7. Test failed payment and failed refund scenarios.
8. Test chargeback event ingestion.
9. Validate reconciliation reports.

## Phase 3 - Escrow and Deposit Review

1. Select escrow/deposit model.
2. Complete legal review.
3. Map provider states to RentasHub escrow states.
4. Test release, partial release, refund, dispute, cancellation, and expiry paths in sandbox.
5. Verify ledger immutability and audit exports.

## Phase 4 - Financial Controls

1. Assign reconciliation owner.
2. Assign financial reporting owner.
3. Define daily exception review.
4. Define payout approval workflow.
5. Define payout failure workflow.
6. Validate supplier earnings reports.
7. Validate platform fee reports.
8. Validate Tax/GCT reports.

## Phase 5 - Paid Pilot Gate

Paid pilot remains NO-GO until:

- Provider sandbox tests pass.
- Escrow/legal review passes.
- Tax/GCT review passes.
- Reconciliation process is tested.
- Payout policy is approved.
- Security review is complete.
- Production monitoring is active.
