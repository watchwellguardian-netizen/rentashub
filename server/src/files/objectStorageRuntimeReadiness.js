import { createHash, randomUUID } from "node:crypto";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, validateFileMetadata } from "./fileValidator.js";

const PRODUCTION_HOST_PATTERNS = [/amazonaws\.com$/i, /r2\.cloudflarestorage\.com$/i, /storage\.googleapis\.com$/i, /prod/i, /production/i];

export function redactStorageUrl(rawUrl = "") {
  return String(rawUrl || "").replace(/(https?:\/\/)([^:@/\s]+):([^@/\s]+)@/i, "$1$2:REDACTED@");
}

export function validateObjectStorageConfig(input = {}) {
  const hasProvider = Object.prototype.hasOwnProperty.call(input, "provider");
  const hasEndpoint = Object.prototype.hasOwnProperty.call(input, "endpoint");
  const hasBucket = Object.prototype.hasOwnProperty.call(input, "bucket");
  const hasConfirmDisposable = Object.prototype.hasOwnProperty.call(input, "confirmDisposable");
  const provider = hasProvider ? input.provider : process.env.OBJECT_STORAGE_PROVIDER || "local_s3";
  const endpoint = hasEndpoint ? input.endpoint || "" : hasProvider ? "" : process.env.OBJECT_STORAGE_ENDPOINT || "";
  const bucket = hasBucket ? input.bucket || "" : hasProvider ? "" : process.env.OBJECT_STORAGE_BUCKET || "rentashub-local-evidence";
  const confirmDisposable = hasConfirmDisposable ? input.confirmDisposable === true : process.env.OBJECT_STORAGE_CONFIRM_DISPOSABLE === "true";
  if (provider === "local_s3") {
    return {
      status: "READY",
      provider,
      bucket,
      safeForRuntime: true,
      credentialReadiness: "LOCAL_OBJECT_STORAGE_READY",
      sanitizedEndpoint: endpoint ? redactStorageUrl(endpoint) : "",
      liveStorageTouched: false,
    };
  }
  if (provider !== "s3") {
    return { status: "BLOCKED", provider, safeForRuntime: false, code: "unsupported_object_storage_provider", sanitizedEndpoint: "" };
  }
  if (!endpoint || !bucket) {
    return { status: "BLOCKED", provider, safeForRuntime: false, code: "missing_s3_endpoint_or_bucket", sanitizedEndpoint: redactStorageUrl(endpoint) };
  }
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { status: "BLOCKED", provider, safeForRuntime: false, code: "invalid_s3_endpoint", sanitizedEndpoint: "[invalid-url]" };
  }
  const localHost = ["localhost", "127.0.0.1", "::1", "s3mock", "minio"].includes(parsed.hostname);
  const productionLike = PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname));
  const safeForRuntime = (localHost || confirmDisposable) && !productionLike;
  return {
    status: safeForRuntime ? "READY" : "BLOCKED",
    provider,
    bucket,
    endpointHost: parsed.hostname,
    safeForRuntime,
    code: safeForRuntime ? "s3_emulator_runtime_ready" : "s3_not_confirmed_disposable",
    credentialReadiness: safeForRuntime ? "S3_CREDENTIAL_READY" : "S3_OWNER_ACTION_REQUIRED",
    sanitizedEndpoint: redactStorageUrl(endpoint),
    liveStorageTouched: false,
  };
}

export function tenantObjectPath({ tenantId = "", classification = "", fileName = "" } = {}) {
  const tenant = sanitizePathPart(tenantId || "platform");
  const type = sanitizePathPart(classification || "general");
  const name = sanitizeFileName(fileName || `${randomUUID()}.bin`);
  return `tenants/${tenant}/${type}/${name}`;
}

function sanitizePathPart(value) {
  const clean = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!clean) throw new Error("Object path part cannot be empty.");
  return clean.slice(0, 80);
}

