# Beta Risk Register

Status: Operational Review

This register captures closed beta risks. It does not certify production readiness.

| Risk ID | Risk | Severity | Area | Business impact | Technical impact | Mitigation | Owner required | Beta blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BETA-001 | Real database not active | High | Infrastructure | Data durability and audit confidence are limited. | JSON fallback remains local/demo oriented. | Use beta with controlled data volume; activate PostgreSQL before paid pilot. | Infrastructure owner | No for closed beta, yes for paid pilot |
| BETA-002 | Real object storage not active | High | Storage | Asset and evidence uploads remain metadata/placeholder. | No binary upload or signed URL workflow. | Use controlled placeholder assets; activate Supabase Storage before broader beta. | Storage owner | Conditional |
| BETA-003 | Live payments not active | Critical | Payments | Revenue and paid transaction flows cannot be validated live. | Simulated ledger only. | Keep beta unpaid or sandbox-only; complete payment provider activation before paid pilot. | Payments owner | Yes for paid pilot |
| BETA-004 | Escrow not live | Critical | Escrow | Deposit protection cannot be legally offered. | Readiness-only escrow states. | Avoid live deposit language; complete legal/provider review before collecting funds. | Legal/escrow owner | Yes for paid pilot |
| BETA-005 | Supabase Auth not live | High | Authentication | Demo/local auth remains unsuitable for broad external users. | Production session model not active. | Limit beta accounts; migrate auth before expanding cohort. | Auth owner | Conditional |
| BETA-006 | Monitoring not live | High | Operations | Incidents may be detected late. | Readiness-only observability. | Configure Sentry/Better Stack before external cohort. | Monitoring owner | Conditional |
| BETA-007 | Security certification not complete | High | Security | Public launch risk remains high. | No pen test or formal certification. | Keep beta controlled; complete security certification before public launch. | Security owner | No for closed beta, yes for public launch |
| BETA-008 | Claims and disputes are simulated | Medium | Trust and safety | User expectations may exceed operational capability. | No legal arbitration, payout, or binding resolution. | Use manual escalation and clear disclaimers. | Dispute owner | Conditional |
| BETA-009 | Support ownership missing | High | Operations | Slow response could damage supplier/customer confidence. | No code impact. | Assign support and escalation owners before launch. | Support owner | Conditional |
| BETA-010 | Supplier quality variance | Medium | Marketplace | Poor listings reduce conversion. | No code impact. | Manually review supplier profiles and listings before admission. | Supplier onboarding owner | Conditional |

## Overall Risk Level

Risk level: Medium-High

Closed beta can proceed only with invite controls, manual operations, no live funds handling, and clear beta disclaimers.
