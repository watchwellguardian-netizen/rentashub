# Frontend API Adapter Layer

Module 23 adds a frontend adapter boundary without connecting the UI to the backend API yet.

## Goal

Current UI flows still call localStorage-backed domain services. The adapter layer prepares a safer migration path:

```text
UI
-> Adapter
-> Local repository now
-> API repository later
```

## Configuration

Use:

```text
VITE_DATA_MODE=local
```

Future API migration modules may use:

```text
VITE_DATA_MODE=api
```

API mode intentionally throws controlled not-implemented errors for now. This prevents accidental partial backend usage before authentication, API contracts, and domain-by-domain migration are ready.

## Adapter Files

- `src/lib/adapters/assetAdapter.js`
- `src/lib/adapters/bookingAdapter.js`
- `src/lib/adapters/inspectionAdapter.js`
- `src/lib/adapters/reviewAdapter.js`
- `src/lib/adapters/paymentAdapter.js`
- `src/lib/adapters/messageAdapter.js`
- `src/lib/adapters/notificationAdapter.js`
- `src/lib/adapters/supplierAdapter.js`
- `src/lib/adapters/marketplaceAdapter.js`
- `src/lib/adapters/trustAdapter.js`
- `src/lib/adapters/protectionAdapter.js`

## Current Status

- Local mode wraps existing localStorage repository services.
- Asset/listing UI flows are now adapter-mediated as of Module 27.
- Booking UI flows are now adapter-mediated as of Module 30.
- Inspection UI flows are now adapter-mediated as of Module 31.
- Message and notification UI flows are now adapter-mediated as of Module 32.
- Reviews, ratings, and reputation-facing review reads are now adapter-mediated as of Module 33.
- Trust scoring, trust summaries, trust ranking, badges, and risk queue reads are now adapter-mediated as of Module 34.
- Protection plans, booking protection selections, claims, and admin claim review reads/writes are now adapter-mediated as of Module 35.
- Disputes and admin dispute review reads/writes are now adapter-mediated as of Module 37.
- Payments, wallet, earnings, payouts, transactions, and refund placeholders are now adapter-mediated as of Module 38.
- API mode for assets, bookings, inspections, messages, notifications, reviews, trust, protection, claims, disputes, and payments is still a guarded pilot. Frontend backend auth is available in explicit API mode as of Module 36, and protected domain adapters now prefer stored bearer auth when an API token exists. Development role headers remain only as a local/demo fallback.
- Existing broader admin moderation domains remain on direct localStorage or guarded workflows until later approved modules migrate them one domain at a time.
- No real authentication, payment, KYC, insurance, escrow, file storage, or deployment integration is added by this module.

## Module 27 Asset Migration

The following asset-facing surfaces use `assetAdapter` for asset reads/writes:

- list asset
- edit asset
- my listings
- asset detail
- marketplace search
- category pages through marketplace search
- exchange marketplace listing views
- marketplace offer listing context
- booking request asset context
- review asset context
- protection asset context
- booking-linked message asset context
- AI rental advisor asset list

Local mode behavior is expected to match the previous localStorage service behavior. API mode must remain controlled until frontend auth and backend API migration are approved.

## Module 29 Asset API Mode Pilot

Module 29 makes only the asset adapter capable of calling the backend asset API when explicitly enabled.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Asset API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The asset adapter can call:

- `GET /api/assets`
- `GET /api/assets/:id`
- `POST /api/assets`
- `PATCH /api/assets/:id`
- `DELETE /api/assets/:id`

Only the asset domain uses this API pilot. Bookings, payments, inspections, messages, reviews, disputes, protection, claims, admin, and frontend login remain on their current guarded or local workflows.

### Running The Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/assets`, `/asset/:id`, `/list-asset`, and `/my-listings`.

