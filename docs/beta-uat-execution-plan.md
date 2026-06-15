# Beta UAT Execution Plan

Status: Ready to execute when pilot participants, staging infrastructure, and operational owners are available.

This plan converts the external review's recommended UAT rounds into an executable acceptance program. It does not claim that real beta testing has already occurred.

## Entry Criteria

- Staging environment available.
- Test data reset plan approved.
- Support owner assigned.
- Supplier onboarding owner assigned.
- Admin/moderation owner assigned.
- Incident owner assigned.
- Test participant consent and feedback process approved.
- No real payment, escrow, KYC, or insurance claims are enabled unless provider activation and approvals are complete.

## UAT Round 1 - 20 Suppliers

Goal: Validate supplier onboarding and listing operations.

Participants: 20 supplier/vendor users.

Scenarios:

- Create supplier profile.
- Complete verification checklist.
- Create asset listings across at least five categories.
- Add upload-ready photo/document metadata.
- Review trust score and profile completeness.
- Receive an inquiry/message.
- Accept or decline a booking request.
- Review rental requests.
- View earnings and payout placeholders.

Pass criteria:

- At least 90% of suppliers complete profile setup without staff intervention.
- At least 90% create one valid listing.
- No supplier can edit another supplier's listing.
- No private verification placeholder is exposed publicly.
- Support issues are logged and triaged.

## UAT Round 2 - 100 Customers

Goal: Validate discovery, booking, messaging, and review journeys.

Participants: 100 customer/user accounts.

Scenarios:

- Browse public marketplace.
- Search by category, location, price, and listing type.
- Open asset detail.
- Submit booking request.
- Open booking detail.
- Message supplier.
- Review simulated payment disclosure.
- Complete eligible check-in/check-out.
- Submit review for completed booking.
- View wallet/payments placeholders.

Pass criteria:

- At least 90% of customers can find and open a relevant asset.
- At least 85% can submit a booking request without support.
- Unauthorized supplier/admin actions remain blocked.
- Simulated payment language is clear and not misleading.
- No protected data is exposed through direct URL refresh.

## UAT Round 3 - 10 Admin Users

Goal: Validate admin oversight and escalation workflows.

Participants: 10 admin/moderator users.

Scenarios:

- Open admin center.
- Review readiness dashboards.
- Review users/listings/reviews/claims/disputes.
- Simulate moderation action where available.
- Review trust/risk queue.
- Review audit log expectations.
- Confirm destructive/live provider actions are unavailable.

Pass criteria:

- Every admin panel has a controlled outcome.
- Simulated/local-only actions are clearly labeled.
- No live payout, escrow release, legal resolution, or destructive production action exists.
- Admin actions remain role-protected.

## UAT Round 4 - Cross-Role Operational Scenarios

Goal: Validate full marketplace journeys across roles.

Scenarios:

- Supplier onboarding to inquiry.
- Customer search to completed booking.
- Inspection to claim placeholder.
- Review to trust-score impact.
- Messaging to notification.
- Broker lead review.
- Admin moderation review.

Pass criteria:

- Each scenario has a recorded pass/fail result.
- Each failure has owner, severity, and required fix.
- Paid pilot remains no-go until critical failures are closed.

## Mobile Device Matrix

Minimum physical or cloud-device coverage:

- iPhone recent Safari.
- iPhone older supported Safari.
- Android Chrome recent.
- Android lower-memory device.
- Tablet portrait.
- Tablet landscape.
- Laptop desktop browser.
- Large desktop browser.

Checks:

- Navigation is reachable.
- Buttons fit inside containers.
- Forms remain usable.
- Modals and placeholders are readable.
- No required action is hidden behind inaccessible menus.

## Low Bandwidth Testing

Required profiles:

- Slow 3G.
- Fast 3G.
- High latency mobile network.
- Intermittent connection.

Checks:

- Loading states appear.
- Errors are controlled.
- Form submission failures are recoverable.
- No user is misled into thinking simulated payments or escrow are live.

## Accessibility Review

Required before paid pilot:

- Keyboard navigation review.
- Focus indicator review.
- Screen reader smoke test.
- Contrast review.
- Form label review.
- Error message review.
- Touch target review.

Formal accessibility certification remains pending until performed by qualified reviewers.

## UAT Exit Decision

Closed Beta can proceed only when:

- Supplier UAT pass criteria are met.
- Customer UAT pass criteria are met.
- Admin UAT pass criteria are met.
- Critical defects are closed or accepted by owner.
- Support and escalation owners are active.
- Monitoring is active for staging.

Paid Pilot remains NO-GO until live infrastructure, payments, escrow/legal controls, security certification, and commercial approvals are complete.
