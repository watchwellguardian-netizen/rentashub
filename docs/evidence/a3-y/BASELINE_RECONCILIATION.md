# A3-Y Baseline Reconciliation

## Purpose

This report reconciles the earlier repository reality audit with the current RentasHub baseline. It prevents obsolete findings from being repeated as current facts.

## Current Evidence Sources

- `AGENTS.md`
- `docs/program-state.md`
- `package.json`
- `docs/evidence/ai-studio-consolidation/CONSOLIDATION_COMPLETION_REPORT.md`
- `docs/evidence/ai-studio-consolidation/TEST_RESULTS.md`
- Current `git status --short`

## Reconciliation Matrix

| Finding | Earlier Audit | Current Repository Evidence | Current Status | Resolution |
| --- | --- | --- | --- | --- |
| Previous 12 failing frontend tests | 589 frontend tests, 577 passing, 12 failing | A3-X evidence reports 596/596 frontend tests passing | Resolved by later baseline | Fully resolved per recorded A3-X evidence; not rerun in this A3-Y batch |
| Frontend test count | 589 total frontend tests | A3-X evidence reports 596 frontend tests | Changed | Increase explained by A3-X tests and prior readiness tooling |
| Total test count | Not 710 | A3-X evidence reports 596 frontend + 114 backend = 710 | Updated | Current known baseline is 710 passing tests |
| Repository-local AGENTS.md | Missing | Root `AGENTS.md` exists and identifies RentasHub governance | Resolved | Added in A3-X |
| AI Assistant integration | Incomplete | `/ai-assistant` route and `src/lib/aiStudioConsolidation.js` exist | Resolved for non-production scope | Provider runtime still not live |
| Documentation integration | Incomplete | `/documentation` route added through A3-X | Resolved for non-production scope | Documentation is searchable/read-only |
| Workflow guides | Incomplete | `/workflows` route added through A3-X | Resolved for non-production scope | Guides are read-only, not transaction engines |
| Admin system-status route | Missing | `/admin/system-status` added through A3-X | Resolved for non-production scope | Truthfully marks A4-01 blocked/open |
| Lint command | No confirmed lint command | Package excerpt inspected in A3-Y Phase 0 did not confirm root lint scripts | Still open | A3-Y Phase 4 must verify or implement |
| Bundle-size warning | Large Vite bundle warning | Build passed in A3-X evidence, but current bundle measurement was not rerun | Still open | A3-Y Phase 5 must measure before changing |
| OpenAPI placeholder status | Placeholder | `server/docs/openapi-placeholder.md` exists | Still open | API documentation is not proven complete OpenAPI implementation |
| Frontend-to-backend migration | Incomplete | Frontend adapters and server repositories exist, but full rental journey parity not proven | Partially resolved | A3-Y Phase 6/7 must map and migrate safely |
| LocalStorage dependency | Active | Source scan shows local/client repositories and localStorage-dependent workflow risk remains | Still open | A3-Y Phase 8 must inventory keys |
| Supabase activation | Not active | A4-01 remains open; no complete project-ID package accepted | Still blocked | Requires A4 evidence |
| Authentication activation | Not production active | Server auth scaffold and Supabase readiness exist; live Auth evidence absent | Provider-ready only | Requires real Supabase Auth evidence later |
| Storage activation | Not production active | Supabase storage readiness/scaffold exists; live bucket evidence absent | Provider-ready only | Requires A4 storage evidence later |
| Payment simulation | Simulated | Payment scripts/services indicate readiness and simulation boundaries | Simulated/provider-ready | No real money movement authorized |
| Escrow simulation | Simulated | Escrow readiness exists; legal/provider activation absent | Simulated/provider-ready | No real escrow authorized |
| Monitoring activation | Not active | Monitoring readiness tooling exists; live Sentry/Better Stack evidence absent | Provider-ready only | B3 remains blocked |
| Production certification | Not approved | `docs/program-state.md` says production ready: No | Blocked | Requires A4-A5 and downstream activation/certification |

## Current Baseline Statement

The earlier failed-test audit is obsolete for current reporting. The current recorded baseline is:

- Frontend tests: PASS, 596/596
- Backend tests: PASS, 114/114
- Total tests: PASS, 710/710
- Production build: PASS
- Readiness CLI: PASS at credential-report level only

These results are accepted as recorded A3-X evidence until rerun during a later A3-Y verification batch.

## Remaining Engineering Truth

RentasHub has broad non-production coverage, but the core product still needs a proven backend-connected rental vertical slice. A3-Y must focus on consolidation, canonical adapters, localStorage reduction, performance, and truthful readiness rather than new surface features.
