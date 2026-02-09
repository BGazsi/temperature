import { Sensor } from '../types';
import { ApiService } from './apiService';
import { BufferService } from './bufferService';
import { metrics } from '../monitoring/metrics';
import { logger, logMeasurement, logError } from '../monitoring/logger';
import { config } from '../config/environment';

export class MeasurementService {
  constructor(
    private sensor: Sensor,
    private apiService: ApiService | null,
    private bufferService: BufferService
  ) {}

  async takeMeasurement(): Promise<void> {
    const startTime = Date.now();

    try {
      // Read from sensor
      const reading = await this.sensor.read(config.SENSOR_TYPE, config.SENSOR_PIN);
      const timestamp = new Date();

      const temperatureReading = {
        temp: Number(reading.temperature.toFixed(1)),
        humidity: Number(reading.humidity.toFixed(1)),
        timestamp,
      };

      // Try to post to API
      if (this.apiService) {
        try {
          const response = await this.apiService.postTemperature(temperatureReading);

          if (response.success) {
            logMeasurement(temperatureReading.temp, temperatureReading.humidity, timestamp);

            const latency = Date.now() - startTime;
            metrics.recordSuccess(latency);

            // Try to flush buffer if there are pending measurements
            if (this.bufferService.getBufferSize() > 0) {
              const flushed = await this.bufferService.flush(this.apiService);
              if (flushed > 0) {
                logger.info({ flushedCount: flushed }, 'Flushed buffered measurements');
              }
            }
          } else {
            // API error - add to buffer
            logger.warn(
              { error: response.error, reading: temperatureReading },
              'Failed to post to API, adding to buffer'
            );
            this.bufferService.add(temperatureReading);
            metrics.recordFailure('api');
          }
        } catch (apiError) {
          // API error - add to buffer
          logger.warn(
            { error: apiError, reading: temperatureReading },
            'Failed to post to API, adding to buffer'
          );
          this.bufferService.add(temperatureReading);
          metrics.recordFailure('api');
        }
      } else {
        // No API service - add to buffer
        logger.warn({ reading: temperatureReading }, 'No API service, adding to buffer');
        this.bufferService.add(temperatureReading);
      }

      // Update buffer count in metrics
      metrics.setBufferedCount(this.bufferService.getBufferSize());
    } catch (sensorError) {
      logError(sensorError, 'sensor reading', {
        sensorType: config.SENSOR_TYPE,
        pin: config.SENSOR_PIN,
      });
      metrics.recordFailure('sensor');
    }
  }

  updateApiService(apiService: ApiService | null): void {
    this.apiService = apiService;
  }

  getBufferSize(): number {
    return this.bufferService.getBufferSize();
  }
}
