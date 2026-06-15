# Commercial Risk Register

Status: Commercial Readiness Review

This register captures risks that block or constrain revenue-generating pilot customers.

| Risk ID | Risk | Severity | Area | Commercial impact | Technical impact | Required fix | Credential required | Paid pilot blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| COMM-001 | No live payment provider | Critical | Payments | Cannot safely charge customers. | Payment flow remains simulated. | Activate and validate Stripe/WiPay/Lynk/NCB sandbox and webhooks. | Yes | Yes |
| COMM-002 | No escrow/legal deposit capability | Critical | Escrow | Cannot hold deposits or protect funds. | Escrow is readiness-only. | Complete legal/provider review and trust account or provider activation. | Yes | Yes |
| COMM-003 | JSON fallback active | Critical | Database | Revenue and audit records lack production durability. | No PostgreSQL driver/server active. | Activate Supabase PostgreSQL and migration/backup flow. | Yes | Yes |
| COMM-004 | Object storage not active | High | Storage | Evidence and verification files cannot support paid disputes. | Metadata only. | Activate Supabase Storage, private buckets, signed URLs, scanning policy. | Yes | Yes |
| COMM-005 | Frontend auth not fully production-live | High | Auth | Paid accounts need stronger identity/session control. | Local/demo remains default. | Activate Supabase Auth and production session handling. | Yes | Yes |
| COMM-006 | Monitoring not live | High | Monitoring | Payment-impacting failures may go unnoticed. | Readiness only. | Activate Sentry/Better Stack, alert routing, uptime checks. | Yes | Yes |
| COMM-007 | Security review incomplete | High | Security | Paid workflows increase exposure and liability. | No pen test or certification. | Complete security audit and paid-workflow threat review. | No | Yes |
| COMM-008 | Support SLA not staffed | Medium | Support | Paid users expect faster resolution. | No code impact. | Assign payment, dispute, support, and escalation owners. | No | Conditional |
| COMM-009 | Refund/chargeback operations missing | High | Revenue ops | Customer disputes can become unmanaged losses. | Refunds are placeholders. | Implement provider sandbox refund and chargeback handling. | Yes | Yes |
| COMM-010 | Supplier payout operations not live | High | Revenue ops | Suppliers cannot receive real funds. | Payouts are simulated. | Activate payout provider, settlement, reconciliation. | Yes | Yes |

## Commercial Risk Score

Commercial risk score: 78/100 High

The score is high because the core marketplace is mature, but revenue infrastructure is not activated. Paid pilot remains NO-GO until the critical blockers are closed.

## Recommended Sequence

1. Activate production auth.
2. Activate PostgreSQL.
3. Activate object storage.
4. Validate payment provider sandbox.
5. Complete escrow/legal review.
6. Activate monitoring and support SLA.
7. Complete security review for paid workflows.
8. Re-run paid pilot readiness review.
