# Route and RBAC Matrix

| Route | Access | Purpose | Production claim |
| --- | --- | --- | --- |
| `/ai-assistant` | Customer, supplier, broker, admin | Role-aware AI guidance with deterministic documentation fallback. | No. External AI provider remains credential required. |
| `/documentation` | Public/read-only | Searchable RentasHub documentation subjects with status labels. | No. Documentation does not prove implementation. |
| `/workflows` | Public/read-only | Read-only workflow guides for rental, purchase, sale, trade, swap, brokerage, booking, inspection, review, and dispute. | No. Guides create no transactions. |
| `/admin/system-status` | Admin only | Truthful status categories including A4-01 open/blocked state. | No. RC-0.6A remains not certified. |

Existing `ProtectedRoute`, `AuthContext`, and AppShell navigation are reused. No second router, auth system, backend, database, or transaction engine was created.
