# Operational Simulation Critical Issue Register

| Issue ID | Critical Issue | Current State | Required End State | Owner Needed | Manual Intervention Required | Credential Required |
| --- | --- | --- | --- | --- | --- | --- |
| CRIT-SIM-001 | Durable source of truth | localStorage/JSON fallback | Supabase PostgreSQL active with migrations, backups, restore test, and API integration | Technical lead / infrastructure owner | Yes | Yes |
| CRIT-SIM-002 | Production authentication | Local/demo auth default | Supabase Auth live with email verification, password reset, session revocation, refresh rotation, and RBAC mapping | Security/auth owner | Yes | Yes |
| CRIT-SIM-003 | File evidence | Metadata only | Supabase Storage private/public buckets with signed URLs and virus scan process | Storage/security owner | Yes | Yes |
| CRIT-SIM-004 | Payments | Simulated ledger | Sandbox-validated and then live provider with webhooks, refunds, chargebacks, payouts, and reconciliation | Payments owner | Yes | Yes |
| CRIT-SIM-005 | Escrow/deposits | Readiness-only records | Legal escrow/trust account model, provider integration, release/refund/dispute controls | Legal/payment operations owner | Yes | Yes |
| CRIT-SIM-006 | Monitoring | Credential-ready only | Sentry/Better Stack live with alert routing, uptime checks, and incident ownership | Operations owner | Yes | Yes |
| CRIT-SIM-007 | Security certification | Readiness documents only | OWASP, dependency, secrets, RBAC, auth, storage, payment, escrow, monitoring, and penetration test completion | Security owner | Yes | No |

