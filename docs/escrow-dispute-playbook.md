# Escrow Dispute Playbook

This playbook prepares RentasHub for deposit and escrow disputes. It does not create legal mediation, arbitration, binding adjudication, payout authority, refund authority, or live escrow authority.

## Dispute Triggers

- Damage found at checkout.
- Missing accessories.
- Late return.
- Fuel, battery, mileage, or engine-hour discrepancy.
- Customer cancellation disagreement.
- Supplier no-show or unavailable asset.
- Inspection evidence conflict.
- Claim escalation.

## Intake Requirements

- Booking ID.
- Asset ID.
- Customer and supplier IDs.
- Deposit type and amount.
- Check-in and check-out inspection records.
- Photo/file metadata where available.
- Claim or dispute reason.
- Requested outcome.

## Review Steps

1. Confirm the booking and deposit record exist.
2. Confirm customer/supplier ownership and access rights.
3. Review inspection records and evidence metadata.
4. Compare listing rules, damage policy, cancellation policy, and safety instructions.
5. Request more information if evidence is incomplete.
6. Mark the dispute as unresolved, resolved for customer, resolved for supplier, or legal/provider escalation required.

## Escalation Path

- Support owner handles intake.
- Dispute owner reviews evidence.
- Escrow legal owner reviews policy exceptions.
- Provider support is contacted only when sandbox/live credentials and process are active.
- Legal trust account owner is contacted only if that model is approved and active.

## Evidence Handling

- Private verification, inspection, claim, and dispute files must not be public.
- Evidence file content must use secure object storage before paid pilot.
- Metadata-only records are acceptable for demo and internal testing only.

## Safety Rules

- Do not promise a refund, payout, or escrow release before provider/legal activation.
- Do not delete evidence.
- Do not expose private documents publicly.
- Do not treat simulated status transitions as provider actions.
- No legal mediation or arbitration exists until a separate legal workflow is approved.
