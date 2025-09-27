/**
 * Vercel Serverless Function for F1 Events
 * Get all F1 events for a specific year
 */

const { mockEvents2024, mockEvents2025 } = require('./events-mock.js');

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
    const { year = 2024 } = req.query;

    console.log(`🏎️ Fetching events for year ${year}...`);

    // Try to fetch from Ergast API first, fallback to mock data
    let events = [];
    let source = 'Mock Data';

    try {
      const ergastUrl = `http://ergast.com/api/f1/${year}.json`;
      console.log(`🏎️ Ergast URL: ${ergastUrl}`);

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(ergastUrl);
      
      if (response.ok) {
        const data = await response.json();
        const races = data.MRData.RaceTable.Races;

        if (races && races.length > 0) {
          events = races.map((race, index) => ({
            round: parseInt(race.round),
            name: race.raceName,
            location: race.Circuit.Location.locality,
            country: race.Circuit.Location.country,
            date: race.date,
            circuitName: race.Circuit.circuitName
          }));
          source = 'Ergast API';
        }
      }
    } catch (apiError) {
      console.log('🏎️ Ergast API not accessible, using mock data');
    }

    // Fallback to mock data if API failed
    if (events.length === 0) {
      if (year == 2024) {
        events = mockEvents2024;
      } else if (year == 2025) {
        events = mockEvents2025;
      } else {
        // Use 2024 data as default
        events = mockEvents2024;
      }
    }

    if (events.length === 0) {
      return res.status(404).json({ 
        error: 'No events found',
        detail: `No F1 events found for year ${year}`
      });
    }

    const responseData = {
      year: parseInt(year),
      events: events,
      totalEvents: events.length,
      source: source,
      timestamp: new Date().toISOString()
    };

    console.log(`🏎️ Successfully fetched ${events.length} events for ${year} from ${source}`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏎️ Error fetching events:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}
