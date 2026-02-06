# Temperature Sensor Project

A TypeScript-based temperature and humidity monitoring application that reads sensor data and stores it in a MongoDB database with enhanced reliability, observability, and modular architecture.

## Features

- **Modular Architecture**: Well-organized codebase with separation of concerns
- **Structured Logging**: Pino-based logging with multiple log levels
- **Metrics Collection**: Track success rates, latencies, and error counts
- **Offline Resilience**: Buffer measurements when database is unavailable
- **Health Monitoring**: Periodic health checks for sensor and database
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Database Indexes**: Optimized queries for time-series data
- **Graceful Shutdown**: Proper cleanup and buffer flushing on exit
- **Mock Sensor**: Realistic sensor simulation for development/testing

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- MongoDB database instance

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
use_real_sensor=false
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=temperature_db
MONGODB_COLLECTION=temperatures
refresh_interval=60000
SENSOR_TYPE=22
SENSOR_PIN=4
LOG_LEVEL=info
MAX_BUFFER_SIZE=1000
MAX_CONSECUTIVE_ERRORS=10
```

### Environment Variables

- `use_real_sensor` - Set to `true` to use real DHT22 sensor, `false` for mock sensor
- `MONGODB_URL` - MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGODB_DB_NAME` - Database name (default: `temperature_db`)
- `MONGODB_COLLECTION` - Collection name (default: `temperatures`)
- `refresh_interval` - Interval between measurements in milliseconds (default: `60000`)
- `SENSOR_TYPE` - DHT sensor type (default: `22` for DHT22)
- `SENSOR_PIN` - GPIO pin number (default: `4`)
- `LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)
- `MAX_BUFFER_SIZE` - Maximum number of measurements to buffer offline (default: `1000`)
- `MAX_CONSECUTIVE_ERRORS` - Max errors before triggering reconnection (default: `10`)

## Scripts

- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application with PM2
- `npm stop` - Stop the PM2 process
- `npm restart` - Restart the PM2 process
- `npm run logs` - View PM2 logs
- `npm run status` - Check PM2 status
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
├── src/
│   ├── config/
│   │   └── environment.ts       # Environment variable validation with Zod
│   ├── database/
│   │   ├── connection.ts        # MongoDB connection management
│   │   └── repository.ts        # Data access layer with indexes
│   ├── monitoring/
│   │   ├── logger.ts            # Structured logging with Pino
│   │   ├── metrics.ts           # Metrics collection and reporting
│   │   └── healthCheck.ts       # Health monitoring for sensor and DB
│   ├── sensor/
│   │   └── sensorFactory.ts     # Sensor initialization (real/mock)
│   ├── services/
│   │   ├── bufferService.ts     # Offline measurement buffering
│   │   └── measurementService.ts # Core measurement logic
│   ├── index.ts                 # Application entry point
│   ├── mockSensor.ts            # Mock sensor with realistic variations
│   └── types.ts                 # TypeScript type definitions
├── dist/                        # Compiled JavaScript (generated)
├── .eslintrc.json               # ESLint configuration
├── .prettierrc.json             # Prettier configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Project dependencies and scripts
```

## Architecture

### Key Components

1. **Configuration Module** (`config/environment.ts`)
   - Validates environment variables using Zod
   - Provides type-safe configuration throughout the app

2. **Database Layer** (`database/`)
   - `connection.ts`: Manages MongoDB connection with auto-reconnect
   - `repository.ts`: Abstracts database operations with indexes

3. **Monitoring** (`monitoring/`)
   - `logger.ts`: Structured logging with Pino
   - `metrics.ts`: Tracks success rates, latencies, error counts
   - `healthCheck.ts`: Monitors sensor and database health

4. **Services** (`services/`)
   - `bufferService.ts`: Buffers measurements when DB is offline (max 1000)
   - `measurementService.ts`: Orchestrates sensor reading and data storage

5. **Sensor** (`sensor/`)
   - `sensorFactory.ts`: Creates real or mock sensor based on config

### Data Flow

```
Sensor → MeasurementService → Repository → MongoDB
                ↓ (on DB failure)
           BufferService → (retry when DB reconnects)
```

### Reliability Features

- **Automatic Reconnection**: Exponential backoff for MongoDB reconnection
- **Offline Buffering**: Stores up to 1000 measurements when DB is unavailable
- **Health Checks**: Periodic monitoring every 2 minutes
- **Graceful Shutdown**: Flushes buffer and closes connections properly
- **Error Tracking**: Counts consecutive errors to trigger recovery actions

### Observability Features

- **Structured Logs**: JSON-formatted logs with context
- **Metrics Tracking**: Success rate, latency, error counts
- **Periodic Reporting**: Metrics logged every 5 minutes
- **Health Status**: Real-time sensor and database health monitoring

## Data Model

### TemperatureDocument

```typescript
{
  _id: string;           // UUIDv7 for time-ordered IDs
  temp: number;          // Temperature in Celsius
  humidity: number;      // Humidity percentage
  timestamp: Date;       // Measurement timestamp
  metadata?: {
    sensorType: number;  // DHT sensor type (22)
    pin: number;         // GPIO pin number
    readDurationMs: number; // Time taken to read sensor
  }
}
```

### Database Indexes

- `{ timestamp: -1 }` - For recent measurements queries
- `{ timestamp: 1, temp: 1 }` - For time-series temperature queries

## Development

1. Make changes to TypeScript files in the `src/` directory
2. Run `npm run lint` to check for issues
3. Run `npm run format` to format code
4. Run `npm run build` to compile
5. Run `npm run dev` to test locally

## Production Deployment

1. Set environment variables in `.env`
2. Run `npm run build` to compile
3. Run `npm start` to start with PM2
4. Monitor with `npm run logs`

## Monitoring

The application provides comprehensive monitoring:

- **Logs**: Structured JSON logs with Pino
- **Metrics**: Success rate, latency, error counts (logged every 5 minutes)
- **Health Checks**: Sensor and database status (checked every 2 minutes)
- **Buffer Status**: Number of pending measurements

## Troubleshooting

### Database Connection Issues
- Check MongoDB URL and credentials
- Verify network connectivity
- Check logs for connection errors
- Buffered measurements will be saved when connection is restored

### Sensor Reading Errors
- Verify GPIO pin configuration
- Check sensor wiring
- Review sensor type setting (DHT22 = 22)
- Use mock sensor for testing (`use_real_sensor=false`)

### High Memory Usage
- Reduce `MAX_BUFFER_SIZE` if buffer grows too large
- Check for database connection issues causing buffer buildup
- Monitor metrics for error rates

## License

ISC