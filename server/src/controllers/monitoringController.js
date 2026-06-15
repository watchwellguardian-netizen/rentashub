import { createIncidentEvent } from "../monitoring/incidentEvents.js";
import { createMonitoringProvider, getMonitoringReadiness } from "../monitoring/monitoringProvider.js";
import { createLogger } from "../monitoring/logger.js";

export function createMonitoringController(options = {}) {
  const env = options.env || process.env;
  const activeLogger = options.logger || createLogger({ sink: options.logSink, level: env.LOG_LEVEL || options.logLevel });
  return {
    observability(req, res) {
      res.json(200, {
        ok: true,
        module: "observability-readiness",
        monitoring: getMonitoringReadiness(env),
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      });
    },
    testEvent(req, res) {
      const monitoring = createMonitoringProvider(env);
      const event = createIncidentEvent({
        type: req.body?.type || "api_5xx_spike",
        severity: req.body?.severity || "test",
        message: req.body?.message || "Dev-safe monitoring test event.",
        requestId: req.requestId,
        actorId: req.user?.id || "anonymous",
        metadata: req.body?.metadata || {},
      });
      activeLogger.event(event);
      const delivery = monitoring.captureIncident(event);
      res.json(202, {
        ok: true,
        event,
        delivery,
        notice: "Monitoring test event is dev-safe. No real alert is sent unless provider clients are explicitly implemented and verified.",
      });
    },
  };
}
