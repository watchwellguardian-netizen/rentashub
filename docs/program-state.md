# RentasHub Program State

This file is the single source of truth for current RentasHub governance.

## Current State

Platform: RentasHub Marketplace

Current gate: A4-01 Infrastructure Ownership Confirmation

Current owner: Operations / DevOps

Last approved state: RC-0.6A

Current classification: RC-0.6A

Current state: Infrastructure Activation Hold

Production ready: No

Paid pilot ready: No

Public launch ready: No

## Authorized Work

Only the following work is authorized:

- A4-01 Infrastructure Ownership Confirmation
- A3-X - AI Studio Capability Consolidation, as a non-production integration stage on the backlog branch.
- A3-Y - Repository Consolidation, Technical Debt Elimination, Performance Hardening, and Core Rental Vertical-Slice Readiness, as a non-production engineering stage on the backlog branch.
- Accelerated Full-Feature Delivery Programme Phase 0, as a provider-independent implementation mobilization stage.
- ACCEL-P1-001 - Local PostgreSQL/Supabase Execution & Core Rental Infrastructure, as a non-production local-only execution-readiness stage on the backlog branch.
- ACCEL-P1-002 - Executable Local Database, RLS, Storage, and Core Rental Persistence validation, as a non-production local-only execution gate on the backlog branch.
- ACCEL-P1-003 - Provider-independent core rental backend contracts, pricing, availability, idempotency, lifecycle, and audit-event preparation on the backlog branch.

The next valid production-gate submission must be infrastructure ownership evidence, not secrets.

Non-production A3-X work may proceed in parallel only when it preserves A4 gates, avoids production claims, and follows repository governance in `AGENTS.md`.

Non-production A3-Y work may proceed in parallel only when it preserves A4 gates, avoids production claims, preserves existing worktree changes, avoids new marketplace feature breadth, and follows repository governance in `AGENTS.md`.

Accelerated delivery work may proceed in parallel with A4-01 only when it is provider-independent, preserves A4 gates, avoids production claims, uses shared canonical services/contracts, and does not activate live Supabase, payments, escrow, monitoring, legal, security-certification, or production deployment providers.

A4-01 remains mandatory but does not freeze provider-independent implementation work.

ACCEL-P1-001 work may proceed only against local/provider-independent execution paths. It may add local Supabase scaffolding, static migration parity checks, local command guards, and backend contracts. It must not run linked Supabase commands, touch production, load real credentials, or claim A4 evidence completion.

ACCEL-P1-002 work may proceed only against disposable local Supabase CLI or disposable local PostgreSQL execution environments. If Supabase CLI, Docker, or psql are unavailable, the batch must report BLOCKED rather than simulate PostgreSQL execution or claim RLS enforcement.

ACCEL-P1-003 work may proceed only as provider-independent core rental backend preparation. It may add local service contracts, request and response validation, booking pricing, availability checks, idempotency handling, lifecycle state guards, mocked/in-memory integration tests, and audit-event definitions. It must not claim PostgreSQL execution, RLS enforcement, live storage, live Supabase Auth, live payments, escrow activation, staging validation, or production readiness.

## Parallel Provider-Independent Implementation Stage

Stage identifier: Accelerated Full-Feature Delivery Programme Phase 0 - Mobilization and Shared Control Foundation

Classification: Non-production provider-independent implementation stage.

Relationship to A4-01:

- May proceed in parallel with A4-01.
- Does not satisfy A4-01.
- Does not authorize live provider activation.
- Does not authorize production claims.
- Does not change RC-0.6A certification status.

Scope:

- Accelerated delivery controls.
- Workstream ownership matrix.
- Feature flag registry and local feature flag service.
- Migration ledger.
- Shared contract registry.
- Feature completion ledger.
- Machine-readable delivery dashboard inputs.
- A4-01 evidence capture with unknowns clearly flagged.

Required exit criteria:

- A4-01 remains open unless a separate complete A4-01 evidence package passes.
- No secrets are committed, documented, printed, or logged.
- No duplicate app, router, backend, authentication system, database, or persistence layer is introduced.
- New tests pass.
- Existing tests remain passing for the affected batch.

## Parallel Non-Production Engineering Stage

Stage identifier: A3-X - AI Studio Capability Consolidation

Classification: Non-production integration stage.

Relationship to A4-01:

- May proceed in parallel with A4-01.
- Does not satisfy A4-01.
- Does not authorize infrastructure activation.
- Does not authorize production claims.
- Does not change RC-0.6A certification status.

Scope:

- AI Assistant.
- Documentation.
- Workflow Guides.
- Admin System Status.
- Test and evidence updates.

Required exit criteria:

- No duplicate application architecture.
- No mock transaction backend imported.
- All existing 703 baseline tests remain passing.
- New tests pass.
- Production build passes.
- Access controls verified.
- Statuses remain truthful.
- Evidence package complete.

## Parallel Non-Production Engineering Stage

Stage identifier: A3-Y - Repository Consolidation, Technical Debt Elimination, Performance Hardening, and Core Rental Vertical-Slice Readiness

Classification: Non-production engineering stage.

Relationship to A4-01:

- May proceed in parallel with A4-01.
- Does not satisfy A4-01.
- Does not authorize infrastructure activation.
- Does not authorize production claims.
- Does not change RC-0.6A certification status.

Scope:

