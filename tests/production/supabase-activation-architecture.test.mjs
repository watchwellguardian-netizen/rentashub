import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("Project A1 Supabase activation architecture artifacts exist", () => {
  for (const file of [
    "docs/supabase-architecture-migration.md",
    "server/docs/supabase-postgres-migration-strategy.md",
    "server/migrations/004_supabase_activation_architecture.sql",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("Supabase migration strategy covers required domains and environments", () => {
  const doc = read("docs/supabase-architecture-migration.md");
  for (const phrase of [
    "Supabase PostgreSQL",
    "Supabase Auth",
    "Supabase Storage",
    "Supabase Realtime",
    "Row Level Security",
    "Development",
    "UAT",
    "Production",
    "Users",
    "Auctions",
    "Listings",
    "Inspection Marketplace",
    "Transport Marketplace",
    "Financing Marketplace",
    "Documents",
    "Notifications",
    "Analytics",
    "AI Recommendation Audit",
    "Rollback Plan",
    "Risk Assessment",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
});

test("Supabase SQL migration adds tenant audit fields phase 2 tables and RLS policies", () => {
  const sql = read("server/migrations/004_supabase_activation_architecture.sql");
  for (const table of [
    "tenants",
    "user_role_assignments",
    "auctions",
    "auction_bids",
    "inspection_marketplace_requests",
    "transport_marketplace_requests",
    "financing_marketplace_referrals",
    "generated_documents",
    "notification_events",
    "analytics_events",
    "ai_recommendation_audit",
    "storage_objects_audit",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`), `${table} should be created`);
  }
  for (const phrase of [
    "tenant_id",
    "created_by",
    "updated_by",
    "deleted_at",
    "ENABLE ROW LEVEL SECURITY",
    "CREATE POLICY",
    "rentashub_auth_user_id",
    "rentashub_is_admin",
    "rentashub_is_service_role",
  ]) {
    assert.match(sql, new RegExp(phrase), `${phrase} should be present`);
  }
});

test("server Supabase migration docs include auth role mapping realtime validation and rollback", () => {
  const strategy = read("server/docs/supabase-postgres-migration-strategy.md");
  for (const phrase of [
    "DATABASE_PROVIDER=postgres",
    "DATABASE_POSTGRES_VENDOR=supabase",
    "customer",
    "supplier",
    "dealer",
    "inspector",
    "transport_provider",
    "financing_partner",
    "admin",
    "super_admin",
    "Realtime",
    "RLS",
    "Rollback",
  ]) {
    assert.match(strategy, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be documented`);
  }
});

test("Supabase activation config remains credential-ready and does not expose service role to frontend", () => {
  const serverEnv = read("server/.env.example");
  const frontendEnv = read(".env.example");
  assert.match(serverEnv, /SUPABASE_PROJECT_REF=/);
  assert.match(serverEnv, /SUPABASE_DB_POOLING_MODE=transaction/);
  assert.match(serverEnv, /SUPABASE_REALTIME_ENABLED=false/);
  assert.match(serverEnv, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(frontendEnv, /VITE_SUPABASE_URL=/);
  assert.match(frontendEnv, /VITE_SUPABASE_ANON_KEY=/);
  assert.doesNotMatch(frontendEnv, /SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_SERVICE_ROLE_KEY/);
});

test("Supabase activation docs avoid false live activation claims", () => {
  const combined = [
    read("docs/supabase-architecture-migration.md"),
    read("server/docs/supabase-postgres-migration-strategy.md"),
  ].join("\n");
  assert.match(combined, /does not activate a live Supabase project/i);
  assert.match(combined, /credential-ready/i);
  assert.doesNotMatch(combined, /Supabase is live|live activation complete|public launch approved|certified for public production/i);
});
