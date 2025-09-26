/**
 * Sportradar F1 Betting Insights API
 * Get comprehensive betting insights and recommendations with 6-hour caching
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

    console.log(`🏎️ Fetching Sportradar F1 betting insights for ${year} ${event}...`);

    // Use cache system
    const cacheResult = await withCache('sportradar-insights', { year, event })(async () => {
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

      // Get season schedule to find the event
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

      // Get stage summary for betting insights
      const summaryUrl = `${SPORTRADAR_BASE_URL}/sport_events/${targetEvent.id}/summary.json?api_key=${SPORTRADAR_API_KEY}`;
      const summaryResponse = await fetch(summaryUrl);
      
      if (!summaryResponse.ok) {
        throw new Error(`Sportradar summary API error: ${summaryResponse.status}`);
      }
      
      const summaryData = await summaryResponse.json();
      
      // Generate comprehensive betting insights
      return generateComprehensiveInsights(summaryData, targetEvent);
    });

    const responseData = {
      ...cacheResult.data,
      cacheInfo: {
        fromCache: cacheResult.fromCache,
        cacheAge: cacheResult.cacheAge,
        cachedAt: cacheResult.fromCache ? new Date(Date.now() - cacheResult.cacheAge * 60 * 1000).toISOString() : new Date().toISOString()
      }
    };
    
    console.log(`🏎️ Successfully generated betting insights for ${event} ${cacheResult.fromCache ? '(from cache)' : '(fresh)'}`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏎️ Error fetching Sportradar F1 betting insights:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}

/**
 * Generate comprehensive betting insights
 */
function generateComprehensiveInsights(summaryData, eventInfo) {
  const stage = summaryData.stage;
  const competitors = stage.competitors || [];
  
  // Analyze competitors for betting insights
  const analyzedCompetitors = competitors.map(comp => ({
    id: comp.id,
    name: comp.name,
    team: comp.team?.name,
    qualifying: comp.qualifying,
    recentForm: analyzeRecentForm(comp),
    trackSpecialist: isTrackSpecialist(comp, eventInfo),
    weatherSpecialist: isWeatherSpecialist(comp, stage.weather),
    bettingOdds: comp.odds || null,
    performanceMetrics: calculatePerformanceMetrics(comp)
  }));

  // Generate different types of insights
  const insights = {
    raceInfo: {
      name: eventInfo.description,
      location: eventInfo.venue?.city,
      country: eventInfo.venue?.country,
      date: eventInfo.scheduled,
      weather: stage.weather,
      trackTemperature: stage.track_temperature,
      airTemperature: stage.air_temperature,
      trackType: classifyTrackType(eventInfo.venue?.name)
    },
    
    qualifyingInsights: {
      polePosition: {
        driver: analyzedCompetitors.find(c => c.qualifying?.position === '1'),
        advantage: 'Pole position provides significant race advantage'
      },
      top3: analyzedCompetitors
        .filter(c => c.qualifying?.position && parseInt(c.qualifying.position) <= 3)
        .slice(0, 3),
      surprises: analyzedCompetitors.filter(c => 
        c.qualifying?.position && parseInt(c.qualifying.position) > 10 && 
        c.recentForm === 'improving'
      )
    },
    
    bettingRecommendations: {
      favorites: generateFavorites(analyzedCompetitors),
      trackSpecialists: generateTrackSpecialists(analyzedCompetitors),
      weatherSpecialists: generateWeatherSpecialists(analyzedCompetitors),
      formBased: generateFormBasedRecommendations(analyzedCompetitors),
      valueBets: generateValueBets(analyzedCompetitors)
    },
    
    riskAnalysis: {
      highRisk: generateHighRiskBets(analyzedCompetitors),
      mediumRisk: generateMediumRiskBets(analyzedCompetitors),
      lowRisk: generateLowRiskBets(analyzedCompetitors)
    },
    
    trackAnalysis: {
      characteristics: analyzeTrackCharacteristics(eventInfo.venue?.name),
      weatherImpact: analyzeWeatherImpact(stage.weather),
      historicalTrends: getHistoricalTrends(eventInfo.venue?.name)
    }
  };

  return {
    ...insights,
    source: 'Sportradar API',
    timestamp: new Date().toISOString(),
    confidence: calculateOverallConfidence(insights)
  };
}

