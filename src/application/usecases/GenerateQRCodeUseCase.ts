import { QRCodeRequestDTO, QRCodeResponseDTO } from '../dto';
import { QRCode } from '../../domain/entities/QRCode';
import { QRCodeConfiguration } from '../../domain/entities/QRCodeConfiguration';
import { Size } from '../../domain/valueObjects/Size';
import { ColorValue } from '../../domain/valueObjects/ColorValue';
import { ErrorCorrectionLevelValue } from '../../domain/valueObjects/ErrorCorrectionLevel';
import { OutputFormatValue } from '../../domain/valueObjects/OutputFormat';
import { DataPayload } from '../../domain/valueObjects/DataPayload';
import { Logo } from '../../domain/valueObjects/Logo';
import { ValidateParametersUseCase } from './ValidateParametersUseCase';
import { CacheManagementUseCase } from './CacheManagementUseCase';
import { IQRCodeGenerator, ILogger, IMetricsCollector } from '../ports';

export class GenerateQRCodeUseCase {
  constructor(
    private readonly qrCodeGenerator: IQRCodeGenerator,
    private readonly validateParametersUseCase: ValidateParametersUseCase,
    private readonly cacheManagementUseCase: CacheManagementUseCase,
    private readonly logger: ILogger,
    private readonly metricsCollector: IMetricsCollector
  ) {}

  async execute(request: QRCodeRequestDTO): Promise<QRCodeResponseDTO> {
    const startTime = Date.now();
    let cacheStatus: 'hit' | 'miss' | 'error' = 'miss';

    try {
      this.logger.info('QR Code generation started', { 
        data: request.data?.substring(0, 100) + (request.data?.length > 100 ? '...' : ''),
        format: request.format,
        size: request.size
      });

      // Step 1: Validate input parameters
      const validation = await this.validateParametersUseCase.execute(request);
      if (!validation.isValid()) {
        const processingTime = Date.now() - startTime;
        this.metricsCollector.incrementCounter('qr_generation_errors_total', { type: 'validation' });
        this.metricsCollector.recordHistogram('qr_generation_duration_ms', processingTime, { status: 'error' });
        
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input parameters',
            details: validation.getErrors()
          },
          performance: {
            processingTimeMs: processingTime,
            cacheStatus: 'error',
            dataSize: 0
          }
        };
      }

      // Step 2: Build configuration from validated parameters
      const configuration = this.buildConfiguration(request);
      const cacheKey = configuration.getHashKey();

      // Step 3: Check cache first
      const cachedQRCode = await this.cacheManagementUseCase.get(cacheKey);
      if (cachedQRCode) {
        const processingTime = Date.now() - startTime;
        cacheStatus = 'hit';
        
        this.logger.info('QR Code served from cache', { 
          id: cachedQRCode.getId(),
          cacheKey: cacheKey.substring(0, 20) + '...'
        });

        this.metricsCollector.incrementCounter('qr_cache_hits_total');
        this.metricsCollector.recordHistogram('qr_generation_duration_ms', processingTime, { status: 'success', cache: 'hit' });

        return {
          success: true,
          data: {
            id: cachedQRCode.getId(),
            image: cachedQRCode.getImageData(),
            mimeType: cachedQRCode.getMimeType(),
            size: cachedQRCode.getDataSize(),
            format: configuration.getFormat().toString(),
            dimensions: configuration.getSize().toString(),
            cacheHit: true,
            generatedAt: cachedQRCode.getCreatedAt().toISOString()
          },
          performance: {
            processingTimeMs: processingTime,
            cacheStatus,
            dataSize: cachedQRCode.getDataSize()
          }
        };
      }

      // Step 4: Generate new QR code
      this.metricsCollector.incrementCounter('qr_cache_misses_total');
      
      const qrCode = await this.qrCodeGenerator.generate(configuration);
      
      // Step 5: Cache the result (async, don't wait)
      this.cacheManagementUseCase.set(cacheKey, qrCode)
        .catch(error => {
          this.logger.warn('Failed to cache QR code', { error: error.message, cacheKey });
          cacheStatus = 'error';
        });

