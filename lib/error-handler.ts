export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "INTERNAL_ERROR",
  ) {
    super(message)
    this.name = "APIError"
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR")
  }
}

export class AuthenticationError extends APIError {
  constructor(message = "Unauthorized") {
    super(401, message, "AUTH_ERROR")
  }
}

export class NotFoundError extends APIError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND")
  }
}

export class RateLimitError extends APIError {
  constructor(message = "Too many requests", retryAfter?: number) {
    super(429, message, "RATE_LIMIT")
  }
}

export function handleError(error: unknown) {
  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    }
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("rate limit")) {
      return {
        statusCode: 429,
        code: "RATE_LIMIT",
        message: "API rate limit exceeded. Please try again later.",
      }
    }

    if (error.message.includes("authentication") || error.message.includes("unauthorized")) {
      return {
        statusCode: 401,
        code: "AUTH_ERROR",
        message: "Authentication failed",
      }
    }

    return {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: error.message,
    }
  }

  return {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  }
}
