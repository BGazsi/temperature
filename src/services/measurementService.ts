import { uuidv7 } from 'uuidv7';
import { Sensor, TemperatureDocument } from '../types';
import { TemperatureRepository } from '../database/repository';
import { BufferService } from './bufferService';
import { metrics } from '../monitoring/metrics';
import { logger, logMeasurement, logError } from '../monitoring/logger';
import { config } from '../config/environment';

export class MeasurementService {
  constructor(
    private sensor: Sensor,
    private repository: TemperatureRepository | null,
    private bufferService: BufferService
  ) {}

  async takeMeasurement(): Promise<void> {
    const startTime = Date.now();

    try {
      // Read from sensor
      const reading = await this.sensor.read(config.SENSOR_TYPE, config.SENSOR_PIN);
      const timestamp = new Date();

      const document: TemperatureDocument = {
        _id: uuidv7(),
        temp: Number(reading.temperature.toFixed(1)),
        humidity: Number(reading.humidity.toFixed(1)),
        timestamp,
        metadata: {
          sensorType: config.SENSOR_TYPE,
          pin: config.SENSOR_PIN,
          readDurationMs: Date.now() - startTime,
        },
      };

      // Try to save to database
      if (this.repository) {
        try {
          await this.repository.save(document);
          logMeasurement(document.temp, document.humidity, timestamp);

          const latency = Date.now() - startTime;
          metrics.recordSuccess(latency);

          // Try to flush buffer if there are pending measurements
          if (this.bufferService.getBufferSize() > 0) {
            const flushed = await this.bufferService.flush(this.repository.getCollection());
            if (flushed > 0) {
              logger.info({ flushedCount: flushed }, 'Flushed buffered measurements');
            }
          }
        } catch (dbError) {
          // Database error - add to buffer
          logger.warn(
            { error: dbError, documentId: document._id },
            'Failed to save to database, adding to buffer'
          );
          this.bufferService.add(document);
          metrics.recordFailure('database');
        }
      } else {
        // No database connection - add to buffer
        logger.warn({ documentId: document._id }, 'No database connection, adding to buffer');
        this.bufferService.add(document);
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

  updateRepository(repository: TemperatureRepository | null): void {
    this.repository = repository;
  }

  getBufferSize(): number {
    return this.bufferService.getBufferSize();
  }
}
