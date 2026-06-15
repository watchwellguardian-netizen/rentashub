# Database Persistence Foundation

Module 39 keeps the backend on a real database activation path without pretending a production database is already active. Module 44 selects Supabase PostgreSQL as the production database target and adds Supabase-specific credential-readiness checks. JSON remains available only as a restricted-environment fallback, SQLite is the intended local driver path once a reviewed dependency is installed, and PostgreSQL remains the production target.

## Module 44 Supabase PostgreSQL Status

Selected provider: Supabase PostgreSQL.

Credential-ready changes:

- `DATABASE_PROVIDER=postgres` now targets Supabase PostgreSQL by default.
- `DATABASE_POSTGRES_VENDOR=supabase` documents the selected provider.
- `DATABASE_URL` is validated for PostgreSQL URL shape and placeholder values.
- Supabase mode requires a Supabase database or pooler host.
- `npm run db:check` reports the selected provider, activation target, missing credentials, and blocked connection state.
- `GET /api/health/database` reports database provider readiness.
- `db:migrate`, `db:seed`, and `db:reset` report `provider=postgres` before failing if credentials/driver are missing.
- No silent JSON fallback is used when PostgreSQL is explicitly selected.

Real activation still requires a valid Supabase connection string, a reviewed PostgreSQL driver, migrations against Supabase, backup/restore verification, and production cutover approval. See `server/docs/supabase-postgres-activation.md`.

## Module 39 Verification Status

The database-provider implementation, backend tests, frontend production tests, and readiness CLI were verified for the JSON fallback and guarded SQLite/PostgreSQL paths.

Verified:

- Backend tests passed with the JSON provider.
- Frontend production tests passed with the current local/default data mode.
- Readiness CLI reported the active database provider and remaining manual provider gates.
- Explicit SQLite/PostgreSQL provider selection is guarded and does not silently fall back to JSON.

Blocked in the current local environment:

- Production build could not be rerun because the sandboxed Vite build cannot read the standalone Vite config.
- The escalated build path was rejected by the local environment usage limiter.
- ZIP refresh remains pending until the build succeeds in CI or another working Node/npm environment.

Remaining database and infrastructure risks:

- SQLite/PostgreSQL drivers are not active.
- JSON fallback remains the active local persistence path.
- No real database server is connected.
- No object storage, real payment processor, escrow, deployment, or production security review is complete.

These are open production workstreams, not completed database activation tasks. The next verification pass must rerun `npm run build` and refresh `RentasHub-Standalone-Web-App.zip` in CI or a local environment that can access the Vite config.

## Provider Selection

Module 26 adds a provider boundary:

```text
DATABASE_PROVIDER=json
DATABASE_PROVIDER=sqlite
DATABASE_PROVIDER=postgres
DATABASE_POSTGRES_VENDOR=supabase
DATABASE_URL=
```

`json` remains the default because this environment cannot install or verify native database drivers. The backend routes database creation through `server/src/db/databaseProvider.js` and reports provider status through `GET /api/health/readiness`.

When `DATABASE_PROVIDER=sqlite` or `DATABASE_PROVIDER=postgres` is selected explicitly, the backend fails with a controlled error if the required driver or configuration is missing. It does not silently fall back to JSON.

## JSON Fallback

The current adapter stores development data in a local JSON file so tests can run without installing database drivers in restricted environments. The default path is:

```text
server/.data/rentashub-dev-db.json
```

Use `RENTASHUB_DB_PATH` to override the path. Tests use `:memory:`.

JSON is not a production database. It does not provide concurrency control, transactional integrity, query planning, connection pooling, replication, backups, or operational database security. It exists only as a development fallback.

## SQLite Local Development

`server/src/db/adapters/sqliteAdapter.js` reserves the SQLite provider path. A SQLite driver is not installed in this environment, so selecting `DATABASE_PROVIDER=sqlite` returns a controlled provider-unavailable error.

Step-by-step local setup once a reviewed SQLite driver is allowed:

