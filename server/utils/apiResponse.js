// utils/apiResponse.js - Standardized API Response Handler

export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export const sendSuccessResponse = (res, statusCode, data, message = "Success") => {
  return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
};

export const sendErrorResponse = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    statusCode,
    message,
    errors,
    success: false,
  });
};

// Success response wrappers
export const ok = (res, data, message = "Success") =>
  sendSuccessResponse(res, 200, data, message);

export const created = (res, data, message = "Resource created successfully") =>
  sendSuccessResponse(res, 201, data, message);

export const accepted = (res, data, message = "Request accepted") =>
  sendSuccessResponse(res, 202, data, message);

export const noContent = (res) => res.status(204).send();

// Error response wrappers
export const badRequest = (res, message, errors = null) =>
  sendErrorResponse(res, 400, message, errors);

export const unauthorized = (res, message = "Unauthorized") =>
  sendErrorResponse(res, 401, message);

export const forbidden = (res, message = "Forbidden") =>
  sendErrorResponse(res, 403, message);

export const notFound = (res, message = "Resource not found") =>
  sendErrorResponse(res, 404, message);

export const conflict = (res, message = "Resource conflict") =>
  sendErrorResponse(res, 409, message);

export const unprocessableEntity = (res, message, errors = null) =>
  sendErrorResponse(res, 422, message, errors);

export const tooManyRequests = (res, message = "Too many requests") =>
  sendErrorResponse(res, 429, message);

export const internalServerError = (res, message = "Internal server error", errors = null) =>
  sendErrorResponse(res, 500, message, errors);

export const serviceUnavailable = (res, message = "Service unavailable") =>
  sendErrorResponse(res, 503, message);
