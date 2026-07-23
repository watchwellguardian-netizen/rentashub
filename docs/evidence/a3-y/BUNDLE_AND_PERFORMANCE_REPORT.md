# A3-Y Bundle and Performance Report

## Current Measurement

The current production build completed successfully after route-level lazy loading. Vite no longer reports the large main chunk warning.

## Build Result

| Command | Result |
| --- | --- |
| `npm.cmd run build` | PASS |

## Current Bundle Summary

| Asset | Size | Gzip |
| --- | ---: | ---: |
| `dist/index.html` | 1.19 kB | 0.53 kB |
| `dist/assets/index-Dylnph42.css` | 18.07 kB | 4.26 kB |
| `dist/assets/index-DPB-u038.js` | 222.24 kB | 67.69 kB |

## Bundle Report Command Result

| Command | Result |
| --- | --- |
| `npm.cmd run bundle:report` | PASS |

Generated artifacts:

- `artifacts/a3-y/bundle-report.json`
- `artifacts/a3-y/bundle-report.md`

## Performance Result

The main JavaScript bundle is below Vite's 500 kB warning threshold. The bundle report also confirms the main JS file is not over 500 kB.

## Implemented Split Targets

- Route-level page modules in `src/App.jsx`
- Admin, dashboard, marketplace, auction, AI, readiness, and operational pages are loaded through `React.lazy`
- Existing router structure was preserved; no second router or parallel app was introduced

## Boundary

No Core Web Vitals compliance is claimed. Browser-based performance evidence has not been collected in this batch.
