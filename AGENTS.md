# RentasHub Repository Governance

## Canonical Product

The canonical product for this repository is RentasHub.

Tagline:

Rent. Buy. Sell. Trade.

Do not rename this repository or active application surfaces to VibeForge, PlannasHub, RentBroker Nexus, or another product.

## Repository Authority

This AGENTS.md governs the standalone RentasHub repository.

`docs/program-state.md` remains the authoritative stage-gate and release-status record.

Where this file and `docs/program-state.md` address different matters:

- AGENTS.md controls repository identity, engineering conduct, consolidation rules, and naming.
- `docs/program-state.md` controls release stages, infrastructure gates, certification, and production readiness.

Neither file may be used to bypass the other.

## Canonical Application

The existing RentasHub application is the sole canonical operational application.

The Google AI Studio RentasHub project is an engineering knowledge-base and feature-donor source only.

Do not create a second application, router, backend, authentication system, database, transaction engine, or parallel data store.

## Current Authorized Stage

The repository may continue non-production implementation, integration, documentation, testing, and technical-debt remediation while A4-01 remains open.

A4-01 and later production gates remain mandatory before production activation or certification.

## AI Studio Consolidation Authority

The following AI Studio capabilities are authorized for selective native integration:

- role-aware AI Assistant;
- searchable RentasHub documentation;
- read-only workflow guides;
- truthful admin system-status dashboard.

The following are not authorized for operational import:

- AI Studio mock Express transaction engine;
- simulated escrow, payment, booking, or dispute services;
- duplicate authentication;
- duplicate routing;
- duplicate persistence;
- unapproved fee or commission assumptions;
- claims of live providers or production readiness.

## Truthfulness

Every feature must be labelled accurately as one of:

- Active
- Partial
- Simulated
- Specified Only
- Credential Required
- Infrastructure Required
- Deferred
- Not Certified

## Engineering Controls

Before each bounded batch:

1. Record the baseline.
2. Preserve existing functionality.
3. Reuse existing services and abstractions.
4. Add or update tests.
5. Run targeted tests.
6. Run full frontend tests.
7. Run full backend tests.
8. Run the production build.
9. Produce evidence.
10. Do not advance release gates without required evidence.
