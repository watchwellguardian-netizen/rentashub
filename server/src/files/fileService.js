import { createUploadIntent } from "./fileStorageAdapter.js";
import { validateFileMetadata } from "./fileValidator.js";
import { getRepositories } from "../services/persistenceService.js";

function appError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function now() {
  return new Date().toISOString();
}

function toRecord(input = {}, intent = {}) {
  const ownerId = input.ownerUserId || input.owner_id;
  const entityType = input.relatedEntityType || input.entity_type;
  const entityId = input.relatedEntityId || input.entity_id;
  const originalFileName = input.originalFileName || input.original_file_name || input.file_name;
  const storageProvider = input.storageProvider || input.storage_provider || intent.storageProvider || "local_placeholder";
  const timestamp = now();
  return {
    id: input.fileId || input.id || intent.fileId,
    owner_id: ownerId,
    entity_type: entityType,
    entity_id: entityId,
    file_name: originalFileName,
    original_file_name: originalFileName,
    stored_file_name: input.storedFileName || input.stored_file_name || intent.storedFileName,
    mime_type: input.mimeType || input.mime_type,
    file_size: Number(input.fileSize ?? input.file_size),
    storage_provider: storageProvider,
    storage_key: input.storagePath || input.storage_key || intent.storagePath || "",
    status: input.status || "pending_upload",
    visibility: input.visibility || "private",
    checksum: input.checksum || "",
    created_at: input.createdAt || input.created_at || timestamp,
    updated_at: input.updatedAt || input.updated_at || timestamp,
  };
}

function toApi(record) {
  if (!record) return null;
  return {
    fileId: record.id,
    ownerUserId: record.owner_id,
    relatedEntityType: record.entity_type,
    relatedEntityId: record.entity_id,
    originalFileName: record.original_file_name || record.file_name,
    storedFileName: record.stored_file_name,
    mimeType: record.mime_type,
    fileSize: record.file_size,
    storageProvider: record.storage_provider,
    storagePath: record.storage_key,
    status: record.status,
    visibility: record.visibility,
    checksum: record.checksum,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function canViewFile(user, file) {
  if (!user || !file || file.status === "deleted" || file.deleted_at) return false;
  if (user.role === "admin") return true;
  if (file.visibility === "public" && !["verification", "claim", "dispute"].includes(file.entity_type)) return true;
  if (file.owner_id === user.id) return true;
  if (user.role === "supplier" && ["asset", "inspection", "message"].includes(file.entity_type)) return true;
  if (user.role === "customer" && ["inspection", "claim", "dispute", "review", "message"].includes(file.entity_type)) return true;
  return false;
}

function canMutateFile(user, file) {
  if (!user || !file) return false;
  if (user.role === "admin") return true;
  return file.owner_id === user.id;
}

export function createFileService(options = {}) {
  async function repositories() {
    return getRepositories(options);
  }

  async function fileRepository() {
    return (await repositories()).file_metadata;
  }

  async function audit(action, fileId, req) {
    const repos = await repositories();
    await repos.audit_logs.record(action, "file_metadata", {
      actor_id: req.user?.id || "anonymous",
      entity_id: fileId,
      metadataOnly: true,
    });
  }

  return {
    async createUploadIntent(input, req) {
      const ownerUserId = input.ownerUserId || req.user?.id;
      const intent = createUploadIntent(input, { env: options.env, storageProvider: input.storageProvider || input.storage_provider, visibility: input.visibility || "private" });
      const record = toRecord({ ...input, ownerUserId, status: "pending_upload" }, intent);
      const validation = validateFileMetadata(record);
      if (!validation.valid) throw appError(400, "validation_error", "Please correct the highlighted file metadata fields.", validation.errors);
      const created = await (await fileRepository()).create(record);
      await audit("files.upload_intent.created", created.id, req);
      return { intent, file: toApi(created) };
    },

    async createMetadata(input, req) {
      const ownerUserId = input.ownerUserId || req.user?.id;
      const intent = createUploadIntent(input, { env: options.env, storageProvider: input.storageProvider || input.storage_provider, visibility: input.visibility || "private" });
      const record = toRecord({ ...input, ownerUserId, status: input.status || "uploaded_placeholder" }, intent);
      const validation = validateFileMetadata(record);
      if (!validation.valid) throw appError(400, "validation_error", "Please correct the highlighted file metadata fields.", validation.errors);
      const created = await (await fileRepository()).create(record);
      await audit("files.metadata.created", created.id, req);
      return toApi(created);
    },

    async list(query = {}, req) {
      const repo = await fileRepository();
      let files = query.relatedEntityType && query.relatedEntityId
        ? await repo.listByRelatedEntity(query.relatedEntityType, query.relatedEntityId)
        : query.ownerUserId
          ? await repo.listByOwner(query.ownerUserId)
          : await repo.list();
      files = files.filter((file) => canViewFile(req.user, file));
      return files.map(toApi);
    },

    async getById(fileId, req) {
      const file = await (await fileRepository()).findById(fileId);
      if (!file) throw appError(404, "not_found", "File metadata was not found.");
      if (!canViewFile(req.user, file)) throw appError(403, "forbidden", "You cannot access this file metadata.");
      return toApi(file);
    },

    async update(fileId, input, req) {
      const repo = await fileRepository();
      const file = await repo.findById(fileId);
      if (!file) throw appError(404, "not_found", "File metadata was not found.");
      if (!canMutateFile(req.user, file)) throw appError(403, "forbidden", "You cannot update this file metadata.");
      const next = toRecord({ ...file, ...input, id: fileId, updated_at: now() });
      const validation = validateFileMetadata(next);
      if (!validation.valid) throw appError(400, "validation_error", "Please correct the highlighted file metadata fields.", validation.errors);
      const updated = await repo.update(fileId, next);
      await audit("files.metadata.updated", fileId, req);
      return toApi(updated);
    },

    async softDelete(fileId, req) {
      const repo = await fileRepository();
      const file = await repo.findById(fileId);
      if (!file) throw appError(404, "not_found", "File metadata was not found.");
      if (!canMutateFile(req.user, file)) throw appError(403, "forbidden", "You cannot delete this file metadata.");
      const marked = await repo.update(fileId, { status: "deleted", updated_at: now() });
      await repo.softDelete(fileId);
      await audit("files.metadata.deleted", fileId, req);
      return toApi({ ...marked, status: "deleted" });
    },
  };
}
