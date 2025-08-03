import { QRCode } from '../../domain/entities/QRCode';
import { QRCodeConfiguration } from '../../domain/entities/QRCodeConfiguration';

export interface IQRCodeGenerator {
  generate(configuration: QRCodeConfiguration): Promise<QRCode>;
  supports(format: string): boolean;
  getCapabilities(): string[];
}

export interface ICacheRepository {
  get(key: string): Promise<QRCode | null>;
  set(key: string, qrCode: QRCode, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getStats(): Promise<{
    hits: number;
    misses: number;
    keys: number;
    memory?: number;
  }>;
}

export interface IImageProcessor {
  optimize(imageData: Buffer, format: string): Promise<Buffer>;
  resize(imageData: Buffer, width: number, height: number): Promise<Buffer>;
  convert(imageData: Buffer, fromFormat: string, toFormat: string): Promise<Buffer>;
  supports(format: string): boolean;
}

export interface ILogger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export interface IMetricsCollector {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): Promise<any>;
}

export interface IValidator {
  validate(input: any): Promise<{ isValid: boolean; errors: string[] }>;
}

export interface IHealthChecker {
  checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, 'available' | 'unavailable'>;
  }>;
}
