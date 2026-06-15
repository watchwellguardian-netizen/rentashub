# Customer Support Playbook

This playbook defines customer and supplier support during controlled RentasHub pilot operations. It does not activate real payments, escrow, KYC, insurance, or legal dispute handling.

## Intake Channels

- Primary support email: `PILOT_SUPPORT_EMAIL`.
- Optional support phone: `PILOT_SUPPORT_PHONE`.
- Escalation email: `PILOT_ESCALATION_EMAIL`.
- Operating hours: `PILOT_OPERATING_HOURS`.

## Account Support

Handle:

- Login/demo-mode questions.
- Role confusion.
- Profile edits.
- Supplier/customer dashboard navigation.
- Password reset guidance only if live auth is activated.

Never request passwords, secret keys, card numbers, bank details, or private documents through ordinary support messages.

## Booking Support

Handle:

- Booking request status.
- Supplier response follow-up.
- Check-in/check-out guidance.
- Availability confusion.
- Cancellation policy questions.

Escalate if a booking involves safety, fraud, damage, harassment, or real-money confusion.

## Payment and Protection Support Placeholders

Current support language:

- Payments are simulated unless a real provider is activated and approved.
- Protection and claims are simulated/operational placeholders unless real insurance and claims workflows are activated.
- No real card, bank, refund, chargeback, payout, or escrow promise should be made.

## Safety Issue Escalation

Escalate immediately for:

- Injury or safety incident.
- Equipment failure during rental.
- Unsafe vehicle or machinery.
- Threatening behavior.
- Missing or stolen asset.
- Private document exposure.

Collect only necessary facts and preserve evidence references.

## Dispute and Claim Routing

Collect:

- User ID and role.
- Booking ID.
- Asset ID.
- Supplier ID.
- Inspection ID if available.
- Message thread ID.
- Claim/dispute summary.
- Evidence metadata.
- Timestamp and location context.

Route to the dispute owner and escalation owner.

## Supplier Complaint Handling

For complaints about suppliers:

- Review listing accuracy.
- Review booking messages.
- Review inspection/check-in/check-out records.
- Review prior ratings, disputes, claims, and trust signals.
- Escalate repeated issues to moderation.

## Evidence Collection

Evidence should include:

- Screenshots where appropriate.
- Inspection records.
- Photo metadata when storage is active.
- Message thread references.
- Booking status timeline.
- Support ticket notes.

Do not collect sensitive documents through unapproved channels.

## Response Time SLAs

Recommended pilot SLAs:

- Safety escalation: same day, immediate owner notification.
- Booking-blocking issue: within 4 business hours.
- Supplier onboarding issue: within 1 business day.
- General support: within 1 business day.
- Non-urgent feedback: within 3 business days.

## Ticket Closure

Close only after:

- User received clear response.
- Owner/action is recorded.
- Follow-up date is set if unresolved.
- Known product gap is logged.
- Escalation record is created if needed.
