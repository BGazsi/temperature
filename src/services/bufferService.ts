import { Collection } from 'mongodb';
import { BufferedMeasurement, TemperatureDocument } from '../types';
import { logger } from '../monitoring/logger';
import { config } from '../config/environment';

export class BufferService {
  private buffer: BufferedMeasurement[] = [];
  private readonly maxBufferSize: number;
  private readonly maxRetries = 3;

  constructor(maxBufferSize?: number) {
    this.maxBufferSize = maxBufferSize || config.MAX_BUFFER_SIZE;
  }

  add(document: TemperatureDocument): void {
    if (this.buffer.length >= this.maxBufferSize) {
      const removed = this.buffer.shift();
      logger.warn(
        { removedId: removed?.document._id, bufferSize: this.buffer.length },
        'Buffer full, removing oldest measurement'
      );
    }

    this.buffer.push({
      document,
      retryCount: 0,
      timestamp: new Date(),
    });

    logger.debug({ bufferSize: this.buffer.length }, 'Measurement added to buffer');
  }

  async flush(collection: Collection<TemperatureDocument>): Promise<number> {
    if (this.buffer.length === 0) {
      return 0;
    }

    let flushedCount = 0;
    const itemsToProcess = [...this.buffer];

    logger.info({ count: itemsToProcess.length }, 'Starting buffer flush');

    for (const item of itemsToProcess) {
      try {
        await collection.insertOne(item.document);
        // Remove from buffer on success
        const index = this.buffer.findIndex((b) => b.document._id === item.document._id);
        if (index !== -1) {
          this.buffer.splice(index, 1);
        }
        flushedCount++;
      } catch (error) {
        item.retryCount++;

        if (item.retryCount >= this.maxRetries) {
          logger.error(
            {
              error,
              documentId: item.document._id,
              retryCount: item.retryCount,
            },
            'Max retries reached, removing from buffer'
          );
          // Remove from buffer after max retries
          const index = this.buffer.findIndex((b) => b.document._id === item.document._id);
          if (index !== -1) {
            this.buffer.splice(index, 1);
          }
        } else {
          logger.warn(
            {
              error,
              documentId: item.document._id,
              retryCount: item.retryCount,
            },
            'Failed to flush buffered measurement, will retry'
          );
        }
        // Stop flushing on first error to avoid overwhelming the database
        break;
      }
    }

    if (flushedCount > 0) {
      logger.info(
        { flushedCount, remainingInBuffer: this.buffer.length },
        'Buffer flush completed'
      );
    }

    return flushedCount;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  clear(): void {
    const count = this.buffer.length;
    this.buffer = [];
    logger.info({ clearedCount: count }, 'Buffer cleared');
  }

  getOldestTimestamp(): Date | null {
    if (this.buffer.length === 0) {
      return null;
    }
    return this.buffer[0].timestamp;
  }
}
