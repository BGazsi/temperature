# Migration to API-Based Temperature Recording

## Overview

The temperature recording system has been migrated from **direct database insertion** to **API-based recording**. This provides better architecture, centralized data validation, automatic cache synchronization, and improved scalability.

## What Changed

### Architecture Before
```
Sensor → MeasurementService → MongoDB (direct insert)
```

### Architecture After
```
Sensor → MeasurementService → API Service → Temperature API → MongoDB + Cache
```

## Key Benefits

✅ **Automatic Cache Synchronization** - API updates in-memory cache on every insert  
✅ **Centralized Validation** - All data validation happens in the API  
✅ **Better Security** - Database credentials only in API, not in sensor code  
✅ **Improved Monitoring** - API metrics track all data ingestion  
✅ **Easier Scaling** - Multiple sensors can POST to same API  
✅ **Resilient** - Buffer/retry mechanism maintained for network failures  

## Configuration

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# API Configuration (REQUIRED)
API_URL=http://localhost:443
API_KEY=your_api_key_here
API_TIMEOUT=10000

# Sensor Configuration
use_real_sensor=false
SENSOR_TYPE=22
SENSOR_PIN=4
refresh_interval=60000

# Application Configuration
LOG_LEVEL=info
MAX_BUFFER_SIZE=1000
MAX_CONSECUTIVE_ERRORS=10
```

### Getting Your API Key

1. The API uses JWT authentication
2. Create a user account via the API's user creation script
3. Login to get a JWT token
4. Use the token as your `API_KEY`

Example:
```bash
# In the API project
cd packages/api
npm run create-user

# Then login to get token
curl -X POST http://localhost:443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Use the returned token as API_KEY
```

## Files Modified

### New Files
- `src/services/apiService.ts` - HTTP client for API communication
- `.env.example` - Updated with API configuration
- `MIGRATION_TO_API.md` - This documentation

### Modified Files
- `src/config/environment.ts` - Added API_URL, API_KEY, API_TIMEOUT
- `src/services/measurementService.ts` - Uses ApiService instead of TemperatureRepository
- `src/services/bufferService.ts` - Flushes via API instead of MongoDB
- `src/monitoring/metrics.ts` - Added 'api' error type
- `src/types.ts` - Added apiErrors to MetricsData
- `src/index.ts` - Removed database initialization, added API initialization
- `package.json` - Added axios dependency

### Removed Dependencies (can be uninstalled)
- Direct MongoDB connection is no longer needed
- `src/database/connection.ts` - Not used (kept for reference)
- `src/database/repository.ts` - Not used (kept for reference)

## API Endpoint

The temperature recording system POSTs data to:

```
POST /api/temperature
Content-Type: application/json
Authorization: Bearer <your_api_key>

{
  "temp": 23.5,
  "humidity": 47.0,
  "timestamp": "2026-02-09T20:00:00.000Z"  // optional, defaults to now
}
```

## Error Handling & Resilience

### Buffering
- If API is unreachable, measurements are buffered in memory
- Buffer size: configurable via `MAX_BUFFER_SIZE` (default: 1000)
- Oldest measurements are dropped if buffer is full

### Retry Logic
- Failed API calls are retried up to 3 times with exponential backoff
- Client errors (4xx) are not retried
- Server errors (5xx) and network errors are retried
- Buffered measurements are flushed when API becomes available

### Health Checks
- API health is checked on startup
- If API is down, measurements are buffered until it's available
- Application continues running even if API is unreachable

## Monitoring

### Metrics
The application tracks:
- `total` - Total measurement attempts
- `successful` - Successful API posts
- `failed` - Failed attempts
- `sensorErrors` - Sensor reading failures
- `apiErrors` - API communication failures
- `successRate` - Success percentage
- `avgLatency` - Average API response time
- `bufferedCount` - Current buffer size

### Logs
Structured JSON logs include:
- Successful measurements with temp/humidity
- API errors with retry information
- Buffer operations (add, flush)
- Health check results

## Testing

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Verify API Connection
Check logs for:
```
"API connection verified successfully"
```

If API is down:
```
"API health check failed, will buffer measurements until API is available"
```

## Troubleshooting

### "Cannot connect to API"
- Verify `API_URL` is correct
- Check if API server is running
- Verify network connectivity
- Check firewall rules

### "401 Unauthorized"
- Verify `API_KEY` is valid
- Token may have expired - get a new one
- Check if user account is active

### "Buffer full, removing oldest measurement"
- API has been unreachable for extended period
- Increase `MAX_BUFFER_SIZE` if needed
- Check API server health
- Review API logs for errors

### High API Latency
- Check network connection
- Verify API server performance
- Consider increasing `API_TIMEOUT`
- Review API server logs

## Rollback (if needed)

To rollback to direct database access:

1. Restore old versions of modified files from git
2. Remove axios dependency: `npm uninstall axios`
3. Update `.env` to use MongoDB configuration
4. Restart application

## Migration Checklist

- [x] Install axios dependency
- [x] Create ApiService
- [x] Update environment configuration
- [x] Modify MeasurementService
- [x] Update BufferService
- [x] Update metrics tracking
- [x] Update main index.ts
- [x] Create documentation
- [ ] Update .env with API credentials
- [ ] Test in development
- [ ] Deploy to production
- [ ] Monitor for issues

## Support

For issues or questions:
1. Check application logs
2. Verify API server is running
3. Test API endpoint manually with curl
4. Review this documentation