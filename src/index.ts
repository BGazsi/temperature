import dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
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

// MongoDB connection
const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'temperature_db';
const collectionName = process.env.MONGODB_COLLECTION || 'temperatures';

let db: Db;
let collection: Collection<TemperatureDocument>;

const connectToMongoDB = async (): Promise<void> => {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('Connected successfully to MongoDB');

    db = client.db(dbName);
    collection = db.collection<TemperatureDocument>(collectionName);
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    throw err;
  }
};

const addNewMeasurement = async (): Promise<void> => {
  try {
    const res: SensorReading = await sensor.read(22, 4);
    const document: TemperatureDocument = {
      temp: res.temperature.toFixed(1),
      humidity: res.humidity.toFixed(1),
      _id: new Date().getTime().toString(),
    };

    await collection.insertOne(document);
    console.log(`Measurement saved: ${document.temp}°C, ${document.humidity}% humidity`);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error gathering data from the sensor or writing to db:\n ${err.message}`);
    } else {
      console.error(`Unknown error occurred:\n ${String(err)}`);
    }
    throw err;
  }
};

const exec = async (): Promise<void> => {
  await connectToMongoDB();

  addNewMeasurement().catch(console.error);
  const refreshInterval = parseInt(process.env.refresh_interval || '60000', 10);
  setInterval(() => {
    addNewMeasurement().catch(console.error);
  }, refreshInterval);
};

exec().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Made with Bob
