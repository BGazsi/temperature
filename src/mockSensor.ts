import { Sensor, SensorReading } from './types';

export const mockSensor: Sensor = {
  read: (): Promise<SensorReading> => {
    // Simulate realistic temperature and humidity variations
    const baseTemp = 22;
    const baseHumidity = 48;

    // Add random variations (±2°C for temp, ±5% for humidity)
    const temp = baseTemp + (Math.random() - 0.5) * 4;
    const humidity = baseHumidity + (Math.random() - 0.5) * 10;

    // Clamp humidity to realistic range (0-100%)
    const clampedHumidity = Math.max(0, Math.min(100, humidity));

    // Simulate occasional sensor errors (5% chance)
    if (Math.random() < 0.05) {
      return Promise.reject(new Error('Mock sensor read timeout'));
    }

    // Simulate realistic sensor precision (1 decimal place)
    return Promise.resolve({
      temperature: Number(temp.toFixed(1)),
      humidity: Number(clampedHumidity.toFixed(1)),
    });
  },
};
