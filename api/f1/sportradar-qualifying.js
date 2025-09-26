/**
 * Sportradar F1 Qualifying Results API
 * Enhanced F1 component with betting insights using Sportradar API with 6-hour caching
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
    const { year = 2025, event = 'Australia' } = req.query;

    console.log(`🏎️ Fetching Sportradar F1 data for ${year} ${event}...`);

    // Use cache system
    const cacheResult = await withCache('sportradar-qualifying', { year, event })(async () => {
      // Step 1: Get current season
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

      // Step 2: Get season schedule to find the event
      const scheduleUrl = `${SPORTRADAR_BASE_URL}/sport_events/${currentSeason.id}/schedule.json?api_key=${SPORTRADAR_API_KEY}`;
      const scheduleResponse = await fetch(scheduleUrl);
      
      if (!scheduleResponse.ok) {
        throw new Error(`Sportradar schedule API error: ${scheduleResponse.status}`);
      }
      
      const scheduleData = await scheduleResponse.json();
      const targetEvent = scheduleData.stages.find(stage => 
        stage.description.toLowerCase().includes(event.toLowerCase()) ||
        stage.venue.city.toLowerCase().includes(event.toLowerCase())
      );
      
      if (!targetEvent) {
        throw new Error(`Event "${event}" not found for ${year}`);
      }

      // Step 3: Get qualifying results for the event
      const qualifyingUrl = `${SPORTRADAR_BASE_URL}/sport_events/${targetEvent.id}/summary.json?api_key=${SPORTRADAR_API_KEY}`;
      const qualifyingResponse = await fetch(qualifyingUrl);
      
      if (!qualifyingResponse.ok) {
        throw new Error(`Sportradar qualifying API error: ${qualifyingResponse.status}`);
      }
      
      const qualifyingData = await qualifyingResponse.json();
      
      // Transform Sportradar data to our format with betting insights
      return transformSportradarData(qualifyingData, targetEvent);
    });

    const responseData = {
      ...cacheResult.data,
      cacheInfo: {
        fromCache: cacheResult.fromCache,
        cacheAge: cacheResult.cacheAge,
        cachedAt: cacheResult.fromCache ? new Date(Date.now() - cacheResult.cacheAge * 60 * 1000).toISOString() : new Date().toISOString()
      }
    };
    
    console.log(`🏎️ Successfully fetched Sportradar F1 data for ${responseData.results.length} drivers ${cacheResult.fromCache ? '(from cache)' : '(fresh)'}`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏎️ Error fetching Sportradar F1 data:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}

/**
 * Transform Sportradar data into betting-focused insights
 */
