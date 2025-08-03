import { Environment, LogLevel, CacheConfig } from '../../shared/types';

export interface AppConfig {
  server: {
    port: number;
    host: string;
    env: Environment;
  };
  logging: {
    level: LogLevel;
    enableConsole: boolean;
  };
  cache: CacheConfig & {
    maxKeys: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  compression: {
    enabled: boolean;
    threshold: number;
  };
  qrGeneration: {
    maxDataLength: number;
    defaultFormat: string;
    defaultSize: string;
    allowedFormats: string[];
  };
  security: {
    helmet: boolean;
    rateLimitEnabled: boolean;
  };
}

export const defaultConfig: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: (process.env.NODE_ENV as Environment) || 'development'
  },
  logging: {
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
    enableConsole: true
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10),
    checkInterval: 60000 // 1 minute
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per minute
    skipSuccessfulRequests: false
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: false
  },
  compression: {
    enabled: true,
    threshold: 1024 // Compress responses > 1KB
  },
  qrGeneration: {
    maxDataLength: 900,
    defaultFormat: 'png',
    defaultSize: '200x200',
    allowedFormats: ['png', 'jpg', 'jpeg', 'svg']
  },
  security: {
    helmet: true,
    rateLimitEnabled: true
  }
};

export function loadConfig(): AppConfig {
  return defaultConfig;
}