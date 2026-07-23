# Test Results

## Commands Run

| Command | Result | Evidence |
| --- | --- | --- |
| `node --test tests/production/ai-studio-consolidation.test.mjs` | PASS | 7/7 focused A3-X tests passed. |
| `npm.cmd run test` | PASS | 596/596 frontend production tests passed. Baseline count was not reduced. |
| `npm.cmd run test:server` | PASS | 114/114 backend tests passed. |
| `npm.cmd run readiness` | PASS | Credential-level readiness report generated; real providers remain credential/manual-operation required. |
| `npm.cmd run build` | PASS | Vite production build passed; 1692 modules transformed. |

## Readiness Boundary

The readiness CLI still reports missing credentials and manual provider evidence for auth, infrastructure, monitoring, security, compliance, revenue, escrow, and pilot operations. This is expected and does not satisfy A4-01 or production certification.

## A4 Status

A4-01 remains open/blocked. The consolidation did not submit real Development, UAT/Staging, and Production Supabase project IDs.
