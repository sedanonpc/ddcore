# F1 Qualifying Results API

A FastAPI backend that provides Formula 1 qualifying results using the FastF1 library.

## Features

- 🏎️ Real-time F1 qualifying results
- 📊 Driver positions, lap times, and time deltas
- 🎨 Team colors for visual representation
- 💾 Built-in caching for performance
- 🔄 CORS enabled for frontend integration
- 📚 Auto-generated API documentation

## Quick Start

### 1. Install Dependencies

```bash
cd f1_backend
pip install -r requirements.txt
```

### 2. Start the Server

```bash
python start.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Endpoints

### GET `/api/f1/qualifying`
Get qualifying results for a specific F1 event.

**Parameters:**
- `year` (int): Championship year (default: 2024)
- `event` (str): Event name (default: "Las Vegas")

**Example:**
```bash
curl "http://localhost:8000/api/f1/qualifying?year=2024&event=Las%20Vegas"
```

### GET `/api/f1/events/{year}`
Get all F1 events for a specific year.

**Example:**
```bash
curl "http://localhost:8000/api/f1/events/2024"
```

### GET `/api/f1/available-years`
Get available years for F1 data.

### GET `/api/f1/cache/info`
Get information about the FastF1 cache.

## Response Format

```json
{
  "event": "Las Vegas Grand Prix 2024",
  "session": "Qualifying",
  "results": [
    {
      "position": 1,
      "driver": "VER",
      "team": "Red Bull Racing",
      "lapTime": "1:32.123",
      "timeDelta": "Pole",
      "teamColor": "#3671C6"
    }
  ],
  "polePosition": {
    "driver": "VER",
    "time": "1:32.123"
  },
  "totalDrivers": 20
}
```

## Docker Support

### Build and Run with Docker

```bash
# Build the image
docker build -t f1-backend .

# Run the container
docker run -p 8000:8000 f1-backend
```

### Docker Compose

The backend is designed to work with Docker Compose for multi-service applications.

## Development

### Cache Management

FastF1 uses a local cache to store downloaded data. The cache directory is automatically created and managed.

To clear the cache:
```python
import fastf1
fastf1.Cache.clear_cache()
```

### Logging

The API includes comprehensive logging for debugging and monitoring.

## Dependencies

- **FastAPI**: Modern web framework for building APIs
- **FastF1**: Python library for Formula 1 data
- **Pandas**: Data manipulation and analysis
- **Uvicorn**: ASGI server for FastAPI

## Notes

- First API call may take longer as data is downloaded and cached
- Subsequent calls will be much faster due to caching
- FastF1 provides data from 2018 onwards for detailed information
- Schedule data is available from 1950 onwards
