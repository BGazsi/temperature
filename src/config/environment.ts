import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  USE_REAL_SENSOR: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  // API Configuration (new approach)
  API_URL: z.string().default('http://localhost:443'),
  API_KEY: z.string().optional(),
  API_TIMEOUT: z
    .string()
    .optional()
    .default('10000')
    .transform((val) => parseInt(val, 10)),
  // Database Configuration (kept for backward compatibility, but not used in API mode)
  MONGODB_URL: z.string().default('mongodb://localhost:27017'),
  MONGODB_DB_NAME: z.string().default('temperature_db'),
  MONGODB_COLLECTION: z.string().default('temperatures'),
  REFRESH_INTERVAL: z
    .string()
    .optional()
    .default('60000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1000, {
      message: 'REFRESH_INTERVAL must be a number >= 1000ms',
    }),
  SENSOR_TYPE: z
    .string()
    .optional()
    .default('22')
    .transform((val) => parseInt(val, 10)),
  SENSOR_PIN: z
    .string()
    .optional()
    .default('4')
    .transform((val) => parseInt(val, 10)),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MAX_BUFFER_SIZE: z
    .string()
    .optional()
    .default('1000')
    .transform((val) => parseInt(val, 10)),
  MAX_CONSECUTIVE_ERRORS: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10)),
});

export type Config = z.infer<typeof envSchema>;

let config: Config;

try {
  config = envSchema.parse({
    USE_REAL_SENSOR: process.env.use_real_sensor,
    API_URL: process.env.API_URL,
    API_KEY: process.env.API_KEY,
    API_TIMEOUT: process.env.API_TIMEOUT,
    MONGODB_URL: process.env.MONGODB_URL,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    MONGODB_COLLECTION: process.env.MONGODB_COLLECTION,
    REFRESH_INTERVAL: process.env.refresh_interval,
    SENSOR_TYPE: process.env.SENSOR_TYPE,
    SENSOR_PIN: process.env.SENSOR_PIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    MAX_BUFFER_SIZE: process.env.MAX_BUFFER_SIZE,
    MAX_CONSECUTIVE_ERRORS: process.env.MAX_CONSECUTIVE_ERRORS,
  });
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

export { config };
