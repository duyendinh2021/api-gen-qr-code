import { IMetricsCollector } from '../../../application/ports';

interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface CounterMetric {
  name: string;
  help: string;
  type: 'counter';
  values: MetricValue[];
}

interface HistogramMetric {
  name: string;
  help: string;
  type: 'histogram';
  values: MetricValue[];
  buckets: number[];
}

interface GaugeMetric {
  name: string;
  help: string;
  type: 'gauge';
  values: MetricValue[];
}

type Metric = CounterMetric | HistogramMetric | GaugeMetric;

export class SimpleMetricsCollector implements IMetricsCollector {
  private metrics = new Map<string, Metric>();
  private readonly maxValues = 10000; // Limit memory usage

  constructor() {
    this.initializeDefaultMetrics();
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const metric = this.getOrCreateCounter(name);
    const existingValue = this.findValue(metric.values, labels);

    if (existingValue) {
      existingValue.value += 1;
      existingValue.timestamp = Date.now();
    } else {
      metric.values.push({
        value: 1,
        timestamp: Date.now(),
        labels,
      });
    }

    this.trimValues(metric.values);
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.getOrCreateHistogram(name);

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    this.trimValues(metric.values);
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.getOrCreateGauge(name);
    const existingValue = this.findValue(metric.values, labels);

    if (existingValue) {
      existingValue.value = value;
      existingValue.timestamp = Date.now();
    } else {
      metric.values.push({
        value,
        timestamp: Date.now(),
        labels,
      });
    }

    this.trimValues(metric.values);
  }

  async getMetrics(): Promise<any> {
    const metricsData: any = {
      timestamp: new Date().toISOString(),
      metrics: {},
    };

    for (const [name, metric] of this.metrics.entries()) {
      switch (metric.type) {
        case 'counter':
          metricsData.metrics[name] = this.aggregateCounter(metric);
          break;
        case 'histogram':
          metricsData.metrics[name] = this.aggregateHistogram(metric);
          break;
        case 'gauge':
          metricsData.metrics[name] = this.aggregateGauge(metric);
          break;
      }
    }

    return metricsData;
  }

  private initializeDefaultMetrics(): void {
    this.getOrCreateCounter('http_requests_total');
    this.getOrCreateHistogram('http_request_duration_ms');
    this.getOrCreateCounter('qr_codes_generated_total');
    this.getOrCreateCounter('qr_cache_hits_total');
    this.getOrCreateCounter('qr_cache_misses_total');
    this.getOrCreateCounter('qr_generation_errors_total');
    this.getOrCreateCounter('health_checks_total');
    this.getOrCreateGauge('memory_usage_bytes');
    this.getOrCreateGauge('cpu_usage_percent');
  }

  private getOrCreateCounter(name: string): CounterMetric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help: `Counter metric: ${name}`,
        type: 'counter',
        values: [],
      });
    }
    return this.metrics.get(name) as CounterMetric;
  }

  private getOrCreateHistogram(name: string): HistogramMetric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help: `Histogram metric: ${name}`,
        type: 'histogram',
        values: [],
        buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      });
    }
    return this.metrics.get(name) as HistogramMetric;
  }

  private getOrCreateGauge(name: string): GaugeMetric {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        help: `Gauge metric: ${name}`,
        type: 'gauge',
        values: [],
      });
    }
    return this.metrics.get(name) as GaugeMetric;
  }

  private findValue(
    values: MetricValue[],
    labels?: Record<string, string>
  ): MetricValue | undefined {
    return values.find((v) => this.labelsMatch(v.labels, labels));
  }

  private labelsMatch(labels1?: Record<string, string>, labels2?: Record<string, string>): boolean {
    if (!labels1 && !labels2) return true;
    if (!labels1 || !labels2) return false;

    const keys1 = Object.keys(labels1).sort();
    const keys2 = Object.keys(labels2).sort();

    if (keys1.length !== keys2.length) return false;

    return keys1.every((key, index) => key === keys2[index] && labels1[key] === labels2[key]);
  }

  private trimValues(values: MetricValue[]): void {
    if (values.length > this.maxValues) {
      values.sort((a, b) => b.timestamp - a.timestamp);
      values.splice(this.maxValues);
    }
  }

  private aggregateCounter(metric: CounterMetric): any {
    const total = metric.values.reduce((sum, v) => sum + v.value, 0);
    return {
      type: 'counter',
      total,
      values: metric.values.length,
    };
  }

  private aggregateHistogram(metric: HistogramMetric): any {
    if (metric.values.length === 0) {
      return {
        type: 'histogram',
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        buckets: {},
      };
    }

    const values = metric.values.map((v) => v.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate bucket distribution
    const buckets: Record<string, number> = {};
    for (const bucket of metric.buckets) {
      buckets[`le_${bucket}`] = values.filter((v) => v <= bucket).length;
    }

    return {
      type: 'histogram',
      count,
      sum,
      avg: Math.round(avg * 100) / 100,
      min,
      max,
      buckets,
    };
  }

  private aggregateGauge(metric: GaugeMetric): any {
    if (metric.values.length === 0) {
      return {
        type: 'gauge',
        value: 0,
        timestamp: null,
      };
    }

    // Get the most recent value
    const latest = metric.values.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    return {
      type: 'gauge',
      value: latest.value,
      timestamp: new Date(latest.timestamp).toISOString(),
    };
  }

  // Utility methods for debugging and monitoring
  clearMetrics(): void {
    this.metrics.clear();
    this.initializeDefaultMetrics();
  }

  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  // Start collecting system metrics
  startSystemMetricsCollection(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      const memUsage = process.memoryUsage();
      this.recordGauge('memory_usage_bytes', memUsage.heapUsed);

      // CPU usage would require more complex calculation
      // For now, we'll just record a placeholder
      this.recordGauge('cpu_usage_percent', 0);
    }, intervalMs);
  }
}
