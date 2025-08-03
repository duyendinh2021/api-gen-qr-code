import { Request, Response, NextFunction } from 'express';
import { SimpleLogger } from '../infrastructure/adapters/external/SimpleLogger';

export interface ValidationMiddlewareOptions {
  logger?: SimpleLogger;
  sanitizeInput?: boolean;
  maxRequestSize?: number;
}

export class ValidationMiddleware {
  private logger: SimpleLogger;
  private options: Required<ValidationMiddlewareOptions>;

  constructor(options: ValidationMiddlewareOptions = {}) {
    this.options = {
      logger: options.logger || new SimpleLogger('info', true),
      sanitizeInput: options.sanitizeInput ?? true,
      maxRequestSize: options.maxRequestSize || 1024 * 1024, // 1MB
    };
    this.logger = this.options.logger;
  }

  /**
   * Validates and sanitizes request body for QR code generation
   */
  validateQRCodeRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      const startTime = Date.now();

      try {
        // Log the validation start
        this.logger.info('Input validation started', {
          requestId,
          method: req.method,
          path: req.path,
          contentType: req.headers['content-type'],
        });

        // Check request size
        const requestSize = this.getRequestSize(req);
        if (requestSize > this.options.maxRequestSize) {
          this.logger.warn('Request size exceeds limit', {
            requestId,
            size: requestSize,
            limit: this.options.maxRequestSize,
          });
          
          return res.status(413).json({
            success: false,
            error: {
              code: 'REQUEST_TOO_LARGE',
              message: `Request size (${requestSize} bytes) exceeds maximum allowed size (${this.options.maxRequestSize} bytes)`,
              details: {
                maxSize: this.options.maxRequestSize,
                actualSize: requestSize,
              },
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              processingTimeMs: Date.now() - startTime,
            },
          });
        }

        // Validate content type for POST requests
        if (req.method === 'POST') {
          const contentType = req.headers['content-type'];
          if (!contentType || !contentType.includes('application/json')) {
            this.logger.warn('Invalid content type', {
              requestId,
              contentType,
              expected: 'application/json',
            });

            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_CONTENT_TYPE',
                message: 'Content-Type must be application/json for POST requests',
                details: {
                  received: contentType,
                  expected: 'application/json',
                },
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId,
              },
            });
          }
        }

        // Sanitize input if enabled
        if (this.options.sanitizeInput) {
          this.sanitizeRequest(req);
        }

        // Validate basic request structure
        const validationErrors = this.validateRequestStructure(req);
        if (validationErrors.length > 0) {
          this.logger.warn('Request structure validation failed', {
            requestId,
            errors: validationErrors,
          });

          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_REQUEST_STRUCTURE',
              message: 'Request structure validation failed',
              details: validationErrors,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
        }

        this.logger.info('Input validation completed successfully', {
          requestId,
          processingTimeMs: Date.now() - startTime,
        });

        next();
      } catch (error) {
        this.logger.error('Validation middleware error', error as Error, {
          requestId,
          method: req.method,
          path: req.path,
        });

        return res.status(500).json({
          success: false,
          error: {
            code: 'VALIDATION_MIDDLEWARE_ERROR',
            message: 'An error occurred during request validation',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
      }
    };
  }

  /**
   * Rate limiting middleware (basic implementation)
   */
  rateLimit(options: { windowMs: number; maxRequests: number }) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = this.getClientId(req);
      const now = Date.now();
      const windowMs = options.windowMs;
      const maxRequests = options.maxRequests;

      // Clean up expired entries
      const cutoff = now - windowMs;
      for (const [key, value] of requests.entries()) {
        if (value.resetTime < cutoff) {
          requests.delete(key);
        }
      }

      // Get or create client entry
      let clientData = requests.get(clientId);
      if (!clientData || clientData.resetTime < cutoff) {
        clientData = { count: 0, resetTime: now + windowMs };
        requests.set(clientId, clientData);
      }

      // Check rate limit
      if (clientData.count >= maxRequests) {
        const resetIn = Math.ceil((clientData.resetTime - now) / 1000);
        
        this.logger.warn('Rate limit exceeded', {
          clientId,
          requests: clientData.count,
          limit: maxRequests,
          resetIn,
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Limit: ${maxRequests} requests per ${windowMs / 1000} seconds`,
            details: {
              limit: maxRequests,
              windowMs,
              resetIn,
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || 'unknown',
          },
        });
      }

      // Increment counter
      clientData.count++;

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - clientData.count).toString(),
        'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString(),
      });

      next();
    };
  }

  private getRequestSize(req: Request): number {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    // Estimate size from body if available
    if (req.body) {
      return JSON.stringify(req.body).length;
    }
    
    return 0;
  }

  private sanitizeRequest(req: Request): void {
    // Sanitize body parameters
    if (req.body && typeof req.body === 'object') {
      this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      this.sanitizeObject(req.query);
    }
  }

  private sanitizeObject(obj: any): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic sanitization - remove potential XSS patterns
        obj[key] = value
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value);
      }
    }
  }

  private validateRequestStructure(req: Request): string[] {
    const errors: string[] = [];

    // Check for required data parameter
    const data = req.method === 'POST' ? req.body?.data : req.query?.data;
    if (!data) {
      errors.push('Missing required parameter: data');
    } else if (typeof data !== 'string') {
      errors.push('Parameter "data" must be a string');
    }

    // Validate optional parameters if present
    const params = req.method === 'POST' ? req.body : req.query;
    
    if (params.size && typeof params.size !== 'string') {
      errors.push('Parameter "size" must be a string');
    }
    
    if (params.format && typeof params.format !== 'string') {
      errors.push('Parameter "format" must be a string');
    }
    
    if (params.color && typeof params.color !== 'string') {
      errors.push('Parameter "color" must be a string');
    }
    
    if (params.bgcolor && typeof params.bgcolor !== 'string') {
      errors.push('Parameter "bgcolor" must be a string');
    }
    
    if (params.margin !== undefined && typeof params.margin !== 'number') {
      errors.push('Parameter "margin" must be a number');
    }
    
    if (params.qzone !== undefined && typeof params.qzone !== 'number') {
      errors.push('Parameter "qzone" must be a number');
    }

    return errors;
  }

  private getClientId(req: Request): string {
    // Use IP address as basic client identifier
    // In production, you might want to use more sophisticated identification
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
}