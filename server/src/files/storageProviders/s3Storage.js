const REQUIRED = ["FILE_STORAGE_BUCKET", "FILE_STORAGE_REGION", "FILE_STORAGE_ACCESS_KEY", "FILE_STORAGE_SECRET_KEY"];

function missing(env) {
  return REQUIRED.filter((key) => !String(env[key] || "").trim());
}

export function createS3Storage(options = {}) {
  const env = options.env || process.env;
  const missingCredentials = missing(env);
  const provider = "s3";
  return {
    provider,
    productionSuitable: true,
    signedUrlReady: missingCredentials.length === 0,
    virusScanReady: String(env.FILE_REQUIRE_VIRUS_SCAN || "true").toLowerCase() === "true" && Boolean(env.FILE_VIRUS_SCAN_PROVIDER),
    missing: missingCredentials,
    createUploadIntent() {
      if (missingCredentials.length) {
        const message = `S3 storage provider is missing required credentials: ${missingCredentials.join(", ")}. No signed upload URL was generated.`;
        const error = new Error(message);
        error.code = "storage_provider_not_configured";
        error.statusCode = 400;
        error.publicMessage = message;
        error.details = missingCredentials.map((field) => ({ field, message: `${field} is required for S3 upload intent generation.` }));
        throw error;
      }
      return {
        provider,
        uploadUrl: null,
        signedUploadUrl: "s3-signed-upload-url-placeholder",
        requiredHeaders: { "content-type": "validated-mime-type" },
        message: "S3 provider credentials are present, but real signed URL generation is still a provider adapter placeholder.",
      };
    },
    readiness() {
      return {
        provider,
        selectedProvider: provider,
        ready: missingCredentials.length === 0,
        productionSuitable: true,
        signedUrlReady: missingCredentials.length === 0,
        virusScanReady: this.virusScanReady,
        missing: missingCredentials,
        message: missingCredentials.length
          ? "S3 storage requires bucket, region, access key, and secret key before signed upload URLs can be generated."
          : "S3 credentials are present; signed URL implementation still requires provider SDK verification.",
      };
    },
  };
}
