import { ICacheRepository, ILogger } from '../ports';
import { QRCode } from '../../domain/entities/QRCode';

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  memory?: number;
}

export class CacheManagementUseCase {
  constructor(
    private readonly cacheRepository: ICacheRepository,
    private readonly logger: ILogger,
    private readonly defaultTTL: number = 3600 // 1 hour default
  ) {}

  async get(key: string): Promise<QRCode | null> {
    try {
      this.logger.debug('Cache get operation', { key });
      
      const cachedQRCode = await this.cacheRepository.get(key);
      
      if (cachedQRCode) {
        this.logger.debug('Cache hit', { key, id: cachedQRCode.getId() });
        return cachedQRCode;
      } else {
        this.logger.debug('Cache miss', { key });
        return null;
      }
    } catch (error) {
      this.logger.error('Cache get operation failed', error as Error, { key });
      return null; // Graceful degradation
    }
  }

  async set(key: string, qrCode: QRCode, ttlSeconds?: number): Promise<boolean> {
    try {
      const ttl = ttlSeconds || this.defaultTTL;
      
      this.logger.debug('Cache set operation', { 
        key, 
        id: qrCode.getId(), 
        size: qrCode.getDataSize(),
        ttl 
      });
      
      await this.cacheRepository.set(key, qrCode, ttl);
      
      this.logger.debug('Cache set successful', { key, id: qrCode.getId() });
      return true;
    } catch (error) {
      this.logger.error('Cache set operation failed', error as Error, { 
        key, 
        id: qrCode.getId() 
      });
      return false; // Graceful degradation
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      this.logger.debug('Cache delete operation', { key });
      
      await this.cacheRepository.delete(key);
      
      this.logger.debug('Cache delete successful', { key });
      return true;
    } catch (error) {
      this.logger.error('Cache delete operation failed', error as Error, { key });
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      this.logger.info('Cache clear operation started');
      
      await this.cacheRepository.clear();
      
      this.logger.info('Cache clear successful');
      return true;
    } catch (error) {
      this.logger.error('Cache clear operation failed', error as Error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.cacheRepository.exists(key);
    } catch (error) {
      this.logger.error('Cache exists check failed', error as Error, { key });
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const stats = await this.cacheRepository.getStats();
      const hitRate = stats.hits + stats.misses > 0 
        ? (stats.hits / (stats.hits + stats.misses)) * 100 
        : 0;

      return {
        ...stats,
        hitRate: Math.round(hitRate * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', error as Error);
      return {
        hits: 0,
        misses: 0,
        keys: 0,
        hitRate: 0
      };
    }
  }

  // Cache warming strategy
  async warmCache(qrCodes: Array<{ key: string; qrCode: QRCode; ttl?: number }>): Promise<number> {
    let successCount = 0;
    
    this.logger.info('Cache warming started', { count: qrCodes.length });
    
    for (const { key, qrCode, ttl } of qrCodes) {
      const success = await this.set(key, qrCode, ttl);
      if (success) {
        successCount++;
      }
    }
    
    this.logger.info('Cache warming completed', { 
      total: qrCodes.length, 
      successful: successCount,
      failed: qrCodes.length - successCount
    });
    
    return successCount;
  }

  // Cache eviction based on size or age
  async evictExpired(): Promise<number> {
    try {
      // This would require additional cache repository methods
      // For now, we'll just log the operation
      this.logger.info('Cache eviction operation requested');
      return 0;
    } catch (error) {
      this.logger.error('Cache eviction failed', error as Error);
      return 0;
    }
  }

  // Health check for cache
  async isHealthy(): Promise<boolean> {
    try {
      // Try a simple operation to check if cache is responsive
      const testKey = '__health_check__';
      const testQRCode = null; // We would need a minimal QRCode for testing
      
      // For now, just check if we can get stats
      await this.cacheRepository.getStats();
      return true;
    } catch (error) {
      this.logger.error('Cache health check failed', error as Error);
      return false;
    }
  }

  // Get cache performance metrics
  async getPerformanceMetrics() {
    const stats = await this.getStats();
    
    return {
      hitRate: stats.hitRate,
      totalKeys: stats.keys,
      memoryUsage: stats.memory || 0,
      efficiency: this.calculateEfficiency(stats),
      recommendations: this.getRecommendations(stats)
    };
  }

  private calculateEfficiency(stats: CacheStats): number {
    // Simple efficiency calculation based on hit rate and key count
    if (stats.hitRate === 0) return 0;
    
    const hitRateScore = Math.min(stats.hitRate, 100) / 100;
    const utilizationScore = Math.min(stats.keys / 1000, 1); // Assume 1000 is optimal key count
    
    return Math.round((hitRateScore * 0.7 + utilizationScore * 0.3) * 100);
  }

  private getRecommendations(stats: CacheStats): string[] {
    const recommendations: string[] = [];
    
    if (stats.hitRate < 50) {
      recommendations.push('Consider increasing TTL or adjusting cache strategy');
    }
    
    if (stats.keys > 10000) {
      recommendations.push('Cache may be oversized, consider implementing LRU eviction');
    }
    
    if (stats.hitRate > 90 && stats.keys < 100) {
      recommendations.push('Cache is highly efficient but underutilized');
    }
    
    return recommendations;
  }
}