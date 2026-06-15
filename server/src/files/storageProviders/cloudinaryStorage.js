const REQUIRED = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];

function missing(env) {
  return REQUIRED.filter((key) => !String(env[key] || "").trim());
}

export function createCloudinaryStorage(options = {}) {
  const env = options.env || process.env;
  const missingCredentials = missing(env);
  const provider = "cloudinary";
  return {
    provider,
    productionSuitable: true,
    signedUrlReady: missingCredentials.length === 0,
    virusScanReady: String(env.FILE_REQUIRE_VIRUS_SCAN || "true").toLowerCase() === "true" && Boolean(env.FILE_VIRUS_SCAN_PROVIDER),
    missing: missingCredentials,
    createUploadIntent() {
      if (missingCredentials.length) {
        const message = `Cloudinary provider is missing required credentials: ${missingCredentials.join(", ")}. No signed upload URL was generated.`;
        const error = new Error(message);
        error.code = "storage_provider_not_configured";
        error.statusCode = 400;
        error.publicMessage = message;
        error.details = missingCredentials.map((field) => ({ field, message: `${field} is required for Cloudinary upload intent generation.` }));
        throw error;
      }
      return {
        provider,
        uploadUrl: null,
        signedUploadUrl: "cloudinary-signed-upload-url-placeholder",
        requiredHeaders: { "content-type": "validated-mime-type" },
        message: "Cloudinary credentials are present, but real signed upload generation is still a provider adapter placeholder.",
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
          ? "Cloudinary requires cloud name, API key, and API secret before signed upload intents can be generated."
          : "Cloudinary credentials are present; signed upload implementation still requires provider SDK verification.",
      };
    },
  };
}