/**
 * Analyze recent form for a competitor
 */
function analyzeRecentForm(comp) {
  // This would need historical data - simplified for now
  const improvingDrivers = ['NOR', 'PIA', 'ALB', 'STR'];
  const decliningDrivers = ['PER', 'SAI', 'BOT'];
  const stableDrivers = ['VER', 'HAM', 'LEC'];
  
  const driverCode = comp.name;
  
  if (improvingDrivers.includes(driverCode)) return 'improving';
  if (decliningDrivers.includes(driverCode)) return 'declining';
  if (stableDrivers.includes(driverCode)) return 'stable';
  return 'unknown';
}

/**
 * Check if driver is a track specialist
 */
function isTrackSpecialist(comp, eventInfo) {
  const specialistTracks = {
    'Monaco': ['LEC', 'VER', 'NOR'],
    'Silverstone': ['HAM', 'NOR', 'RUS'],
    'Spa': ['VER', 'LEC', 'HAM'],
    'Monza': ['VER', 'LEC', 'NOR'],
    'Suzuka': ['VER', 'LEC', 'NOR'],
    'Interlagos': ['VER', 'HAM', 'LEC']
  };
  
  const trackName = eventInfo.venue?.name;
  const driverCode = comp.name;
  
  return specialistTracks[trackName]?.includes(driverCode) || false;
}

/**
 * Check if driver is a weather specialist
 */
function isWeatherSpecialist(comp, weather) {
  const rainSpecialists = ['VER', 'NOR', 'LEC', 'HAM'];
  const drySpecialists = ['VER', 'LEC', 'NOR', 'PIA'];
  const driverCode = comp.name;
  
  if (weather === 'Rainy' || weather === 'Heavy rainfall') {
    return rainSpecialists.includes(driverCode);
  } else if (weather === 'Sunny' || weather === 'Cloudy') {
    return drySpecialists.includes(driverCode);
  }
  
  return false;
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(comp) {
  return {
    qualifyingPosition: comp.qualifying?.position || null,
    qualifyingTime: comp.qualifying?.time || null,
    gap: comp.qualifying?.gap || null,
    consistency: 'medium', // Would need historical data
    speed: 'high', // Would need historical data
    reliability: 'high' // Would need historical data
  };
}

/**
 * Classify track type
 */
function classifyTrackType(trackName) {
  const highSpeedTracks = ['Monza', 'Silverstone', 'Spa'];
  const technicalTracks = ['Monaco', 'Hungaroring', 'Suzuka'];
  const streetCircuits = ['Monaco', 'Baku', 'Singapore', 'Las Vegas'];
  
  if (highSpeedTracks.includes(trackName)) return 'high-speed';
  if (technicalTracks.includes(trackName)) return 'technical';
  if (streetCircuits.includes(trackName)) return 'street-circuit';
  return 'mixed';
}

/**
 * Generate favorites based on qualifying and form
 */
function generateFavorites(competitors) {
  return competitors
    .filter(c => c.qualifying?.position && parseInt(c.qualifying.position) <= 5)
    .slice(0, 3)
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position),
      reason: 'Strong qualifying performance',
      confidence: 'high'
    }));
}

/**
 * Generate track specialist recommendations
 */
function generateTrackSpecialists(competitors) {
  return competitors
    .filter(c => c.trackSpecialist)
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position) || null,
      reason: 'Strong track record',
      confidence: 'medium'
    }));
}

/**
 * Generate weather specialist recommendations
 */
function generateWeatherSpecialists(competitors) {
  return competitors
    .filter(c => c.weatherSpecialist)
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position) || null,
      reason: 'Excels in current conditions',
      confidence: 'medium'
    }));
}

/**
 * Generate form-based recommendations
 */
