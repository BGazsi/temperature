import { Db } from 'mongodb';
import { Sensor, HealthStatus } from '../types';
import { logger, logHealthCheck } from './logger';
import { config } from '../config/environment';

export class HealthChecker {
  private consecutiveErrors = 0;

  constructor(
    private sensor: Sensor,
    private db: Db | null
  ) {}

  async check(): Promise<HealthStatus> {
    const status: HealthStatus = {
      sensor: 'healthy',
      database: 'healthy',
      lastCheck: new Date(),
      consecutiveErrors: this.consecutiveErrors,
    };

    // Check sensor health
    try {
      await this.sensor.read(config.SENSOR_TYPE, config.SENSOR_PIN);
      status.sensor = 'healthy';
    } catch (error) {
      logger.warn({ error }, 'Sensor health check failed');
      status.sensor = 'unhealthy';
    }

    // Check database health
    if (!this.db) {
      status.database = 'unhealthy';
    } else {
      try {
        await this.db.admin().ping();
        status.database = 'healthy';
      } catch (error) {
        logger.warn({ error }, 'Database health check failed');
        status.database = 'unhealthy';
      }
    }

    logHealthCheck(status.sensor, status.database, this.consecutiveErrors);

    return status;
  }

  incrementErrors(): void {
    this.consecutiveErrors++;
  }

  resetErrors(): void {
    this.consecutiveErrors = 0;
  }

  getConsecutiveErrors(): number {
    return this.consecutiveErrors;
  }

  updateDb(db: Db | null): void {
    this.db = db;
  }
}
