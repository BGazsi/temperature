export interface SensorReading {
  temperature: number;
  humidity: number;
}

export interface Sensor {
  read: (sensorType: number, pin: number) => Promise<SensorReading>;
}

export interface TemperatureDocument {
  _id: string;
  temp: number; // Changed from string to number
  humidity: number; // Changed from string to number
  timestamp: Date;
  metadata?: {
    sensorType: number;
    pin: number;
    readDurationMs?: number;
  };
}

export interface HealthStatus {
  sensor: 'healthy' | 'degraded' | 'unhealthy';
  database: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  consecutiveErrors: number;
}

export interface BufferedMeasurement {
  document: TemperatureDocument;
  retryCount: number;
  timestamp: Date;
}

export interface MetricsData {
  total: number;
  successful: number;
  failed: number;
  sensorErrors: number;
  dbErrors: number;
  apiErrors: number;
  successRate: number;
  avgLatency: number;
  bufferedCount: number;
}
