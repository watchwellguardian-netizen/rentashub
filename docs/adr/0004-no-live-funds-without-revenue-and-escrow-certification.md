# ADR 0004: No Live Funds Without Revenue and Escrow Certification

Status: Accepted

Date: 2026-06-16

Owner: Revenue / Legal / Security / DevOps

## Context

RentasHub includes simulated payments, payouts, escrow states, deposit workflows, claims, disputes, and revenue readiness tooling. Real money movement creates legal, operational, security, tax, and customer-risk obligations.

## Decision

RentasHub will not process live payments, deposits, refunds, payouts, escrow releases, legal trust account transactions, or settlement flows until revenue and escrow certification evidence passes.

## Options Considered

| Option | Benefits | Tradeoffs | Decision |
| --- | --- | --- | --- |
| Activate live payment sandbox and production together | Faster revenue path | Too risky without legal, tax, monitoring, and reconciliation evidence | Rejected |
| Keep all money movement simulated until certification | Strong safety boundary | Delays revenue collection | Accepted |
| Manual off-platform payments | Possible pilot workaround | Creates reconciliation and support risk | Deferred pending legal review |

## Consequences

- Payment and escrow flows remain simulation-safe.
- Provider sandbox validation may be prepared but not treated as live money movement.
- Legal trust account readiness remains legal-review only.

## Validation

- Tests confirm `liveFundsProcessed: false`.
- Revenue and escrow readiness tools report missing legal/provider evidence until supplied.
- No payment or escrow provider credentials are committed.

## Rollback or Reversal

This decision can be reversed only by a later ADR after payment provider onboarding, escrow legal review, tax/GCT review, reconciliation testing, monitoring activation, and executive signoff.

## References

- Related docs: `docs/revenue-operations-playbook.md`, `docs/escrow-activation-readiness.md`
- Related tools: `scripts/revenue-readiness-tooling.mjs`, `scripts/escrow-readiness-tooling.mjs`
