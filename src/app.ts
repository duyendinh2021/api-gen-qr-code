import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Domain and Application imports
import { ValidateParametersUseCase } from './application/usecases/ValidateParametersUseCase';
import { CacheManagementUseCase } from './application/usecases/CacheManagementUseCase';  
import { GenerateQRCodeUseCase } from './application/usecases/GenerateQRCodeUseCase';

// Infrastructure imports
import { InMemoryCacheRepository } from './infrastructure/adapters/repositories/InMemoryCacheRepository';
import { SimpleLogger } from './infrastructure/adapters/external/SimpleLogger';
import { QRCodeJSAdapter } from './infrastructure/adapters/external/QRCodeJSAdapter';
import { SimpleMetricsCollector } from './infrastructure/adapters/external/SimpleMetricsCollector';
import { QRCodeController } from './infrastructure/adapters/controllers/QRCodeController';
import { HealthController } from './infrastructure/adapters/controllers/HealthController';
import { loadConfig, AppConfig } from './infrastructure/config/app.config';

// Middleware imports
import { ValidationMiddleware, LoggingMiddleware } from './middleware';

// Shared imports
import { AppError } from './shared/errors';

class QRCodeGeneratorApp {
  private app: Application;
  private config: AppConfig;
  
  // Dependencies
  private logger!: SimpleLogger;
  private metricsCollector!: SimpleMetricsCollector;
  private cacheRepository!: InMemoryCacheRepository;
  private qrCodeGenerator!: QRCodeJSAdapter;
  
  // Middleware
  private validationMiddleware!: ValidationMiddleware;
  private loggingMiddleware!: LoggingMiddleware;
  
  // Use Cases
  private validateParametersUseCase!: ValidateParametersUseCase;
  private cacheManagementUseCase!: CacheManagementUseCase;
  private generateQRCodeUseCase!: GenerateQRCodeUseCase;
  
  // Controllers
  private qrCodeController!: QRCodeController;
  private healthController!: HealthController;

