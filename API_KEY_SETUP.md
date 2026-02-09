# API Key Setup Guide

## Quick Setup

### 1. Generate a Secure API Key

Generate a random 32+ character string for your sensor API key:

```bash
# On macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. Configure the API

Add the generated key to your API's `.env` file:

```bash
# In packages/api/.env
SENSOR_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 3. Configure the Temperature Recorder

Add the same key to your temperature recorder's `.env` file:

```bash
# In ../temperature/.env
API_URL=http://localhost:443
API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
API_TIMEOUT=10000
```

### 4. Restart Both Services

```bash
# Restart API
cd packages/api
npm run dev

# Restart temperature recorder
cd ../temperature
npm run dev
```

## Verification

### Check API Logs

You should see:
```
[INFO] Environment validation passed
```

If `SENSOR_API_KEY` is not set, you'll see a warning:
```
[WARN] SENSOR_API_KEY is not set - sensor endpoint will reject all requests
```

### Check Temperature Recorder Logs

You should see:
```
[INFO] API connection verified successfully
```

If the API key is wrong:
```
[ERROR] API health check failed
[WARN] Will buffer measurements until API is available
```

### Test the Endpoint Manually

```bash
# Test with correct API key
curl -X POST http://localhost:443/api/temperature/sensor \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{"temp": 23.5, "humidity": 47.0}'

# Expected response:
# {"message":"Temperature record created successfully","id":"..."}

# Test with wrong API key
curl -X POST http://localhost:443/api/temperature/sensor \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrong_key" \
  -d '{"temp": 23.5, "humidity": 47.0}'

# Expected response:
# {"error":"Invalid or missing API key"}
```

## Security Best Practices

### Development
- ✅ Use a random 32+ character key
- ✅ Store in `.env` file (not committed to git)
- ✅ Different key per environment

### Production
- ✅ Use a cryptographically secure random key (64+ characters)
- ✅ Store in environment variables or secrets manager
- ✅ Rotate keys periodically
- ✅ Use HTTPS (not HTTP)
- ✅ Restrict API access by IP if possible
- ✅ Monitor for unauthorized access attempts

## Key Rotation

To rotate your API key:

1. Generate a new key
2. Update API's `.env` with new key
3. Restart API
4. Update temperature recorder's `.env` with new key
5. Restart temperature recorder

**Note:** There will be a brief period where measurements are buffered during the rotation.

## Troubleshooting

### "Invalid or missing API key"
- Verify the key matches in both `.env` files
- Check for extra spaces or newlines
- Ensure the key is at least 32 characters

### "SENSOR_API_KEY is required in production"
- Set `SENSOR_API_KEY` in your production environment
- This is enforced when `NODE_ENV=production`

### Measurements Being Buffered
- Check API is running: `curl http://localhost:443/api/health`
- Verify API key is correct
- Check API logs for authentication errors
- Ensure network connectivity

## API Endpoints

### Sensor Endpoint (API Key Auth)
```
POST /api/temperature/sensor
Headers:
  Content-Type: application/json
  x-api-key: <your_api_key>
Body:
  {
    "temp": 23.5,
    "humidity": 47.0,
    "timestamp": "2026-02-09T20:00:00.000Z"  // optional
  }
```

### Web UI Endpoint (Session Auth)
```
POST /api/temperature
Headers:
  Content-Type: application/json
  Cookie: connect.sid=...
Body:
  {
    "temp": 23.5,
    "humidity": 47.0,
    "timestamp": "2026-02-09T20:00:00.000Z"  // optional
  }
```

Both endpoints:
- Insert to MongoDB
- Update in-memory cache
- Return 201 with record ID on success