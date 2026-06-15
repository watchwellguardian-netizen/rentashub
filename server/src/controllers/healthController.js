import { getDatabaseReadiness, getHealth, getReadiness } from "../services/healthService.js";

export const healthController = {
  index(req, res) {
    res.json(200, getHealth());
  },
  readiness(req, res) {
    res.json(200, getReadiness());
  },
  database(req, res) {
    const payload = getDatabaseReadiness();
    res.json(payload.ok ? 200 : 503, payload);
  },
};
