/**
 * Vercel Serverless Function for Available F1 Years
 * Get available years for F1 data
 */

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
    console.log('🏎️ Fetching available years...');

    // Ergast API supports data from 1950 onwards
    const currentYear = new Date().getFullYear();
    const availableYears = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => 1950 + i);

    const responseData = {
      availableYears: availableYears,
      detailedDataFrom: 1950,
      scheduleDataFrom: 1950,
      currentYear: currentYear,
      source: 'Ergast API',
      timestamp: new Date().toISOString()
    };

    console.log(`🏎️ Successfully fetched ${availableYears.length} available years`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('🏎️ Error fetching available years:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}
