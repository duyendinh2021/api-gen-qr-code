import { Request, Response, NextFunction } from 'express';
import { SimpleLogger } from '../infrastructure/adapters/external/SimpleLogger';
import { v4 as uuidv4 } from 'uuid';

export interface LoggingMiddlewareOptions {
  logger?: SimpleLogger;
  includeBody?: boolean;
  includeHeaders?: boolean;
  maxBodySize?: number;
  sensitiveFields?: string[];
}

export class LoggingMiddleware {
  private logger: SimpleLogger;
  private options: Required<LoggingMiddlewareOptions>;

  constructor(options: LoggingMiddlewareOptions = {}) {
    this.options = {
      logger: options.logger || new SimpleLogger('info', true),
      includeBody: options.includeBody ?? true,
      includeHeaders: options.includeHeaders ?? false,
      maxBodySize: options.maxBodySize || 1000,
      sensitiveFields: options.sensitiveFields || ['password', 'token', 'apikey', 'authorization'],
    };
    this.logger = this.options.logger;
  }

  /**
   * Enhanced request/response logging middleware with correlation IDs
   */
  enhancedLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Generate correlation ID if not present
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = `req_${Date.now()}_${uuidv4().slice(0, 8)}`;
      }
      
      const requestId = req.headers['x-request-id'] as string;
      
      // Log request details
      this.logRequest(req, requestId, startTime);
      
      // Capture original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;
      
      let responseBody: any;
      let statusCode = 200;
      
      // Override res.status to capture status code
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };
      
      // Override res.json to capture response body
      res.json = function(body: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };
      
      // Override res.send to capture response body
      res.send = function(body: any) {
        if (!responseBody) {
          responseBody = body;
        }
        return originalSend.call(this, body);
      };
      
      // Log response when finished
      res.on('finish', () => {
        this.logResponse(req, res, requestId, startTime, statusCode, responseBody);
      });
      
      // Log errors
      res.on('error', (error: Error) => {
        this.logError(req, requestId, error, Date.now() - startTime);
      });
      
      next();
    };
  }

  /**
   * Parameter extraction logging middleware
   */
  logParameterExtraction() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      
      try {
        const extractedParams = this.extractParameters(req);
        
        this.logger.info('Parameters extracted', {
          requestId,
          method: req.method,
          path: req.path,
          parameters: extractedParams,
          extractionSuccess: true,
        });
        
        // Store extracted params in request for later use
        (req as any).extractedParams = extractedParams;
        
      } catch (error) {
        this.logger.error('Parameter extraction failed', error as Error, {
          requestId,
          method: req.method,
          path: req.path,
        });
      }
      
      next();
    };
  }

  /**
   * Performance monitoring middleware
   */
  performanceMonitoring() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const requestId = req.headers['x-request-id'] as string || 'unknown';
      
      // Add performance markers
      (req as any).performanceMarkers = {
        requestStart: startTime,
        markers: {} as Record<string, bigint>,
      };
      
      // Helper function to add performance markers
      (req as any).addPerformanceMarker = (name: string) => {
        (req as any).performanceMarkers.markers[name] = process.hrtime.bigint();
      };
      
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const totalDuration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        const performanceData = {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          totalDurationMs: Math.round(totalDuration * 100) / 100,
          markers: {} as Record<string, number>,
        };
        
        // Calculate marker durations
        const markers = (req as any).performanceMarkers?.markers || {};
        let previousTime = startTime;
        
        for (const [name, time] of Object.entries(markers)) {
          const duration = Number((time as bigint) - previousTime) / 1000000;
          performanceData.markers[name] = Math.round(duration * 100) / 100;
          previousTime = time as bigint;
        }
        
        this.logger.info('Request performance metrics', performanceData);
      });
      
      next();
    };
  }

  private logRequest(req: Request, requestId: string, startTime: number): void {
    const logData: any = {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    // Include headers if enabled
    if (this.options.includeHeaders) {
      logData.headers = this.sanitizeHeaders(req.headers);
    }

    // Include body if enabled and present
    if (this.options.includeBody && (req.body || req.query)) {
      const body = req.method === 'GET' ? req.query : req.body;
      if (body) {
        logData.body = this.sanitizeBody(body);
      }
    }

    this.logger.info('HTTP Request', logData);
  }

  private logResponse(
    req: Request,
    res: Response,
    requestId: string,
    startTime: number,
    statusCode: number,
    responseBody: any
  ): void {
    const duration = Date.now() - startTime;
    
    const logData: any = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      durationMs: duration,
      contentLength: res.get('content-length'),
      timestamp: new Date().toISOString(),
    };

    // Include response body for errors or if specifically requested
    if (this.options.includeBody && (statusCode >= 400 || responseBody)) {
      logData.responseBody = this.sanitizeBody(responseBody);
    }

    // Determine log level based on status code
    if (statusCode >= 500) {
      this.logger.error('HTTP Response - Server Error', logData);
    } else if (statusCode >= 400) {
      this.logger.warn('HTTP Response - Client Error', logData);
    } else {
      this.logger.info('HTTP Response - Success', logData);
    }
  }

  private logError(req: Request, requestId: string, error: Error, duration: number): void {
    this.logger.error('HTTP Request Error', error, {
      requestId,
      method: req.method,
      path: req.path,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  }

  private extractParameters(req: Request): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract from body (POST requests)
    if (req.body && typeof req.body === 'object') {
      Object.assign(params, req.body);
    }
    
    // Extract from query (GET requests)
    if (req.query && typeof req.query === 'object') {
      Object.assign(params, req.query);
    }
    
    // Extract from route params
    if (req.params && typeof req.params === 'object') {
      Object.assign(params, req.params);
    }
    
    return this.sanitizeBody(params);
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    
    for (const field of this.options.sensitiveFields) {
      if (sanitized[field.toLowerCase()]) {
        sanitized[field.toLowerCase()] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return this.truncateIfNeeded(body);
    }
    
    const sanitized = Array.isArray(body) ? [...body] : { ...body };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (this.options.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = this.truncateIfNeeded(value);
      }
    }
    
    return sanitized;
  }

  private truncateIfNeeded(value: any): any {
    if (typeof value === 'string' && value.length > this.options.maxBodySize) {
      return value.substring(0, this.options.maxBodySize) + '... [TRUNCATED]';
    }
    return value;
  }
}