      const processingTime = Date.now() - startTime;

      this.logger.info('QR Code generated successfully', {
        id: qrCode.getId(),
        size: qrCode.getDataSize(),
        format: configuration.getFormat().toString(),
        processingTimeMs: processingTime
      });

      this.metricsCollector.incrementCounter('qr_codes_generated_total', { 
        format: configuration.getFormat().toString() 
      });
      this.metricsCollector.recordHistogram('qr_generation_duration_ms', processingTime, { 
        status: 'success', 
        cache: 'miss' 
      });

      return {
        success: true,
        data: {
          id: qrCode.getId(),
          image: qrCode.getImageData(),
          mimeType: qrCode.getMimeType(),
          size: qrCode.getDataSize(),
          format: configuration.getFormat().toString(),
          dimensions: configuration.getSize().toString(),
          cacheHit: false,
          generatedAt: qrCode.getCreatedAt().toISOString()
        },
        performance: {
          processingTimeMs: processingTime,
          cacheStatus,
          dataSize: qrCode.getDataSize()
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error('QR Code generation failed', error as Error, {
        request: {
          ...request,
          data: request.data?.substring(0, 100) + (request.data?.length > 100 ? '...' : '')
        }
      });

      this.metricsCollector.incrementCounter('qr_generation_errors_total', { type: 'generation' });
      this.metricsCollector.recordHistogram('qr_generation_duration_ms', processingTime, { status: 'error' });

      return {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof Error ? error.stack : undefined
        },
        performance: {
          processingTimeMs: processingTime,
          cacheStatus: 'error',
          dataSize: 0
        }
      };
    }
  }

  private buildConfiguration(request: QRCodeRequestDTO): QRCodeConfiguration {
    const data = DataPayload.create(request.data);
    
    const size = request.size 
      ? Size.fromString(request.size) 
      : Size.default();
    
    const format = request.format 
      ? OutputFormatValue.create(request.format) 
      : OutputFormatValue.default();
    
    const errorCorrectionLevel = request.ecc 
      ? ErrorCorrectionLevelValue.create(request.ecc) 
      : ErrorCorrectionLevelValue.default();
    
    const foregroundColor = request.color 
      ? ColorValue.create(request.color) 
      : ColorValue.black();
    
    const backgroundColor = request.bgcolor 
      ? ColorValue.create(request.bgcolor) 
      : ColorValue.white();

    const logo = request.logo 
      ? Logo.create(request.logo, request.logo_size, request.logo_margin) 
      : undefined;

    return new QRCodeConfiguration({
      data,
      size,
      format,
      errorCorrectionLevel,
      foregroundColor,
      backgroundColor,
      margin: request.margin,
      quietZone: request.qzone,
      charsetSource: request['charset-source'],
      charsetTarget: request['charset-target'],
      logo
    });
  }

  // Health check method for the use case
  async healthCheck(): Promise<boolean> {
    try {
      // Check if generator supports required formats
      const requiredFormats = ['png', 'jpg', 'jpeg'];
      const supports = requiredFormats.every(format => 
        this.qrCodeGenerator.supports(format)
      );

      if (!supports) {
        this.logger.warn('QR Generator missing required format support');
        return false;
      }

      // Check cache health
      const cacheHealthy = await this.cacheManagementUseCase.isHealthy();
      if (!cacheHealthy) {
        this.logger.warn('Cache system unhealthy');
        // Don't fail health check for cache issues (graceful degradation)
      }

      return true;
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      return false;
    }
  }

  // Get performance statistics
  async getPerformanceStats() {
    const cacheStats = await this.cacheManagementUseCase.getStats();
    
    return {
      cache: cacheStats,
      generator: {
        capabilities: this.qrCodeGenerator.getCapabilities(),
        supportedFormats: ['png', 'jpg', 'jpeg', 'svg']
      }
    };
  }
}