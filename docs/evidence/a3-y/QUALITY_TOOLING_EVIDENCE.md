# A3-Y Quality Tooling Evidence

## Tooling Selected

A3-Y adds a dependency-free repository quality gate:

- Script: `scripts/a3-y-quality-tooling.mjs`
- Commands:
  - `npm run lint`
  - `npm run lint:check`
  - `npm run bundle:report`
  - `npm run build:report`

ESLint is not installed in the local dependency tree. No network dependency installation was performed in this batch. The current quality gate uses Node syntax checks for parseable JavaScript/MJS files plus static RentasHub policy checks.

## Lint Coverage

The lint command checks:

- Node syntax for `server/src`, `scripts`, `tests/production`, and `server/tests` JavaScript/MJS files.
- Merge conflict markers.
- Retired product branding in `src/`.
- Secret-like values outside controlled test fixtures.
- Production-readiness claim review warnings in `src/`.

## Lint Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd run lint` | PASS | 341 files scanned; 0 findings; 0 warnings |
| `npm.cmd run lint:check` | PASS | 341 files scanned; 0 findings; 0 warnings |

An initial lint run failed on false positives from the lint script's own regex and intentional test fixtures. The rules were narrowed to line-start conflict markers and source/docs secret-like values while preserving test fixture coverage through existing dedicated secret-safety tests.

## Bundle Reporting

The bundle report command reads `dist/` after a production build and writes:

- `artifacts/a3-y/bundle-report.json`
- `artifacts/a3-y/bundle-report.md`

## Bundle Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd run bundle:report` | PASS | Total assets: 868.32 kB; main JS: 217.04 kB; main JS over 500 kB: no |

## Exclusions and Justification

- JSX syntax is validated by the production build rather than `node --check`, because Node does not parse JSX natively.
- Controlled test fixtures are excluded from the generic secret-like-value lint rule because they intentionally contain synthetic secret-shaped strings. Dedicated secret-safety tests remain responsible for validating scanner behavior.

## Open Quality Items

- ESLint remains a future optional upgrade when dependency installation is explicitly approved.
- Browser-based Core Web Vitals evidence remains a future verification item.
