# Implementation Reuse Plan

## Architecture Snapshot

- Frontend framework: React 18 with Vite.
- Router: single `react-router-dom` `Routes` tree in `src/App.jsx`.
- Shell/navigation: `src/components/AppShell.jsx`.
- Authentication: `src/state/AuthContext.jsx` with local/API/Supabase-ready adapter modes.
- Frontend RBAC: `src/components/ProtectedRoute.jsx` and `src/lib/rbac.js`.
- Backend framework: local Node HTTP API in `server/src/main/app.js` and `server/src/main/router.js`.
- Server authorization: `server/src/middleware/auth.js`, `server/src/auth/authMiddleware.js`, and `server/src/auth/rbacPolicy.js`.
- Readiness/status source: `src/lib/credentialReadiness.js`, `src/lib/adminCenter.js`, `server/src/config/integrationReadiness.js`, and `docs/program-state.md`.
- Existing AI services: `src/lib/aiAssistant.js`, `src/lib/aiListingAssistantEngine.js`, and `src/lib/aiValuationEngine.js`.
- Existing pages overlapping requested scope: `src/pages/AiAssistant.jsx`, `src/pages/AdminCenter.jsx`, admin readiness panels, notification/document/analytics pages, and dashboard pages.

## Feature Reuse Plan

| Feature | Reuse | Route | Data source | Existing partial | Proposed files | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| Role-aware AI Assistant | `AuthContext`, AI shell/page patterns, existing AI helper copy | `/ai-assistant` | Shared consolidation content and existing role model | `/ai` and role-specific AI pages exist | `src/lib/aiStudioConsolidation.js`, `src/pages/AiStudioConsolidationPages.jsx`, `src/App.jsx`, `src/components/AppShell.jsx` | Route, role copy, credential-required state, no live claims |
| Searchable Documentation | Existing page/card styles and status-badge pattern | `/documentation` | Structured native documentation subjects derived from approved consolidation scope | Readiness docs exist, no single searchable app page | Same shared lib/page file | Search/filter, subject coverage, status labels |
| Workflow Guides | Existing read-only panel/card patterns and workflow state language | `/workflows` | Structured workflow definitions | Many workflows exist as operational pages, no unified guide | Same shared lib/page file | Required workflows, no transaction creation language |
| Admin System Status | `ProtectedRoute`, admin shell conventions, readiness status language | `/admin/system-status` | Shared system status model and A4 truthfulness model | Admin dashboard has readiness sections | Same shared lib/page file plus app route/nav | Admin-only route, required categories, A4 open/blocked |

## Duplication Controls

- No AI Studio mock Express transaction engine will be imported.
- No new backend server will be created.
- No duplicate React router will be created.
- No duplicate auth system, database, persistence layer, payment service, escrow service, booking service, or dispute service will be created.
- New pages remain read-only except local search/filter UI state.
- A4-01 remains open until real Supabase Development, UAT/Staging, and Production project IDs are submitted.

## Stop Assessment

Implementation can proceed because the existing RentasHub architecture supports all four requested features through extension of the current React route tree and existing role/readiness models.
