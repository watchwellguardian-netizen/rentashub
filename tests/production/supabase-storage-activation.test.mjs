import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  getBucketForEntityType,
  getSupabaseStorageActivationPlan,
  isPublicVisibilityAllowed,
  SUPABASE_STORAGE_AUDIT_EVENTS,
  SUPABASE_STORAGE_BUCKETS,
} from "../../server/src/files/supabaseStorageActivation.js";

const root = process.cwd();

test("Project A3 Supabase storage activation artifacts exist", () => {
  for (const file of [
    "docs/supabase-storage-activation-readiness.md",
    "server/src/files/supabaseStorageActivation.js",
    "server/migrations/006_supabase_storage_activation.sql",
  ]) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("Supabase storage activation doc covers buckets signed URLs audit RLS and rollback", () => {
  const doc = readFileSync(join(root, "docs/supabase-storage-activation-readiness.md"), "utf8");
  for (const text of [
    "Bucket Architecture",
    "Upload Policy Framework",
    "Signed URL Strategy",
    "Storage Audit Logging",
    "RLS And Storage Policy Alignment",
    "Listing photo storage",
    "Inspection report storage",
    "Auction/document storage",
    "User upload storage",
    "Rollback",
    "Credential-ready only",
  ]) {
    assert.match(doc, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.doesNotMatch(doc, /production ready/i);
});

test("Supabase storage bucket matrix protects private evidence categories", () => {
  assert.equal(SUPABASE_STORAGE_BUCKETS.publicAssets.defaultName, "public-assets");
  assert.equal(SUPABASE_STORAGE_BUCKETS.privateVerification.defaultName, "private-verification");
  assert.equal(getBucketForEntityType("asset", {}).bucketName, "public-assets");
  assert.equal(getBucketForEntityType("inspection", {}).bucketName, "private-inspections");
  assert.equal(getBucketForEntityType("dispute", {}).bucketName, "private-disputes");
  assert.equal(isPublicVisibilityAllowed("asset"), true);
  assert.equal(isPublicVisibilityAllowed("verification"), false);
  assert.equal(isPublicVisibilityAllowed("inspection"), false);
  assert.equal(isPublicVisibilityAllowed("claim"), false);
  assert.equal(isPublicVisibilityAllowed("dispute"), false);
});

test("Supabase storage activation plan reports missing credentials and signed URL guardrails", () => {
  const plan = getSupabaseStorageActivationPlan({ FILE_STORAGE_PROVIDER: "supabase" });
  assert.equal(plan.selected, true);
  assert.equal(plan.credentialsReady, false);
  assert.ok(plan.missing.includes("SUPABASE_URL"));
  assert.ok(plan.missing.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.equal(plan.signedUrlStrategy.signedUploadReady, false);
  assert.equal(plan.signedUrlStrategy.signedDownloadReady, false);
  assert.equal(plan.signedUrlStrategy.upload.method, "createSignedUploadUrl");
  assert.equal(plan.signedUrlStrategy.download.method, "createSignedUrl");
  assert.match(plan.activationBoundary, /Credential-ready only/i);
});

test("Supabase storage activation plan accepts shaped credentials without claiming live storage", () => {
  const env = {
    FILE_STORAGE_PROVIDER: "supabase",
    SUPABASE_URL: "https://rentashub.supabase.co",
    SUPABASE_ANON_KEY: "sb_anon_realistic_key_for_readiness",
    SUPABASE_SERVICE_ROLE_KEY: "sb_service_realistic_key_for_readiness",
    FILE_STORAGE_BUCKET_PUBLIC_ASSETS: "public-assets",
    FILE_STORAGE_BUCKET_SUPPLIER_LOGOS: "supplier-logos",
    FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION: "private-verification",
    FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS: "private-inspections",
    FILE_STORAGE_BUCKET_PRIVATE_CLAIMS: "private-claims",
    FILE_STORAGE_BUCKET_PRIVATE_DISPUTES: "private-disputes",
    FILE_STORAGE_SIGNED_URL_TTL_SECONDS: "600",
  };
  const plan = getSupabaseStorageActivationPlan(env);
  assert.equal(plan.credentialsReady, true);
  assert.equal(plan.status, "credentials_shaped_sdk_validation_required");
  assert.equal(plan.signedUrlStrategy.ttlSeconds, 600);
  assert.equal(plan.signedUrlStrategy.signedUploadReady, false);
  assert.equal(plan.uploadPolicy.verificationDocuments.bucketName, "private-verification");
});

test("Supabase storage audit events and migration prepare policy alignment", () => {
  assert.ok(SUPABASE_STORAGE_AUDIT_EVENTS.includes("storage.upload_intent.created"));
  assert.ok(SUPABASE_STORAGE_AUDIT_EVENTS.includes("storage.signed_download_url.requested"));
  assert.ok(SUPABASE_STORAGE_AUDIT_EVENTS.includes("storage.access.denied"));
  const migration = readFileSync(join(root, "server/migrations/006_supabase_storage_activation.sql"), "utf8");
  for (const text of [
    "storage_bucket_policies",
    "bucket_name",
    "upload_intent_id",
    "signed_url_status",
    "scan_status",
    "ENABLE ROW LEVEL SECURITY",
    "private-verification",
    "private-inspections",
    "private-claims",
    "private-disputes",
  ]) {
    assert.match(migration, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
