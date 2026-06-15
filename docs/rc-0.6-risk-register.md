# RC-0.6 Risk Register

| Risk ID | Risk | Severity | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| RC06-RISK-001 | Live infrastructure credentials are delayed | High | Medium | Closed beta slips | Assign Supabase technical administrator and secure secrets process | Technical Administrator |
| RC06-RISK-002 | Migration mismatch between JSON/local data and PostgreSQL | High | Medium | Data loss or broken UAT flows | Run staging migrations, seed validation, and rollback rehearsal | Backend Lead |
| RC06-RISK-003 | Auth/RBAC mismatch after Supabase activation | Critical | Medium | Unauthorized access or blocked users | Validate role mapping, RLS, route guards, and session revocation | Security Owner |
| RC06-RISK-004 | Private files become publicly accessible | Critical | Low | Privacy/compliance incident | Validate bucket policies, signed URLs, KYC/evidence access, and logs | Storage Owner |
| RC06-RISK-005 | Monitoring blind spots during beta | High | Medium | Incidents go undetected | Activate Sentry/Better Stack, alerts, heartbeat, and incident owner | Operations Lead |
| RC06-RISK-006 | Security findings block paid pilot | Critical | Medium | Paid pilot delay | Run OWASP/dependency/secrets/RBAC review early | Security Owner |
| RC06-RISK-007 | Compliance policies are not legally approved | Critical | Medium | Paid pilot/public launch blocked | Complete Jamaica DPA/GDPR/legal document review | Compliance Owner |
| RC06-RISK-008 | Payment provider onboarding takes longer than expected | High | Medium | Revenue activation delayed | Start Stripe/WiPay sandbox onboarding in parallel after infrastructure activation | Revenue Owner |
| RC06-RISK-009 | Escrow legal model is rejected or delayed | Critical | Medium | Deposit protection cannot launch | Get legal review before live payment activation | Legal Owner |
| RC06-RISK-010 | Tax/GCT treatment changes revenue model | High | Medium | Pricing/fees require revision | Validate tax/GCT before paid pilot pricing commitments | Finance Owner |

## Current Risk Posture

Overall risk: High for paid pilot and public launch, moderate for closed beta after live staging infrastructure and monitoring are activated.