function generateFormBasedRecommendations(competitors) {
  return competitors
    .filter(c => c.recentForm === 'improving')
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position) || null,
      reason: 'Improving form',
      confidence: 'medium'
    }));
}

/**
 * Generate value bets (underdogs with potential)
 */
function generateValueBets(competitors) {
  return competitors
    .filter(c => 
      c.qualifying?.position && 
      parseInt(c.qualifying.position) > 10 && 
      c.recentForm === 'improving'
    )
    .slice(0, 3)
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position),
      reason: 'Value bet - improving form',
      confidence: 'low'
    }));
}

/**
 * Generate high-risk betting recommendations
 */
function generateHighRiskBets(competitors) {
  return competitors
    .filter(c => 
      c.qualifying?.position && 
      parseInt(c.qualifying.position) > 15
    )
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position),
      reason: 'High-risk bet',
      confidence: 'low'
    }));
}

/**
 * Generate medium-risk betting recommendations
 */
function generateMediumRiskBets(competitors) {
  return competitors
    .filter(c => 
      c.qualifying?.position && 
      parseInt(c.qualifying.position) > 5 && 
      parseInt(c.qualifying.position) <= 15
    )
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position),
      reason: 'Medium-risk bet',
      confidence: 'medium'
    }));
}

/**
 * Generate low-risk betting recommendations
 */
function generateLowRiskBets(competitors) {
  return competitors
    .filter(c => 
      c.qualifying?.position && 
      parseInt(c.qualifying.position) <= 5
    )
    .map(c => ({
      driver: c.name,
      position: parseInt(c.qualifying.position),
      reason: 'Low-risk bet',
      confidence: 'high'
    }));
}

/**
 * Analyze track characteristics
 */
function analyzeTrackCharacteristics(trackName) {
  const characteristics = {
    'Monaco': { type: 'street-circuit', difficulty: 'high', overtaking: 'difficult' },
    'Silverstone': { type: 'high-speed', difficulty: 'medium', overtaking: 'moderate' },
    'Spa': { type: 'high-speed', difficulty: 'medium', overtaking: 'good' },
    'Monza': { type: 'high-speed', difficulty: 'low', overtaking: 'excellent' },
    'Suzuka': { type: 'technical', difficulty: 'high', overtaking: 'moderate' }
  };
  
  return characteristics[trackName] || { type: 'mixed', difficulty: 'medium', overtaking: 'moderate' };
}

/**
 * Analyze weather impact
 */
function analyzeWeatherImpact(weather) {
  const impacts = {
    'Sunny': { impact: 'low', advantage: 'dry-weather specialists' },
    'Cloudy': { impact: 'low', advantage: 'consistent drivers' },
    'Rainy': { impact: 'high', advantage: 'rain specialists' },
    'Heavy rainfall': { impact: 'very high', advantage: 'wet-weather experts' }
  };
  
  return impacts[weather] || { impact: 'medium', advantage: 'all drivers' };
}

/**
 * Get historical trends for track
 */
function getHistoricalTrends(trackName) {
  // This would need historical data - simplified for now
  return {
    poleToWin: '60%',
    top3Finish: '80%',
    surpriseWinners: '20%',
    weatherChanges: '30%'
  };
}

/**
 * Calculate overall confidence in insights
 */
function calculateOverallConfidence(insights) {
  let confidence = 0;
  let factors = 0;
  
  // Factor in qualifying data quality
  if (insights.qualifyingInsights.polePosition.driver) {
    confidence += 0.3;
    factors++;
  }
  
  // Factor in track specialist data
  if (insights.bettingRecommendations.trackSpecialists.length > 0) {
    confidence += 0.2;
    factors++;
  }
  
  // Factor in weather data
  if (insights.raceInfo.weather) {
    confidence += 0.2;
    factors++;
  }
  
  // Factor in form data
  if (insights.bettingRecommendations.formBased.length > 0) {
    confidence += 0.3;
    factors++;
  }
  
  return factors > 0 ? Math.round((confidence / factors) * 100) : 0;
}
