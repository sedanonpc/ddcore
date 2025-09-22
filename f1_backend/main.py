from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import fastf1.plotting
import pandas as pd
from fastf1.core import Laps
from datetime import datetime, timedelta
import os
from typing import List, Dict, Any
import tempfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable FastF1 cache
cache_dir = os.path.join(os.getcwd(), "cache")
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

# Enable Matplotlib patches for plotting timedelta values
fastf1.plotting.setup_mpl(mpl_timedelta_support=True, color_scheme=None)

app = FastAPI(title="F1 Qualifying Results API", version="1.0.0")

# Enable CORS for your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://frontend:3000"  # Docker container name
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "F1 Qualifying Results API", 
        "status": "running",
        "version": "1.0.0",
        "cache_dir": cache_dir
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/f1/qualifying")
async def get_qualifying_results(year: int = 2024, event: str = "Las Vegas"):
    """
    Get qualifying results for a specific F1 event
    Based on the plot_qualifying_results.py example
    """
    try:
        logger.info(f"Fetching qualifying results for {year} {event}")
        
        # Get the qualifying session (same as the example)
        session = fastf1.get_session(year, event, 'Q')
        session.load()
        
        # Get all drivers (same as the example)
        drivers = pd.unique(session.laps['Driver'])
        logger.info(f"Found {len(drivers)} drivers: {list(drivers)}")
        
        # Get fastest lap for each driver (same as the example)
        list_fastest_laps = []
        for drv in drivers:
            try:
                drvs_fastest_lap = session.laps.pick_drivers(drv).pick_fastest()
                if not drvs_fastest_lap.empty:
                    list_fastest_laps.append(drvs_fastest_lap)
            except Exception as e:
                logger.warning(f"Could not get fastest lap for {drv}: {e}")
                continue
        
        if not list_fastest_laps:
            raise HTTPException(status_code=404, detail="No qualifying data found")
        
        # Create Laps object and sort by lap time (same as the example)
        fastest_laps = Laps(list_fastest_laps) \
            .sort_values(by='LapTime') \
            .reset_index(drop=True)
        
        # Calculate time differences from pole position (same as the example)
        pole_lap = fastest_laps.pick_fastest()
        fastest_laps['LapTimeDelta'] = fastest_laps['LapTime'] - pole_lap['LapTime']
        
        # Get team colors (same as the example)
        team_colors = []
        for index, lap in fastest_laps.iterlaps():
            try:
                color = fastf1.plotting.get_team_color(lap['Team'], session=session)
                team_colors.append(color)
            except:
                team_colors.append("#FFFFFF")  # Default white color
        
        # Format data for frontend
        results = []
        for idx, lap in fastest_laps.iterrows():
            time_delta = lap['LapTimeDelta']
            
            # Format lap time
            lap_time_str = str(lap['LapTime']).split()[-1] if pd.notna(lap['LapTime']) else "N/A"
            
            # Format time delta
            if time_delta.total_seconds() > 0:
                time_delta_str = f"+{time_delta.total_seconds():.3f}s"
            else:
                time_delta_str = "Pole"
            
            result = {
                "position": idx + 1,
                "driver": lap['Driver'],
                "team": lap['Team'],
                "lapTime": lap_time_str,
                "timeDelta": time_delta_str,
                "teamColor": team_colors[idx] if idx < len(team_colors) else "#FFFFFF"
            }
            results.append(result)
        
        # Get event information
        event_name = session.event['EventName'] if hasattr(session.event, 'EventName') else event
        event_year = session.event.year if hasattr(session.event, 'year') else year
        
        response_data = {
            "event": f"{event_name} {event_year}",
            "session": "Qualifying",
            "results": results[:20],  # Top 20 drivers
            "polePosition": {
                "driver": results[0]["driver"] if results else None,
                "time": results[0]["lapTime"] if results else None
            },
            "totalDrivers": len(results),
            "cacheInfo": {
                "cacheDir": cache_dir,
                "cacheEnabled": True
            }
        }
        
        logger.info(f"Successfully fetched qualifying results for {len(results)} drivers")
        return response_data
        
    except Exception as e:
        logger.error(f"Error fetching qualifying data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching qualifying data: {str(e)}")

@app.get("/api/f1/events/{year}")
async def get_events(year: int = 2024):
    """
    Get all F1 events for a specific year
    """
    try:
        logger.info(f"Fetching events for year {year}")
        
        schedule = fastf1.get_event_schedule(year)
        events = []
        
        for idx, event in schedule.iterrows():
            events.append({
                "round": event.get('RoundNumber', idx + 1),
                "name": event['EventName'],
                "location": event.get('Location', 'Unknown'),
                "country": event.get('Country', 'Unknown'),
                "date": event['Session5Date'].strftime('%Y-%m-%d') if pd.notna(event.get('Session5Date')) else None
            })
        
        logger.info(f"Found {len(events)} events for {year}")
        return {"year": year, "events": events}
        
    except Exception as e:
        logger.error(f"Error fetching events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")

@app.get("/api/f1/available-years")
async def get_available_years():
    """
    Get available years for F1 data
    """
    try:
        # FastF1 supports data from 2018 onwards for detailed data
        # But schedule data goes back to 1950
        current_year = datetime.now().year
        available_years = list(range(2018, current_year + 1))
        
        return {
            "availableYears": available_years,
            "detailedDataFrom": 2018,
            "scheduleDataFrom": 1950
        }
    except Exception as e:
        logger.error(f"Error getting available years: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting available years: {str(e)}")

@app.get("/api/f1/cache/info")
async def get_cache_info():
    """
    Get information about the FastF1 cache
    """
    try:
        cache_info = fastf1.Cache.get_cache_info()
        return {
            "cachePath": cache_info[0] if cache_info[0] else "Not configured",
            "cacheSize": cache_info[1] if cache_info[1] else 0,
            "cacheSizeMB": round(cache_info[1] / (1024 * 1024), 2) if cache_info[1] else 0
        }
    except Exception as e:
        logger.error(f"Error getting cache info: {str(e)}")
        return {
            "cachePath": "Error",
            "cacheSize": 0,
            "cacheSizeMB": 0,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
