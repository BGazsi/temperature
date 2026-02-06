import pino from 'pino';
import { config } from '../config/environment';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  base: {
    app: 'temperature-monitor',
  },
});

// Helper functions for common log patterns
export const logMeasurement = (temp: number, humidity: number, timestamp: Date): void => {
  logger.info(
    {
      temp,
      humidity,
      timestamp: timestamp.toISOString(),
    },
    'Measurement saved'
  );
};

export const logError = (
  error: unknown,
  context: string,
  additionalData?: Record<string, unknown>
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(
    {
      error: errorMessage,
      stack: errorStack,
      context,
      ...additionalData,
    },
    `Error in ${context}`
  );
};

export const logHealthCheck = (
  sensor: string,
  database: string,
  consecutiveErrors: number
): void => {
  logger.info(
    {
      sensor,
      database,
      consecutiveErrors,
    },
    'Health check completed'
  );
};
