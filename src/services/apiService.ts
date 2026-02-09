import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../monitoring/logger';
import { config } from '../config/environment';

export interface TemperatureReading {
  temp: number;
  humidity: number;
  timestamp?: Date;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ApiService {
  private client: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    this.client = axios.create({
      baseURL: config.API_URL,
      timeout: config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...(config.API_KEY && { 'x-api-key': config.API_KEY }),
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ url: config.url, method: config.method }, 'API request');
        return config;
      },
      (error) => {
        logger.error({ error }, 'API request error');
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ url: response.config.url, status: response.status }, 'API response');
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(
            {
              url: error.config?.url,
              status: error.response.status,
              data: error.response.data,
            },
            'API response error'
          );
        } else if (error.request) {
          logger.error({ url: error.config?.url }, 'API no response');
        } else {
          logger.error({ error: error.message }, 'API request setup error');
        }
        return Promise.reject(error);
      }
    );
  }

  async postTemperature(reading: TemperatureReading): Promise<ApiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.post('/api/temperature/sensor', reading);

        logger.info(
          {
            temp: reading.temp,
            humidity: reading.humidity,
            attempt,
          },
          'Temperature data posted successfully'
        );

        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        // Don't retry on client errors (4xx)
        if (
          axiosError.response &&
          axiosError.response.status >= 400 &&
          axiosError.response.status < 500
        ) {
          logger.error(
            {
              error: axiosError.response.data,
              status: axiosError.response.status,
              temp: reading.temp,
              humidity: reading.humidity,
            },
            'Client error posting temperature data - not retrying'
          );

          return {
            success: false,
            error: `Client error: ${axiosError.response.status}`,
          };
        }

        // Retry on server errors (5xx) or network errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          logger.warn(
            {
              error: axiosError.message,
              attempt,
              maxRetries: this.maxRetries,
              retryInMs: delay,
            },
            'Failed to post temperature data, retrying...'
          );
          await this.sleep(delay);
        }
      }
    }

    logger.error(
      {
        error: lastError,
        temp: reading.temp,
        humidity: reading.humidity,
        attempts: this.maxRetries,
      },
      'Failed to post temperature data after all retries'
    );

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      logger.error({ error }, 'API health check failed');
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Made with Bob
