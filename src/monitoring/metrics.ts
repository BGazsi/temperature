import { MetricsData } from '../types';
import { logger } from './logger';

export class Metrics {
  private measurements = {
    total: 0,
    successful: 0,
    failed: 0,
    sensorErrors: 0,
    dbErrors: 0,
    apiErrors: 0,
  };

  private latencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100;
  private bufferedCount = 0;

  recordSuccess(latencyMs: number): void {
    this.measurements.total++;
    this.measurements.successful++;
    this.latencies.push(latencyMs);

    // Keep only the last N samples
    if (this.latencies.length > this.MAX_LATENCY_SAMPLES) {
      this.latencies.shift();
    }
  }

  recordFailure(type: 'sensor' | 'database' | 'api'): void {
    this.measurements.total++;
    this.measurements.failed++;

    if (type === 'sensor') {
      this.measurements.sensorErrors++;
    } else if (type === 'database') {
      this.measurements.dbErrors++;
    } else {
      this.measurements.apiErrors++;
    }
  }

  setBufferedCount(count: number): void {
    this.bufferedCount = count;
  }

  getStats(): MetricsData {
    const successRate =
      this.measurements.total > 0
        ? (this.measurements.successful / this.measurements.total) * 100
        : 0;

    const avgLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

    return {
      ...this.measurements,
      successRate: Number(successRate.toFixed(2)),
      avgLatency: Number(avgLatency.toFixed(2)),
      bufferedCount: this.bufferedCount,
    };
  }

  logStats(): void {
    const stats = this.getStats();
    logger.info(stats, 'Current metrics');
  }

  reset(): void {
    this.measurements = {
      total: 0,
      successful: 0,
      failed: 0,
      sensorErrors: 0,
      dbErrors: 0,
      apiErrors: 0,
    };
    this.latencies = [];
  }
}

export const metrics = new Metrics();
