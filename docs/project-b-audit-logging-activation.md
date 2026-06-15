# Project B2 - Audit Logging Activation

Status: Provider-ready only.

Project B2 strengthens RentasHub audit logging for enterprise review. It does not activate a live SIEM, external log drain, compliance-certified immutable archive, legal hold system, or production audit certification.

## Enterprise Audit Event Model

Audit events are grouped into these categories:

- Auth: registration, login, logout, password reset, session revocation.
- RBAC: role assignment, permission changes, denied access, development-header lockdown.
- Marketplace: listings, auctions, admin marketplace actions.
- Operations: inspections, transport, financing referrals.
- Communications: messages, notifications, generated documents.
- Trust and safety: reviews, trust recalculation, claims, disputes.
- Payments: simulated payments, refund placeholders, payout placeholders, escrow readiness events.
- Storage: upload intents, metadata changes, signed URL attempts, access denial.
- Intelligence: AI listing and valuation recommendation audit.
- System: seed, readiness, monitoring test events.

## Immutable-Style Audit Records

New audit records include:

- `event_id`
- `action`
- `category`
- `severity`
- `actor_id`
- `actor_role`
- `entity_type`
- `entity_id`
- `request_id`
- `source`
- `metadata_json`
- `previous_hash`
- `immutable_hash`
- `retention_policy`
- `export_status`
- `created_at`

The hash fields are an immutable-style readiness control for tamper-evidence preparation. They do not represent a certified immutable ledger until a real database, archive, SIEM, and legal retention policy are activated and verified.

## Audit Coverage

Required audit coverage:

| Domain | Examples |
|---|---|
| Auth | login success/failure, logout, password reset, session revocation |
| RBAC | role changes, permission denial, admin access changes |
| Listings/Auctions/Admin | listing create/update/delete, auction approval/rejection, admin moderation |
| Inspection/Transport/Financing | inspection updates, transport requests, financing referrals |
| Notification/Document/AI | notification creation, document generation, AI recommendation acceptance |
| Trust/Safety | reviews, claims, disputes, trust recalculation |
| Payments/Escrow | simulated payment, refund placeholder, payout placeholder, escrow readiness |
| Storage | upload intents, file metadata, denied file access |

## Search And Export Readiness

Admin-only endpoints:

```text
GET /api/audit/readiness
GET /api/audit/events
GET /api/audit/export
```

Supported filters:

- `category`
- `action`
- `actorId`
- `entityType`
- `entityId`

Supported export modes:

- `json`
- `csv_placeholder`

Exports are local/repository-backed review artifacts only. No live SIEM, external log drain, legal archive, or regulator-facing export is triggered.

## Retention Policy Placeholders

Initial retention model:

| Policy | Days | Legal hold |
|---|---:|---|
| default | 365 | Yes |
| auth | 730 | Yes |
| rbac | 730 | Yes |
| payments | 2555 | Yes |
| trustSafety | 2555 | Yes |
| storage | 2555 | Yes |

Required live variables:

```text
SIEM_PROVIDER=
SIEM_LOG_DRAIN_URL=
AUDIT_RETENTION_POLICY_URL=
AUDIT_EXPORT_OWNER_EMAIL=
AUDIT_LEGAL_HOLD_ENABLED=false
```

## Security Rules

- Do not log secrets, API keys, tokens, cookies, service role keys, payment keys, DSNs, or database URLs.
- Audit search/export must remain admin-only.
- Audit records must include request IDs where available.
- Payment, escrow, storage, dispute, claim, RBAC, and auth events are high-sensitivity.
- Retention and legal hold policies require legal/security review before paid pilot.

## Activation Sequence

1. Confirm PostgreSQL persistence is active.
2. Run migration `007_audit_logging_activation.sql`.
3. Confirm existing mutation audit records still write.
4. Confirm `/api/audit/readiness` reports missing SIEM/retention/export credentials.
5. Confirm `/api/audit/events` searches by category/action/entity.
6. Confirm `/api/audit/export` produces local JSON/CSV placeholder output.
7. Select SIEM/log-drain provider.
8. Configure retention policy and export owner.
9. Run a staging audit export review.
10. Validate hash chain/tamper-evidence controls in staging.

## Rollback

If activation fails:

1. Disable external SIEM/log drain.
2. Keep local repository audit writes enabled.
3. Preserve audit log records.
4. Rotate any exposed log-drain credentials.
5. Rerun mutation, search, export, and redaction tests.

## Completion Criteria

Project B2 credential-ready completion:

- Enterprise audit event model exists.
- Immutable-style audit records are generated for new repository audit writes.
- Audit search/export readiness exists.
- Retention placeholders are documented and testable.
- Admin-only API access is enforced.
- Tests, build, smoke, and ZIP pass.

Live audit activation is complete only after:

- PostgreSQL persistence is live.
- SIEM/log drain is configured and tested.
- Retention/legal hold policies are approved.
- Audit exports are reviewed by authorized owners.
- Security review confirms no secrets appear in logs or audit exports.
