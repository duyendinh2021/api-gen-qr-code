import { ILogger } from '../../../application/ports';
import { LogLevel } from '../../../shared/types';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class SimpleLogger implements ILogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor(
    private readonly logLevel: LogLevel = 'info',
    private readonly enableConsole: boolean = true
  ) {}

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;

    this.log('error', message, meta, errorInfo);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  private log(level: LogLevel, message: string, meta?: any, error?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      error
    };

    // Add to internal logs
    this.logs.push(logEntry);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    if (this.enableConsole) {
      this.logToConsole(logEntry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, meta, error } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const fullMessage = `${prefix} ${message}${metaStr}`;

    switch (level) {
      case 'error':
        console.error(fullMessage);
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      case 'debug':
        console.debug(fullMessage);
        break;
      default:
        console.log(fullMessage);
    }
  }

  // Utility methods for testing and monitoring
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = level 
      ? this.logs.filter(log => log.level === level)
      : this.logs;

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return [...filteredLogs]; // Return copy
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogCount(level?: LogLevel): number {
    return level 
      ? this.logs.filter(log => log.level === level).length
      : this.logs.length;
  }

  // Get recent errors for health checks
  getRecentErrors(minutes: number = 5): LogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => 
      log.level === 'error' && new Date(log.timestamp) > cutoff
    );
  }

  // Export logs in JSON format
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}