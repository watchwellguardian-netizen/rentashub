# Pull Request

## Summary

- What changed:
- Why it changed:
- Authorized gate or backlog item:
- Source branch:
- Target branch:
- Related ADR or decision record:

## Files Changed

- Frontend:
- Backend:
- Docs:
- Tests:
- CI/operations:

## Testing

- [ ] Frontend tests run.
- [ ] Backend tests run.
- [ ] Readiness CLI run.
- [ ] Production build run.
- [ ] Secret scan run.
- [ ] Artifact validation run.
- [ ] HTTP smoke tests run, if applicable.
- [ ] ZIP/artifact checks run, if applicable.
- [ ] Not run, reason:

## Security Impact

- [ ] No secrets, credentials, tokens, or real environment files added.
- [ ] No new public exposure of protected data.
- [ ] Auth/RBAC behavior unchanged or documented below.
- [ ] Security review required.

Notes:

## Database Impact

- [ ] No database changes.
- [ ] Migration added.
- [ ] Seed/reset behavior changed.
- [ ] Rollback reviewed.

Notes:

## Rollback Plan

- Rollback approach:
- Data rollback required: Yes / No
- Last known good commit/tag:
- Feature flag or config rollback available: Yes / No / N/A

## Release Evidence

- Release candidate tag:
- Evidence index updated: Yes / No / N/A
- Changelog updated: Yes / No / N/A
- Manual evidence required after merge:
- Current launch boundary preserved: Yes / No

## Screenshots

Attach screenshots or note why not applicable.

## Approval Checklist

- [ ] Scope matches authorized gate or backlog item.
- [ ] `main` / `release` protections respected.
- [ ] Production readiness is not falsely claimed.
- [ ] Live payments, escrow, auth, storage, monitoring, and provider integrations remain inactive unless explicitly authorized.
- [ ] No secrets, keys, tokens, passwords, or real provider credentials are included.
- [ ] Required owners from CODEOWNERS have reviewed or been identified.
- [ ] Documentation updated where required.
