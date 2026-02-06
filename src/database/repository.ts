import { Collection, Db } from 'mongodb';
import { TemperatureDocument } from '../types';
import { logger } from '../monitoring/logger';
import { config } from '../config/environment';

export class TemperatureRepository {
  private collection: Collection<TemperatureDocument>;

  constructor(db: Db) {
    this.collection = db.collection<TemperatureDocument>(config.MONGODB_COLLECTION);
  }

  async ensureIndexes(): Promise<void> {
    try {
      // Index for time-based queries (most recent first)
      await this.collection.createIndex({ timestamp: -1 });

      // Compound index for temperature queries over time
      await this.collection.createIndex({ timestamp: 1, temp: 1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to create database indexes');
      throw error;
    }
  }

  async save(document: TemperatureDocument): Promise<void> {
    await this.collection.insertOne(document);
  }

  async saveBatch(documents: TemperatureDocument[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    await this.collection.insertMany(documents);
  }

  async getLatest(limit: number = 10): Promise<TemperatureDocument[]> {
    return this.collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async getAverages(since: Date): Promise<{ avgTemp: number; avgHumidity: number }> {
    const result = await this.collection
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            avgTemp: { $avg: '$temp' },
            avgHumidity: { $avg: '$humidity' },
          },
        },
      ])
      .toArray();

    if (result.length === 0) {
      return { avgTemp: 0, avgHumidity: 0 };
    }

    const avgTemp = typeof result[0].avgTemp === 'number' ? result[0].avgTemp : 0;
    const avgHumidity = typeof result[0].avgHumidity === 'number' ? result[0].avgHumidity : 0;

    return {
      avgTemp: Number(avgTemp.toFixed(2)),
      avgHumidity: Number(avgHumidity.toFixed(2)),
    };
  }

  async getCount(): Promise<number> {
    return this.collection.countDocuments();
  }

  getCollection(): Collection<TemperatureDocument> {
    return this.collection;
  }
}
