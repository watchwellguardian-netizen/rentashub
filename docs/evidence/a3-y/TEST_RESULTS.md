# A3-Y Test Results

## Commands Run

| Command | Exit code | Result | Notes |
| --- | ---: | --- | --- |
| `npm run test -- tests/production/a3-y-governance-evidence.test.mjs` | 1 | FAIL | Blocked by Windows PowerShell execution policy for `npm.ps1`; no repository failure. |
| `npm.cmd run test -- tests/production/a3-y-governance-evidence.test.mjs` | 0 | PASS | Repo test script ran the full production glob and the A3-Y test file; 601/601 frontend production tests passed. |
| `npm.cmd run test -- tests/production/a3-y-governance-evidence.test.mjs tests/production/a3-y-quality-tooling.test.mjs` | 1 | FAIL | One transient release-readiness artifact test failed during a duplicate-argument run; direct artifact report passed and the canonical test command passed afterward. |
| `npm.cmd run test` | 0 | PASS | 604/604 frontend production tests passed. |
| `npm.cmd run test:server` | 0 | PASS | 114/114 backend tests passed. |
| `npm.cmd run lint` | 0 | PASS | 341 files scanned; 0 findings; 0 warnings. |
| `npm.cmd run lint:check` | 0 | PASS | 341 files scanned; 0 findings; 0 warnings. |
| `npm.cmd run readiness` | 0 | PASS | Credential-level readiness report generated; missing real-provider credentials remain expected and truthful. |
| `npm.cmd run build` | 0 | PASS | Vite production build passed. |
| `npm.cmd run bundle:report` | 0 | PASS | Bundle report generated under `artifacts/a3-y/`. |

## Build Output Summary

- CSS: `dist/assets/index-Dylnph42.css`, 18.07 kB, gzip 4.26 kB
- Main JS: `dist/assets/index-DPB-u038.js`, 222.24 kB, gzip 67.69 kB
- Warning: none reported by Vite after route-level lazy loading.

## Interpretation

The A3-Y evidence, quality, and performance-hardening batch passes the canonical frontend tests, backend tests, lint, readiness, bundle report, and build. Route-level lazy loading reduced the main JavaScript chunk below Vite's 500 kB warning threshold.

## Release Boundary

These test results do not satisfy A4-01, do not activate Supabase, and do not certify production readiness.