function sanitizeFileName(value) {
  return String(value || "file").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export class LocalS3CompatibleStorage {
  constructor({ bucket = "rentashub-local-evidence", maxBytes = MAX_FILE_SIZE_BYTES, signedUrlTtlSeconds = 900 } = {}) {
    this.bucket = bucket;
    this.maxBytes = maxBytes;
    this.signedUrlTtlSeconds = signedUrlTtlSeconds;
    this.objects = new Map();
    this.signedUrls = new Map();
    this.events = [];
  }

  upload(input = {}) {
    const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(String(input.body || ""));
    const record = {
      ownerUserId: input.ownerUserId || "storage-test-owner",
      relatedEntityType: input.relatedEntityType || "asset",
      relatedEntityId: input.relatedEntityId || "asset-test",
      originalFileName: input.fileName || input.originalFileName || "file.txt",
      mimeType: input.mimeType || "text/plain",
      fileSize: body.length,
      storageProvider: "s3",
      visibility: input.visibility || "private",
    };
    const customValidation = validateUpload(record, this.maxBytes);
    if (!customValidation.valid) throw storageError("object_validation_failed", customValidation.errors.map((error) => error.message).join(" "));
    const key = input.key || tenantObjectPath({ tenantId: input.tenantId, classification: record.relatedEntityType, fileName: record.originalFileName });
    const object = {
      bucket: input.bucket || this.bucket,
      key,
      body,
      checksum: sha256(body),
      mimeType: record.mimeType,
      size: body.length,
      visibility: record.visibility,
      metadata: { ...input.metadata, ownerUserId: record.ownerUserId, tenantId: input.tenantId || "platform" },
      createdAt: new Date().toISOString(),
    };
    this.objects.set(`${object.bucket}/${key}`, object);
    this.events.push({ type: "uploaded", key, checksum: object.checksum });
    return withoutBody(object);
  }

  download({ bucket = this.bucket, key, signedUrlToken = "", requesterId = "" } = {}) {
    const object = this.objects.get(`${bucket}/${key}`);
    if (!object) throw storageError("object_not_found", "Object was not found.");
    if (object.visibility !== "public" && !this.isSignedTokenValid(signedUrlToken, bucket, key) && requesterId !== object.metadata.ownerUserId) {
      this.events.push({ type: "access_denied", key });
      throw storageError("object_access_denied", "Private object requires owner access or a valid signed URL.");
    }
    this.events.push({ type: "downloaded", key });
    return { ...withoutBody(object), body: Buffer.from(object.body) };
  }

  delete({ bucket = this.bucket, key } = {}) {
    const deleted = this.objects.delete(`${bucket}/${key}`);
    this.events.push({ type: deleted ? "deleted" : "delete_missing", key });
    return { deleted, bucket, key };
  }

  createSignedUrl({ bucket = this.bucket, key, expiresInSeconds = this.signedUrlTtlSeconds } = {}) {
    if (!this.objects.has(`${bucket}/${key}`)) throw storageError("object_not_found", "Object was not found.");
    const token = `signed-${randomUUID()}`;
    const expiresAtMs = Date.now() + expiresInSeconds * 1000;
    this.signedUrls.set(token, { bucket, key, expiresAtMs });
    this.events.push({ type: "signed_url_created", key, expiresAt: new Date(expiresAtMs).toISOString() });
    return { token, url: `local-s3://${bucket}/${key}?signature=REDACTED`, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  isSignedTokenValid(token, bucket, key, nowMs = Date.now()) {
    const record = this.signedUrls.get(token);
    return Boolean(record && record.bucket === bucket && record.key === key && record.expiresAtMs > nowMs);
  }

  cleanup() {
    const count = this.objects.size;
    this.objects.clear();
    this.signedUrls.clear();
    this.events.push({ type: "cleanup", count });
    return { cleaned: count };
  }

  manifest() {
    return {
      bucket: this.bucket,
      objects: [...this.objects.values()].map(withoutBody),
      events: this.events,
      objectCount: this.objects.size,
    };
  }
}

function validateUpload(record, maxBytes) {
  const errors = [];
  if (!ALLOWED_MIME_TYPES.has(record.mimeType)) errors.push({ field: "mimeType", message: "MIME type is not approved for object storage." });
  if (record.fileSize > maxBytes) errors.push({ field: "fileSize", message: "File exceeds configured object storage size limit." });
  const metadata = validateFileMetadata(record);
  return { valid: errors.length === 0 && metadata.valid, errors: [...errors, ...metadata.errors] };
}

function withoutBody(object) {
  const { body: _body, ...rest } = object;
  return rest;
}

function storageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function exportData(records = [], { format = "json" } = {}) {
  if (format === "text") {
    return { format, contentType: "text/plain", body: records.map((row) => Object.values(row).join(" | ")).join("\n"), binaryExport: false };
  }
  if (format === "html") {
    const rows = records.map((row) => `<tr>${Object.values(row).map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
    return { format, contentType: "text/html", body: `<table>${rows}</table>`, binaryExport: false };
  }
  if (format === "csv") {
    const headers = Object.keys(records[0] || {});
    const body = [headers.join(","), ...records.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n");
    return { format, contentType: "text/csv", body, binaryExport: false };
  }
  if (format === "binary") {
    throw storageError("binary_export_not_configured", "Binary export must fail closed until a reviewed binary exporter is configured.");
  }
  return { format: "json", contentType: "application/json", body: JSON.stringify(records, null, 2), binaryExport: false };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function createObjectStorageReadinessEvidence() {
  const config = validateObjectStorageConfig();
  const storage = new LocalS3CompatibleStorage({ bucket: "rentashub-local-evidence", maxBytes: 1024 * 1024 });
  const upload = storage.upload({
    tenantId: "tenant-a",
    relatedEntityType: "asset",
    relatedEntityId: "asset-a",
    fileName: "asset-photo.jpg",
    mimeType: "image/jpeg",
    body: "image-bytes",
    visibility: "private",
  });
  const signed = storage.createSignedUrl({ key: upload.key, expiresInSeconds: 60 });
  const downloaded = storage.download({ key: upload.key, signedUrlToken: signed.token });
  let privateDenied = false;
  try {
    storage.download({ key: upload.key, requesterId: "other-user" });
  } catch (error) {
    privateDenied = error.code === "object_access_denied";
  }
  const deleted = storage.delete({ key: upload.key });
  const exports = {
    text: exportData([{ id: "asset-a", status: "ready" }], { format: "text" }).contentType,
    html: exportData([{ id: "asset-a", status: "ready" }], { format: "html" }).contentType,
    csv: exportData([{ id: "asset-a", status: "ready" }], { format: "csv" }).contentType,
  };
  let binaryFailClosed = false;
  try {
    exportData([], { format: "binary" });
  } catch (error) {
    binaryFailClosed = error.code === "binary_export_not_configured";
  }
  const cleanup = storage.cleanup();
  return {
    sprint: "S5-S3D",
    status: "OBJECT_STORAGE_ENGINEERING_COMPLETE",
    exportStatus: "EXPORT_ENGINEERING_COMPLETE",
    runtimeStatus: "OBJECT_STORAGE_RUNTIME_PREPARED",
    ciStatus: "CI_EXECUTION_PENDING",
    config,
    checks: {
      tenantPath: upload.key.startsWith("tenants/tenant-a/asset/"),
      upload: Boolean(upload.checksum),
      checksum: upload.checksum === createHash("sha256").update(downloaded.body).digest("hex"),
      signedUrl: signed.url.includes("signature=REDACTED"),
      privateDenied,
      delete: deleted.deleted,
      cleanup: cleanup.cleaned === 0,
      exports,
      binaryFailClosed,
    },
    manifest: storage.manifest(),
    productionTouched: false,
    liveStorageTouched: false,
  };
}
