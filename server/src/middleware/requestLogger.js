import { createLogger } from "../monitoring/logger.js";

export function requestLogger(options = {}) {
  const activeLogger = options.logger || createLogger({ sink: options.logSink, level: options.logLevel });
  return (req, res, next) => {
    const startedAt = Date.now();
    activeLogger.requestStart(req);
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      activeLogger.requestEnd(req, res, startedAt);
      return originalEnd(...args);
    };
    next();
  };
}