function transformSportradarData(sportradarData, eventInfo) {
  const stage = sportradarData.stage;
  const competitors = stage.competitors || [];
  
  // Sort competitors by qualifying position
  const sortedCompetitors = competitors
    .filter(comp => comp.qualifying && comp.qualifying.position)
    .sort((a, b) => parseInt(a.qualifying.position) - parseInt(b.qualifying.position));

  // Transform to our format
  const results = sortedCompetitors.map(comp => ({
    position: parseInt(comp.qualifying.position),
    driver: comp.name,
    team: comp.team?.name || 'Unknown',
    lapTime: comp.qualifying.time || 'N/A',
    timeDelta: comp.qualifying.position === '1' ? 'Pole' : `+${comp.qualifying.gap || 'N/A'}`,
    teamColor: getTeamColor(comp.team?.name),
    // Betting insights
    bettingOdds: comp.odds?.win || null,
    recentForm: getRecentForm(comp),
    trackSpecialist: isTrackSpecialist(comp, eventInfo),
    weatherSpecialist: isWeatherSpecialist(comp, stage.weather)
  }));

  // Generate betting insights
  const bettingInsights = generateBettingInsights(results, stage);
  
  return {
    event: `${eventInfo.description} ${eventInfo.scheduled?.split('-')[0] || ''}`,
    session: 'Qualifying',
    results: results,
    polePosition: {
      driver: results[0]?.driver,
      time: results[0]?.lapTime
    },
    totalDrivers: results.length,
    // Enhanced betting data
    bettingInsights: bettingInsights,
    trackInfo: {
      name: eventInfo.venue?.name,
      location: eventInfo.venue?.city,
      country: eventInfo.venue?.country,
      weather: stage.weather,
      trackTemperature: stage.track_temperature,
      airTemperature: stage.air_temperature
    },
    source: 'Sportradar API',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate betting insights based on qualifying results
 */
function generateBettingInsights(results, stage) {
  const favorites = results.slice(0, 3); // Top 3
  const surprises = results.filter(r => r.position > 10 && r.recentForm === 'improving');
  const trackSpecialists = results.filter(r => r.trackSpecialist);
  const weatherSpecialists = results.filter(r => r.weatherSpecialist);
  
  return {
    favorites: favorites.map(r => ({
      driver: r.driver,
      position: r.position,
      reason: 'Strong qualifying performance'
    })),
    surprises: surprises.map(r => ({
      driver: r.driver,
      position: r.position,
      reason: 'Unexpected qualifying result'
    })),
    trackSpecialists: trackSpecialists.map(r => ({
      driver: r.driver,
      position: r.position,
      reason: 'Strong track record'
    })),
    weatherSpecialists: weatherSpecialists.map(r => ({
      driver: r.driver,
      position: r.position,
      reason: 'Excels in current conditions'
    })),
    bettingRecommendations: generateBettingRecommendations(results, stage)
  };
}

/**
 * Generate specific betting recommendations
 */
function generateBettingRecommendations(results, stage) {
  const recommendations = [];
  
  // Pole position winner
  if (results[0]) {
    recommendations.push({
      type: 'Pole Position Winner',
      driver: results[0].driver,
      confidence: 'High',
      reasoning: 'Pole position gives significant advantage'
    });
  }
  
  // Weather-based recommendations
  if (stage.weather === 'Rainy' || stage.weather === 'Heavy rainfall') {
    const rainSpecialists = results.filter(r => r.weatherSpecialist);
    if (rainSpecialists.length > 0) {
      recommendations.push({
        type: 'Weather Specialist',
        driver: rainSpecialists[0].driver,
        confidence: 'Medium',
        reasoning: 'Excels in wet conditions'
      });
    }
  }
  
  // Track specialist
  const trackSpecialists = results.filter(r => r.trackSpecialist);
  if (trackSpecialists.length > 0) {
    recommendations.push({
      type: 'Track Specialist',
      driver: trackSpecialists[0].driver,
      confidence: 'Medium',
      reasoning: 'Strong history at this circuit'
    });
  }
  
  return recommendations;
}

/**
 * Get team color based on team name
 */
function getTeamColor(teamName) {
  const teamColors = {
    'Red Bull Racing': '#3671C6',
    'Ferrari': '#DC143C',
    'Mercedes': '#00D2BE',
    'McLaren': '#FF8700',
    'Aston Martin': '#006F62',
    'Alpine F1 Team': '#0090FF',
    'Williams': '#005AFF',
    'AlphaTauri': '#2B4562',
    'Alfa Romeo': '#900000',
    'Haas F1 Team': '#FFFFFF'
  };
  return teamColors[teamName] || '#FFFFFF';
}

/**
 * Determine if driver is a track specialist (simplified logic)
 */
function isTrackSpecialist(comp, eventInfo) {
  // This would need historical data - simplified for now
  const specialistTracks = {
    'Monaco': ['LEC', 'VER', 'NOR'],
    'Silverstone': ['HAM', 'NOR', 'RUS'],
    'Spa': ['VER', 'LEC', 'HAM']
  };
  
  const trackName = eventInfo.venue?.name;
  const driverCode = comp.name;
  
  return specialistTracks[trackName]?.includes(driverCode) || false;
}

/**
 * Determine if driver is a weather specialist (simplified logic)
 */
function isWeatherSpecialist(comp, weather) {
  // This would need historical data - simplified for now
  const rainSpecialists = ['VER', 'NOR', 'LEC'];
  const driverCode = comp.name;
  
  return (weather === 'Rainy' || weather === 'Heavy rainfall') && 
         rainSpecialists.includes(driverCode);
}

/**
 * Get recent form for driver (simplified)
 */
function getRecentForm(comp) {
  // This would need historical data - simplified for now
  const improvingDrivers = ['NOR', 'PIA', 'ALB'];
  const decliningDrivers = ['PER', 'SAI'];
  
  const driverCode = comp.name;
  
  if (improvingDrivers.includes(driverCode)) return 'improving';
  if (decliningDrivers.includes(driverCode)) return 'declining';
  return 'stable';
}
