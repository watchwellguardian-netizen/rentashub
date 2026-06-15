import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

const docs = [
  "docs/project-a4-live-supabase-activation-certification.md",
  "docs/supabase-environment-inventory.md",
  "docs/supabase-persistence-certification-checklist.md",
  "docs/supabase-auth-storage-certification-checklist.md",
];

function readDoc(file) {
  return readFileSync(join(root, file), "utf8");
}

test("Project A4 Supabase activation certification docs exist", () => {
  for (const file of docs) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("Project A4 defines environment provisioning for development UAT and production", () => {
  const content = readDoc("docs/project-a4-live-supabase-activation-certification.md");
  for (const text of [
    "Development Supabase project",
    "UAT/Staging Supabase project",
    "Production Supabase project",
    "Separate Supabase URLs",
    "Separate PostgreSQL databases",
    "Separate storage buckets",
    "Separate Auth configurations",
    "Environment inventory approved",
  ]) {
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Project A4 locks approved migrations and production hold", () => {
  const content = readDoc("docs/project-a4-live-supabase-activation-certification.md");
  for (const migration of [
    "004_supabase_activation_architecture.sql",
    "005_supabase_auth_rbac_activation.sql",
    "006_supabase_storage_activation.sql",
    "007_audit_logging_activation.sql",
  ]) {
    assert.match(content, new RegExp(migration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(content, /Do not run Production until UAT signoff/i);
  assert.match(content, /Production activation is NO-GO until UAT signoff/i);
});

test("Project A4 covers Auth Storage secrets backup and restore certification", () => {
  const content = readDoc("docs/project-a4-live-supabase-activation-certification.md");
  for (const text of [
    "Supabase Auth Activation",
    "Password reset works",
    "Email verification works",
    "Supabase Storage Activation",
    "Signed URL generation works",
    "Backup database",
    "Restore database",
    "Service role keys stored only in backend/server secrets",
    "Frontend bundle does not contain service role key",
  ]) {
    assert.match(content, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Project A4 docs do not store live secrets or claim production activation", () => {
  const combined = docs.map(readDoc).join("\n");
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*eyJ|DATABASE_URL\s*=\s*postgresql:\/\/|supabase\.co\/auth\/v1\/token/i);
  assert.doesNotMatch(combined, /Production ready: Yes|Production activation complete|Public launch GO/i);
  assert.match(combined, /Do not store secrets/i);
  assert.match(combined, /NO-GO until UAT certification passes/i);
});

test("Supabase checklists require persistence auth storage and secrets evidence", () => {
  const persistence = readDoc("docs/supabase-persistence-certification-checklist.md");
  const authStorage = readDoc("docs/supabase-auth-storage-certification-checklist.md");
  for (const text of [
    "Tables created",
    "RLS enabled",
    "Cross-tenant access rejected",
    "Backup created",
    "Restore executed",
  ]) {
    assert.match(persistence, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const text of [
    "Registration validated",
    "Password reset validated",
    "private-verification",
    "Signed URL generation validated",
    "Repository secret scan passed",
    "ZIP artifact secret scan passed",
  ]) {
    assert.match(authStorage, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
