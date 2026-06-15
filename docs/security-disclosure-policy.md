# Security Disclosure Policy

Status: R3-05 operational governance draft. This policy does not activate a live vulnerability disclosure program, bug bounty, penetration test, or production security certification.

## Purpose

Define how RentasHub should receive, triage, remediate, coordinate, and disclose security vulnerability reports from internal testers, external researchers, partners, customers, suppliers, and future security vendors.

## Responsible Disclosure Principles

RentasHub should encourage good-faith vulnerability reporting while protecting users, platform integrity, and sensitive data.

Principles:

- Report vulnerabilities promptly through approved channels.
- Do not exploit vulnerabilities beyond what is necessary to prove impact.
- Do not access, modify, delete, download, or disclose data that does not belong to the reporter.
- Do not interrupt RentasHub services, degrade availability, or perform denial-of-service testing.
- Do not use social engineering, phishing, physical attacks, extortion, or threats.
- Give RentasHub reasonable time to investigate and remediate before public disclosure.
- Preserve evidence safely without sharing secrets, private user data, payment data, or protected documents.

## Vulnerability Reporting Process

1. Reporter submits vulnerability through an approved reporting channel.
2. Security owner acknowledges receipt.
3. Security owner assigns tracking ID and severity.
4. Triage determines scope, impact, affected systems, and urgency.
5. Engineering/security owner validates the report in a safe environment where possible.
6. Remediation owner is assigned.
7. Fix is developed, reviewed, tested, and released through approved change management.
8. Reporter is notified of status.
9. Public advisory is prepared if user, partner, regulatory, or ecosystem impact requires it.
10. Post-remediation review records lessons learned and prevention measures.

## Accepted Reporting Channels

Approved future channels:

- Security contact mailbox, once created.
- Private vulnerability intake form, once created.
- Approved support channel routed to the security owner.
- Direct security vendor or penetration-test engagement channel.

Not approved:

- Public social media posts containing exploit details.
- Chat messages containing secrets, tokens, private user data, or exploit payloads.
- Shared documents containing live credentials.
- Screenshots that expose service role keys, JWTs, database URLs, private files, or personal data.

Until a live security mailbox exists, reports should be routed internally to the assigned Security Owner through the approved operations channel.

## Scope Definition

### In Scope After Authorization

- RentasHub web frontend.
- RentasHub backend/API.
- Authentication and RBAC controls.
- Supabase integration after activation.
- Storage access controls after activation.
- Admin workflows.
- Marketplace data isolation.
- Claims, disputes, protection, payments, and escrow simulation/provider-ready workflows.
- CI/CD and repository configuration after remote setup.

### Out of Scope Unless Explicitly Authorized

- Denial-of-service or stress testing.
- Social engineering.
- Physical attacks.
- Third-party provider systems not owned by RentasHub.
- Attempts to access real user data.
- Payment processor, bank, escrow, KYC, government, court, or customs systems unless a formal testing agreement exists.
- Automated high-volume scanning against production.

## Severity Classification

| Severity | Description | Examples |
| --- | --- | --- |
| Critical | Direct compromise of sensitive data, privileged access, cross-tenant exposure, credential leakage, or financial integrity. | Service role key exposure, admin bypass, cross-tenant record access, payment/escrow ledger tampering. |
| High | Significant unauthorized access, auth/RBAC weakness, private file exposure, or serious workflow abuse. | Supplier accesses another supplier's records, private claim evidence accessible publicly, account takeover path. |
| Medium | Security weakness with limited exploitability or constrained impact. | Missing security header, rate-limit gap, non-sensitive information disclosure. |
| Low | Defense-in-depth issue, low-impact configuration issue, or informational finding. | Minor clickjacking exposure on non-sensitive route, verbose non-secret error detail. |

## Response SLAs

| Severity | Acknowledge | Initial triage | Remediation target |
| --- | --- | --- | --- |
| Critical | 1 business day, immediate where monitored. | 1 business day. | 7 calendar days or emergency mitigation. |
| High | 2 business days. | 3 business days. | 30 calendar days. |
| Medium | 5 business days. | 10 business days. | 60 calendar days. |
| Low | 10 business days. | 20 business days. | 90 calendar days or planned backlog. |

