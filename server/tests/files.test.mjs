import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { createApp } from "../src/main/app.js";

async function createTestApp() {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  return { database, app: createApp({ database }) };
}

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

const ownerHeaders = { "x-user-role": "supplier", "x-user-id": "supplier-demo" };
const otherHeaders = { "x-user-role": "customer", "x-user-id": "other-customer" };
const adminHeaders = { "x-user-role": "admin", "x-user-id": "admin-demo" };

const imagePayload = {
  relatedEntityType: "asset",
  relatedEntityId: "asset-demo",
  originalFileName: "front-view.jpg",
  mimeType: "image/jpeg",
  fileSize: 120000,
  visibility: "public",
};

test("upload intent creates pending metadata", async () => {
  const { app, database } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/upload-intent", {
      method: "POST",
      headers: ownerHeaders,
      body: imagePayload,
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.file.status, "pending_upload");
    assert.equal(result.body.intent.uploadMode, "metadata_only_placeholder");
    assert.equal(result.body.intent.provider, "local_placeholder");
    assert.equal(result.body.intent.signedUploadUrl, null);
    assert.ok(result.body.intent.uploadIntentId);
    assert.ok(result.body.intent.expiresAt);
    assert.equal(database.table("file_metadata").length, 1);
  });
});

test("object storage providers without credentials fail clearly", async () => {
  for (const provider of ["s3", "supabase", "cloudinary"]) {
    const { app } = await createTestApp();
    await withServer(app.handler, async (baseUrl) => {
      const result = await requestJson(baseUrl, "/api/files/upload-intent", {
        method: "POST",
        headers: ownerHeaders,
        body: { ...imagePayload, storageProvider: provider },
      });
      assert.equal(result.response.status, 400);
      assert.equal(result.body.error, "storage_provider_not_configured");
      assert.match(result.body.message, /No signed upload URL was generated/);
    });
  }
});

test("Supabase provider reports missing URL keys and bucket names", async () => {
  const { getStorageReadiness } = await import("../src/files/storageProviderFactory.js");
  const readiness = getStorageReadiness({ FILE_STORAGE_PROVIDER: "supabase" });
  assert.equal(readiness.selectedProvider, "supabase");
  assert.equal(readiness.ready, false);
  assert.equal(readiness.credentialsReady, false);
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
    "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
    "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
    "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
    "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
    "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
  ]) {
    assert.ok(readiness.missing.includes(key), `${key} should be missing`);
  }
});

test("Supabase provider with placeholder keys fails clearly", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const env = {
    FILE_STORAGE_PROVIDER: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-role",
    SUPABASE_ANON_KEY: "placeholder-anon",
    FILE_STORAGE_BUCKET_PUBLIC_ASSETS: "public-assets",
    FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION: "private-verification",
    FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS: "private-inspections",
    FILE_STORAGE_BUCKET_PRIVATE_CLAIMS: "private-claims",
    FILE_STORAGE_BUCKET_PRIVATE_DISPUTES: "private-disputes",
    FILE_STORAGE_BUCKET_SUPPLIER_LOGOS: "supplier-logos",
  };
  const providerApp = createApp({ database, env });
  await withServer(providerApp.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/upload-intent", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, storageProvider: "supabase" },
    });
    assert.equal(result.response.status, 400);
    assert.equal(result.body.error, "storage_provider_not_configured");
    assert.match(result.body.message, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(result.body.message, /SUPABASE_ANON_KEY/);
  });
});

test("Supabase upload intent returns provider-ready shape without signed URL when credentials are shaped", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  await runMigrations(database);
  const env = {
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
  };
  const providerApp = createApp({ database, env });
  await withServer(providerApp.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/upload-intent", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, storageProvider: "supabase" },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.intent.provider, "supabase");
    assert.equal(result.body.intent.bucket, "public-assets");
    assert.equal(result.body.intent.signedUploadUrl, null);
    assert.equal(result.body.intent.requiredHeaders["x-rentashub-storage-provider"], "supabase");
    assert.match(result.body.intent.message, /real signed URL generation is not active/i);
  });
});

