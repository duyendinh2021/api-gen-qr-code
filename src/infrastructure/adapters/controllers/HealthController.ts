import { Request, Response } from 'express';
import { GenerateQRCodeUseCase } from '../../../application/usecases/GenerateQRCodeUseCase';
import { CacheManagementUseCase } from '../../../application/usecases/CacheManagementUseCase';
import { ILogger, IMetricsCollector } from '../../../application/ports';
import { HealthCheckResponseDTO } from '../../../application/dto';

export class HealthController {
  private readonly startTime = Date.now();
  private readonly version = '1.0.0';

  constructor(
    private readonly generateQRCodeUseCase: GenerateQRCodeUseCase,
    private readonly cacheManagementUseCase: CacheManagementUseCase,
    private readonly logger: ILogger,
    private readonly metricsCollector: IMetricsCollector
  ) {}

  async checkHealth(req: Request, res: Response): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || 'health-check';
    
    try {
      this.logger.debug('Health check requested', { requestId });

      // Check core services
      const qrGeneratorHealthy = await this.generateQRCodeUseCase.healthCheck();
      const cacheHealthy = await this.cacheManagementUseCase.isHealthy();

      const overallStatus = qrGeneratorHealthy && cacheHealthy ? 'healthy' : 'unhealthy';

      // Get basic metrics for health response
      const metrics = await this.getBasicMetrics();

      const healthResponse: HealthCheckResponseDTO = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.version,
        services: {
          cache: cacheHealthy ? 'available' : 'unavailable',
          qrGenerator: qrGeneratorHealthy ? 'available' : 'unavailable',
          imageProcessor: 'available' // For now, assume available
        },
        metrics
      };

      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      
      this.metricsCollector.incrementCounter('health_checks_total', { 
        status: overallStatus 
      });

      res.status(statusCode).json(healthResponse);

    } catch (error) {
      this.logger.error('Health check failed', error as Error, { requestId });

      const errorResponse: HealthCheckResponseDTO = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.version,
        services: {
          cache: 'unavailable',
          qrGenerator: 'unavailable',
          imageProcessor: 'unavailable'
        }
      };

      this.metricsCollector.incrementCounter('health_checks_total', { 
        status: 'unhealthy' 
      });

      res.status(503).json(errorResponse);
    }
  }

  async checkLiveness(req: Request, res: Response): Promise<void> {
    // Simple liveness check - just return OK if the service is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    });
  }

  async checkReadiness(req: Request, res: Response): Promise<void> {
    // Readiness check - verify service can handle requests
    try {
      const qrGeneratorReady = await this.generateQRCodeUseCase.healthCheck();
      
      if (qrGeneratorReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          services: {
            qrGenerator: 'ready'
          }
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          services: {
            qrGenerator: 'not_ready'
          }
        });
      }
    } catch (error) {
      this.logger.error('Readiness check failed', error as Error);
      
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Service not ready'
      });
    }
  }

  private async getBasicMetrics() {
    try {
      const cacheStats = await this.cacheManagementUseCase.getStats();
      const performanceStats = await this.generateQRCodeUseCase.getPerformanceStats();

      return {
        totalRequests: 0, // Would come from metrics collector in real implementation
        successRate: 0,   // Would be calculated from success/failure metrics
        averageResponseTime: 0, // Would come from histogram metrics
        cacheHitRate: cacheStats.hitRate
      };
    } catch (error) {
      this.logger.warn('Failed to get basic metrics for health check', { error: (error as Error).message });
      return undefined;
    }
  }

  // Detailed health endpoint with more information
  async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const qrGeneratorHealthy = await this.generateQRCodeUseCase.healthCheck();
      const cacheHealthy = await this.cacheManagementUseCase.isHealthy();
      const cacheStats = await this.cacheManagementUseCase.getStats();
      const performanceStats = await this.generateQRCodeUseCase.getPerformanceStats();

      const detailedHealth = {
        status: qrGeneratorHealthy && cacheHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.version,
        environment: process.env.NODE_ENV || 'development',
        services: {
          qrGenerator: {
            status: qrGeneratorHealthy ? 'healthy' : 'unhealthy',
            capabilities: performanceStats.generator.capabilities,
            supportedFormats: performanceStats.generator.supportedFormats
          },
          cache: {
            status: cacheHealthy ? 'healthy' : 'unhealthy',
            stats: cacheStats,
            type: 'in-memory'
          }
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage(),
          pid: process.pid
        }
      };

      res.status(200).json(detailedHealth);

    } catch (error) {
      this.logger.error('Detailed health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }
}