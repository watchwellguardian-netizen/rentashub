import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { createApp } from "../src/main/app.js";
import { getStorageReadiness } from "../src/files/storageProviderFactory.js";
import { getBucketForEntityType, getSupabaseStorageActivationPlan } from "../src/files/supabaseStorageActivation.js";

async function withServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function requestJson(baseUrl, path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { "content-type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json() };
}

const supplierHeaders = { "x-user-role": "supplier", "x-user-id": "supplier-demo" };

const supabaseEnv = {
  FILE_STORAGE_PROVIDER: "supabase",
  SUPABASE_URL: "https://rentashub.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_service_realistic_key_for_readiness",
  SUPABASE_ANON_KEY: "sb_anon_realistic_key_for_readiness",
  FILE_STORAGE_BUCKET_PUBLIC_ASSETS: "public-assets",
  FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION: "private-verification",
  FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS: "private-inspections",
  FILE_STORAGE_BUCKET_PRIVATE_CLAIMS: "private-claims",
  FILE_STORAGE_BUCKET_PRIVATE_DISPUTES: "private-disputes",
  FILE_STORAGE_BUCKET_SUPPLIER_LOGOS: "supplier-logos",
  FILE_STORAGE_SIGNED_URL_TTL_SECONDS: "450",
};

test("Supabase storage activation helper maps entities to buckets", () => {
  assert.equal(getBucketForEntityType("asset", supabaseEnv).bucketName, "public-assets");
  assert.equal(getBucketForEntityType("supplier_profile", supabaseEnv).bucketName, "supplier-logos");
  assert.equal(getBucketForEntityType("verification", supabaseEnv).bucketName, "private-verification");
  assert.equal(getBucketForEntityType("inspection", supabaseEnv).bucketName, "private-inspections");
  assert.equal(getBucketForEntityType("claim", supabaseEnv).bucketName, "private-claims");
  assert.equal(getBucketForEntityType("dispute", supabaseEnv).bucketName, "private-disputes");
});

test("Supabase storage activation plan remains credential-ready only", () => {
  const missing = getSupabaseStorageActivationPlan({ FILE_STORAGE_PROVIDER: "supabase" });
  assert.equal(missing.credentialsReady, false);
  assert.ok(missing.missing.includes("SUPABASE_URL"));
  const ready = getSupabaseStorageActivationPlan(supabaseEnv);
  assert.equal(ready.credentialsReady, true);
  assert.equal(ready.signedUrlStrategy.signedUploadReady, false);
  assert.equal(ready.signedUrlStrategy.signedDownloadReady, false);
  assert.equal(ready.rlsAlignment.privateBucketsMustRemainPrivate, true);
});

test("Supabase storage readiness exposes activation plan and missing credentials", () => {
  const readiness = getStorageReadiness({ FILE_STORAGE_PROVIDER: "supabase" });
  assert.equal(readiness.selectedProvider, "supabase");
  assert.equal(readiness.ready, false);
  assert.equal(readiness.activationPlan.provider, "supabase");
  assert.ok(readiness.missing.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.equal(readiness.activationPlan.signedUrlStrategy.signedUploadReady, false);
});

test("Supabase upload intent includes bucket strategy without live signed URL", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const app = createApp({ database, env: supabaseEnv });
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/upload-intent", {
      method: "POST",
      headers: supplierHeaders,
      body: {
        relatedEntityType: "inspection",
        relatedEntityId: "inspection-demo",
        originalFileName: "inspection-report.pdf",
        mimeType: "application/pdf",
        fileSize: 200000,
        visibility: "restricted",
        storageProvider: "supabase",
      },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.intent.provider, "supabase");
    assert.equal(result.body.intent.bucket, "private-inspections");
    assert.equal(result.body.intent.signedUploadUrl, null);
    assert.equal(result.body.intent.signedUrlStrategy.ttlSeconds, 450);
    assert.equal(result.body.intent.signedUrlStrategy.status, "provider_sdk_required");
    assert.match(result.body.intent.message, /real signed URL generation is not active/i);
  });
});

test("Supabase upload intent rejects public private-evidence visibility", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const app = createApp({ database, env: supabaseEnv });
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/upload-intent", {
      method: "POST",
      headers: supplierHeaders,
      body: {
        relatedEntityType: "verification",
        relatedEntityId: "verification-demo",
        originalFileName: "kyc.pdf",
        mimeType: "application/pdf",
        fileSize: 100000,
        visibility: "public",
        storageProvider: "supabase",
      },
    });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error, "storage_visibility_not_allowed");
  });
});
