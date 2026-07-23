# Accelerated Delivery Control

Status: Active for provider-independent implementation only.

Release classification: RC-0.6A unchanged.

A4-01 status: Open.

Production readiness: Not certified.

## Operating Rules

- Shared foundation work comes before new feature breadth.
- Provider-independent implementation may continue while A4-01 ownership evidence is collected.
- Live Supabase, payment, escrow, monitoring, legal, security-certification, and production deployment activation remain blocked.
- Every incomplete or provider-dependent feature must be governed by the central feature flag registry.
- Screens alone do not complete a feature. Backend, API, data, permissions, audit, tests, and operational state are required where applicable.
- Documentation must support implementation and evidence. It must not substitute for implementation.

## Current Batch

Batch ID: `ACCEL-P0-001`

Workstream: Core platform foundation.

Purpose:

- Establish programme controls.
- Register workstream boundaries.
- Register feature flags.
- Register migrations and shared contracts.
- Capture A4-01 known and unknown ownership evidence.
- Add a generated dashboard path.

## Stop Conditions

- A Severity 1 defect is found.
- Credentials or production access are required.
- Legal interpretation is required.
- A change would bypass A4 gates.
- A change would create a duplicate app, router, auth system, database, or persistence layer.
