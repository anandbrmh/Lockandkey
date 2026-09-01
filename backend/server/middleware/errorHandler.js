const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File too large. Max 5MB per image.";
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    message = err.message || "Unexpected file field";
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(statusCode).json({ success: false, message, errors });
  }

  if (message.includes("Only image/jpeg")) {
    statusCode = 400;
  }

  // Duplicate key (unique index) -> 409 Conflict
  if (err.code === 11000 || err.code === 11001) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "";
    if (field === "email") {
      message = "Email already registered";
    } else if (field === "nameLower") {
      message = "Person with this name already exists";
    } else {
      message = `${field} already exists${value ? `: ${value}` : ""}`;
    }
    return res.status(statusCode).json({ success: false, message });
  }

  // Mongoose buffering timeout -> DB not connected yet
  if (message.includes("buffering timed out") || message.includes("bufferTimeoutMS")) {
    statusCode = 503;
    message = "Database not ready, please retry in a moment";
  }

  // JWT misconfiguration
  if (message.includes("secretOrPrivateKey must have a value")) {
    statusCode = 500;
    message = "Server misconfigured: JWT_SECRET missing";
  }

  console.error(`[Error] ${req.method} ${req.originalUrl} -> ${message}`, err.stack?.split("\n")[1]?.trim() || "");

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
};

export default errorHandler;