test("valid image and PDF metadata are accepted", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const image = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, status: "uploaded_placeholder" },
    });
    assert.equal(image.response.status, 201);
    assert.equal(image.body.file.mimeType, "image/jpeg");

    const pdf = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        relatedEntityType: "claim",
        relatedEntityId: "claim-demo",
        originalFileName: "damage-report.pdf",
        mimeType: "application/pdf",
        fileSize: 250000,
        visibility: "restricted",
      },
    });
    assert.equal(pdf.response.status, 201);
    assert.equal(pdf.body.file.mimeType, "application/pdf");
  });
});

test("invalid MIME type, oversized file, and missing related entity are rejected", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const badMime = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, originalFileName: "script.js", mimeType: "application/javascript" },
    });
    assert.equal(badMime.response.status, 400);
    assert.equal(badMime.body.error, "validation_error");

    const tooLarge = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, fileSize: 11 * 1024 * 1024 },
    });
    assert.equal(tooLarge.response.status, 400);

    const missingEntity = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, relatedEntityId: "" },
    });
    assert.equal(missingEntity.response.status, 400);
  });
});

test("private verification file is not public and unauthorized user is blocked", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        relatedEntityType: "verification",
        relatedEntityId: "verification-demo",
        originalFileName: "business-registration.pdf",
        mimeType: "application/pdf",
        fileSize: 180000,
        visibility: "private",
      },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.file.visibility, "private");

    const blocked = await requestJson(baseUrl, `/api/files/${created.body.file.fileId}`, { headers: otherHeaders });
    assert.equal(blocked.response.status, 403);

    const owner = await requestJson(baseUrl, `/api/files/${created.body.file.fileId}`, { headers: ownerHeaders });
    assert.equal(owner.response.status, 200);
    assert.equal(owner.body.file.relatedEntityType, "verification");
  });
});

test("public verification visibility is rejected", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const result = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: {
        relatedEntityType: "verification",
        relatedEntityId: "verification-demo",
        originalFileName: "private-id.pdf",
        mimeType: "application/pdf",
        fileSize: 100000,
        visibility: "public",
      },
    });
    assert.equal(result.response.status, 400);
    assert.ok(result.body.details.some((detail) => detail.field === "visibility"));
  });
});

test("inspection claim and dispute evidence cannot be public", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    for (const relatedEntityType of ["inspection", "claim", "dispute"]) {
      const result = await requestJson(baseUrl, "/api/files/metadata", {
        method: "POST",
        headers: ownerHeaders,
        body: {
          relatedEntityType,
          relatedEntityId: `${relatedEntityType}-demo`,
          originalFileName: `${relatedEntityType}.pdf`,
          mimeType: "application/pdf",
          fileSize: 100000,
          visibility: "public",
        },
      });
      assert.equal(result.response.status, 400);
      assert.ok(result.body.details.some((detail) => detail.field === "visibility"));
    }
  });
});

test("admin can view metadata and soft delete marks file deleted", async () => {
  const { app } = await createTestApp();
  await withServer(app.handler, async (baseUrl) => {
    const created = await requestJson(baseUrl, "/api/files/metadata", {
      method: "POST",
      headers: ownerHeaders,
      body: { ...imagePayload, visibility: "private" },
    });
    const adminView = await requestJson(baseUrl, `/api/files/${created.body.file.fileId}`, { headers: adminHeaders });
    assert.equal(adminView.response.status, 200);

    const deleted = await requestJson(baseUrl, `/api/files/${created.body.file.fileId}`, {
      method: "DELETE",
      headers: ownerHeaders,
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.softDeleted, true);
    assert.equal(deleted.body.file.status, "deleted");

    const afterDelete = await requestJson(baseUrl, `/api/files/${created.body.file.fileId}`, { headers: adminHeaders });
    assert.equal(afterDelete.response.status, 404);
  });
});
