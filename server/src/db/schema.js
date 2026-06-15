export const SCHEMA_VERSION = "001_initial_schema";

export const TABLES = [
  "users",
  "roles",
  "permissions",
  "role_permissions",
  "asset_categories",
  "assets",
  "bookings",
  "inspections",
  "payment_ledger",
  "message_threads",
  "messages",
  "notifications",
  "supplier_profiles",
  "verification_records",
  "reviews",
  "disputes",
  "marketplace_offers",
  "wanted_requests",
  "brokerage_leads",
  "trust_scores",
  "protection_plans",
  "protection_selections",
  "claims",
  "audit_logs",
  "file_metadata",
  "auth_sessions",
  "schema_migrations",
];

export const SOFT_DELETE_TABLES = new Set([
  "users",
  "assets",
  "bookings",
  "supplier_profiles",
  "reviews",
  "marketplace_offers",
  "wanted_requests",
  "brokerage_leads",
  "claims",
  "file_metadata",
]);

export function createEmptyDatabase() {
  return TABLES.reduce(
    (database, tableName) => {
      database.tables[tableName] = [];
      return database;
    },
    { schemaVersion: null, tables: {} },
  );
}
