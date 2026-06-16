# Release Candidate Evidence Index

Status: Template / readiness index. This file does not certify production readiness.

## Current Baseline

- Platform: RentasHub Marketplace
- Classification: RC-0.6A
- State: Infrastructure Activation Hold
- Critical path: A4-01 Infrastructure Ownership Confirmation

## Evidence Checklist

| Evidence Area | Required Artifact | Status | Location |
| --- | --- | --- | --- |
| Program state | Current governance source of truth | Present | `docs/program-state.md` |
| Tests | Frontend/production and backend results | Pending per release |  |
| Readiness | Readiness CLI output | Pending per release |  |
| Build | Production build result | Pending per release |  |
| Security | Secret scan and audit result | Pending per release |  |
| Packaging | Artifact validation and ZIP sanity | Pending per release |  |
| ADRs | Decision records for material choices | Present | `docs/adr/` |
| Changelog | Release candidate notes | Pending per release | `docs/changelog-template.md` |
| Infrastructure | A4 evidence package | Pending manual evidence |  |

## RC Evidence Log

| RC | Commit/Tag | Evidence Package | Decision | Notes |
| --- | --- | --- | --- | --- |
| RC-0.6A | Baseline | Build/package/smoke verified; infrastructure hold | Hold | Awaiting A4-01 evidence |

## Secret Safety Rule

Evidence packages must not include secrets, keys, service-role keys, database passwords, payment credentials, escrow credentials, customer private data, KYC documents, or screenshots containing sensitive values.
