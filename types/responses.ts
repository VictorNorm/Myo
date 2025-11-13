/**
 * Standard success response format for all API endpoints
 * Used for 200, 201 status codes
 */
export interface SuccessResponse<T> {
  data: T;
  message: string;
}

/**
 * Standard error response format
 * Used for 400, 401, 403, 404, 500 status codes (except validation errors)
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: string; // Only included in development environment
}

/**
 * Validation error response format
 * Used specifically for 400 status codes with express-validator errors
 */
export interface ValidationErrorResponse {
  error: "validation_failed";
  message: string;
  errors: Array<{
    field?: string;
    message: string;
    type?: string;
    value?: any;
  }>;
}

/**
 * Helper function to create standardized success responses
 * @param data - The response data (can be any type)
 * @param message - Success message
 * @returns Standardized success response object
 */
export const success = <T>(data: T, message: string): SuccessResponse<T> => ({
  data,
  message,
});

/**
 * Helper function to create standardized error responses
 * @param error - Error code (e.g., "not_found", "unauthorized")
 * @param message - Human-readable error message
 * @param details - Optional error details (development only)
 * @returns Standardized error response object
 */
export const error = (
  error: string,
  message: string,
  details?: string
): ErrorResponse => {
  const response: ErrorResponse = { error, message };
  
  // Only include details in development
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }
  
  return response;
};

/**
 * Helper function to create standardized validation error responses
 * @param errors - Array of validation errors from express-validator
 * @param message - Optional custom message (defaults to "Validation failed")
 * @returns Standardized validation error response object
 */
export const validationError = (
  errors: Array<any>,
  message: string = "Validation failed"
): ValidationErrorResponse => ({
  error: "validation_failed",
  message,
  errors: errors.map(err => ({
    field: err.path || err.param,
    message: err.msg,
    type: err.type,
    value: err.value,
  })),
});

/**
 * Standard error codes used across the API
 */
export const ErrorCodes = {
  // Client errors (4xx)
  VALIDATION_FAILED: "validation_failed",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  
  // Server errors (5xx)
  INTERNAL_ERROR: "internal_server_error",
  DATABASE_ERROR: "database_error",
} as const;