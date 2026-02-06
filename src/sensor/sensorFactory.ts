import { Sensor } from '../types';
import { mockSensor } from '../mockSensor';
import { config } from '../config/environment';
import { logger } from '../monitoring/logger';

export function createSensor(): Sensor {
  if (!config.USE_REAL_SENSOR) {
    logger.info('Using mock sensor');
    return mockSensor;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
    const realSensor = require('node-dht-sensor').promises as Sensor;
    logger.info('Using real DHT22 sensor');
    return realSensor;
  } catch (error) {
    logger.error(
      { error },
      'Failed to load real sensor module. Please install node-dht-sensor or set use_real_sensor=false'
    );
    throw new Error(
      'Real sensor requested but node-dht-sensor module not available. Install it with: npm install node-dht-sensor'
    );
  }
}
