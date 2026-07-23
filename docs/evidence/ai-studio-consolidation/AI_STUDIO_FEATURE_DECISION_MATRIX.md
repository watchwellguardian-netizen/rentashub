# AI Studio Feature Decision Matrix

| Capability | Decision | Reason | Implementation path |
| --- | --- | --- | --- |
| Role-aware AI Assistant | Approved | Fits existing RentasHub AI surfaces and does not require live provider activation. | Native `/ai-assistant` route using existing auth role context and deterministic documentation fallback. |
| Searchable documentation | Approved | Improves operator and UAT usability without adding backend risk. | Native `/documentation` route with structured content and implementation status labels. |
| Read-only workflow guides | Approved | Clarifies operational flows without creating fake transactions. | Native `/workflows` route with actors, stages, transitions, failure paths, permissions, and status labels. |
| Admin system status dashboard | Approved | Makes readiness status visible while preserving A4 truthfulness. | Native admin-only `/admin/system-status` route. |
| AI Studio mock Express transaction engine | Rejected | Would create duplicate backend and simulated business services. | Not imported. |
| Duplicate routing | Rejected | Existing `src/App.jsx` is the canonical router. | Existing router extended only. |
| Duplicate authentication | Rejected | Existing `AuthContext`, `ProtectedRoute`, and backend auth/RBAC remain canonical. | Reused current auth model. |
| Duplicate persistence | Rejected | Existing local/API/Supabase-ready persistence path remains canonical. | No new database or data store. |
| Live providers | Deferred | Requires credentials, legal/security review, and activation gates. | Remains blocked by A4 and downstream activation gates. |
