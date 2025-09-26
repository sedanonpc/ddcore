/**
 * Sportradar F1 Events API
 * Get F1 events and schedule information with 6-hour caching
 */

const SPORTRADAR_API_KEY = 'YfECfX62lNPYcCLAvxAnOENKpkwAvjduvjEWyobs';
const SPORTRADAR_BASE_URL = 'https://api.sportradar.com/formula1/trial/v2/en';
import { withCache } from './cache.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year = 2025 } = req.query;

    console.log(`🏎️ Fetching Sportradar F1 events for year ${year}...`);

    // Use cache system
    const cacheResult = await withCache('sportradar-events', { year })(async () => {
      // Get current season
      const seasonsUrl = `${SPORTRADAR_BASE_URL}/seasons.json?api_key=${SPORTRADAR_API_KEY}`;
      const seasonsResponse = await fetch(seasonsUrl);
      
      if (!seasonsResponse.ok) {
        throw new Error(`Sportradar seasons API error: ${seasonsResponse.status}`);
      }
      
      const seasonsData = await seasonsResponse.json();
      const currentSeason = seasonsData.stages.find(s => s.description.includes(year.toString()));
      
      if (!currentSeason) {
        throw new Error(`Season ${year} not found`);
      }

      // Get season schedule
      const scheduleUrl = `${SPORTRADAR_BASE_URL}/sport_events/${currentSeason.id}/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
      const scheduleResponse = await fetch(scheduleUrl);
      
      if (!scheduleResponse.ok) {
        throw new Error(`Sportradar schedule API error: ${scheduleResponse.status}`);
      }
      
      const scheduleData = await scheduleResponse.json();
      
      // Transform Sportradar data to our format
      const events = scheduleData.stages
        .filter(stage => stage.type === 'event')
        .map(stage => ({
          round: stage.round || 0,
          name: stage.description,
          location: stage.venue?.city,
          country: stage.venue?.country,
          date: stage.scheduled,
          circuitName: stage.venue?.name,
          stageId: stage.id,
          status: stage.status,
          weather: stage.weather,
          trackTemperature: stage.track_temperature,
          airTemperature: stage.air_temperature
        }));

      return {
        year: parseInt(year),
        events: events,
        totalEvents: events.length,
        source: 'Sportradar API',
        timestamp: new Date().toISOString()
      };
    });

    const responseData = {
      ...cacheResult.data,
      cacheInfo: {
        fromCache: cacheResult.fromCache,
        cacheAge: cacheResult.cacheAge,
        cachedAt: cacheResult.fromCache ? new Date(Date.now() - cacheResult.cacheAge * 60 * 1000).toISOString() : new Date().toISOString()
      }
    };

    console.log(`🏎️ Successfully fetched ${responseData.events.length} events for ${year} ${cacheResult.fromCache ? '(from cache)' : '(fresh)'}`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏎️ Error fetching Sportradar F1 events:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}
