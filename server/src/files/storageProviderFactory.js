import { createCloudinaryStorage } from "./storageProviders/cloudinaryStorage.js";
import { createLocalPlaceholderStorage } from "./storageProviders/localPlaceholderStorage.js";
import { createS3Storage } from "./storageProviders/s3Storage.js";
import { createSupabaseStorage } from "./storageProviders/supabaseStorage.js";

export const STORAGE_PROVIDER_ALIASES = {
  placeholder: "local_placeholder",
  local: "local_placeholder",
  local_placeholder: "local_placeholder",
  s3: "s3",
  s3_placeholder: "s3",
  supabase: "supabase",
  supabase_placeholder: "supabase",
  cloudinary: "cloudinary",
  cloudinary_placeholder: "cloudinary",
};

export function normalizeStorageProvider(provider = "local_placeholder") {
  const normalized = String(provider || "local_placeholder").trim().toLowerCase();
  const mapped = STORAGE_PROVIDER_ALIASES[normalized];
  if (!mapped) {
    const error = new Error(`Unsupported file storage provider "${provider}". Use local_placeholder, s3, supabase, or cloudinary.`);
    error.code = "invalid_storage_provider";
    error.statusCode = 400;
    throw error;
  }
  return mapped;
}

export function storageOptionsFromEnv(env = process.env) {
  return {
    env,
    selectedProvider: normalizeStorageProvider(env.FILE_STORAGE_PROVIDER || "local_placeholder"),
    bucket: env.FILE_STORAGE_BUCKET || env.S3_BUCKET || env.SUPABASE_STORAGE_BUCKET || "",
    region: env.FILE_STORAGE_REGION || env.S3_REGION || "",
    publicBaseUrl: env.FILE_STORAGE_PUBLIC_BASE_URL || "",
    signedUrlTtlSeconds: Number(env.FILE_STORAGE_SIGNED_URL_TTL_SECONDS || 900),
    maxUploadMb: Number(env.FILE_UPLOAD_MAX_MB || 10),
    requireVirusScan: String(env.FILE_REQUIRE_VIRUS_SCAN || "true").toLowerCase() !== "false",
  };
}

export function createStorageProvider(options = {}) {
  const envOptions = storageOptionsFromEnv(options.env || process.env);
  const provider = normalizeStorageProvider(options.provider || options.storageProvider || envOptions.selectedProvider);
  const merged = { ...envOptions, ...options, provider };
  if (provider === "local_placeholder") return createLocalPlaceholderStorage(merged);
  if (provider === "s3") return createS3Storage(merged);
  if (provider === "supabase") return createSupabaseStorage(merged);
  if (provider === "cloudinary") return createCloudinaryStorage(merged);
  return createLocalPlaceholderStorage(merged);
}

export function getStorageReadiness(env = process.env) {
  const provider = createStorageProvider({ env });
  const readiness = provider.readiness();
  const requireVirusScan = String(env.FILE_REQUIRE_VIRUS_SCAN || "true").toLowerCase() !== "false";
  return {
    ...readiness,
    selectedProvider: provider.provider,
    requireVirusScan,
    virusScanReady: requireVirusScan ? readiness.virusScanReady : false,
    signedUrlTtlSeconds: Number(env.FILE_STORAGE_SIGNED_URL_TTL_SECONDS || 900),
    maxUploadMb: Number(env.FILE_UPLOAD_MAX_MB || 10),
  };
}
