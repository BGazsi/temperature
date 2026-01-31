export interface SensorReading {
  temperature: number;
  humidity: number;
}

export interface Sensor {
  read: (sensorType: number, pin: number) => Promise<SensorReading>;
}

export interface TemperatureDocument {
  _id: string;
  temp: string;
  humidity: string;
  timestamp: Date;
}
