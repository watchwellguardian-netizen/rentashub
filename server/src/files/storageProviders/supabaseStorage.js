import { getBucketForEntityType, getSupabaseStorageActivationPlan } from "../supabaseStorageActivation.js";

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
  "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
  "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
  "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
  "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
  "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
];

const PLACEHOLDERS = [/^$/, /placeholder/i, /change/i, /your[-_]?/i, /example/i, /<[^>]+>/];

const ENTITY_BUCKET_KEY = {
  asset: "FILE_STORAGE_BUCKET_PUBLIC_ASSETS",
  supplier_profile: "FILE_STORAGE_BUCKET_SUPPLIER_LOGOS",
  verification: "FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION",
  inspection: "FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS",
  claim: "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
  dispute: "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
  review: "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS",
  message: "FILE_STORAGE_BUCKET_PRIVATE_DISPUTES",
};

function hasPlaceholder(value) {
  const raw = String(value || "").trim();
  return PLACEHOLDERS.some((pattern) => pattern.test(raw));
}

function missing(env) {
  return REQUIRED.filter((key) => hasPlaceholder(env[key]));
}

function bucketFor(env, entityType) {
  const mapped = getBucketForEntityType(entityType, env);
  const key = ENTITY_BUCKET_KEY[entityType] || mapped.envKey || "FILE_STORAGE_BUCKET_PRIVATE_CLAIMS";
  return { key, bucket: env[key] || mapped.bucketName || "" };
}

function validateSupabaseVisibility({ relatedEntityType, visibility }) {
  const privateOnly = new Set(["verification", "inspection", "claim", "dispute", "message"]);
  if (privateOnly.has(relatedEntityType) && visibility === "public") {
    const error = new Error(`${relatedEntityType} files must use private or restricted visibility with Supabase Storage.`);
    error.code = "storage_visibility_not_allowed";
    error.statusCode = 400;
    error.publicMessage = error.message;
    error.details = [{ field: "visibility", message: error.message }];
    throw error;
  }
}

export function createSupabaseStorage(options = {}) {
  const env = options.env || process.env;
  const missingCredentials = missing(env);
  const activationPlan = getSupabaseStorageActivationPlan(env);
  const provider = "supabase";
  return {
    provider,
    productionSuitable: true,
    signedUrlReady: false,
    virusScanReady: String(env.FILE_REQUIRE_VIRUS_SCAN || "true").toLowerCase() === "true" && Boolean(env.FILE_VIRUS_SCAN_PROVIDER),
    missing: missingCredentials,
    createUploadIntent(intent = {}) {
      validateSupabaseVisibility({ relatedEntityType: intent.relatedEntityType, visibility: intent.visibility });
      if (missingCredentials.length) {
        const message = `Supabase Storage provider is missing required credentials or bucket names: ${missingCredentials.join(", ")}. No signed upload URL was generated.`;
        const error = new Error(message);
        error.code = "storage_provider_not_configured";
        error.statusCode = 400;
        error.publicMessage = message;
        error.details = missingCredentials.map((field) => ({ field, message: `${field} is required for Supabase upload intent generation.` }));
        throw error;
      }
      const { key, bucket } = bucketFor(env, intent.relatedEntityType);
      return {
        provider,
        uploadIntentId: `supabase-upload-${intent.fileId}`,
        bucket,
        bucketEnvKey: key,
        objectPath: intent.storagePath,
        uploadUrl: null,
        signedUploadUrl: null,
        signedUploadUrlStatus: "provider_sdk_not_activated",
        signedUrlStrategy: {
          ttlSeconds: activationPlan.signedUrlStrategy.ttlSeconds,
          uploadMethod: activationPlan.signedUrlStrategy.upload.method,
          downloadMethod: activationPlan.signedUrlStrategy.download.method,
          status: "provider_sdk_required",
        },
        requiredHeaders: {
          "content-type": "validated-mime-type",
          "x-rentashub-storage-provider": "supabase",
          "x-rentashub-bucket": bucket,
        },
        message: "Supabase credentials and bucket names are present, but real signed URL generation is not active until Supabase SDK integration is tested.",
      };
    },
    readiness() {
      return {
        provider,
        selectedProvider: provider,
        ready: false,
        credentialsReady: missingCredentials.length === 0,
        productionSuitable: true,
        signedUrlReady: false,
        virusScanReady: this.virusScanReady,
        missing: missingCredentials,
        activationPlan,
        bucketPolicy: {
          publicAssets: env.FILE_STORAGE_BUCKET_PUBLIC_ASSETS || "",
          supplierLogos: env.FILE_STORAGE_BUCKET_SUPPLIER_LOGOS || "",
          privateVerification: env.FILE_STORAGE_BUCKET_PRIVATE_VERIFICATION || "",
          privateInspections: env.FILE_STORAGE_BUCKET_PRIVATE_INSPECTIONS || "",
          privateClaims: env.FILE_STORAGE_BUCKET_PRIVATE_CLAIMS || "",
          privateDisputes: env.FILE_STORAGE_BUCKET_PRIVATE_DISPUTES || "",
        },
        message: missingCredentials.length
          ? "Supabase Storage requires project URL, anon key, service role key, and the required public/private bucket names before upload intents can be prepared."
          : "Supabase Storage credentials are present; real signed URL generation still requires provider SDK verification before activation.",
      };
    },
  };
}
