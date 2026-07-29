import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  LocalS3CompatibleStorage,
  createObjectStorageReadinessEvidence,
  exportData,
  redactStorageUrl,
  tenantObjectPath,
  validateObjectStorageConfig,
} from "../../server/src/files/objectStorageRuntimeReadiness.js";

test("object storage config validates local emulator and redacts credential-bearing endpoints", () => {
  const local = validateObjectStorageConfig({ provider: "local_s3" });
  assert.equal(local.status, "READY");
  assert.equal(local.safeForRuntime, true);

  const endpoint = "http://access:secret@localhost:9090";
  const s3 = validateObjectStorageConfig({ provider: "s3", endpoint, bucket: "rentashub-test" });
  assert.equal(s3.status, "READY");
  assert.doesNotMatch(JSON.stringify(s3), /secret/);
  assert.equal(redactStorageUrl(endpoint), "http://access:REDACTED@localhost:9090");
});

test("object storage config blocks production-like or incomplete S3 targets", () => {
  assert.equal(validateObjectStorageConfig({ provider: "s3" }).status, "BLOCKED");
  const prod = validateObjectStorageConfig({ provider: "s3", endpoint: "https://s3.amazonaws.com", bucket: "rentashub-prod" });
  assert.equal(prod.status, "BLOCKED");
  assert.equal(prod.safeForRuntime, false);
});

test("tenant object paths are isolated and normalized", () => {
  const a = tenantObjectPath({ tenantId: "Tenant A", classification: "Asset", fileName: "front view.jpg" });
  const b = tenantObjectPath({ tenantId: "Tenant B", classification: "Asset", fileName: "front view.jpg" });
  assert.equal(a, "tenants/tenant-a/asset/front_view.jpg");
  assert.notEqual(a, b);
});

test("local S3-compatible storage supports upload download signed URL delete and cleanup", () => {
  const storage = new LocalS3CompatibleStorage({ bucket: "rentashub-test" });
  const uploaded = storage.upload({
    tenantId: "tenant-a",
    relatedEntityType: "asset",
    relatedEntityId: "asset-a",
    fileName: "front.jpg",
    mimeType: "image/jpeg",
    body: "bytes",
    visibility: "private",
  });
  assert.equal(uploaded.checksum, createHash("sha256").update("bytes").digest("hex"));
  assert.throws(() => storage.download({ key: uploaded.key, requesterId: "other-user" }), /valid signed URL|owner access/);
  const signed = storage.createSignedUrl({ key: uploaded.key, expiresInSeconds: 30 });
  assert.match(signed.url, /signature=REDACTED/);
  assert.equal(storage.download({ key: uploaded.key, signedUrlToken: signed.token }).body.toString(), "bytes");
  assert.equal(storage.delete({ key: uploaded.key }).deleted, true);
  assert.equal(storage.cleanup().cleaned, 0);
});

test("local storage rejects invalid MIME type oversized files and public restricted evidence", () => {
  const storage = new LocalS3CompatibleStorage({ maxBytes: 5 });
  assert.throws(() => storage.upload({ fileName: "bad.exe", mimeType: "application/octet-stream", body: "x" }), /MIME type/);
  assert.throws(() => storage.upload({ fileName: "front.jpg", mimeType: "image/jpeg", body: "too-large" }), /size limit/);
  assert.throws(() => storage.upload({ relatedEntityType: "verification", fileName: "doc.pdf", mimeType: "application/pdf", body: "pdf", visibility: "public" }), /cannot be public/);
});

test("export utility supports text html csv json and fails closed for binary", () => {
  const rows = [{ id: "asset-a", status: "ready, quoted" }];
  assert.equal(exportData(rows, { format: "text" }).contentType, "text/plain");
  assert.equal(exportData(rows, { format: "html" }).contentType, "text/html");
  assert.match(exportData(rows, { format: "csv" }).body, /"ready, quoted"/);
  assert.equal(exportData(rows, { format: "json" }).contentType, "application/json");
  assert.throws(() => exportData(rows, { format: "binary" }), /Binary export must fail closed/);
});

test("S5-S3D evidence reports engineering-complete status without live storage claims", () => {
  const evidence = createObjectStorageReadinessEvidence();
  assert.equal(evidence.status, "OBJECT_STORAGE_ENGINEERING_COMPLETE");
  assert.equal(evidence.exportStatus, "EXPORT_ENGINEERING_COMPLETE");
  assert.equal(evidence.runtimeStatus, "OBJECT_STORAGE_RUNTIME_PREPARED");
  assert.equal(evidence.ciStatus, "CI_EXECUTION_PENDING");
  assert.equal(evidence.productionTouched, false);
  assert.equal(evidence.liveStorageTouched, false);
  assert.equal(evidence.checks.tenantPath, true);
  assert.equal(evidence.checks.binaryFailClosed, true);
});

test("S5-S3D workflow declares disposable object-storage emulator and no production credentials", () => {
  const workflow = readFileSync(".github/workflows/object-storage-export-runtime-validation.yml", "utf8");
  for (const required of [
    "image: adobe/s3mock",
    "OBJECT_STORAGE_PROVIDER: s3",
    "OBJECT_STORAGE_ENDPOINT: http://localhost:9090",
    "OBJECT_STORAGE_CONFIRM_DISPOSABLE: \"true\"",
    "node --test tests/production/s5-s3d-object-storage-export-readiness.test.mjs",
    "node scripts/s5-s3d-object-storage-export-readiness.mjs json",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(workflow, /\*amazonaws\.com\*\|\*cloudflarestorage\.com\*\|\*storage\.googleapis\.com\*\|\*prod\*\|\*production\*/);
  assert.doesNotMatch(workflow, /AWS_SECRET_ACCESS_KEY|FILE_STORAGE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|https?:\/\/[^:\s]+:[^@\s]+@/i);
});
