import { AppError } from "./AppError.js";

export function errorMiddleware(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.fields) {
      body.error.fields = err.fields;
    }
    return res.status(err.status).json(body);
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}