1. Add the reviewed SQLite driver dependency in a proper Node/npm environment.
2. Set `DATABASE_PROVIDER=sqlite`.
3. Set `DATABASE_URL` only if the chosen driver uses a URL or path-style connection string.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Run backend tests and the full frontend production suite.
7. Confirm `GET /api/health/readiness` reports the SQLite provider as available before using it for review data.

Until those steps are completed and tested, SQLite is not active.

## PostgreSQL Target

`server/src/db/adapters/postgresAdapter.js` reserves the PostgreSQL provider path. Selecting `DATABASE_PROVIDER=postgres` without a configured driver and valid Supabase `DATABASE_URL` returns a controlled provider-not-configured error.

The migration SQL is intentionally close to PostgreSQL-compatible syntax. A later backend module should validate these migrations against PostgreSQL, add driver-backed repositories or query execution, and preserve the repository interfaces used by controllers.

Step-by-step Supabase PostgreSQL setup once infrastructure is available:

1. Provision a Supabase project with separate staging and production environments.
2. Install a reviewed PostgreSQL driver in CI and local development.
3. Set `DATABASE_PROVIDER=postgres`.
4. Set `DATABASE_POSTGRES_VENDOR=supabase`.
5. Set `DATABASE_URL` from the Supabase database secret store.
6. Run migrations against a disposable database first.
7. Run seeds only in development or staging.
8. Run repository, API, auth, files, payment, and readiness tests.
9. Confirm backups, restore testing, connection pooling, SSL/TLS requirements, and migration rollback procedure.
10. Only then point non-demo backend environments at PostgreSQL.

## Migration Commands

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
npm run db:check
```

The commands log the active provider. `db:reset` warns before destructive local reset. Non-JSON resets require:

```text
RENTASHUB_CONFIRM_DB_RESET=YES
```

Do not run reset against shared, staging, or production databases without a tested backup and rollback plan.

## PostgreSQL Direction

The SQL migrations in `server/migrations/` are the forward contract. The migration path is:

1. Keep JSON fallback for restricted environments.
2. Add and verify SQLite locally if a driver can be installed.
3. Validate migrations against PostgreSQL.
4. Move repository methods from table-array operations to SQL queries behind the same repository API.
5. Run data migration from JSON development records only where intentionally needed.

## Deployment Database Requirements

Before deployment, the database workstream still needs:

- managed PostgreSQL instance or approved database service
- network access rules and SSL/TLS enforcement
- secret-managed `DATABASE_URL`
- connection pooling
- migration job strategy
- backup schedule and restore test
- audit log retention policy
- rollback procedure for failed migrations
- monitoring for connection errors and slow queries

## Migration Risks And Rollback Notes

Known risks when moving from JSON/localStorage to a real database:

- ID collisions between browser-local and backend records
- duplicated demo records after repeated seeds
- stale browser localStorage data pointing at records that do not exist in the database
- auth sessions created before backend auth migration
- file metadata without real object storage files
- partial writes if repository methods are moved to SQL without transaction boundaries
- destructive reset accidentally pointed at shared data

Recommended rollback approach:

1. Snapshot the database before each migration.
2. Keep JSON/localStorage fallback data separate from backend data.
3. Run migrations in staging first.
4. Keep read-only verification queries for migrated counts.
5. Do not delete source records until the target database has been validated.
6. Document the exact migration version and rollback command used during each release.

## Seed Data

Seeds include demo customer, supplier, broker, and admin users, sample categories, a supplier profile, a sample heavy-equipment asset, a sample booking, a simulated protection plan, a trust score, and an audit log.

## Security Notes

- Store file metadata only in `file_metadata`; keep real files in secure object storage later.
- Never store card numbers, bank credentials, escrow credentials, or payment secrets.
- KYC and verification documents need encrypted storage, malware scanning, retention rules, and strict audit controls before real review workflows.
- This module does not implement real authentication, KYC, insurance, payments, escrow, or deployment.
