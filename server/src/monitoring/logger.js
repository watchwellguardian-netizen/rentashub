const SECRET_KEY_PATTERN = /(secret|token|key|password|authorization|cookie|dsn|database_url|service_role)/i;

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redactSecrets(nested)]),
    );
  }
  if (typeof value === "string" && /(Bearer\s+|sk_|sb_|whsec_|postgres:\/\/|postgresql:\/\/)/i.test(value)) return "[REDACTED]";
  return value;
}

export function createLogger(options = {}) {
  const sink = options.sink || console;
  const level = String(options.level || process.env.LOG_LEVEL || "info").toLowerCase();
  const enabled = level !== "silent";

  function write(event, payload = {}) {
    if (!enabled) return;
    const entry = redactSecrets({
      timestamp: new Date().toISOString(),
      service: "rentashub-api",
      event,
      level,
      ...payload,
    });
    sink.log(JSON.stringify(entry));
  }

  return {
    write,
    requestStart(req) {
      write("request.start", { requestId: req.requestId, method: req.method, path: req.path || req.url, userId: req.user?.id || "", role: req.user?.role || "" });
    },
    requestEnd(req, res, startedAt) {
      write("request.end", { requestId: req.requestId, method: req.method, path: req.path || req.url, statusCode: res.statusCode, durationMs: Date.now() - startedAt });
    },
    error(error, req) {
      write("error", { requestId: req?.requestId || "", code: error.code || "server_error", message: error.publicMessage || error.message || "Controlled error" });
    },
    event(event) {
      write("incident.event", event);
    },
  };
}

export const logger = createLogger();
