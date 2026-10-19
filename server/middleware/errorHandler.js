export function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal server error.";
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let fields = err.fields;

  // Invalid Mongoose ObjectId or cast value
  if (err.name === "CastError") {
    status = 400;
    message = "Invalid value provided.";
    code = "INVALID_VALUE";
  }

  // Mongoose schema validation failures
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed.";
    code = "VALIDATION_ERROR";
    fields = Object.fromEntries(
      Object.entries(err.errors).map(([field, error]) => [
        field,
        error.message,
      ]),
    );
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    status = 409;
    message = "A record with this value already exists.";
    code = "DUPLICATE_RECORD";
  }

  if (status >= 500) {
    console.error(err);
    message = "Internal server error.";
    code = "INTERNAL_SERVER_ERROR";
  }

  res.status(status).json({
    message,
    code,
    ...(fields ? { fields } : {}),
  });
}
