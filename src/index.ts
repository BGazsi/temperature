import { config } from './config/environment';
import { logger } from './monitoring/logger';
import { metrics } from './monitoring/metrics';
import { HealthChecker } from './monitoring/healthCheck';
import { ApiService } from './services/apiService';
import { BufferService } from './services/bufferService';
import { MeasurementService } from './services/measurementService';
import { createSensor } from './sensor/sensorFactory';

// Initialize components
const sensor = createSensor();
const apiService = new ApiService();
const bufferService = new BufferService();

let measurementService: MeasurementService;
let healthChecker: HealthChecker;
let measurementInterval: NodeJS.Timeout | null = null;
let metricsInterval: NodeJS.Timeout | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

const initializeApi = async (): Promise<void> => {
  try {
    const isHealthy = await apiService.healthCheck();
    
    if (isHealthy) {
      // Update services with API service
      measurementService.updateApiService(apiService);
      logger.info('API connection verified successfully');
    } else {
      logger.warn('API health check failed, will buffer measurements until API is available');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to connect to API');
    logger.warn('Will buffer measurements until API is available');
  }
};

const startMeasurements = (): void => {
  // Initial measurement
  measurementService.takeMeasurement().catch((err: unknown) => {
    logger.error({ error: err }, 'Error in initial measurement');
  });

  // Schedule periodic measurements
  measurementInterval = setInterval(() => {
    measurementService.takeMeasurement().catch((err: unknown) => {
      logger.error({ error: err }, 'Error in periodic measurement');
    });
  }, config.REFRESH_INTERVAL);

  logger.info({ intervalMs: config.REFRESH_INTERVAL }, 'Measurement collection started');
};

const startMetricsLogging = (): void => {
  // Log metrics every 5 minutes
  metricsInterval = setInterval(() => {
    metrics.logStats();
  }, 300000);
};

const startHealthChecks = (): void => {
  // Perform health check every 2 minutes
  healthCheckInterval = setInterval(() => {
    healthChecker.check().catch((err: unknown) => {
      logger.error({ error: err }, 'Health check failed');
    });
  }, 120000);
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Starting graceful shutdown');

  // Clear all intervals
  if (measurementInterval) {
    clearInterval(measurementInterval);
  }
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Log final metrics
  metrics.logStats();

  // Try to flush buffer one last time
  if (bufferService.getBufferSize() > 0) {
    logger.info('Attempting to flush buffer before shutdown');
    try {
      const flushed = await bufferService.flush(apiService);
      logger.info({ flushedCount: flushed }, 'Buffer flushed');
    } catch (error) {
      logger.error({ error }, 'Failed to flush buffer during shutdown');
    }
  }

  logger.info('Shutdown complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch((err: unknown) => {
    logger.error({ error: err }, 'Error during shutdown');
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch((err: unknown) => {
    logger.error({ error: err }, 'Error during shutdown');
    process.exit(1);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error({ error: err }, 'Uncaught exception');
  healthChecker.incrementErrors();

  if (healthChecker.getConsecutiveErrors() >= config.MAX_CONSECUTIVE_ERRORS) {
    logger.error('Too many uncaught exceptions. Exiting...');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  healthChecker.incrementErrors();

  if (healthChecker.getConsecutiveErrors() >= config.MAX_CONSECUTIVE_ERRORS) {
    logger.error('Too many unhandled rejections. Exiting...');
    process.exit(1);
  }
});

const main = async (): Promise<void> => {
  logger.info('Starting temperature monitoring application');
  logger.info(
    {
      refreshInterval: config.REFRESH_INTERVAL,
      useRealSensor: config.USE_REAL_SENSOR,
      apiUrl: config.API_URL,
      apiTimeout: config.API_TIMEOUT,
    },
    'Configuration loaded'
  );

  // Initialize services
  measurementService = new MeasurementService(sensor, null, bufferService);
  healthChecker = new HealthChecker(sensor, null);

  // Initialize API connection
  await initializeApi();

  // Start all periodic tasks
  startMeasurements();
  startMetricsLogging();
  startHealthChecks();

  // Perform initial health check
  await healthChecker.check();

  logger.info('Application started successfully');
};

// Start the application
main().catch((err: unknown) => {
  logger.error({ error: err }, 'Failed to start application');
  process.exit(1);
});
