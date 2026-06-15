export const RELATED_ENTITY_TYPES = new Set(["asset", "supplier_profile", "verification", "inspection", "dispute", "claim", "review", "message"]);
export const STORAGE_PROVIDERS = new Set(["local_placeholder", "s3", "cloudinary", "supabase", "s3_placeholder", "cloudinary_placeholder", "supabase_placeholder"]);
export const VISIBILITY_VALUES = new Set(["private", "public", "restricted"]);
export const FILE_STATUSES = new Set(["pending_upload", "uploaded_placeholder", "rejected", "deleted"]);
export const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set(["exe", "bat", "cmd", "com", "scr", "ps1", "js", "mjs", "vbs", "sh", "php", "jar", "dll", "msi", "html", "svg"]);
const EXTENSION_BY_MIME = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/jpg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "application/pdf": new Set(["pdf"]),
};

function extension(fileName = "") {
  const parts = String(fileName).toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

export function validateFileMetadata(input = {}, { requireOwner = true } = {}) {
  const errors = [];
  const fileName = input.originalFileName || input.file_name || input.original_file_name || "";
  const mimeType = input.mimeType || input.mime_type || "";
  const fileSize = Number(input.fileSize ?? input.file_size ?? 0);
  const entityType = input.relatedEntityType || input.entity_type;
  const entityId = input.relatedEntityId || input.entity_id;
  const storageProvider = input.storageProvider || input.storage_provider || "local_placeholder";
  const visibility = input.visibility || "private";
  const ext = extension(fileName);

  if (requireOwner && !(input.ownerUserId || input.owner_id)) errors.push({ field: "ownerUserId", message: "Owner user ID is required." });
  if (!entityType || !RELATED_ENTITY_TYPES.has(entityType)) errors.push({ field: "relatedEntityType", message: "Related entity type is required and must be supported." });
  if (!entityId) errors.push({ field: "relatedEntityId", message: "Related entity ID is required." });
  if (!fileName) errors.push({ field: "originalFileName", message: "Original file name is required." });
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) errors.push({ field: "mimeType", message: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed." });
  if (BLOCKED_EXTENSIONS.has(ext)) errors.push({ field: "originalFileName", message: "Executable or script-like files are blocked." });
  if (mimeType && EXTENSION_BY_MIME[mimeType] && !EXTENSION_BY_MIME[mimeType].has(ext)) {
    errors.push({ field: "originalFileName", message: "File extension does not match the MIME type." });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) errors.push({ field: "fileSize", message: "File size is required." });
  if (fileSize > MAX_FILE_SIZE_BYTES) errors.push({ field: "fileSize", message: `File size must be ${MAX_FILE_SIZE_BYTES} bytes or less.` });
  if (!STORAGE_PROVIDERS.has(storageProvider)) errors.push({ field: "storageProvider", message: "Storage provider placeholder is not supported." });
  if (!VISIBILITY_VALUES.has(visibility)) errors.push({ field: "visibility", message: "Visibility must be private, public, or restricted." });

  if (["verification", "inspection", "claim", "dispute", "message"].includes(entityType) && visibility === "public") {
    errors.push({ field: "visibility", message: `${entityType} files cannot be public.` });
  }

  return { valid: errors.length === 0, errors };
}
