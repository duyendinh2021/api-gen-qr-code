import { Request, Response } from 'express';
import { GenerateQRCodeUseCase } from '../../../application/usecases/GenerateQRCodeUseCase';
import { QRCodeRequestDTO } from '../../../application/dto';
import { ILogger, IMetricsCollector } from '../../../application/ports';
import { ValidationError, RateLimitError } from '../../../shared/errors';

export class QRCodeController {
  constructor(
    private readonly generateQRCodeUseCase: GenerateQRCodeUseCase,
    private readonly logger: ILogger,
    private readonly metricsCollector: IMetricsCollector
  ) {}

  async generateQRCode(req: Request, res: Response): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';
    const startTime = Date.now();

    try {
      this.logger.info('QR Code generation request received', {
        requestId,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Extract parameters from both GET and POST requests
      const requestData: QRCodeRequestDTO = this.extractRequestData(req);

      // Validate required data parameter
      if (!requestData.data) {
        this.metricsCollector.incrementCounter('http_requests_total', {
          method: req.method,
          status: '400',
          endpoint: 'create-qr-code',
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_PARAMETER',
            message: 'The "data" parameter is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            version: '1.0.0',
          },
        });
        return;
      }

      // Generate QR code
      const result = await this.generateQRCodeUseCase.execute(requestData);

      if (result.success && result.data) {
        // Set appropriate headers
        res.set({
          'Content-Type': result.data.mimeType,
          'Content-Length': result.data.size.toString(),
          'X-QR-Code-ID': result.data.id,
          'X-Cache-Status': result.data.cacheHit ? 'HIT' : 'MISS',
          'X-Processing-Time': `${result.performance?.processingTimeMs}ms`,
        });

        this.metricsCollector.incrementCounter('http_requests_total', {
          method: req.method,
          status: '200',
          endpoint: 'create-qr-code',
        });
        this.metricsCollector.recordHistogram('http_request_duration_ms', Date.now() - startTime);

        // Send the image buffer
        res.status(200).send(result.data.image);
      } else {
        // Handle error response
        const statusCode = this.getErrorStatusCode(result.error?.code);

        this.metricsCollector.incrementCounter('http_requests_total', {
          method: req.method,
          status: statusCode.toString(),
          endpoint: 'create-qr-code',
        });

        res.status(statusCode).json({
          success: false,
          error: result.error,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            version: '1.0.0',
          },
        });
      }
    } catch (error) {
      this.logger.error('Unexpected error in QR code generation', error as Error, { requestId });

      this.metricsCollector.incrementCounter('http_requests_total', {
        method: req.method,
        status: '500',
        endpoint: 'create-qr-code',
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          version: '1.0.0',
        },
      });
    }
  }

  private extractRequestData(req: Request): QRCodeRequestDTO {
    // Support both GET (query params) and POST (body) requests
    const source = req.method === 'GET' || req.method === 'HEAD' ? req.query : req.body;

    if (!source) {
      return { data: '' };
    }

    return {
      data: source.data as string,
      size: source.size as string,
      format: source.format as string,
      ecc: source.ecc as string,
      color: source.color as string,
      bgcolor: source.bgcolor as string,
      margin: source.margin ? parseInt(source.margin as string, 10) : undefined,
      qzone: source.qzone ? parseInt(source.qzone as string, 10) : undefined,
      'charset-source': source['charset-source'] as string,
      'charset-target': source['charset-target'] as string,
    };
  }

  private getErrorStatusCode(errorCode?: string): number {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return 400;
      case 'NOT_FOUND':
        return 404;
      case 'RATE_LIMIT_EXCEEDED':
        return 429;
      case 'GENERATION_ERROR':
        return 422;
      default:
        return 500;
    }
  }

  // GET endpoint handler
  async handleGet(req: Request, res: Response): Promise<void> {
    await this.generateQRCode(req, res);
  }

  // POST endpoint handler
  async handlePost(req: Request, res: Response): Promise<void> {
    await this.generateQRCode(req, res);
  }

  // Options handler for CORS preflight
  async handleOptions(req: Request, res: Response): Promise<void> {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    });
    res.status(204).send();
  }
}
