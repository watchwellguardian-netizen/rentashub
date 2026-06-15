export function validateRequest(schemaName = "placeholder") {
  return (req, res, next) => {
    req.validation = {
      schemaName,
      status: "placeholder",
      message: "Request validation scaffold. Add Zod or equivalent schemas during backend implementation.",
    };
    next();
  };
}
