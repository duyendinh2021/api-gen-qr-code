export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400);
    this.details = details;
  }
  
  public details?: any;
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class CacheError extends AppError {
  constructor(message: string, operation?: string) {
    super(message, 'CACHE_ERROR', 500);
    this.operation = operation;
  }
  
  public operation?: string;
}

export class GenerationError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'GENERATION_ERROR', 500);
    this.cause = cause;
  }
  
  public cause?: Error;
}

export class RateLimitError extends AppError {
  constructor(limit: number, windowMs: number) {
    super(`Rate limit exceeded: ${limit} requests per ${windowMs}ms`, 'RATE_LIMIT_EXCEEDED', 429);
    this.limit = limit;
    this.windowMs = windowMs;
  }
  
  public limit: number;
  public windowMs: number;
}

export class ConfigurationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'CONFIGURATION_ERROR', 400);
    this.field = field;
  }
  
  public field?: string;
}