Asset list and detail should read from the backend asset endpoints when the backend is running. Create, edit, and delete prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: supplier
x-user-id: <supplier user id>
```

These development headers are not production authentication. They exist only as a local/demo fallback when no frontend API token exists.

### Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, or a protected write is unauthorized, the asset adapter returns a controlled error for the UI to display.

## Module 30 Booking API Mode Pilot

Module 30 makes only the booking adapter capable of calling the backend booking API when explicitly enabled.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Booking API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The booking adapter can call:

- `GET /api/bookings`
- `GET /api/bookings/:id`
- `POST /api/bookings`
- `PATCH /api/bookings/:id`

Booking-related frontend surfaces now route through `bookingAdapter` where practical:

- `/bookings`
- `/asset/:id/book`
- `/assets/:id/book`
- `/booking/:id`
- `/booking/:id/manage`
- `/rental-requests`

Payments, inspections, messages, reviews, disputes, protection, claims, admin data, and frontend login remain on their current local or guarded workflows.

### Running The Booking Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/bookings`, `/asset/:id/book`, `/booking/:id`, `/booking/:id/manage`, and `/rental-requests`.

Booking list and detail should read from the backend booking endpoints when the backend is running. Create and status update requests prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: customer | supplier
x-user-id: <demo user id>
```

These development headers are not production authentication. They exist only as a local/demo fallback when no frontend API token exists.

### Booking Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a booking is missing, or a protected write is unauthorized, the booking adapter returns a controlled error for the UI to display.

## Module 31 Inspection API Mode Pilot

Module 31 makes only the inspection adapter capable of calling the backend inspection API when explicitly enabled. The inspection domain is now adapter-mediated for the digital check-in, check-out, inspection detail, supplier review, and booking detail inspection record surfaces.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Inspection API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The inspection adapter can call:

- `GET /api/inspections`
- `GET /api/inspections/:id`
- `POST /api/inspections`
- `PATCH /api/inspections/:id`

Inspection-related frontend surfaces now route through `inspectionAdapter` where practical:

- `/booking/:id/check-in`
- `/booking/:id/check-out`
- `/inspection/:id`
- `/inspection/:id/review`
- booking detail inspection record previews

Payments, messages, reviews, disputes, protection, claims, admin data, and frontend login remain on their current local or guarded workflows.

### Running The Inspection Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/booking/:id/check-in`, `/booking/:id/check-out`, `/inspection/:id`, `/inspection/:id/review`, and `/booking/:id`.

Inspection list and detail should read from the backend inspection endpoints when the backend is running. Check-in/check-out submissions and supplier inspection review requests prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: customer | supplier
x-user-id: <demo user id>
```

These development headers are not production authentication. They exist only as a local/demo fallback when no frontend API token exists.

### Inspection Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, an inspection is missing, or a protected write is unauthorized, the inspection adapter returns a controlled error for the UI to display.

## Module 32 Messages & Notifications API Mode Pilot

Module 32 makes only the message and notification adapters capable of calling backend communication APIs when explicitly enabled. The communication domain is now adapter-mediated for inboxes, booking-linked message threads, sending messages, notification center reads, mark-read actions, mark-all-read actions, and AppShell unread counts.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Messages and notifications API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The message adapter can call:

- `GET /api/messages`
- `GET /api/messages/:threadId`
- `POST /api/messages`
- `PATCH /api/messages/:messageId`

The notification adapter can call:

- `GET /api/notifications`
- `GET /api/notifications/:id`
- `POST /api/notifications`
- `PATCH /api/notifications/:id`

Communication-related frontend surfaces now route through adapters where practical:

- `/messages`
- `/messages/:threadId`
- `/booking/:id/messages`
- `/notifications`
- AppShell unread message and alert counts

Payments, reviews, disputes, protection, claims, admin data, and frontend login remain on their current local or guarded workflows.

### Running The Communication Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/messages`, `/messages/:threadId`, `/booking/:id/messages`, and `/notifications`.

Message and notification reads should use the backend communication endpoints when the backend is running. Send-message, mark-read, mark-all-read, thread creation, and notification creation requests prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: customer | supplier | broker | admin
x-user-id: <demo user id>
```

These development headers are not production authentication. They exist only as a local/demo fallback when no frontend API token exists.

### Communication Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a message thread or notification is missing, or a protected write is unauthorized, the relevant adapter returns a controlled error for the UI to display.

## Module 33 Reviews, Ratings & Reputation API Mode Pilot

Module 33 makes only the review adapter capable of calling backend review APIs when explicitly enabled. The review domain is now adapter-mediated for user-visible reviews, public asset reviews, public supplier reviews, customer review submission, supplier responses, asset rating summaries, and rating displays used by asset cards and asset detail.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Reviews API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The review adapter can call:

- `GET /api/reviews`
- `GET /api/reviews/:id`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`

