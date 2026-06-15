# Production Launch Checklist

RentasHub must not be considered ready for production launch until every applicable item below is reviewed, evidenced, and approved.

## CI/CD

- [ ] CI clean install passed.
- [ ] Frontend tests passed.
- [ ] Backend tests passed.
- [ ] Readiness report reviewed.
- [ ] Production build passed.
- [ ] ZIP/artifact check passed.
- [ ] Manual deployment approval recorded.

## Infrastructure

- [ ] Database provider active.
- [ ] PostgreSQL or approved database service connected.
- [ ] Database migrations run against staging.
- [ ] Backup and restore tested.
- [ ] Object storage active.
- [ ] Private bucket policy configured.
- [ ] CDN/public media policy approved.

## Payments And Escrow

- [ ] Payment provider active if payments are live.
- [ ] Webhooks verified.
- [ ] Refund and chargeback process approved.
- [ ] Payout controls approved.
- [ ] Escrow provider active if escrow is live.
- [ ] Escrow legal/financial review completed.

## Auth And Security

- [ ] Auth secrets rotated.
- [ ] Session secrets rotated.
- [ ] App encryption key configured.
- [ ] CORS locked down.
- [ ] TLS active.
- [ ] Domain configured.
- [ ] Distributed rate limiting active.
- [ ] WAF or equivalent protection active.
- [ ] Dependency scan reviewed.
- [ ] Penetration testing completed.
- [ ] Production security review signed off.

## Operations

- [ ] Monitoring active.
- [ ] Alert owner assigned.
- [ ] Incident response owner assigned.
- [ ] Logging retention approved.
- [ ] Audit log review process active.
- [ ] Rollback process tested.

## Compliance And Policy

- [ ] Legal/KYC review completed.
- [ ] Insurance workflow reviewed.
- [ ] Data retention policy approved.
- [ ] Privacy policy reviewed.
- [ ] Terms and marketplace rules reviewed.
- [ ] Dispute and claims policy approved.

## Final Gate

- [ ] Product owner approval.
- [ ] Technical owner approval.
- [ ] Security owner approval.
- [ ] Operations owner approval.
