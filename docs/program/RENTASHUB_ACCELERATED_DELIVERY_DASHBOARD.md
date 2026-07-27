# RentasHub Accelerated Delivery Dashboard

Generated from: `docs/program/accelerated-delivery-status.json`

## Programme Status

| Field | Value |
| --- | --- |
| Platform | RentasHub Marketplace |
| Classification | RC-0.6A |
| State | Infrastructure Activation Hold |
| Current Gate | A4-01 Infrastructure Ownership Confirmation |
| Next Authorized Gate | A4-01 Infrastructure Ownership Confirmation Submitted |
| Production Ready | No |
| Provider Activation | No |

## Workstream Summary

| Domain | Total Features | Complete | Partial | Not Started | Blocked | Completion % | Owner | Current Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Core platform foundation | 14 | 7 | 6 | 0 | 1 | 50% | platform-engineering | Executable database validation blocked by missing local engine |
| Rental marketplace | 12 | 10 | 0 | 1 | 1 | 83% | marketplace-engineering | Provider-independent full core rental lifecycle and dashboard refresh path implemented; executable PostgreSQL/RLS persistence pending |
| Financial platform | 12 | 1 | 5 | 2 | 4 | 8% | financial-engineering | Provider-independent state engines only |
| Asset commerce | 10 | 3 | 4 | 2 | 1 | 30% | commerce-engineering | Awaiting shared foundation |
| Auctions and recovery | 14 | 3 | 5 | 3 | 3 | 21% | auction-engineering | Simulation-safe only |
| Trust, operations, and ecosystem services | 16 | 5 | 7 | 2 | 2 | 31% | operations-engineering | Provider-independent readiness |

## Aggregate Metrics

| Metric | Value |
| --- | ---: |
| Total requirements | 78 |
| Completed requirements | 30 |
| Accepted tests | 764 |
| Failing tests | 0 |
| Open P0 defects | 11 |
| Open P1 defects | 5 |
| Closed-beta completion | 45% |
| Paid-pilot completion | 25% |
| Production completion | 20% |

## Status Notes

- Database migration status: migrations 001 007 apply in memory and mirrored to local supabase executable postgres blocked.
- Provider activation status: blocked pending a4 and provider credentials.
- Environment status: local build passes live environments not certified.
