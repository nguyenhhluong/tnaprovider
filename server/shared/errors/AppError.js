const ERROR_CODES = {
  VALIDATION_FAILED: { status: 422, message: "Validation failed" },
  AUTHENTICATION_REQUIRED: { status: 401, message: "Authentication required" },
  PERMISSION_DENIED: { status: 403, message: "Permission denied" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource conflict" },
  INVALID_STATE_TRANSITION: { status: 400, message: "Invalid state transition" },
  DATABASE_ERROR: { status: 500, message: "Database error" },
  MAIL_DELIVERY_FAILED: { status: 500, message: "Mail delivery failed" },
  PDF_GENERATION_FAILED: { status: 500, message: "PDF generation failed" },
  RATE_NOT_CONFIGURED: { status: 400, message: "Rate not configured" },
  MIGRATION_FAILED: { status: 500, message: "Migration failed" },
  INTERNAL_ERROR: { status: 500, message: "Internal error" },
};

export class AppError extends Error {
  constructor(code, message, fields) {
    const config = ERROR_CODES[code] || ERROR_CODES.INTERNAL_ERROR;
    super(message || config.message);
    this.name = "AppError";
    this.code = code;
    this.status = config.status;
    this.fields = fields || undefined;
  }
}

export function getErrorCode(status) {
  for (const [code, config] of Object.entries(ERROR_CODES)) {
    if (config.status === status) return code;
  }
  return "INTERNAL_ERROR";
}
