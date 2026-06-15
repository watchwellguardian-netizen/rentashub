export function errorHandler(error, req, res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.json(error.statusCode || 500, {
    error: error.code || "server_error",
    message: error.publicMessage || "A controlled server error occurred.",
    details: error.details || [],
    requestId: req.requestId || "",
    ...(isProduction ? {} : { debugCode: error.code || "server_error" }),
  });
}

export function notFound(req, res) {
  res.json(404, {
    error: "not_found",
    message: "The requested API route was not found.",
    requestId: req.requestId || "",
  });
}
