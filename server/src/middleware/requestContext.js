import { randomUUID } from "node:crypto";

export function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || `req-${randomUUID()}`;
  req.requestId = String(requestId);
  res.setHeader("X-Request-ID", req.requestId);
  next();
}
