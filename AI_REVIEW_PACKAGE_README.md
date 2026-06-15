# RentasHub AI Review Package

This package is a complete standalone copy of the RentasHub application for AI/code review.

## Included

- Frontend source
- Backend scaffold and API foundations
- Domain services and adapters
- Production/readiness documentation
- Operational simulation audit documentation
- AI review gap closeout, beta UAT plan, and performance/load test plan
- Frontend production tests
- Backend tests
- Build configuration
- Current `dist` production build output when available

## Excluded

- `node_modules`
- `.git`
- `server/.data`
- generated local database/runtime files
- temporary files
- real secrets or provider credentials

## Important Status

RentasHub is not production live.

Current approved release position:

- Demo: GO
- Investor Demo: GO
- Internal Testing: GO
- Supplier Pilot: GO
- Closed Beta: Conditional GO
- Paid Pilot: NO-GO
- Public Launch: NO-GO

Remaining blockers include live Supabase activation, live auth, live object storage, payment provider activation, escrow/legal approval, monitoring activation, and production security certification.

## Review Entry Points

- `README.md`
- `docs/operational-simulation-report.md`
- `docs/full-click-through-operational-audit.md`
- `docs/ai-review-gap-closeout.md`
- `docs/beta-uat-execution-plan.md`
- `docs/performance-load-test-plan.md`
- `docs/phase-3-production-activation-program.md`
- `docs/project-a-supabase-activation-intake.md`
- `docs/verification-log.md`
- `src/App.jsx`
- `src/lib/`
- `server/src/`
- `tests/production/`
- `server/tests/`

## Suggested Verification Commands

Use a normal Node/npm environment:

```bash
npm install
npm run test
npm run test:server
npm run readiness
npm run build
npm run zip:check
```

If dependencies are not installed, the package is still reviewable as source code and documentation.
