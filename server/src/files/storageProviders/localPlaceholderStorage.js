export function createLocalPlaceholderStorage(options = {}) {
  const provider = "local_placeholder";
  return {
    provider,
    productionSuitable: false,
    signedUrlReady: false,
    virusScanReady: false,
    missing: [],
    createUploadIntent({ fileId, storagePath, expiresAt }) {
      return {
        uploadIntentId: `upload-${fileId}`,
        provider,
        uploadUrl: null,
        signedUploadUrl: null,
        expiresAt,
        requiredHeaders: {
          "x-rentashub-upload-mode": "metadata-only-placeholder",
        },
        message: "Local placeholder mode stores metadata only. No binary file upload or signed URL is active.",
      };
    },
    readiness() {
      return {
        provider,
        selectedProvider: provider,
        ready: true,
        productionSuitable: false,
        signedUrlReady: false,
        virusScanReady: false,
        missing: [],
        maxUploadMb: options.maxUploadMb,
        message: "Local placeholder storage is safe for metadata-only development review, not production file storage.",
      };
    },
  };
}
