import { createRepositories } from "../repositories/index.js";
import { getCoreRentalActionMatrix } from "../services/coreRentalService.js";
import { executeCoreRentalPersistenceAction, getCoreRentalPersistenceReadiness, readCoreRentalBooking } from "../services/coreRentalPersistenceAdapter.js";

export function createCoreRentalController(options = {}) {
  const context = options.context || options;

  function activeContext() {
    return {
      ...context,
      repositories: context.repositories || (context.database ? createRepositories(context.database) : context.repositories),
    };
  }

  return {
    async actions(req, res) {
      res.json(200, {
        resource: "core-rental-actions",
        count: getCoreRentalActionMatrix().length,
        data: getCoreRentalActionMatrix(),
      });
    },

    async readiness(req, res) {
      res.json(200, {
        resource: "core-rental-persistence-readiness",
        data: getCoreRentalPersistenceReadiness(activeContext()),
      });
    },

    async quote(req, res) {
      const result = await executeCoreRentalPersistenceAction(activeContext(), "quotePrice", req.body || {}, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },

    async checkAvailability(req, res) {
      const result = await executeCoreRentalPersistenceAction(activeContext(), "checkAvailability", req.body || {}, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },

    async createAsset(req, res) {
      const result = await executeCoreRentalPersistenceAction(activeContext(), "createAsset", req.body || {}, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },

    async runListingAction(req, res) {
      const actionMap = {
        moderate: "moderateListing",
        publish: "publishListing",
      };
      const action = actionMap[req.params.action] || req.params.action;
      const result = await executeCoreRentalPersistenceAction(activeContext(), action, { ...(req.body || {}), asset_id: req.params.id }, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },

    async requestBooking(req, res) {
      const result = await executeCoreRentalPersistenceAction(activeContext(), "requestBooking", req.body || {}, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },

    async readBooking(req, res) {
      const result = await readCoreRentalBooking(activeContext(), req.params.id, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },

    async runBookingAction(req, res) {
      const actionMap = {
        accept: "acceptBooking",
        reject: "rejectBooking",
        "payment-required": "requirePayment",
        confirm: "confirmBooking",
        "trigger-contract": "triggerContract",
        "check-in": "checkIn",
        activate: "activateRental",
        "request-extension": "requestExtension",
        "approve-extension": "approveExtension",
        "reject-extension": "rejectExtension",
        "check-out": "checkOut",
        "calculate-final-charge": "calculateFinalCharge",
        "prepare-settlement": "prepareSettlement",
        "mark-review-eligible": "markReviewEligible",
        cancel: "cancelBooking",
        "open-dispute": "openDispute",
      };
      const action = actionMap[req.params.action] || req.params.action;
      const result = await executeCoreRentalPersistenceAction(activeContext(), action, { ...(req.body || {}), booking_id: req.params.id }, req);
      res.json(result.status, { resource: "core-rental", ...result });
    },
  };
}
