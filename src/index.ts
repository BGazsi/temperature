import dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import { uuidv7 } from 'uuidv7';
import { mockSensor } from './mockSensor';
import { Sensor, SensorReading, TemperatureDocument } from './types';

dotenv.config();

const useRealSensor = process.env.use_real_sensor;

// Dynamic import for real sensor (optional dependency)
let sensor: Sensor;
if (!useRealSensor || useRealSensor === 'false') {
  sensor = mockSensor;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
  const realSensor = require('node-dht-sensor').promises as Sensor;
  sensor = realSensor;
}

// Validate and parse environment variables
const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'temperature_db';
const collectionName = process.env.MONGODB_COLLECTION || 'temperatures';
const refreshInterval = parseInt(process.env.refresh_interval || '60000', 10);

if (isNaN(refreshInterval) || refreshInterval < 1000) {
  console.error('Invalid refresh_interval. Must be a number >= 1000ms. Using default: 60000ms');
}

const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 60000; // 1 minute
const MAX_CONSECUTIVE_ERRORS = 10;

let client: MongoClient;
let db: Db;
let collection: Collection<TemperatureDocument>;
let isConnected = false;
let consecutiveErrors = 0;
let retryTimeout: NodeJS.Timeout | null = null;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const connectToMongoDB = async (retryCount = 0): Promise<void> => {
  try {
    if (client) {
      try {
        await client.close();
      } catch (err) {
        console.warn('Error closing existing client:', err);
      }
    }

    client = new MongoClient(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    console.log('Connected successfully to MongoDB');

    db = client.db(dbName);
    collection = db.collection<TemperatureDocument>(collectionName);
    isConnected = true;
    consecutiveErrors = 0;

    // Monitor connection health
    client.on('close', () => {
      console.warn('MongoDB connection closed');
      isConnected = false;
      scheduleReconnect();
    });

    client.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });
  } catch (err) {
    isConnected = false;
    const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
    console.error(`Failed to connect to MongoDB (attempt ${retryCount + 1}):`, err);
    console.log(`Retrying in ${delay / 1000} seconds...`);

    await sleep(delay);
    return connectToMongoDB(retryCount + 1);
  }
};

const scheduleReconnect = (): void => {
  if (retryTimeout) {
    return; // Already scheduled
  }

  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    console.log('Attempting to reconnect to MongoDB...');
    connectToMongoDB().catch((err) => {
      console.error('Reconnection failed:', err);
    });
  }, RETRY_DELAY);
};

const addNewMeasurement = async (): Promise<void> => {
  if (!isConnected) {
    console.warn('Skipping measurement: MongoDB not connected');
    consecutiveErrors++;
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(
        `Too many consecutive errors (${consecutiveErrors}). Attempting reconnection...`
      );
      scheduleReconnect();
    }
    return;
  }

  try {
    const res: SensorReading = await sensor.read(22, 4);
    const timestamp = new Date();
    const document: TemperatureDocument = {
      _id: uuidv7(),
      temp: res.temperature.toFixed(1),
      humidity: res.humidity.toFixed(1),
      timestamp,
    };

    await collection.insertOne(document);
    console.log(
      `Measurement saved: ${document.temp}°C, ${document.humidity}% humidity at ${timestamp.toISOString()}`
    );
    consecutiveErrors = 0; // Reset on success
  } catch (err) {
    consecutiveErrors++;
    if (err instanceof Error) {
      console.error(`Error gathering data from sensor or writing to db: ${err.message}`);
    } else {
      console.error(`Unknown error occurred: ${String(err)}`);
    }

    // Check if it's a MongoDB connection error
    if (
      err instanceof Error &&
      (err.message.includes('topology') || err.message.includes('connection'))
    ) {
      console.warn('Detected MongoDB connection issue');
      isConnected = false;
      scheduleReconnect();
    }

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(
        `Too many consecutive errors (${consecutiveErrors}). Attempting reconnection...`
      );
      scheduleReconnect();
    }
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  if (retryTimeout) {
    clearTimeout(retryTimeout);
  }

  if (client) {
    try {
      await client.close();
      console.log('MongoDB connection closed');
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
    }
  }

  console.log('Shutdown complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch((err) => {
    console.error('Error during shutdown:', err);
    process.exit(1);
  });
});
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch((err) => {
    console.error('Error during shutdown:', err);
    process.exit(1);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  consecutiveErrors++;
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    console.error('Too many uncaught exceptions. Exiting...');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  consecutiveErrors++;
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    console.error('Too many unhandled rejections. Exiting...');
    process.exit(1);
  }
});

const exec = async (): Promise<void> => {
  console.log('Starting temperature monitoring application...');
  console.log(`Refresh interval: ${refreshInterval}ms`);
  console.log(`Using ${useRealSensor === 'true' ? 'real' : 'mock'} sensor`);

  await connectToMongoDB();

  // Initial measurement
  addNewMeasurement().catch((err) => {
    console.error('Error in initial measurement:', err);
  });

  // Schedule periodic measurements
  setInterval(() => {
    addNewMeasurement().catch((err) => {
      console.error('Error in periodic measurement:', err);
    });
  }, refreshInterval);

  console.log('Application started successfully');
};

exec().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Made with Bob