Review-related frontend surfaces now route through `reviewAdapter` where practical:

- `/reviews`
- `/reviews/write/:bookingId`
- `/asset/:id/reviews`
- `/supplier/:supplierId/reviews`
- asset detail rating summary
- asset card rating summary

Admin review moderation remains on the existing local/admin-center workflow in this module. Payments, disputes, protection, claims, admin data beyond existing review moderation, and frontend login remain on their current local or guarded workflows.

### Running The Review Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/reviews`, `/reviews/write/:bookingId`, `/asset/:id/reviews`, `/supplier/:supplierId/reviews`, and asset detail/search pages that display rating summaries.

Public review reads can load published reviews. Customer review submission and supplier response requests prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: customer | supplier | admin
x-user-id: <demo user id>
```

These development headers are not production authentication. They exist only as a local/demo fallback when no frontend API token exists.

### Review Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a review is missing, a duplicate review is submitted, or a protected write is unauthorized, `reviewAdapter` returns a controlled error for the UI to display.

## Module 34 Trust Engine API Mode Pilot

Module 34 makes the trust adapter capable of calling backend trust APIs when explicitly enabled. The trust domain is now adapter-mediated for trust overview, supplier trust scores, customer trust scores, asset trust scores, risk queue, recalculation, asset card trust summaries, asset detail trust summaries, and marketplace trust sorting.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Trust API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The trust adapter can call:

- `GET /api/trust/supplier`
- `GET /api/trust/supplier/:supplierId`
- `GET /api/trust/customer`
- `GET /api/trust/customer/:customerId`
- `GET /api/trust/asset`
- `GET /api/trust/asset/:assetId`
- `GET /api/trust/risk-queue`
- `PATCH /api/trust/recalculate/:entityType/:entityId`

Trust-related frontend surfaces now route through `trustAdapter` where practical:

- `/trust`
- `/trust/supplier/:supplierId`
- `/trust/customer/:customerId`
- `/trust/asset/:assetId`
- `/admin/risk`
- asset card trust summaries
- asset detail trust summaries
- marketplace search trust sorting

Payments, disputes, broader admin moderation, and frontend login remain on their current local or guarded workflows.

### Running The Trust Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/trust`, `/trust/supplier/:supplierId`, `/trust/customer/:customerId`, `/trust/asset/:assetId`, `/admin/risk`, and marketplace search sorted by trust.

Trust score reads can load from the backend trust endpoints. Recalculation requests prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: admin
x-user-id: <demo admin id>
```

These development headers are not production authentication. They exist only as a local/demo fallback when no frontend API token exists.

### Trust Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a trust record is missing, or recalculation is unauthorized, `trustAdapter` returns a controlled error for the UI to display.

## Module 35 Protection & Claims API Mode Pilot

Module 35 makes the protection adapter capable of calling backend protection and claims APIs when explicitly enabled. The protection and claims domain is now adapter-mediated for protection plan reads, booking protection selection, claim submission, claim detail reads, customer/supplier claim lists, and admin claim status updates.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Protection and claims API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The protection adapter can call:

- `GET /api/protection`
- `GET /api/protection/plans`
- `GET /api/protection/plans/:id`
- `GET /api/protection/booking/:bookingId`
- `POST /api/protection/booking/:bookingId`
- `PATCH /api/protection/booking/:bookingId`
- `GET /api/claims`
- `GET /api/claims/:id`
- `POST /api/claims`
- `PATCH /api/claims/:id`
- `GET /api/admin/claims`
- `PATCH /api/admin/claims/:id`

Protection and claim frontend surfaces now route through `protectionAdapter` where practical:

- `/protection`
- `/protection/plans`
- `/protection/booking/:bookingId`
- `/protection/asset/:assetId`
- `/claims`
- `/claims/new/:bookingId`
- `/claim/:id`
- `/admin/claims`

Payments, disputes, broader admin moderation, and frontend login remain on their current local or guarded workflows.

### Running The Protection And Claims Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/protection`, `/protection/plans`, `/protection/booking/:bookingId`, `/claims`, `/claim/:id`, and `/admin/claims`.

