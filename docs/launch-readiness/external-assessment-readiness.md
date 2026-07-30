# S5-LRW-002 External Assessment Readiness

This package prepares external-review execution. It does not perform independent assessment.

## Independent Penetration Testing

| Field | Requirement |
| --- | --- |
| Scope | UAT/Staging RentasHub app, API, auth/RBAC, file upload, rental workflow, admin routes |
| Prerequisites | A4 evidence, UAT environment, test accounts, monitoring, backup/rollback plan |
| Test accounts | Customer, supplier, dealer/broker, admin, unauthorized user |
| Environment | UAT/Staging only unless production testing is separately approved |
| Owner | Security owner |
| Evidence required | Final report, findings register, remediation evidence, retest evidence |
| Acceptance criteria | Critical fixed; high fixed or formally accepted; no live secrets exposed |
| Remediation workflow | Use vulnerability-remediation register |
| Retest procedure | Retest all critical/high findings after fix |

## External Vulnerability Assessment

| Field | Requirement |
| --- | --- |
| Scope | Dependencies, workflows, web app, API, deployment configuration |
| Prerequisites | CI runtime evidence and scanner-safe environment |
| Test accounts | Not required unless scanner is authenticated |
| Environment | UAT/Staging |
| Owner | Security owner |
| Evidence required | Scanner report, triage decisions, remediation tracker |
| Acceptance criteria | No unresolved critical findings |
| Remediation workflow | Patch, retest, record acceptance |
| Retest procedure | Rerun scanner after remediation |

## Privacy Review

| Field | Requirement |
| --- | --- |
| Scope | Personal-data inventory, DSAR, consent, retention, KYC, telemetry privacy |
| Prerequisites | Privacy-readiness package and processor inventory |
| Test accounts | Privacy/DSAR test user |
| Environment | UAT/Staging |
| Owner | Privacy/legal owner |
| Evidence required | Legal/privacy review record |
| Acceptance criteria | Legal approval or documented remediation items |
| Remediation workflow | Update policies, controls, data workflows |
| Retest procedure | Re-review updated controls |

## Compliance Review

| Field | Requirement |
| --- | --- |
| Scope | Jamaica DPA, GDPR framework, marketplace compliance, KYC readiness |
| Prerequisites | Compliance evidence package and owner action register |
| Test accounts | Customer, supplier, admin |
| Environment | UAT/Staging |
| Owner | Compliance/legal owner |
| Evidence required | Compliance signoff and gap register |
| Acceptance criteria | No blocking legal/compliance gaps |
| Remediation workflow | Assign legal/control owners |
| Retest procedure | Re-review remediated evidence |

## Accessibility Review

| Field | Requirement |
| --- | --- |
| Scope | Browser journey evidence, keyboard navigation, accessible names, ARIA, responsive behavior |
| Prerequisites | Browser/accessibility runtime artifacts |
| Test accounts | Role-specific test accounts where needed |
| Environment | UAT/Staging or local CI artifact |
| Owner | Accessibility reviewer |
| Evidence required | Accessibility report and remediation decisions |
| Acceptance criteria | Critical blockers fixed before launch |
| Remediation workflow | Fix, rerun browser/accessibility workflow |
| Retest procedure | Rerun impacted journeys |

## Production Architecture Review

| Field | Requirement |
| --- | --- |
| Scope | Infrastructure, database, auth, storage, queues, observability, security, recovery, release controls |
| Prerequisites | Runtime evidence wave complete and A4 accepted |
| Test accounts | Not required |
| Environment | Architecture docs plus UAT evidence |
| Owner | Technical architecture reviewer |
| Evidence required | Architecture review decision and gap register |
| Acceptance criteria | No unresolved P0 launch blockers |
| Remediation workflow | Assign owner and evidence target |
| Retest procedure | Re-review changed architecture or controls |
