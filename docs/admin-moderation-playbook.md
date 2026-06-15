# Admin Moderation Playbook

This playbook defines controlled admin moderation for RentasHub pilot operations. It does not implement legal moderation, real KYC, real insurance adjudication, escrow release, refunds, payouts, or binding dispute resolution.

## Listing Review Process

Review each listing for:

- Correct category and subcategory.
- Clear title and description.
- Location clarity.
- Price/rate or sale/trade value consistency.
- Availability status.
- Damage, cancellation, safety, and usage policies.
- Operator requirement.
- Photo/evidence readiness when storage is active.

Actions:

- Approve placeholder.
- Request changes placeholder.
- Suspend/takedown placeholder.

## Supplier Verification Review

Review:

- Business profile completeness.
- Contact information.
- Service areas.
- Supplier type.
- Document metadata placeholders.
- Ownership proof placeholders.
- Insurance and operator certification placeholders where relevant.

Do not mark legal/KYC verification as real unless an approved provider and policy are active.

## Review and Report Moderation

Moderate:

- Abusive content.
- Spam.
- Private information.
- Fraud allegations.
- Retaliatory reviews.
- Duplicate reports.

Actions remain simulated/local unless a future moderation module activates backend workflows.

## Dispute Escalation

Escalate disputes when:

- Damage is alleged.
- Asset is missing.
- Safety issue is reported.
- Supplier/customer conduct is abusive.
- Real-money confusion appears.
- Evidence conflicts or cannot be resolved through basic support.

Preserve audit logs and all related IDs.

## Claim Escalation

Escalate claims when:

- Inspection record is flagged.
- Damage evidence exists.
- Supplier and customer accounts disagree.
- Protection/insurance terms are referenced.
- A real payment/refund expectation is present.

Claims remain simulated until insurance, payments, escrow, and legal workflows are activated.

## Suspicious Activity Review

Review:

- Excessive disputes.
- Frequent cancellations.
- Unusual offer activity.
- Repeated failed payments in future provider mode.
- Admin changes outside operating process.
- Login/auth failure spikes.
- Private document access anomalies.

Route suspicious patterns to the escalation owner.

## Audit Log Review

Review audit logs for:

- Admin mutations.
- Listing changes.
- Booking status changes.
- Payment simulation events.
- Claim/dispute status changes.
- Trust recalculation.
- File metadata changes.

Audit records support internal review only until real retention/export policies are approved.

## Takedown Workflow

Controlled takedown steps:

1. Capture reason and evidence.
2. Notify supplier through support channel.
3. Mark listing/profile action as placeholder or simulated status.
4. Record admin owner and timestamp.
5. Offer appeal path if policy allows.
6. Escalate severe cases to legal/security owner.

No destructive deletion should be used for pilot moderation.