Protection reads can load from backend protection endpoints. Booking protection selection, claim submission, and admin claim status updates prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: customer | supplier | admin
x-user-id: <demo user id>
```

These development headers are not production authentication and exist only as a local/demo fallback. Protection and claims remain simulated. No real insurance, underwriting, adjudication, payout, or escrow is active.

### Protection And Claims Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a protection plan or claim is missing, or a protected write is unauthorized, `protectionAdapter` returns a controlled error for the UI to display.

## Module 37 Disputes API Mode Pilot

Module 37 makes the dispute adapter capable of calling backend dispute APIs when explicitly enabled. The dispute domain is now adapter-mediated for participant dispute lists, dispute detail reads, dispute creation, booking detail dispute entry points, and admin dispute status updates.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Disputes API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The dispute adapter can call:

- `GET /api/disputes`
- `GET /api/disputes/:id`
- `POST /api/disputes`
- `PATCH /api/disputes/:id`
- `GET /api/admin/disputes`
- `PATCH /api/admin/disputes/:id`

Dispute frontend surfaces now route through `disputeAdapter` where practical:

- `/disputes`
- `/disputes/new/:bookingId`
- `/dispute/:id`
- `/admin/disputes`
- booking detail dispute action

Payments, broader admin moderation, real dispute adjudication, escrow, refunds, legal mediation, and frontend production auth hardening remain outside this module.

### Running The Disputes Pilot

1. Start the backend scaffold from the standalone app folder.
2. Set `VITE_API_BASE_URL` to the backend origin.
3. Set `VITE_DATA_MODE=api`.
4. Open `/disputes`, `/disputes/new/:bookingId`, `/dispute/:id`, and `/admin/disputes`.

Dispute reads and writes prefer stored bearer auth from frontend API auth mode. If no token exists, local/demo pilot fallback can use:

```text
x-user-role: customer | supplier | admin
x-user-id: <demo user id>
```

These development headers are not production authentication and exist only as a local/demo fallback. Dispute handling remains simulated. No legal mediation, arbitration, payout, refund, escrow, or binding resolution is active.

### Disputes Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a dispute is missing, or a protected write is unauthorized, `disputeAdapter` returns a controlled error for the UI to display.

## Module 38 Payments API Mode Pilot

Module 38 makes the payment adapter capable of calling backend payment APIs when explicitly enabled. The payment domain is now adapter-mediated for booking payment summary actions, customer payments, wallet summary, supplier earnings, payouts, transaction detail, and refund placeholders.

Default mode remains:

```text
VITE_DATA_MODE=local
```

Payments API pilot mode:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001
VITE_DATA_MODE=api
```

The payment adapter can call:

- `GET /api/payments`
- `GET /api/payments/:id`
- `POST /api/payments/intent`
- `POST /api/payments/simulate`
- `POST /api/payments/refund-placeholder`
- `GET /api/wallet`
- `GET /api/earnings`
- `GET /api/payouts`
- `POST /api/payouts/request`
- `GET /api/transactions/:id`

Payment frontend surfaces now route through `paymentAdapter` where practical:

- `/booking/:id/payment`
- `/payments`
- `/wallet`
- `/earnings`
- `/payouts`
- `/transaction/:id`

Provider architecture is prepared for Stripe, PayPal, WiPay, Lynk, bank transfer, and escrow-provider placeholders, but simulated mode remains the only executable payment behavior in this module.

### Payment Credential Gates

Real provider mode requires explicit configuration and later provider implementation:

```text
PAYMENT_PROVIDER=stripe|paypal|wipay|lynk|ncb|jn
PAYMENT_MODE=provider
PAYMENT_PUBLIC_KEY=<provider public key>
PAYMENT_SECRET_KEY=<provider secret key>
ESCROW_PROVIDER=stripe_connect|escrow_provider
ESCROW_API_KEY=<escrow key>
PLATFORM_FEE_PERCENTAGE=10
PAYOUT_MODE=simulated|provider
```

No real card fields, bank account storage, provider success, escrow release, refund, chargeback, payout, or bank transfer is active.

### Payments Pilot Error Handling

API mode does not silently fall back to localStorage. If the backend is unavailable, `VITE_API_BASE_URL` is missing, validation fails, a transaction is missing, provider credentials are missing, or a protected write is unauthorized, `paymentAdapter` returns a controlled error for the UI to display.
