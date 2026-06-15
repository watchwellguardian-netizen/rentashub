# RentasHub Server Scaffold

This server is a backend/API scaffold with a database-ready persistence foundation and Module 39 database-provider guardrails. It implements a real HTTP app shape and health route, route/controller/service/middleware skeletons that match the frontend API blueprint, API-pilot endpoints for selected domains, and repository contracts backed by local development persistence.

It does not implement production authentication, real payments, real KYC, real insurance, escrow, deployment, or production security controls. The frontend still defaults to local/demo workflows, with selected domains using controlled API pilots only when explicitly enabled.

## Commands

```bash
npm run test
npm run db:migrate
npm run db:seed
npm run db:reset
npm run dev
```

The server uses dependency-free Node.js HTTP primitives for this scaffold so tests can run in limited environments. Express or Fastify can replace the small router later without changing the route contract.

## Implemented Module 22 Endpoints

The following endpoints are connected to the Module 21 repository/persistence layer:

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
POST   /api/auth/request-password-reset
POST   /api/auth/reset-password
POST   /api/files/upload-intent
POST   /api/files/metadata
GET    /api/files
GET    /api/files/:id
PATCH  /api/files/:id
DELETE /api/files/:id
GET    /api/assets
GET    /api/assets/:id
POST   /api/assets
PATCH  /api/assets/:id
DELETE /api/assets/:id
GET    /api/bookings
GET    /api/bookings/:id
POST   /api/bookings
PATCH  /api/bookings/:id
```

Asset and booking write operations require either a valid development-safe bearer token or simulated development headers such as:

```text
x-user-role: supplier
x-user-id: supplier-demo
```

This is only a development-safe RBAC skeleton and is not real authentication. Create, update, and soft-delete operations write audit log rows through the repository layer.

Auth endpoints use salted password hashing, expiring signed development tokens, and local session persistence. See `server/docs/auth-security.md`.

File endpoints store metadata only and return provider-ready upload intent details. No binary content, real object storage, virus scanning, signed URLs, or encryption workflow is implemented. See `server/docs/file-storage-security.md` and `server/docs/object-storage-readiness.md`.

All remaining API groups are still scaffold-only contract endpoints until future modules connect them to services and repositories.

## Database Setup

Module 21 adds SQL migrations under `server/migrations/`, seed data under `server/seeds/`, database helpers under `server/src/db/`, and repository interfaces under `server/src/repositories/`.

Local development uses a dependency-free JSON-backed adapter at `server/.data/rentashub-dev-db.json` by default because this environment cannot install a SQLite or PostgreSQL driver. Provider selection supports `DATABASE_PROVIDER=json|sqlite|postgres`. SQLite and PostgreSQL adapter paths are present, but explicit SQLite/PostgreSQL selection fails safely until reviewed drivers/configuration are added. No silent fallback to JSON is used when a real provider is explicitly selected. The migration SQL is written to stay close to PostgreSQL-compatible table shapes so a real SQLite/PostgreSQL adapter can replace the local adapter later.

Set a local path with:

```text
RENTASHUB_DB_PATH=server/.data/rentashub-dev-db.json
DATABASE_PROVIDER=json
DATABASE_URL=
```

SQLite local activation path:

```text
DATABASE_PROVIDER=sqlite
DATABASE_URL=<optional sqlite path/url used by the chosen driver>
```

PostgreSQL activation path:

```text
DATABASE_PROVIDER=postgres
DATABASE_URL=<managed PostgreSQL connection string>
```

`npm run db:reset` warns before destructive local reset. Non-JSON reset requires `RENTASHUB_CONFIRM_DB_RESET=YES` and must not be used against shared data without a backup and rollback plan.

## Table Overview

The initial schema includes users, roles, permissions, role permissions, asset categories, assets, bookings, inspections, payment ledger, message threads, messages, notifications, supplier profiles, verification records, reviews, disputes, marketplace offers, wanted requests, brokerage leads, trust scores, protection plans, protection selections, claims, audit logs, file metadata, and schema migrations.

## Repository Pattern

Repositories expose `create`, `findById`, `list`, `update`, and `softDelete` where appropriate. Specialized repositories currently exist for assets, bookings, and audit logs, while generic repositories cover the remaining table contracts.

## Security Considerations

- Do not store sensitive identity, KYC, or insurance documents directly in the database.
- File uploads should store metadata only; secure object storage must hold the actual files later.
- Payment card, bank, and escrow credentials must never be stored in this application database.
- KYC documents require encrypted storage, strict access controls, retention policies, and audit trails before real use.
- This persistence layer is not wired to production authentication or authorization yet.
