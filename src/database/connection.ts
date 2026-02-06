import { MongoClient, Db } from 'mongodb';
import { config } from '../config/environment';
import { logger } from '../monitoring/logger';

const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 60000; // 1 minute

export class DatabaseConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;
  private retryTimeout: NodeJS.Timeout | null = null;

  async connect(retryCount = 0): Promise<Db> {
    try {
      if (this.client) {
        try {
          await this.client.close();
        } catch (err) {
          logger.warn({ error: err }, 'Error closing existing client');
        }
      }

      this.client = new MongoClient(config.MONGODB_URL, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      logger.info('Connected successfully to MongoDB');

      this.db = this.client.db(config.MONGODB_DB_NAME);
      this.isConnected = true;

      // Monitor connection health
      this.client.on('close', () => {
        logger.warn('MongoDB connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.client.on('error', (err) => {
        logger.error({ error: err }, 'MongoDB connection error');
        this.isConnected = false;
      });

      return this.db;
    } catch (err) {
      this.isConnected = false;
      const delay = Math.min(RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
      logger.error(
        { error: err, attempt: retryCount + 1, retryInSeconds: delay / 1000 },
        'Failed to connect to MongoDB'
      );

      await this.sleep(delay);
      return this.connect(retryCount + 1);
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimeout) {
      return; // Already scheduled
    }

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      logger.info('Attempting to reconnect to MongoDB...');
      this.connect().catch((err: unknown) => {
        logger.error({ error: err }, 'Reconnection failed');
      });
    }, RETRY_DELAY);
  }

  async close(): Promise<void> {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.client) {
      try {
        await this.client.close();
        logger.info('MongoDB connection closed');
      } catch (err) {
        logger.error({ error: err }, 'Error closing MongoDB connection');
      }
    }

    this.isConnected = false;
    this.db = null;
    this.client = null;
  }

  getDb(): Db | null {
    return this.db;
  }

  getClient(): MongoClient | null {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected && this.db !== null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
