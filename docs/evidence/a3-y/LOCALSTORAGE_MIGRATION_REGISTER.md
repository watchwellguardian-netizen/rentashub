# A3-Y LocalStorage Migration Register

## Purpose

This register starts the A3-Y localStorage reduction track. A later implementation batch must populate exact key names from code-level scans and tests before changing persistence behavior.

## Policy

- No new business-critical localStorage key may be introduced in A3-Y.
- Sensitive data must not be newly stored in localStorage.
- Local fallback may remain only when visible, deterministic, and covered by tests.
- Production-critical transactional records must migrate to backend persistence before production certification.

## Initial Register

| Area | Likely owner | Data classification | Current risk | Target backend repository/table | Migration priority | Planned retirement stage |
| --- | --- | --- | --- | --- | --- | --- |
| Auth/session role state | Auth context/session utilities | Sensitive/auth-adjacent | Frontend role state can be mistaken for backend authorization | Supabase Auth/session tables after A4 | P0 | A4 Auth certification |
| Listings/assets | Asset listing repository/services | Business transactional | Core listing records may remain local-only | Asset repository / listings tables | P0 | A3-Y/A4 depending endpoint parity |
| Bookings | Booking repository/services | Business transactional | Rental state may remain local-only | Booking repository / bookings tables | P0 | A3-Y/A4 depending endpoint parity |
| Messages | Messaging service/adapter | User communications | Conversations may be local-only | Message repository / message tables | P1 | A3-Y if API parity exists |
| Inspections | Inspection service/adapter | Operational evidence | Checklists/photos may be local-only | Inspection repository / storage metadata tables | P1 | A3-Y metadata; A4 storage for files |
| Reviews | Review service/adapter | Public/user content | Review eligibility may depend on local booking state | Review repository / reviews tables | P1 | A3-Y if API parity exists |
| Payments/wallet | Payment ledger/readiness services | Financial | Simulated data can be confused with real ledger | Payment ledger tables after provider activation | P0 | E2 revenue sandbox |
| Escrow | Escrow readiness/services | Financial/legal | Simulated escrow must not be production ledger | Escrow ledger tables after legal/provider activation | P0 | E2/Escrow activation |
| Admin/readiness status | Admin center/readiness tooling | Governance evidence | Local status may be mistaken as operational status | Audit/readiness evidence repository | P1 | A4/B3 later |

## Next Required Action

Run an exact code scan for `localStorage`, classify every key, and update this register before migrating any persistence behavior.
