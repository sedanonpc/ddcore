/**
 * Vercel Serverless Function for F1 Qualifying Results
 * Replaces the Python FastAPI backend with a lightweight serverless solution
 * Uses Ergast API (http://ergast.com/mrd/) for F1 data, with mock data fallback
 */

// Removed mock data import - using Sportradar API instead

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
    const { year = 2024, event = 'Las Vegas' } = req.query;

    console.log(`🏎️ Fetching qualifying results for ${year} ${event}...`);

    // Map event names to round numbers for Ergast API
    const eventToRound = await getEventRound(year, event);
    
    if (!eventToRound) {
      return res.status(404).json({ 
        error: `Event "${event}" not found for year ${year}`,
        detail: 'Please check the event name and year'
      });
    }

    // Fetch qualifying results from Ergast API
    const ergastUrl = `http://ergast.com/api/f1/${year}/${eventToRound}/qualifying.json`;
    console.log(`🏎️ Ergast URL: ${ergastUrl}`);

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(ergastUrl);
    
    if (!response.ok) {
      throw new Error(`Ergast API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const qualifyingData = data.MRData.RaceTable.Races[0];

    if (!qualifyingData || !qualifyingData.QualifyingResults) {
      return res.status(404).json({ 
        error: 'No qualifying data found',
        detail: `No qualifying results available for ${event} ${year}`
      });
    }

    // Transform Ergast data to match your component's expected format
    const results = qualifyingData.QualifyingResults.map((result, index) => ({
      position: parseInt(result.position),
      driver: result.Driver.code,
      team: result.Constructor.name,
      lapTime: result.Q3 || result.Q2 || result.Q1 || 'N/A',
      timeDelta: index === 0 ? 'Pole' : `+${calculateTimeDelta(result, qualifyingData.QualifyingResults[0])}`,
      teamColor: getTeamColor(result.Constructor.name)
    }));

    const responseData = {
      event: `${qualifyingData.raceName} ${year}`,
      session: 'Qualifying',
      results: results,
      polePosition: {
        driver: results[0].driver,
        time: results[0].lapTime
      },
      totalDrivers: results.length,
      source: 'Ergast API',
      timestamp: new Date().toISOString()
    };

    console.log(`🏎️ Successfully fetched qualifying results for ${results.length} drivers`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏎️ Error fetching qualifying results:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}

/**
 * Get the round number for a specific event in a given year
 */
async function getEventRound(year, eventName) {
  try {
    // First, try to get the schedule for the year
    const scheduleUrl = `http://ergast.com/api/f1/${year}.json`;
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(scheduleUrl);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const races = data.MRData.RaceTable.Races;

    // Find the race that matches the event name
    const matchingRace = races.find(race => 
      race.raceName.toLowerCase().includes(eventName.toLowerCase()) ||
      race.Circuit.Location.country.toLowerCase().includes(eventName.toLowerCase()) ||
      race.Circuit.circuitName.toLowerCase().includes(eventName.toLowerCase())
    );

    return matchingRace ? matchingRace.round : null;
  } catch (error) {
    console.error('Error getting event round:', error);
    return null;
  }
}

/**
 * Calculate time delta between two qualifying results
 */
function calculateTimeDelta(result, poleResult) {
  try {
    const resultTime = result.Q3 || result.Q2 || result.Q1;
    const poleTime = poleResult.Q3 || poleResult.Q2 || poleResult.Q1;
    
    if (!resultTime || !poleTime) return 'N/A';
    
    // Simple time difference calculation (this is approximate)
    // In a real implementation, you'd parse the time strings properly
    return '0.000s'; // Placeholder - Ergast doesn't provide time deltas
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Get team color based on constructor name
 */
function getTeamColor(constructorName) {
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
    'Haas F1 Team': '#FFFFFF',
    'Force India': '#FF8700',
    'Racing Point': '#F596C8',
    'Toro Rosso': '#469BFF',
    'Sauber': '#9B0000',
    'Manor': '#6C0000',
    'Caterham': '#00FF00',
    'HRT': '#FF0000',
    'Virgin': '#0000FF',
    'Lotus F1': '#FFD700',
    'Marussia': '#FF1493',
    'Caterham F1': '#32CD32'
  };

  return teamColors[constructorName] || '#FFFFFF';
}
