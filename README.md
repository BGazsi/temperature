# Temperature Sensor Project

A TypeScript-based temperature and humidity monitoring application that reads sensor data and stores it in a Cloudant database.

## Features

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Support for both real DHT22 sensor and mock sensor
- MongoDB database integration
- Configurable refresh intervals

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
```

### Environment Variables

- `use_real_sensor` - Set to `true` to use real DHT22 sensor, `false` for mock sensor
- `MONGODB_URL` - MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGODB_DB_NAME` - Database name (default: `temperature_db`)
- `MONGODB_COLLECTION` - Collection name (default: `temperatures`)
- `refresh_interval` - Interval between measurements in milliseconds (default: `60000`)

## Scripts

- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
├── src/
│   ├── index.ts          # Main application entry point
│   ├── mockSensor.ts     # Mock sensor implementation
│   └── types.ts          # TypeScript type definitions
├── dist/                 # Compiled JavaScript (generated)
├── .eslintrc.json        # ESLint configuration
├── .prettierrc.json      # Prettier configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies and scripts
```

## Development

1. Make changes to TypeScript files in the `src/` directory
2. Run `npm run lint` to check for issues
3. Run `npm run format` to format code
4. Run `npm run build` to compile
5. Run `npm start` to execute

## License

ISC