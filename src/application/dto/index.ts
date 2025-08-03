export interface QRCodeRequestDTO {
  data: string;
  size?: string;
  format?: string;
  ecc?: string;
  color?: string;
  bgcolor?: string;
  margin?: number;
  qzone?: number;
  'charset-source'?: string;
  'charset-target'?: string;
  logo?: string;
  logo_size?: number;
  logo_margin?: number;
}

export interface QRCodeResponseDTO {
  success: boolean;
  data?: {
    id: string;
    image: Buffer;
    mimeType: string;
    size: number;
    format: string;
    dimensions: string;
    cacheHit?: boolean;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  performance?: {
    processingTimeMs: number;
    cacheStatus: 'hit' | 'miss' | 'error';
    dataSize: number;
  };
}

export interface HealthCheckResponseDTO {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    cache: 'available' | 'unavailable';
    qrGenerator: 'available' | 'unavailable';
    imageProcessor: 'available' | 'unavailable';
  };
  metrics?: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
}

export interface MetricsResponseDTO {
  timestamp: string;
  metrics: {
    http_requests_total: number;
    http_request_duration_ms: {
      count: number;
      sum: number;
      avg: number;
    };
    qr_codes_generated_total: number;
    cache_hits_total: number;
    cache_misses_total: number;
    errors_total: number;
    memory_usage_bytes: number;
    cpu_usage_percent: number;
  };
}