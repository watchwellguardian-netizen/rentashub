export function auditLog(req, res, next) {
  req.audit = {
    method: req.method,
    path: req.url,
    userId: req.user?.id || "",
    actorRole: req.user?.role || "",
    requestId: req.requestId || "",
    ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
    timestamp: new Date().toISOString(),
    immutableStyle: true,
    retentionStatus: "retention_policy_placeholder",
    exportStatus: "export_ready_placeholder",
    note: "Audit context is provider-ready. External SIEM/log drain and compliance-certified immutable archive are not active.",
  };
  next();
}
