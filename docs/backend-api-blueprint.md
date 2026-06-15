# RentasHub Backend/API Blueprint

Module 18 prepares the frontend for a backend/API migration. It does not implement a backend server, production authentication, real payments, real insurance, or production deployment.

## Proposed Entities

- Users: customers, suppliers/vendors, brokers, admins, role aliases, account status, authentication identity.
- Supplier profiles: business profile, service areas, verification status, document metadata.
- Assets: rental/sale/trade/swap/brokerage listings, category fields, protection setting, owner supplier.
- Bookings: requests, approvals, payment status, protection selections, check-in/check-out state.
- Inspections: check-in and check-out condition records, meter readings, accessories, evidence metadata.
- Payment ledger: simulated transactions now; real payment/escrow records later.
- Messages: booking-linked threads and message records.
- Notifications: in-app notifications now; provider-backed notifications later.
- Reviews: asset, supplier, and customer reviews plus supplier responses.
- Disputes: future formal dispute records linked to inspections, claims, bookings, payments.
- Marketplace offers: purchase inquiries, cash offers, trade/swap proposals, broker requests.
- Wanted requests: asset acquisition and rental needs posted by customers.
- Brokerage leads: broker-assigned marketplace opportunities.
- Trust/risk: computed scores, risk flags, badges, audit inputs, admin risk queue.
- Protection plans: protection/coverage placeholders now; provider-backed plans later.
- Claims: simulated protection claims linked to bookings, inspections, disputes, and evidence metadata.
- Files/documents: asset photos, verification documents, inspection evidence, claim evidence.

## Proposed REST API Routes

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `GET /assets`
- `POST /assets`
- `GET /assets/:id`
- `PATCH /assets/:id`
- `GET /assets/:id/reviews`
- `GET /bookings`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id/status`
- `POST /bookings/:id/protection`
- `POST /bookings/:id/payment-intent`
- `GET /inspections/:id`
- `POST /bookings/:id/check-in`
- `POST /bookings/:id/check-out`
- `PATCH /inspections/:id/review`
- `GET /ledger`
- `GET /transactions/:id`
- `POST /payouts`
- `GET /messages/threads`
- `GET /messages/threads/:id`
- `POST /messages/threads/:id/messages`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /supplier-profiles/:supplierId`
- `PUT /supplier-profiles/:supplierId`
- `POST /supplier-profiles/:supplierId/verification`
- `PATCH /admin/verifications/:supplierId`
- `GET /reviews`
- `POST /reviews`
- `POST /reviews/:id/response`
- `PATCH /admin/reviews/:id`
- `GET /disputes`
- `POST /disputes`
- `GET /marketplace/offers`
- `POST /marketplace/offers`
- `GET /wanted`
- `POST /wanted`
- `GET /brokerage/leads`
- `PATCH /brokerage/leads/:id`
- `GET /trust/overview`
- `GET /trust/suppliers/:supplierId`
- `GET /trust/assets/:assetId`
- `GET /trust/customers/:customerId`
- `GET /admin/risk`
- `GET /protection/plans`
- `GET /protection/assets/:assetId`
- `GET /claims`
- `POST /claims`
- `GET /claims/:id`
- `PATCH /admin/claims/:id`
- `POST /files/presign`
- `POST /files/complete`

## Auth/RBAC Model

- Authentication should move first to a real auth service with HTTP-only session cookies or short-lived tokens.
- Roles remain: `customer`, `guest/user` aliases, `supplier/vendor` aliases, `broker`, `admin`.
- RBAC must protect routes, UI actions, service calls, repository calls, and database queries.
- Data access must be scoped by ownership:
  - Customers access their own bookings, payments, claims, reviews, wallet, notifications, and messages.
  - Suppliers access their own assets, supplier profile, asset bookings, earnings, claims, inspections, and messages.
  - Brokers access brokerage leads and assigned marketplace opportunities.
  - Admins access controlled admin views and audit logs.

## Proposed Database Tables

- `users`
- `auth_sessions`
- `user_roles`
- `supplier_profiles`
- `verification_documents`
- `assets`
- `asset_category_fields`
- `asset_photos`
- `bookings`
- `booking_protection_selections`
- `inspections`
- `inspection_evidence`
- `payment_ledger`
- `payouts`
- `message_threads`
- `messages`
- `notifications`
- `reviews`
- `review_responses`
- `disputes`
- `marketplace_offers`
- `wanted_requests`
- `brokerage_leads`
- `trust_scores`
- `risk_flags`
- `protection_plans`
- `claims`
- `claim_evidence`
- `files`
- `audit_events`

## File Storage Needs

- Asset listing photos.
- Supplier logo/profile photos.
- Verification documents.
- Inspection photos and videos.
- Claim evidence.
- Review attachments if added later.

Use object storage with private buckets, signed upload URLs, virus scanning, content-type validation, retention policies, and audit trails.

## Payment Provider Placeholder

The current payment ledger is simulated. Future integration should add provider customer IDs, payment intents, escrow/hold records, refunds, deposit holds/releases, payout accounts, webhook verification, idempotency keys, and ledger reconciliation.

## Notification Provider Placeholder

Current notifications are local/in-app only. Future providers may include email, SMS, push, or WhatsApp. Provider integrations must include templates, opt-in preferences, delivery logs, retries, and unsubscribe/compliance handling.

## Security Requirements

- Server-side RBAC and ownership checks on every endpoint.
- Input validation and output encoding.
- Rate limiting and abuse monitoring.
- Audit logging for admin, payment, verification, claims, and trust/risk actions.
- Secure secrets management.
- CSRF protection if cookie sessions are used.
- CORS allowlist.
- File upload scanning and signed URL expiry.
- Webhook signature verification.
- Database backups, migrations, and rollback plan.
- Monitoring, alerting, error reporting, and incident response plan.
