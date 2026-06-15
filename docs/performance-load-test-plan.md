# Performance And Load Test Plan

Status: Ready to execute on staging infrastructure.

This plan responds to the review finding that no evidence exists yet for low bandwidth testing, accessibility certification, or 1,000+ concurrent user performance testing.

## Current Status

Performance readiness is planned, not proven.

RentasHub must not be treated as paid-pilot or public-launch ready until load testing is executed against live-like infrastructure.

## Required Environment

- Staging deployment.
- Supabase PostgreSQL or approved database provider active.
- Object storage provider active or explicitly disabled for test scope.
- Monitoring active.
- Log aggregation active.
- Test data seeded.
- Rate limit thresholds documented.
- Rollback plan ready.

## Load Levels

| Level | Concurrent users | Purpose | Launch impact |
| --- | ---: | --- | --- |
| Smoke | 25 | Validate staging availability | Required for closed beta |
| Pilot | 100 | Validate supplier/customer pilot traffic | Required for closed beta |
| Growth | 1,000 | Validate early public growth assumptions | Required before paid pilot |
| Scale | 5,000 | Validate infrastructure scaling plan | Required before public launch |
| Stress | 10,000 | Identify failure limits | Required before major public launch campaign |

## Critical Journeys To Test

- Public home and marketplace browse.
- Search/category page filtering.
- Asset detail reads.
- Login/session restore.
- Supplier listing creation.
- Booking request creation.
- Booking detail reads.
- Messaging thread reads and sends.
- Notification listing and mark-read.
- Review submission.
- Trust score reads.
- Protection/claim placeholder creation.
- Payment intent/simulated transaction path.
- Admin readiness dashboard reads.

## Metrics To Capture

- P50, P95, and P99 response times.
- Browser page load time.
- API error rate.
- Frontend error rate.
- Backend 5xx rate.
- Database latency.
- Storage upload-intent latency.
- Auth latency.
- Message send latency.
- Booking creation latency.
- CPU and memory saturation.
- Rate-limit trigger volume.
- Queue/backlog behavior where applicable.

## Acceptance Thresholds

Closed Beta:

- P95 page/API response under 2.5 seconds for core reads.
- Error rate under 1% for tested journeys.
- No data exposure across roles.
- No uncontrolled blank or crash pages.

Paid Pilot:

- P95 page/API response under 2 seconds for core reads.
- Booking and payment-simulation flows complete under agreed thresholds.
- Monitoring captures errors, traces, and alert events.
- Recovery plan tested for at least one induced failure.

Public Launch:

- Scale and stress results reviewed.
- Capacity plan approved.
- Autoscaling or scaling procedure documented.
- Database backup/restore tested.
- Incident runbook tested.

## Tooling Recommendations

Use one or more approved tools:

- k6 for scripted API/browser-adjacent load.
- Artillery for API journey simulation.
- Playwright for browser workflow smoke and regression.
- Lighthouse for frontend performance diagnostics.
- Sentry for error/performance traces.
- Better Stack for uptime and incident alerts.

## No-Go Conditions

- Load tests are run only against local JSON fallback.
- Monitoring is inactive.
- Database is not live or test-equivalent.
- Test results show uncontrolled 5xx spikes.
- Protected data is exposed between roles.
- Payment/escrow paths imply live money movement when still simulated.
- No rollback owner is available during test.

## Deliverables

- Test scripts.
- Test data description.
- Environment description.
- Results summary.
- Bottleneck register.
- Fix owner list.
- Retest evidence.
- Go/no-go recommendation.
