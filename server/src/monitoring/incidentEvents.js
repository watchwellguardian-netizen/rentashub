export const INCIDENT_EVENT_TYPES = [
  "auth_failure_spike",
  "payment_failure_spike",
  "storage_failure",
  "database_failure",
  "api_5xx_spike",
  "provider_webhook_failure",
  "suspicious_admin_activity",
];

export function createIncidentEvent({ type, severity = "test", message = "", requestId = "", actorId = "system", metadata = {} } = {}) {
  const eventType = INCIDENT_EVENT_TYPES.includes(type) ? type : "api_5xx_spike";
  return {
    id: `incident-${Date.now()}`,
    type: eventType,
    severity,
    message: message || `Dev-safe ${eventType} monitoring event.`,
    requestId,
    actorId,
    metadata,
    createdAt: new Date().toISOString(),
    simulated: true,
  };
}
