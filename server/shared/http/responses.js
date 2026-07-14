export function success(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

export function successPaginated(res, data, pagination) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page || 1,
      pageSize: pagination.pageSize || pagination.perPage || 25,
      total: pagination.total || 0,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || 0) / (pagination.pageSize || pagination.perPage || 25)),
    },
  });
}

export function error(res, code, message, fields, status) {
  const statusMap = {
    VALIDATION_FAILED: 422,
    AUTHENTICATION_REQUIRED: 401,
    PERMISSION_DENIED: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INVALID_STATE_TRANSITION: 400,
    DATABASE_ERROR: 500,
    INTERNAL_ERROR: 500,
  };
  const httpStatus = status || statusMap[code] || 500;
  const body = {
    success: false,
    error: { code, message },
  };
  if (fields) body.error.fields = fields;
  return res.status(httpStatus).json(body);
}

export function created(res, data) {
  return success(res, data, 201);
}

export function noContent(res) {
  return res.status(204).end();
}