- Repository and worktree preservation evidence.
- Baseline reconciliation.
- Canonical implementation reality matrix.
- Duplication and technical-debt audit.
- Quality tooling verification or implementation.
- Route-level performance and bundle hardening.
- Core rental vertical-slice readiness using non-credential-dependent paths only.
- LocalStorage reduction and migration register.
- Security and truthfulness hardening.
- Test and evidence updates.

Required exit criteria:

- A4-01 remains open unless a separate A4-01 evidence package passes.
- Existing A3-X behavior remains preserved.
- No second application, router, backend, authentication system, database, or persistence layer is introduced.
- No real Supabase, payment, escrow, monitoring, legal, or production provider activation occurs.
- Existing tests remain passing and new tests pass.
- Production build passes.
- Readiness remains truthful about credential and infrastructure blockers.
- Evidence package complete.

## Blocked Work

The following remain blocked until A4-05 Infrastructure Review passes:

- B3 Monitoring Production Activation
- C2 Security Operationalization
- D2 Compliance Operationalization
- E2 Revenue Sandbox Activation
- Closed Beta
- Paid Pilot
- Production Certification
- New marketplace modules
- New auction modules
- New AI modules
- New dashboards
- Mobile apps
- Government integrations
- Customs integrations
- Court integrations

## A4 Gate Sequence

- A4-01 Infrastructure Ownership Confirmation.
- A4-02 Environment Provisioning Verification.
- A4-03 Migration Execution.
- A4-04 Infrastructure Certification.
- A4-05 Infrastructure Review.

## A4-01 Evidence Requirements

The A4-01 Infrastructure Ownership Confirmation package must include:

- Supabase account exists.
- Supabase organization exists.
- Account owner identified.
- Billing owner identified.
- Access owner identified.
- Development Project Name.
- Development Project ID.
- UAT/Staging Project Name.
- UAT/Staging Project ID.
- Production Project Name.
- Production Project ID.

Do not include Supabase keys, database passwords, JWT secrets, service role keys, screenshots containing secrets, or any credential material in chat, documentation, source code, ZIP artifacts, or commits.

## Later A4 Evidence Requirements

After A4-01 passes, the remaining A4 evidence package must include:

- Environment Evidence
- Migration Evidence
- Persistence Evidence
- RLS/RBAC Evidence
- Real Supabase Auth Evidence
- Storage Evidence
- Backup/Restore Evidence
- Secrets Exposure Certification

## A4-01 Pass Criteria

A4-01 passes only if evidence proves:

- Development Supabase project exists.
- UAT/Staging Supabase project exists.
- Production Supabase project exists.
- Development, UAT/Staging, and Production project names and IDs are provided.
- Account owner, billing owner, and access owner are identified.
- No secrets are exposed.

## Full A4 Pass Criteria

A4-05 passes only if evidence proves:

- Development Supabase project exists and is accessible.
- UAT/Staging Supabase project exists and is accessible.
- Production Supabase project exists and is isolated.
- Development and UAT use separate Supabase project IDs, databases, storage buckets, and auth configurations.
- Migrations `004`, `005`, `006`, and `007` succeed in Development and UAT.
- Production migrations remain untouched until UAT signoff.
- Real records validate create, read, update, delete, soft delete where supported, and restore where supported.
- Tenant isolation, role isolation, admin access, cross-tenant denial, and cross-role denial are verified.
- Real Supabase Auth validates registration, login, logout, password reset, email verification, session refresh, and session revocation.
- Required storage buckets exist and validate upload, download, signed URL generation, and unauthorized-access denial.
- Backup is created, restore is executed, and restored data integrity is verified.
- `SUPABASE_SERVICE_ROLE_KEY` is absent from source control, frontend bundles, ZIP artifacts, documentation, and logs.

## Decision Outcomes

PASS:

- If A4-01 passes, authorize A4-02 Environment Provisioning Verification.
- If A4-05 passes, move to RC-0.6B - Infrastructure Certified and authorize B3 Monitoring Production Activation.

FAIL:

- Remain at RC-0.6A.
- Authorize only remediation of failed infrastructure ownership, provisioning, migration, or certification items.

## Response Protocol

Before performing any task:

1. Read this file.
2. Work only within the authorized scope.
3. Do not propose roadmap changes unless this file is changed by explicit user instruction.
4. Do not repeat governance state unless it changed.

For gate reviews, respond only with:

- STATUS: PASS or FAIL
- FILES CHANGED
- TEST RESULTS
- EVIDENCE GENERATED
- DEFECTS
- NEXT AUTHORIZED GATE

For state checks:

- Reply `UNCHANGED` if this file still controls the program and no evidence package was submitted.
- Explain changes only if this file has changed or the submitted evidence changes the gate outcome.

## Review Suppression Rule

Do not request or submit a governance review when all of the following are true:

- `STATUS = UNCHANGED`.
- `FILES CHANGED = None`.
- `TEST RESULTS = Not run`.
- No new evidence was generated.

In those cases, governance is assumed unchanged and no review is required.

Submit a review only when one or more of the following exists:

- New gate evidence.
- New code.
- New documentation.
- New test results.
- New commit.
- New defect.
- A gate submission is being made.

## Current Next Input

Next expected submission: A4-01 Infrastructure Ownership Confirmation Submitted

The next meaningful submission should begin with:

`A4-01 Infrastructure Ownership Confirmation Submitted`
