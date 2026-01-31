import { Sensor, SensorReading } from './types';

export const mockSensor: Sensor = {
  read: (): Promise<SensorReading> => {
    return Promise.resolve({ temperature: 22.600000381469727, humidity: 48 });
  },
};
