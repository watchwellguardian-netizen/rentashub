# A3-Y Core Rental Vertical-Slice Plan

## Objective

Plan one complete rental journey through canonical services and backend-ready adapters without activating Supabase, payments, escrow, or storage providers.

## Boundary

A4-01 remains open. Real Supabase activation, live authentication, live storage, live provider payments, and production certification are not authorized in A3-Y.

## Target Journey Classification

| Step | Frontend page/service | Backend/API target | Current persistence mode | Target A3-Y mode | localStorage dependency | Blocker | Completion definition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| User registration | `Login.jsx`, auth adapter | `server/src/routes/authRoutes.js` | Local/server scaffold | API adapter, local/dev mode explicit | Possible local session | Real Supabase Auth for production | UI uses one auth adapter and reports mode |
| User authentication | Auth context/session | Auth routes/services | Local/session scaffold | API adapter, local/dev mode explicit | Local session risk | Real Supabase Auth | No hidden fallback; dev mode visible |
| Supplier profile creation | Supplier dashboard/profile services | Supplier profile repository/API target | Local repository | Canonical supplier adapter | Likely local | Backend endpoint parity | Supplier profile writes through adapter |
| Listing creation | Listing/create asset pages, `assetAdapter` | Asset repository/API target | Local repository | Canonical listing adapter | Likely local | Storage activation for real media | Listing CRUD uses one adapter |
| Listing image metadata/upload | Listing media UI, file service | File routes/storage provider | Placeholder/storage-ready | Metadata only until storage active | Possible local placeholder | Supabase Storage A4 | Metadata path is explicit; upload blocked truthfully |
| Search/discovery | `MarketplaceSearch.jsx`, asset listing service | Asset/listing API target | Local data | Canonical listing source | Likely local | Backend parity | Search reads same listing source as create |
| Booking request | `BookingRequest.jsx`, booking adapter | Booking repository/API target | Local repository | Canonical booking adapter | Likely local | Backend parity | Request writes through one adapter |
| Supplier acceptance/rejection | Booking/detail dashboards | Booking repository/API target | Local state | Canonical booking adapter | Likely local | Backend parity | Valid status transitions tested |
| Messaging | `MessagesPage.jsx`, message adapter | Message notification routes | Local + backend scaffold | Adapter path; fallback documented if API incomplete | Likely local | API parity | Rental thread uses canonical adapter |
| Check-in inspection | Inspection form/service | Inspection/API target | Local | Canonical inspection adapter | Likely local | Storage for photos | Metadata/checklist state through adapter |
| Check-out inspection | Inspection form/service | Inspection/API target | Local | Canonical inspection adapter | Likely local | Storage for photos | Valid rental state required |
| Completion | Booking service/status | Booking repository/API target | Local | Canonical booking adapter | Likely local | Backend parity | Completed state drives review eligibility |
| Review | Review form/service/adapter | Review API routes | Local + backend scaffold | Canonical review adapter | Likely local | Backend parity | Review allowed only for completed booking |
| Audit trail | Audit services/server audit middleware | Audit routes/repository | Server/local scaffold | Audit event call where state changes occur | No local-only audit for production | Audit persistence A4 | Meaningful state transitions create audit events |

## Implementation Order

1. Verify current adapters and repositories.
2. Identify the single UI entry point for listings, bookings, messages, inspections, and reviews.
3. Add explicit adapter mode reporting where missing.
4. Route create/read/update operations through canonical adapters where behavior can be preserved.
5. Preserve local fallback until backend parity is proven.
6. Add tests for adapter mode, status transitions, authorization denial, duplicate submissions, and review eligibility.

## Stop Conditions

Stop for owner decision if two backend paths are functionally complete and conflict on canonical ownership, or if migration would overwrite existing uncommitted A3-X/readiness work.