SLA targets begin after the report reaches an approved intake channel. Targets may change after legal, regulatory, provider, or incident review.

## Remediation Targets

Remediation may include:

- Code fix.
- Configuration change.
- Secret rotation.
- Session revocation.
- Access policy update.
- RLS/RBAC policy change.
- Monitoring or alert update.
- Documentation and support process update.
- Provider escalation.
- Temporary mitigation while permanent fix is prepared.

Critical and high findings require verification evidence before closure.

## Coordinated Disclosure Process

Coordinated disclosure should be used when a vulnerability affects users, partners, public systems, providers, or third-party ecosystems.

Process:

1. Confirm vulnerability and severity.
2. Identify affected versions, systems, data classes, and users.
3. Prepare remediation or mitigation.
4. Coordinate with affected providers or partners where applicable.
5. Agree on disclosure timing with reporter where possible.
6. Publish advisory only after mitigation is available or risk requires urgent notification.
7. Credit reporter if authorized and safe.

## Public Advisory Process

Public advisories may be required for:

- Confirmed user data exposure.
- Credential or key exposure.
- Cross-tenant access.
- Payment/escrow integrity risk.
- Legal or regulatory reporting requirement.
- High-impact vulnerability already publicly known.

Advisory should include:

- Summary.
- Affected systems.
- Severity.
- Impact.
- Mitigation/remediation status.
- Required user action, if any.
- Timeline.
- Contact channel.

Do not publish exploit details that materially increase risk before mitigation is broadly available.

## Legal Safe Harbor Language

RentasHub should not pursue legal action against good-faith reporters who:

- Follow this policy.
- Avoid privacy violations.
- Avoid service disruption.
- Avoid data destruction or exfiltration.
- Report findings promptly.
- Do not publicly disclose before coordinated disclosure is complete.

Safe harbor does not apply to:

- Extortion or threats.
- Social engineering.
- Physical attacks.
- Malware.
- Persistence mechanisms.
- Unauthorized access to third-party systems.
- Downloading, modifying, or disclosing data beyond proof of concept.
- Violating applicable law.

Final legal safe harbor language must be reviewed by legal counsel before public publication.

## Security Contact Procedures

Required future setup:

- Create a dedicated security contact address.
- Route reports to Security Owner and backup owner.
- Maintain private intake records.
- Define escalation path for SEV-1 and SEV-2.
- Define after-hours process before public launch.
- Publish security contact in `SECURITY.md` after approval.

Interim process:

- Route security findings through the internal operations owner.
- Do not paste secrets or sensitive data into chat.
- Store evidence only in approved restricted-access locations.

## Evidence Collection Requirements

Security report evidence should include:

- Reporter contact, if provided.
- Date/time received.
- Affected environment.
- Affected route, API, workflow, or provider.
- Reproduction steps.
- Expected vs actual security behavior.
- Impact assessment.
- Screenshots or logs with secrets redacted.
- Affected commit, release candidate, or version.
- Triage owner.
- Remediation owner.
- Closure evidence.

Evidence must not include:

- Live secrets.
- Raw access tokens.
- Service role keys.
- Database passwords or URLs.
- Private user files.
- Unredacted personal data.
- Payment card or bank data.

## Internal Escalation

| Severity | Required escalation |
| --- | --- |
| Critical | Incident Commander, Security Owner, DevOps, Engineering Lead, Executive Sponsor, Legal/Compliance where data or regulatory impact exists. |
| High | Security Owner, Engineering Lead, DevOps, Product/Operations owner. |
| Medium | Security Owner and relevant technical owner. |
| Low | Security backlog owner. |

## Closure Criteria

A vulnerability report can be closed only after:

- Severity is assigned.
- Impact is documented.
- Remediation or accepted-risk decision is recorded.
- Verification evidence is captured.
- Reporter is updated where possible.
- Follow-up controls are assigned if needed.

Critical and high findings require a post-remediation review.

## Certification Note

This policy improves disclosure readiness only. It does not create a public bug bounty, authorize live testing, complete penetration testing, or certify RentasHub as production ready.
