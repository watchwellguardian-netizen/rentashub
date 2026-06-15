import { randomUUID } from "node:crypto";
import { createStorageProvider, normalizeStorageProvider, storageOptionsFromEnv } from "./storageProviderFactory.js";

function safeName(fileName = "file") {
  return String(fileName).replace(/[^A-Za-z0-9._-]/g, "_");
}

function expiresAt(ttlSeconds) {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

export function createUploadIntent({ originalFileName, relatedEntityType, relatedEntityId, storageProvider } = {}, options = {}) {
  const envOptions = storageOptionsFromEnv(options.env || process.env);
  const selectedProvider = normalizeStorageProvider(storageProvider || options.storageProvider || envOptions.selectedProvider);
  const provider = createStorageProvider({ ...envOptions, ...options, provider: selectedProvider });
  const fileId = `file-${randomUUID()}`;
  const storedFileName = `${fileId}-${safeName(originalFileName)}`;
  const storagePath = `${selectedProvider}/${relatedEntityType}/${relatedEntityId}/${storedFileName}`;
  const expiry = expiresAt(envOptions.signedUrlTtlSeconds);
  const providerIntent = provider.createUploadIntent({
    fileId,
    storedFileName,
    storagePath,
    expiresAt: expiry,
    relatedEntityType,
    relatedEntityId,
    visibility: options.visibility,
  });
  return {
    uploadIntentId: providerIntent.uploadIntentId || `upload-${fileId}`,
    fileId,
    provider: selectedProvider,
    storageProvider: selectedProvider,
    storedFileName,
    storagePath,
    bucket: providerIntent.bucket || "",
    bucketEnvKey: providerIntent.bucketEnvKey || "",
    objectPath: providerIntent.objectPath || storagePath,
    uploadMode: "metadata_only_placeholder",
    uploadUrl: providerIntent.uploadUrl || null,
    signedUploadUrl: providerIntent.signedUploadUrl || null,
    signedUploadUrlStatus: providerIntent.signedUploadUrlStatus || "not_generated",
    signedUrlStrategy: providerIntent.signedUrlStrategy || null,
    expiresAt: providerIntent.expiresAt || expiry,
    requiredHeaders: providerIntent.requiredHeaders || {},
    message: providerIntent.message || "Upload intent is metadata-only. Real object storage and signed URLs are not implemented.",
  };
}
