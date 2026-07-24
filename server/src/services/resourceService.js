import { getRepositories } from "./persistenceService.js";
import {
  CORE_RENTAL_AUDIT_ACTIONS,
  prepareBookingCreate,
  prepareBookingUpdate,
  validateAssetForRental,
} from "./coreRentalService.js";

function validationError(details) {
  const error = new Error("The request contains validation errors.");
  error.statusCode = 400;
  error.code = "validation_error";
  error.publicMessage = "Please correct the highlighted fields.";
  error.details = details;
  return error;
}

function notFound(resourceName) {
  const error = new Error(`${resourceName} was not found.`);
  error.statusCode = 404;
  error.code = "not_found";
  error.publicMessage = `${resourceName} was not found.`;
  return error;
}

const REQUIRED_FIELDS = {
  assets: ["owner_id", "title", "category", "listing_type"],
  bookings: ["asset_id", "customer_id", "supplier_id"],
  inspections: ["booking_id", "asset_id", "type", "condition_status"],
};

function validateRequired(resourceName, payload, fields) {
  const missing = fields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === "");
  if (missing.length) {
    throw validationError(missing.map((field) => ({ field, message: `${field} is required.` })));
  }
}

export function createResourceService(resourceName, options = {}) {
  const context = options.context || options;

  async function repository() {
    const repositories = await getRepositories(context);
    return repositories[resourceName];
  }

  async function audit(action, entityId, req, metadata = {}) {
    const repositories = await getRepositories(context);
    await repositories.audit_logs.record(action, resourceName.slice(0, -1) || resourceName, {
      actor_id: req.user?.id || "anonymous",
      entity_id: entityId,
      resource: resourceName,
      ...metadata,
    });
  }

  return {
    async list(filter = {}) {
      return (await repository()).list(filter);
    },

    async findById(id) {
      const record = await (await repository()).findById(id);
      if (!record) throw notFound(resourceName.slice(0, -1));
      return record;
    },

    async create(payload, req) {
      validateRequired(resourceName, payload, REQUIRED_FIELDS[resourceName] || []);
      if (resourceName === "assets") validateAssetForRental(payload);
      let preparedPayload = payload;
      let idempotent = null;
      if (resourceName === "bookings") {
        const repositories = await getRepositories(context);
        const prepared = await prepareBookingCreate(repositories, payload, req);
        preparedPayload = prepared.payload;
        idempotent = prepared.idempotent || null;
      }
      if (idempotent) return idempotent;
      const record = await (await repository()).create(preparedPayload);
      const action = resourceName === "bookings" ? CORE_RENTAL_AUDIT_ACTIONS.bookingRequested : `${resourceName}.created`;
      await audit(action, record.id, req);
      return record;
    },

    async update(id, payload, req) {
      let preparedPayload = payload;
      if (resourceName === "bookings") {
        const repositories = await getRepositories(context);
        const prepared = await prepareBookingUpdate(repositories, id, payload);
        if (prepared.missing) throw notFound(resourceName.slice(0, -1));
        preparedPayload = prepared.payload;
      }
      const updated = await (await repository()).update(id, preparedPayload);
      if (!updated) throw notFound(resourceName.slice(0, -1));
      const action = resourceName === "bookings" && payload.status ? CORE_RENTAL_AUDIT_ACTIONS.bookingStatusChanged : `${resourceName}.updated`;
      await audit(action, id, req);
      return updated;
    },

    async softDelete(id, req) {
      const deleted = await (await repository()).softDelete(id);
      if (!deleted) throw notFound(resourceName.slice(0, -1));
      await audit(`${resourceName}.deleted`, id, req, { softDelete: true });
      return deleted;
    },
  };
}
