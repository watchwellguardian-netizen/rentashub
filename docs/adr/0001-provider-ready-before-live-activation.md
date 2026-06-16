# ADR 0001: Provider-Ready Foundations Before Live Activation

Status: Accepted

Date: 2026-06-16

Owner: Architecture / DevOps / Security

## Context

RentasHub has marketplace, auction, inspection, transport, financing, analytics, document, notification, AI, payment, escrow, compliance, and operational foundations. Real infrastructure providers and credentials are not yet active.

## Decision

RentasHub will keep provider integrations credential-ready and simulation-safe until external environments, credentials, legal approvals, and operational evidence are available.

## Options Considered

| Option | Benefits | Tradeoffs | Decision |
| --- | --- | --- | --- |
| Activate live providers immediately | Faster apparent launch | High risk without evidence, legal review, monitoring, rollback, and secret controls | Rejected |
| Keep local/demo foundations only | Safest short term | Does not prepare activation path | Rejected |
| Build provider-ready inactive interfaces | Clear activation path without live-risk exposure | Requires evidence gates before launch | Accepted |

## Consequences

- Live payments, escrow, auth, storage, monitoring, KYC, and external AI remain inactive.
- Readiness tooling may validate configuration shape and evidence templates but must not claim provider connectivity.
- Manual evidence gates remain required for live activation.

## Validation

- Readiness CLI reports missing real-provider credentials.
- Secret scanner remains clean.
- Tests confirm no live provider claims or money movement.
- A4 evidence gates must pass before infrastructure certification.

## Rollback or Reversal

This decision can be revisited only after live provider environments are provisioned, tested in UAT, and approved through release governance.

## References

- Related docs: `docs/program-state.md`, `docs/project-a4-live-supabase-activation-certification.md`
- Related gate: RC-0.6A Infrastructure Activation Hold
