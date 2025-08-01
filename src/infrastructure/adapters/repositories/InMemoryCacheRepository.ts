import { ICacheRepository } from '../../../application/ports';
import { QRCode } from '../../../domain/entities/QRCode';

interface CacheEntry {
  qrCode: QRCode;
  expiresAt: number;
  createdAt: number;
}

export class InMemoryCacheRepository implements ICacheRepository {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor(
    private readonly maxKeys: number = 1000,
    private readonly defaultTTL: number = 3600 // 1 hour
  ) {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  async get(key: string): Promise<QRCode | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.qrCode;
  }

  async set(key: string, qrCode: QRCode, ttlSeconds?: number): Promise<void> {
    const ttl = (ttlSeconds || this.defaultTTL) * 1000; // Convert to milliseconds
    const now = Date.now();
    
    // If at max capacity, remove oldest entry
    if (this.cache.size >= this.maxKeys && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      qrCode,
      expiresAt: now + ttl,
      createdAt: now
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    if (this.cache.delete(key)) {
      this.stats.deletes++;
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.resetStats();
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    memory?: number;
  }> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.size,
      memory: this.calculateMemoryUsage()
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Approximate memory usage calculation
      totalSize += entry.qrCode.getDataSize();
      totalSize += JSON.stringify(entry.qrCode.toJSON()).length * 2; // Rough estimate for metadata
    }
    
    return totalSize;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // Additional utility methods for monitoring
  getDetailedStats() {
    return {
      ...this.stats,
      keys: this.cache.size,
      maxKeys: this.maxKeys,
      memoryUsage: this.calculateMemoryUsage(),
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0
    };
  }

  // Get all cache keys (for debugging)
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache entry info without affecting stats
  inspectEntry(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }
}