  constructor() {
    this.config = loadConfig();
    this.app = express();
    
    this.initializeDependencies();
    this.initializeMiddleware();
    this.initializeUseCases();
    this.initializeControllers();
    this.initializeExpressMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeDependencies(): void {
    // Infrastructure dependencies
    this.logger = new SimpleLogger(this.config.logging.level, this.config.logging.enableConsole);
    this.metricsCollector = new SimpleMetricsCollector();
    this.cacheRepository = new InMemoryCacheRepository(
      this.config.cache.maxKeys,
      this.config.cache.ttl
    );
    this.qrCodeGenerator = new QRCodeJSAdapter();

    this.logger.info('Dependencies initialized');
  }

  private initializeUseCases(): void {
    this.validateParametersUseCase = new ValidateParametersUseCase();
    this.cacheManagementUseCase = new CacheManagementUseCase(
      this.cacheRepository,
      this.logger,
      this.config.cache.ttl
    );
    this.generateQRCodeUseCase = new GenerateQRCodeUseCase(
      this.qrCodeGenerator,
      this.validateParametersUseCase,
      this.cacheManagementUseCase,
      this.logger,
      this.metricsCollector
    );

    this.logger.info('Use cases initialized');
  }

  private initializeControllers(): void {
    this.qrCodeController = new QRCodeController(
      this.generateQRCodeUseCase,
      this.logger,
      this.metricsCollector
    );
    
    this.healthController = new HealthController(
      this.generateQRCodeUseCase,
      this.cacheManagementUseCase,
      this.logger,
      this.metricsCollector
    );

    this.logger.info('Controllers initialized');
  }

  private initializeMiddleware(): void {
    // Initialize custom middleware
    this.validationMiddleware = new ValidationMiddleware({
      logger: this.logger,
      sanitizeInput: true,
      maxRequestSize: 1024 * 1024, // 1MB
    });
    
    this.loggingMiddleware = new LoggingMiddleware({
      logger: this.logger,
      includeBody: true,
      includeHeaders: false,
      maxBodySize: 1000,
    });

    this.logger.info('Custom middleware initialized');
  }

  private initializeExpressMiddleware(): void {
    // Security middleware
    if (this.config.security.helmet) {
      this.app.use(helmet());
    }

    // CORS
    this.app.use(cors({
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials
    }));

    // Compression
    if (this.config.compression.enabled) {
      this.app.use(compression({
        threshold: this.config.compression.threshold
      }));
    }

    // Request parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Enhanced logging middleware
    this.app.use(this.loggingMiddleware.enhancedLogging());
    this.app.use(this.loggingMiddleware.performanceMonitoring());

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          this.logger.info(message.trim());
        }
      }
    }));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    this.logger.info('Express middleware initialized');
  }

  private initializeRoutes(): void {
    // Health check routes
    this.app.get('/health', this.healthController.checkHealth.bind(this.healthController));
    this.app.get('/health/live', this.healthController.checkLiveness.bind(this.healthController));
    this.app.get('/health/ready', this.healthController.checkReadiness.bind(this.healthController));
    this.app.get('/health/detailed', this.healthController.getDetailedHealth.bind(this.healthController));

    // Metrics endpoint
    this.app.get('/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await this.metricsCollector.getMetrics();
        res.json(metrics);
      } catch (error) {
        this.logger.error('Failed to get metrics', error as Error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // QR Code generation routes with validation middleware
    const qrValidation = this.validationMiddleware.validateQRCodeRequest();
    const rateLimit = this.validationMiddleware.rateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    });
    const parameterLogging = this.loggingMiddleware.logParameterExtraction();

    // V1 API routes (existing)
    this.app.get('/v1/create-qr-code', 
      rateLimit,
      qrValidation,
      parameterLogging,
      this.qrCodeController.handleGet.bind(this.qrCodeController)
    );
    this.app.post('/v1/create-qr-code', 
      rateLimit,
      qrValidation,
      parameterLogging,
      this.qrCodeController.handlePost.bind(this.qrCodeController)
    );
    this.app.options('/v1/create-qr-code', 
      this.qrCodeController.handleOptions.bind(this.qrCodeController)
    );

    // Compatibility routes (user-friendly endpoints)
    this.app.get('/create-qr-code', 
      rateLimit,
      qrValidation,
      parameterLogging,
      this.qrCodeController.handleGet.bind(this.qrCodeController)
    );
    this.app.post('/create-qr-code', 
      rateLimit,
      qrValidation,
      parameterLogging,
      this.qrCodeController.handlePost.bind(this.qrCodeController)
    );
    this.app.options('/create-qr-code', 
      this.qrCodeController.handleOptions.bind(this.qrCodeController)
    );

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'QR Code Generator API',
        version: '1.0.0',
        description: 'RESTful QR Code Generator API with Clean Architecture',
        endpoints: {
          'POST /v1/create-qr-code': 'Generate QR code (v1 API)',
          'GET /v1/create-qr-code': 'Generate QR code with query params (v1 API)',
          'POST /create-qr-code': 'Generate QR code (user-friendly)',
          'GET /create-qr-code': 'Generate QR code with query params (user-friendly)',
          'GET /health': 'Health check',
          'GET /metrics': 'Prometheus metrics'
        }
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`
        }
      });
    });

    this.logger.info('Routes initialized');
  }

  private initializeErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', error, {
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
          }
        });
      }
    });

    this.logger.info('Error handling initialized');
  }

  public start(): void {
    const { port, host } = this.config.server;
    
    // Start system metrics collection
    this.metricsCollector.startSystemMetricsCollection();

    this.app.listen(port, host, () => {
      this.logger.info(`QR Code Generator API started`, {
        port,
        host,
        env: this.config.server.env,
        version: '1.0.0'
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down application...');
    
    // Cleanup resources
    await this.cacheManagementUseCase.clear();
    
    this.logger.info('Application shutdown complete');
  }
}

export default QRCodeGeneratorApp;